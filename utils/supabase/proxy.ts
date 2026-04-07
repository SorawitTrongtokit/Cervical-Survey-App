import { createServerClient } from "@supabase/ssr";
import type { JwtPayload } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import type { SupabaseDatabase } from "@/utils/supabase/config";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/utils/supabase/config";

export async function updateSession(request: NextRequest): Promise<{
  claims: JwtPayload | null;
  response: NextResponse;
}> {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<SupabaseDatabase>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, options, value }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  response.headers.set("Cache-Control", "private, no-store");

  return {
    claims: data?.claims ?? null,
    response,
  };
}
