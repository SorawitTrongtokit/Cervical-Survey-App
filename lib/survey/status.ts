import type { ScreeningState, SurveyIntentChoice } from "@/lib/survey/types";

export type SurveyStatusKind = "completed" | "declined" | "legacy" | "pending";

export interface SurveyStatusInput {
  hasIntent: boolean;
  intentChoice: SurveyIntentChoice | null;
  intentUpdatedAt: string | null;
  screeningState: ScreeningState;
  screeningStatusRaw: string;
}

export interface SurveyStatusView {
  kind: SurveyStatusKind;
  label: string;
}

export const CLINIC_SELF_SCREENING_LABEL = "ตรวจแล้ว 22 เม.ย. 69";
export const DECLINED_SCREENING_LABEL = "ไม่ต้องการตรวจ";
export const LEGACY_INTENT_LABEL = "มีการบันทึกเดิม";
export const PENDING_SCREENING_LABEL = "ยังไม่ได้ตรวจ";

function hasSourceDate(value: string) {
  const normalized = value.trim();

  return (
    normalized.length > 0 &&
    normalized !== "#N/A" &&
    normalized !== PENDING_SCREENING_LABEL
  );
}

export function formatIntentCompletedLabel(value: string | null) {
  if (!value) {
    return "ตรวจแล้ว";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "ตรวจแล้ว";
  }

  return `ตรวจแล้ว ${new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
    year: "2-digit",
  }).format(date)}`;
}

export function getSurveyStatus(input: SurveyStatusInput): SurveyStatusView {
  if (input.intentChoice === "home_self_screening") {
    return {
      kind: "completed",
      label: formatIntentCompletedLabel(input.intentUpdatedAt),
    };
  }

  if (input.intentChoice === "clinic_self_screening") {
    return {
      kind: "completed",
      label: CLINIC_SELF_SCREENING_LABEL,
    };
  }

  if (input.intentChoice === "declined_screening") {
    return {
      kind: "declined",
      label: DECLINED_SCREENING_LABEL,
    };
  }

  if (input.screeningState === "completed") {
    const sourceStatus = input.screeningStatusRaw.trim();
    const sourceDate = hasSourceDate(sourceStatus) ? ` ${sourceStatus}` : "";

    return {
      kind: "completed",
      label: `ตรวจแล้ว/มีประวัติเดิม${sourceDate}`,
    };
  }

  if (input.hasIntent) {
    return {
      kind: "legacy",
      label: LEGACY_INTENT_LABEL,
    };
  }

  return {
    kind: "pending",
    label: PENDING_SCREENING_LABEL,
  };
}

export function hasSurveyStatusKind(input: SurveyStatusInput, kind: SurveyStatusKind) {
  return getSurveyStatus(input).kind === kind;
}
