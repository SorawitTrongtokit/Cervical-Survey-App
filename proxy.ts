import { NextResponse, type NextRequest } from "next/server";

import {
  getEmailFromClaims,
  isAllowedEmail,
} from "@/lib/auth/config";
import { updateSession } from "@/utils/supabase/proxy";

function unauthorizedApi(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isProtectedPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isProtectedApiPath(pathname: string) {
  return pathname.startsWith("/api/admin");
}

function redirectToLogin(request: NextRequest, reason?: "unauthorized") {
  const loginUrl = request.nextUrl.clone();
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", nextPath);

  if (reason) {
    loginUrl.searchParams.set("reason", reason);
  }

  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { claims, response } = await updateSession(request);

  if (!isProtectedPath(pathname) && !isProtectedApiPath(pathname)) {
    return response;
  }

  if (!claims) {
    return isProtectedApiPath(pathname)
      ? unauthorizedApi("กรุณาเข้าสู่ระบบก่อนใช้งาน", 401)
      : redirectToLogin(request);
  }

  const email = getEmailFromClaims(claims);

  if (!email || !isAllowedEmail(email)) {
    return isProtectedApiPath(pathname)
      ? unauthorizedApi("บัญชีนี้ไม่มีสิทธิ์ใช้งานระบบ", 403)
      : redirectToLogin(request, "unauthorized");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
