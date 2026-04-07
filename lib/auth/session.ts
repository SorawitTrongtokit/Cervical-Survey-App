import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getEmailFromClaims, isAllowedEmail } from "@/lib/auth/config";
import type { Database } from "@/lib/database.types";
import { createServerClient } from "@/utils/supabase/server";

export interface AuthorizedSession {
  email: string;
  supabase: SupabaseClient<Database>;
  userId: string;
}

async function loadClaims() {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getClaims();

  return {
    claims: data?.claims ?? null,
    error,
    supabase,
  };
}

function userIdFromClaims(sub: unknown) {
  return typeof sub === "string" && sub.length > 0 ? sub : null;
}

export async function getOptionalAuthorizedSession(): Promise<AuthorizedSession | null> {
  const { claims, error, supabase } = await loadClaims();

  if (error || !claims) {
    return null;
  }

  const email = getEmailFromClaims(claims);
  const userId = userIdFromClaims(claims.sub);

  if (!email || !userId || !isAllowedEmail(email)) {
    return null;
  }

  return {
    email,
    supabase,
    userId,
  };
}

export async function requireAuthorizedSession() {
  const session = await getOptionalAuthorizedSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireApiAuthorizedSession():
  Promise<
    | AuthorizedSession
    | {
        response: NextResponse;
      }
  > {
  const session = await getOptionalAuthorizedSession();

  if (!session) {
    return {
      response: NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
        { status: 401 },
      ),
    };
  }

  return session;
}
