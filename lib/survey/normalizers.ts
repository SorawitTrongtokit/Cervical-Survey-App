import type { ScreeningState } from "@/lib/survey/types";

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeVillageCode(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return digits.padStart(2, "0").slice(-2);
}

export function normalizeThaiCitizenId(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function isValidPhone(value: string) {
  return /^0\d{8,9}$/.test(value);
}

export function parseAgeYears(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const match = String(value ?? "").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

export function excelSerialToDate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const excelEpoch = Date.UTC(1899, 11, 30);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch + value * millisecondsPerDay);

  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function deriveScreeningState(value: unknown): ScreeningState {
  return String(value ?? "").trim() === "ยังไม่ได้ตรวจ" ? "pending" : "completed";
}

export function buildFullName(...parts: Array<string | null | undefined>) {
  return normalizeWhitespace(parts.filter(Boolean).join(" "));
}

export function volunteerLookupKey(fullName: string, villageCode: string) {
  return `${normalizeWhitespace(fullName).toLowerCase()}::${normalizeVillageCode(villageCode)}`;
}
