import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiAuthorizedSession } from "@/lib/auth/session";
import type {
  AdminCitizenUpdatePayload,
  AdminCitizenUpdateResponse,
} from "@/lib/admin/types";
import { isValidPhone, normalizePhone } from "@/lib/survey/normalizers";
import { parseSurveyIntentChoice, type SurveyIntentChoice } from "@/lib/survey/types";
import { createAdminClient } from "@/utils/supabase/admin";

const payloadSchema = z.object({
  assignedVolunteerId: z.string().uuid(),
  intentPhone: z.string().trim(),
  screeningState: z.enum(["pending", "completed"]),
});

interface CitizenRouteContext {
  params: Promise<{
    citizenId: string;
  }>;
}

export async function PATCH(request: Request, context: CitizenRouteContext) {
  try {
    const session = await requireApiAuthorizedSession();

    if ("response" in session) {
      return session.response;
    }

    const { citizenId } = await context.params;
    const payload = payloadSchema.safeParse(
      (await request.json()) satisfies AdminCitizenUpdatePayload,
    );

    if (!payload.success) {
      return NextResponse.json(
        { error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizePhone(payload.data.intentPhone);

    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: "กรุณากรอกเบอร์โทรให้ถูกต้อง" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: volunteer, error: volunteerError } = await supabase
      .from("volunteers")
      .select("id")
      .eq("id", payload.data.assignedVolunteerId)
      .single();

    if (volunteerError || !volunteer) {
      return NextResponse.json({ error: "ไม่พบข้อมูล อสม." }, { status: 404 });
    }

    const { data: citizen, error: citizenError } = await supabase
      .from("citizens")
      .update({
        assigned_volunteer_id: payload.data.assignedVolunteerId,
        screening_state: payload.data.screeningState,
      })
      .eq("id", citizenId)
      .select("id, assigned_volunteer_id, screening_state, updated_at")
      .single();

    if (citizenError || !citizen) {
      return NextResponse.json(
        { error: citizenError?.message ?? "ไม่สามารถอัปเดตข้อมูลประชาชนได้" },
        { status: 500 },
      );
    }

    let intentPhone = "";
    let intentChoice: SurveyIntentChoice | null = null;
    let intentUpdatedAt: string | null = null;
    let hasIntent = false;

    if (payload.data.screeningState === "completed" || !normalizedPhone) {
      const { error: deleteError } = await supabase
        .from("survey_intents")
        .delete()
        .eq("citizen_id", citizenId);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 },
        );
      }
    } else {
      const { data: intent, error: intentError } = await supabase
        .from("survey_intents")
        .upsert(
          [
            {
              citizen_id: citizenId,
              contact_phone: normalizedPhone,
              volunteer_id: payload.data.assignedVolunteerId,
            },
          ],
          { onConflict: "citizen_id" },
        )
        .select("contact_phone, intent_choice, updated_at")
        .single();

      if (intentError || !intent) {
        return NextResponse.json(
          { error: intentError?.message ?? "ไม่สามารถอัปเดตความประสงค์ได้" },
          { status: 500 },
        );
      }

      hasIntent = true;
      intentChoice = parseSurveyIntentChoice(intent.intent_choice);
      intentPhone = intent.contact_phone;
      intentUpdatedAt = intent.updated_at;
    }

    const response: AdminCitizenUpdateResponse = {
      assignedVolunteerId: citizen.assigned_volunteer_id,
      hasIntent,
      id: citizen.id,
      intentChoice,
      intentPhone,
      intentUpdatedAt,
      screeningState: citizen.screening_state,
      updatedAt: citizen.updated_at,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
      },
      { status: 500 },
    );
  }
}
