export type ScreeningState = "pending" | "completed";

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
  intentPhone: string;
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
  updatedAt: string;
  volunteerId: string;
}
