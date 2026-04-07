import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiAuthorizedSession } from "@/lib/auth/session";
import type {
  AdminVolunteerUpdatePayload,
  AdminVolunteerUpdateResponse,
} from "@/lib/admin/types";
import {
  isValidPhone,
  normalizePhone,
  normalizeWhitespace,
} from "@/lib/survey/normalizers";
import { createAdminClient } from "@/utils/supabase/admin";

const payloadSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim(),
});

interface VolunteerRouteContext {
  params: Promise<{
    volunteerId: string;
  }>;
}

export async function PATCH(request: Request, context: VolunteerRouteContext) {
  try {
    const session = await requireApiAuthorizedSession();

    if ("response" in session) {
      return session.response;
    }

    const { volunteerId } = await context.params;
    const payload = payloadSchema.safeParse(
      (await request.json()) satisfies AdminVolunteerUpdatePayload,
    );

    if (!payload.success) {
      return NextResponse.json(
        { error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizePhone(payload.data.phone);

    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: "กรุณากรอกเบอร์โทรให้ถูกต้อง" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: volunteer, error: volunteerError } = await supabase
      .from("volunteers")
      .update({
        full_name: normalizeWhitespace(payload.data.fullName),
        phone: normalizedPhone || null,
      })
      .eq("id", volunteerId)
      .select("id, full_name, phone, updated_at")
      .single();

    if (volunteerError || !volunteer) {
      const status = volunteerError?.code === "23505" ? 409 : 500;

      return NextResponse.json(
        {
          error:
            volunteerError?.code === "23505"
              ? "ชื่อ อสม. ซ้ำในหมู่เดียวกัน"
              : volunteerError?.message ?? "ไม่สามารถอัปเดตข้อมูล อสม. ได้",
        },
        { status },
      );
    }

    const response: AdminVolunteerUpdateResponse = {
      fullName: volunteer.full_name,
      id: volunteer.id,
      phone: volunteer.phone,
      updatedAt: volunteer.updated_at,
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
