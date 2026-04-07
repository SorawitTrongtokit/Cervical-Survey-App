import { NextResponse } from "next/server";
import { z } from "zod";

import { isValidPhone, normalizePhone } from "@/lib/survey/normalizers";
import {
  parseSurveyIntentChoice,
  SURVEY_INTENT_CHOICES,
  type SurveyIntentResponse,
} from "@/lib/survey/types";
import { createAdminClient } from "@/utils/supabase/admin";

const payloadSchema = z.object({
  citizenId: z.string().uuid(),
  contactPhone: z.string().trim().min(1),
  intentChoice: z.enum(SURVEY_INTENT_CHOICES),
  volunteerId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.safeParse(await request.json());

    if (!payload.success) {
      return NextResponse.json(
        { error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizePhone(payload.data.contactPhone);

    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: "กรุณากรอกเบอร์โทรให้ถูกต้อง" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: citizen, error: citizenError } = await supabase
      .from("citizens")
      .select("id, screening_state, assigned_volunteer_id")
      .eq("id", payload.data.citizenId)
      .single();

    if (citizenError || !citizen) {
      return NextResponse.json({ error: "ไม่พบข้อมูลประชาชน" }, { status: 404 });
    }

    if (citizen.screening_state !== "pending") {
      return NextResponse.json(
        { error: "บันทึกได้เฉพาะรายที่ยังไม่ได้ตรวจ" },
        { status: 409 },
      );
    }

    if (citizen.assigned_volunteer_id !== payload.data.volunteerId) {
      return NextResponse.json(
        { error: "รายชื่อนี้ไม่ได้อยู่ในความรับผิดชอบของ อสม. ที่เลือก" },
        { status: 409 },
      );
    }

    const { data: surveyIntent, error: upsertError } = await supabase
      .from("survey_intents")
      .upsert(
        [
          {
            citizen_id: payload.data.citizenId,
            contact_phone: normalizedPhone,
            intent_choice: payload.data.intentChoice,
            volunteer_id: payload.data.volunteerId,
          },
        ],
        { onConflict: "citizen_id" },
      )
      .select("citizen_id, contact_phone, intent_choice, updated_at, volunteer_id")
      .single();

    if (upsertError || !surveyIntent) {
      return NextResponse.json(
        { error: upsertError?.message ?? "ไม่สามารถบันทึกข้อมูลได้" },
        { status: 500 },
      );
    }

    const response: SurveyIntentResponse = {
      citizenId: surveyIntent.citizen_id,
      contactPhone: surveyIntent.contact_phone,
      hasIntent: true,
      intentChoice:
        parseSurveyIntentChoice(surveyIntent.intent_choice) ?? payload.data.intentChoice,
      updatedAt: surveyIntent.updated_at,
      volunteerId: surveyIntent.volunteer_id,
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
