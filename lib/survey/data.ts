import type { PostgrestError } from "@supabase/supabase-js";

import { hasSurveyStatusKind } from "@/lib/survey/status";
import { parseSurveyIntentChoice, type DashboardData } from "@/lib/survey/types";
import { buildFullName } from "@/lib/survey/normalizers";
import { createAdminClient } from "@/utils/supabase/admin";

export interface DashboardLoadResult {
  data: DashboardData | null;
  error: string | null;
}

function formatQueryError(error: PostgrestError) {
  if (error.code === "42P01") {
    return "ยังไม่พบตารางใน Supabase กรุณารัน SQL migration ก่อน";
  }

  return `โหลดข้อมูลไม่สำเร็จ: ${error.message}`;
}

export async function getDashboardData(): Promise<DashboardLoadResult> {
  try {
    const supabase = createAdminClient();
    const [{ data: volunteers, error: volunteersError }, { data: citizens, error: citizensError }, { data: surveyIntents, error: surveyIntentsError }] =
      await Promise.all([
        supabase
          .from("volunteers")
          .select("id, full_name, phone, village_code")
          .order("village_code", { ascending: true })
          .order("full_name", { ascending: true }),
        supabase
          .from("citizens")
          .select(
            "id, source_row, house_no, prefix, first_name, last_name, age_years, screening_state, screening_status_raw, assigned_volunteer_id, source_phone",
          )
          .order("source_row", { ascending: true }),
        supabase
          .from("survey_intents")
          .select("citizen_id, contact_phone, intent_choice, updated_at")
          .order("updated_at", { ascending: false }),
      ]);

    if (volunteersError) {
      return { data: null, error: formatQueryError(volunteersError) };
    }

    if (citizensError) {
      return { data: null, error: formatQueryError(citizensError) };
    }

    if (surveyIntentsError) {
      return { data: null, error: formatQueryError(surveyIntentsError) };
    }

    const intentByCitizenId = new Map(
      surveyIntents.map((intent) => [
        intent.citizen_id,
        {
          contactPhone: intent.contact_phone,
          intentChoice: parseSurveyIntentChoice(intent.intent_choice),
          updatedAt: intent.updated_at,
        },
      ]),
    );
    const villages = [...new Set(volunteers.map((volunteer) => volunteer.village_code))].sort(
      (left, right) => Number(left) - Number(right),
    );
    const dashboardCitizens = citizens.map((citizen) => ({
      ageYears: citizen.age_years,
      assignedVolunteerId: citizen.assigned_volunteer_id,
      fullName: buildFullName(citizen.prefix, citizen.first_name, citizen.last_name),
      hasIntent: intentByCitizenId.has(citizen.id),
      houseNo: citizen.house_no,
      id: citizen.id,
      intentChoice: intentByCitizenId.get(citizen.id)?.intentChoice ?? null,
      intentPhone: intentByCitizenId.get(citizen.id)?.contactPhone ?? "",
      intentUpdatedAt: intentByCitizenId.get(citizen.id)?.updatedAt ?? null,
      screeningState: citizen.screening_state,
      screeningStatusRaw: citizen.screening_status_raw,
      sourcePhone: citizen.source_phone,
      sourceRow: citizen.source_row,
    }));

    return {
      data: {
        citizens: dashboardCitizens,
        stats: {
          savedIntentCount: surveyIntents.length,
          totalCitizens: dashboardCitizens.length,
          totalCompleted: dashboardCitizens.filter((citizen) =>
            hasSurveyStatusKind(citizen, "completed"),
          ).length,
          totalPending: dashboardCitizens.filter((citizen) =>
            hasSurveyStatusKind(citizen, "pending"),
          ).length,
          villages,
        },
        volunteers: volunteers.map((volunteer) => ({
          fullName: volunteer.full_name,
          id: volunteer.id,
          phone: volunteer.phone,
          villageCode: volunteer.village_code,
        })),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุระหว่างโหลดข้อมูล",
    };
  }
}
