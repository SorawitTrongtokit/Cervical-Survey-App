import type { ScreeningState } from "@/lib/survey/types";

export type AdminIntentStatus = "all" | "saved" | "unsaved";

export interface AdminFilters {
  intentStatus: AdminIntentStatus;
  screeningState: ScreeningState | "all";
  search: string;
  village: string;
  volunteerId: string;
}

export interface AdminCitizenRow {
  ageYears: number | null;
  assignedVolunteerId: string | null;
  assignedVolunteerName: string | null;
  fullName: string;
  hasIntent: boolean;
  houseNo: string | null;
  id: string;
  intentPhone: string;
  intentUpdatedAt: string | null;
  screeningState: ScreeningState;
  screeningStatusRaw: string;
  sourcePhone: string | null;
  sourceRow: number;
  updatedAt: string;
  villageCode: string;
}

export interface AdminVolunteerRow {
  assignedCitizenCount: number;
  fullName: string;
  id: string;
  intentCount: number;
  pendingCitizenCount: number;
  phone: string | null;
  updatedAt: string;
  villageCode: string;
}

export interface AdminStats {
  totalCitizens: number;
  totalCompleted: number;
  totalPending: number;
  totalSavedIntent: number;
  totalVolunteers: number;
  villages: string[];
}

export interface AdminDashboardData {
  citizens: AdminCitizenRow[];
  stats: AdminStats;
  volunteers: AdminVolunteerRow[];
}

export interface AdminCitizenUpdatePayload {
  assignedVolunteerId: string;
  intentPhone: string;
  screeningState: ScreeningState;
}

export interface AdminCitizenUpdateResponse {
  assignedVolunteerId: string | null;
  hasIntent: boolean;
  id: string;
  intentPhone: string;
  intentUpdatedAt: string | null;
  screeningState: ScreeningState;
  updatedAt: string;
}

export interface AdminVolunteerUpdatePayload {
  fullName: string;
  phone: string;
}

export interface AdminVolunteerUpdateResponse {
  fullName: string;
  id: string;
  phone: string | null;
  updatedAt: string;
}
