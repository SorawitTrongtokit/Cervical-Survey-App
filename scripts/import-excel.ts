import fs from "node:fs";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

import type { Database } from "../lib/database.types";
import {
  buildFullName,
  deriveScreeningState,
  excelSerialToDate,
  normalizePhone,
  normalizeThaiCitizenId,
  normalizeVillageCode,
  parseAgeYears,
  volunteerLookupKey,
} from "../lib/survey/normalizers";
import { createAdminClient } from "../utils/supabase/admin";

loadEnvConfig(process.cwd());

const DEFAULT_WORKBOOK = "ทะเบียนประชากรสำรวจการตรวจมะเร็งปากมดลูก.xlsx";
const BATCH_SIZE = 200;

type CitizenImportRow = Database["public"]["Tables"]["citizens"]["Insert"];
type VolunteerImportRow = Database["public"]["Tables"]["volunteers"]["Insert"];

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

function getWorkbookPath() {
  const argPath = process.argv[2];
  return path.resolve(process.cwd(), argPath ?? DEFAULT_WORKBOOK);
}

function assertFileExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workbook not found: ${filePath}`);
  }
}

function readSheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, {
    blankrows: false,
    defval: "",
    header: 1,
    raw: true,
  });
}

function formatExcelDateDisplay(value: number) {
  const parsed = XLSX.SSF.parse_date_code(value);

  if (!parsed) {
    return String(value);
  }

  return `${parsed.d}/${parsed.m}/${parsed.y}`;
}

function readScreeningStatusRaw(sheet: XLSX.WorkSheet, sourceRow: number) {
  const cellAddress = XLSX.utils.encode_cell({ c: 10, r: sourceRow - 1 });
  const cell = sheet[cellAddress];

  if (!cell) {
    return "";
  }

  if (cell.t === "n" && typeof cell.v === "number") {
    return formatExcelDateDisplay(cell.v);
  }

  if (typeof cell.w === "string" && cell.w.trim().length > 0) {
    return cell.w.trim();
  }

  return String(cell.v ?? "").trim();
}

function readVolunteerRows(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets["อสม."];

  if (!sheet) {
    throw new Error('Missing sheet "อสม."');
  }

  const rows = readSheetRows(sheet);
  const dataRows = rows.slice(1);

  return dataRows
    .filter((row) => row.some((value) => String(value ?? "").trim().length > 0))
    .map<VolunteerImportRow>((row) => ({
      full_name: buildFullName(String(row[0] ?? "")),
      phone: normalizePhone(row[3]) || null,
      village_code: normalizeVillageCode(row[1]),
      volunteer_citizen_id: normalizeThaiCitizenId(row[2]),
    }));
}

function readCitizenRows(
  workbook: XLSX.WorkBook,
  volunteerIdByCard: Map<string, string>,
  volunteerIdByNameVillage: Map<string, string>,
) {
  const sheet = workbook.Sheets["บัญชี1ทั้งหมด"];

  if (!sheet) {
    throw new Error('Missing sheet "บัญชี1ทั้งหมด"');
  }

  const rows = readSheetRows(sheet);
  const dataRows = rows.slice(2);
  const unmatchedRows: string[] = [];

  const citizens = dataRows
    .filter((row) => row.some((value) => String(value ?? "").trim().length > 0))
    .map<CitizenImportRow>((row, index) => {
      const sourceRow = index + 3;
      const villageCode = normalizeVillageCode(row[1]);
      const volunteerCitizenId = normalizeThaiCitizenId(row[12]);
      const volunteerName = buildFullName(String(row[11] ?? ""));
      const screeningStatusRaw = readScreeningStatusRaw(sheet, sourceRow);
      const byCardId = volunteerCitizenId
        ? volunteerIdByCard.get(volunteerCitizenId) ?? null
        : null;
      const byNameVillageId =
        volunteerIdByNameVillage.get(volunteerLookupKey(volunteerName, villageCode)) ??
        null;
      const assignedVolunteerId = byCardId ?? byNameVillageId;

      if (!assignedVolunteerId) {
        unmatchedRows.push(
          `${index + 3}: ${buildFullName(String(row[3] ?? ""), String(row[4] ?? ""), String(row[5] ?? ""))}`,
        );
      }

      return {
        age_years: parseAgeYears(row[8]),
        assigned_volunteer_id: assignedVolunteerId,
        birth_date: excelSerialToDate(row[7]),
        first_name: String(row[4] ?? "").trim(),
        gender: String(row[6] ?? "").trim() || null,
        house_no: String(row[2] ?? "").trim() || null,
        last_name: String(row[5] ?? "").trim(),
        national_id: normalizeThaiCitizenId(row[9]),
        prefix: String(row[3] ?? "").trim() || null,
        screening_state: deriveScreeningState(screeningStatusRaw),
        screening_status_raw: screeningStatusRaw,
        sequence_no:
          typeof row[0] === "number"
            ? row[0]
            : Number.parseInt(String(row[0] ?? "").trim(), 10) || null,
        source_phone: normalizePhone(row[13]) || null,
        source_row: sourceRow,
        village_code: villageCode,
      };
    });

  return { citizens, unmatchedRows };
}

async function upsertVolunteerBatches(
  supabase: SupabaseClient<Database>,
  rows: VolunteerImportRow[],
) {
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const { error } = await supabase
      .from("volunteers")
      .upsert(batch, { onConflict: "volunteer_citizen_id" });

    if (error) {
      throw new Error(`Failed to upsert volunteers: ${error.message}`);
    }
  }
}

async function upsertCitizenBatches(
  supabase: SupabaseClient<Database>,
  rows: CitizenImportRow[],
) {
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const { error } = await supabase
      .from("citizens")
      .upsert(batch, { onConflict: "national_id" });

    if (error) {
      throw new Error(`Failed to upsert citizens: ${error.message}`);
    }
  }
}

async function loadVolunteerMaps(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("volunteers")
    .select("id, full_name, village_code, volunteer_citizen_id");

  if (error) {
    throw new Error(`Failed to load volunteers after upsert: ${error.message}`);
  }

  const volunteerIdByCard = new Map<string, string>();
  const volunteerIdByNameVillage = new Map<string, string>();

  for (const volunteer of data) {
    volunteerIdByCard.set(volunteer.volunteer_citizen_id, volunteer.id);
    volunteerIdByNameVillage.set(
      volunteerLookupKey(volunteer.full_name, volunteer.village_code),
      volunteer.id,
    );
  }

  return { volunteerIdByCard, volunteerIdByNameVillage };
}

async function main() {
  const workbookPath = getWorkbookPath();
  assertFileExists(workbookPath);

  const workbook = XLSX.readFile(workbookPath, {
    cellDates: false,
    raw: true,
  });
  const supabase = createAdminClient();

  const volunteerRows = readVolunteerRows(workbook);
  await upsertVolunteerBatches(supabase, volunteerRows);

  const { volunteerIdByCard, volunteerIdByNameVillage } = await loadVolunteerMaps(
    supabase,
  );
  const { citizens, unmatchedRows } = readCitizenRows(
    workbook,
    volunteerIdByCard,
    volunteerIdByNameVillage,
  );

  await upsertCitizenBatches(supabase, citizens);

  const [{ count: volunteerCount, error: volunteerCountError }, { count: citizenCount, error: citizenCountError }, { count: pendingCount, error: pendingCountError }] =
    await Promise.all([
      supabase
        .from("volunteers")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("citizens")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("citizens")
        .select("*", { count: "exact", head: true })
        .eq("screening_state", "pending"),
    ]);

  if (volunteerCountError || citizenCountError || pendingCountError) {
    throw new Error("Failed to verify imported counts.");
  }

  console.log(`Imported volunteers: ${volunteerCount ?? 0}`);
  console.log(`Imported citizens: ${citizenCount ?? 0}`);
  console.log(`Pending citizens: ${pendingCount ?? 0}`);
  console.log(`Unmatched volunteer links: ${unmatchedRows.length}`);

  if (unmatchedRows.length > 0) {
    console.log("Review unmatched rows:");
    unmatchedRows.slice(0, 20).forEach((row) => console.log(`- ${row}`));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
