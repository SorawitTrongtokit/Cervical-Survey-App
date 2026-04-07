export type ScreeningState = "pending" | "completed";
export const SURVEY_INTENT_CHOICES = [
  "home_self_screening",
  "clinic_self_screening",
  "declined_screening",
] as const;

export type SurveyIntentChoice = (typeof SURVEY_INTENT_CHOICES)[number];

export const SURVEY_INTENT_CHOICE_LABELS: Record<SurveyIntentChoice, string> = {
  home_self_screening: "ตรวจด้วยตัวเองที่บ้าน",
  clinic_self_screening: "ตรวจด้วยตัวเองที่อนามัย (22 เม.ย. 69)",
  declined_screening: "ไม่ต้องการตรวจ",
};

export function parseSurveyIntentChoice(value: string | null | undefined) {
  return value && value in SURVEY_INTENT_CHOICE_LABELS
    ? (value as SurveyIntentChoice)
    : null;
}

export interface VolunteerOption {
  id: string;
  fullName: string;
  phone: string | null;
  villageCode: string;
}

export interface CitizenRow {
  ageYears: number | null;
  assignedVolunteerId: string | null;
  fullName: string;
  hasIntent: boolean;
  houseNo: string | null;
  id: string;
  intentChoice: SurveyIntentChoice | null;
  intentPhone: string;
  intentUpdatedAt: string | null;
  screeningState: ScreeningState;
  screeningStatusRaw: string;
  sourcePhone: string | null;
  sourceRow: number;
}

export interface DashboardStats {
  savedIntentCount: number;
  totalCitizens: number;
  totalCompleted: number;
  totalPending: number;
  villages: string[];
}

export interface DashboardData {
  citizens: CitizenRow[];
  stats: DashboardStats;
  volunteers: VolunteerOption[];
}

export interface SurveyIntentResponse {
  citizenId: string;
  contactPhone: string;
  hasIntent: true;
  intentChoice: SurveyIntentChoice;
  updatedAt: string;
  volunteerId: string;
}
