import type { JwtPayload } from "@supabase/supabase-js";

import { normalizeEmail } from "@/lib/auth/shared";

const PUBLIC_PATHS = new Set(["/login"]);

export function getAllowedEmails() {
  const raw = process.env.INTERNAL_ALLOWED_EMAILS ?? "";

  return new Set(
    raw
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map(normalizeEmail),
  );
}

export function isAllowedEmail(email: string) {
  return getAllowedEmails().has(normalizeEmail(email));
}

export function getEmailFromClaims(claims: JwtPayload | null | undefined) {
  return typeof claims?.email === "string" ? normalizeEmail(claims.email) : null;
}

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname);
}

export function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

export function sanitizeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
