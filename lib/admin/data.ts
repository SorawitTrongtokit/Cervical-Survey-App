import type { PostgrestError } from "@supabase/supabase-js";

import type { AdminDashboardData } from "@/lib/admin/types";
import { buildFullName } from "@/lib/survey/normalizers";
import { hasSurveyStatusKind } from "@/lib/survey/status";
import { parseSurveyIntentChoice } from "@/lib/survey/types";
import { createAdminClient } from "@/utils/supabase/admin";

export interface AdminDataLoadResult {
  data: AdminDashboardData | null;
  error: string | null;
}

function formatQueryError(error: PostgrestError) {
  if (error.code === "42P01") {
    return "ยังไม่พบตารางใน Supabase กรุณารัน SQL migration ก่อน";
  }

  return `โหลดข้อมูลสำหรับหน้า admin ไม่สำเร็จ: ${error.message}`;
}

export async function getAdminDashboardData(): Promise<AdminDataLoadResult> {
  try {
    const supabase = createAdminClient();
    const [{ data: volunteers, error: volunteersError }, { data: citizens, error: citizensError }, { data: surveyIntents, error: surveyIntentsError }] =
      await Promise.all([
        supabase
          .from("volunteers")
          .select("id, full_name, phone, village_code, updated_at")
          .order("village_code", { ascending: true })
          .order("full_name", { ascending: true }),
        supabase
          .from("citizens")
          .select(
            "id, source_row, house_no, prefix, first_name, last_name, age_years, screening_state, screening_status_raw, assigned_volunteer_id, source_phone, village_code, updated_at",
          )
          .order("source_row", { ascending: true }),
        supabase
          .from("survey_intents")
          .select("citizen_id, contact_phone, intent_choice, updated_at, volunteer_id")
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

    const volunteerById = new Map(
      volunteers.map((volunteer) => [
        volunteer.id,
        {
          fullName: volunteer.full_name,
          id: volunteer.id,
          phone: volunteer.phone,
          updatedAt: volunteer.updated_at,
          villageCode: volunteer.village_code,
        },
      ]),
    );
    const intentByCitizenId = new Map(
      surveyIntents.map((intent) => [
        intent.citizen_id,
        {
          contactPhone: intent.contact_phone,
          intentChoice: parseSurveyIntentChoice(intent.intent_choice),
          updatedAt: intent.updated_at,
          volunteerId: intent.volunteer_id,
        },
      ]),
    );
    const villages = [...new Set(volunteers.map((volunteer) => volunteer.village_code))].sort(
      (left, right) => Number(left) - Number(right),
    );

    const adminCitizens = citizens.map((citizen) => {
      const volunteer = citizen.assigned_volunteer_id
        ? volunteerById.get(citizen.assigned_volunteer_id) ?? null
        : null;
      const intent = intentByCitizenId.get(citizen.id) ?? null;

      return {
        ageYears: citizen.age_years,
        assignedVolunteerId: citizen.assigned_volunteer_id,
        assignedVolunteerName: volunteer?.fullName ?? null,
        fullName: buildFullName(citizen.prefix, citizen.first_name, citizen.last_name),
        hasIntent: Boolean(intent),
        houseNo: citizen.house_no,
        id: citizen.id,
        intentChoice: intent?.intentChoice ?? null,
        intentPhone: intent?.contactPhone ?? "",
        intentUpdatedAt: intent?.updatedAt ?? null,
        screeningState: citizen.screening_state,
        screeningStatusRaw: citizen.screening_status_raw,
        sourcePhone: citizen.source_phone,
        sourceRow: citizen.source_row,
        updatedAt: citizen.updated_at,
        villageCode: citizen.village_code,
      };
    });

    const adminVolunteers = volunteers.map((volunteer) => {
      const assignedCitizens = adminCitizens.filter(
        (citizen) => citizen.assignedVolunteerId === volunteer.id,
      );

      return {
        assignedCitizenCount: assignedCitizens.length,
        fullName: volunteer.full_name,
        id: volunteer.id,
        intentCount: assignedCitizens.filter((citizen) => citizen.hasIntent).length,
        pendingCitizenCount: assignedCitizens.filter((citizen) =>
          hasSurveyStatusKind(citizen, "pending"),
        ).length,
        phone: volunteer.phone,
        updatedAt: volunteer.updated_at,
        villageCode: volunteer.village_code,
      };
    });

    return {
      data: {
        citizens: adminCitizens,
        stats: {
          totalCitizens: adminCitizens.length,
          totalCompleted: adminCitizens.filter((citizen) =>
            hasSurveyStatusKind(citizen, "completed"),
          ).length,
          totalDeclined: adminCitizens.filter((citizen) =>
            hasSurveyStatusKind(citizen, "declined"),
          ).length,
          totalLegacyIntent: adminCitizens.filter((citizen) =>
            hasSurveyStatusKind(citizen, "legacy"),
          ).length,
          totalPending: adminCitizens.filter((citizen) =>
            hasSurveyStatusKind(citizen, "pending"),
          ).length,
          totalSavedIntent: adminCitizens.filter((citizen) => citizen.hasIntent).length,
          totalVolunteers: adminVolunteers.length,
          villages,
        },
        volunteers: adminVolunteers,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุระหว่างโหลดข้อมูลสำหรับหน้า admin",
    };
  }
}
