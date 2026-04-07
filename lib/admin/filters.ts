import type {
  AdminCitizenRow,
  AdminDashboardData,
  AdminFilters,
  AdminVolunteerRow,
} from "@/lib/admin/types";
import { normalizePhone, normalizeWhitespace } from "@/lib/survey/normalizers";
import { hasSurveyStatusKind } from "@/lib/survey/status";

export const DEFAULT_ADMIN_FILTERS: AdminFilters = {
  intentStatus: "all",
  screeningState: "all",
  search: "",
  village: "",
  volunteerId: "",
};

type SearchParamsLike = {
  get(name: string): string | null;
};

function normalizeSearch(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

function matchesSearch(row: AdminCitizenRow, search: string) {
  if (!search) {
    return true;
  }

  const normalizedDigits = normalizePhone(search);
  const haystacks = [
    row.fullName,
    row.houseNo ?? "",
    row.sourcePhone ?? "",
    row.intentPhone,
    row.assignedVolunteerName ?? "",
    row.villageCode,
  ]
    .join(" ")
    .toLowerCase();

  return haystacks.includes(search) || (normalizedDigits ? haystacks.includes(normalizedDigits) : false);
}

function matchesVolunteerSearch(row: AdminVolunteerRow, search: string) {
  if (!search) {
    return true;
  }

  const normalizedDigits = normalizePhone(search);
  const haystacks = [row.fullName, row.phone ?? "", row.villageCode].join(" ").toLowerCase();

  return haystacks.includes(search) || (normalizedDigits ? haystacks.includes(normalizedDigits) : false);
}

export function parseAdminFilters(searchParams: SearchParamsLike): AdminFilters {
  const intentStatus = searchParams.get("intentStatus");
  const screeningState = searchParams.get("screeningState");

  return {
    intentStatus:
      intentStatus === "saved" || intentStatus === "unsaved" ? intentStatus : "all",
    screeningState:
      screeningState === "pending" ||
      screeningState === "completed" ||
      screeningState === "declined" ||
      screeningState === "legacy"
        ? screeningState
        : "all",
    search: searchParams.get("search")?.trim() ?? "",
    village: searchParams.get("village")?.trim() ?? "",
    volunteerId: searchParams.get("volunteerId")?.trim() ?? "",
  };
}

export function filterAdminCitizens(rows: AdminCitizenRow[], filters: AdminFilters) {
  const search = normalizeSearch(filters.search);

  return rows.filter((row) => {
    if (filters.village && row.villageCode !== filters.village) {
      return false;
    }

    if (filters.volunteerId && row.assignedVolunteerId !== filters.volunteerId) {
      return false;
    }

    if (
      filters.screeningState !== "all" &&
      !hasSurveyStatusKind(row, filters.screeningState)
    ) {
      return false;
    }

    if (filters.intentStatus === "saved" && !row.hasIntent) {
      return false;
    }

    if (filters.intentStatus === "unsaved" && row.hasIntent) {
      return false;
    }

    return matchesSearch(row, search);
  });
}

export function filterAdminVolunteers(
  rows: AdminVolunteerRow[],
  filters: AdminFilters,
) {
  const search = normalizeSearch(filters.search);

  return rows.filter((row) => {
    if (filters.village && row.villageCode !== filters.village) {
      return false;
    }

    if (!matchesVolunteerSearch(row, search)) {
      return false;
    }

    if (filters.volunteerId && row.id !== filters.volunteerId) {
      return false;
    }

    return true;
  });
}

export function buildFilteredAdminDataset(
  data: AdminDashboardData,
  filters: AdminFilters,
) {
  const citizens = filterAdminCitizens(data.citizens, filters);
  const volunteers = filterAdminVolunteers(data.volunteers, filters);

  return {
    citizens,
    stats: {
      totalCitizens: citizens.length,
      totalCompleted: citizens.filter((row) => hasSurveyStatusKind(row, "completed")).length,
      totalDeclined: citizens.filter((row) => hasSurveyStatusKind(row, "declined")).length,
      totalLegacyIntent: citizens.filter((row) => hasSurveyStatusKind(row, "legacy")).length,
      totalPending: citizens.filter((row) => hasSurveyStatusKind(row, "pending")).length,
      totalSavedIntent: citizens.filter((row) => row.hasIntent).length,
      totalVolunteers: volunteers.length,
      villages: data.stats.villages,
    },
    volunteers,
  };
}

export function createAdminFilterSearchParams(filters: AdminFilters) {
  const searchParams = new URLSearchParams();

  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  if (filters.village) {
    searchParams.set("village", filters.village);
  }

  if (filters.volunteerId) {
    searchParams.set("volunteerId", filters.volunteerId);
  }

  if (filters.screeningState !== "all") {
    searchParams.set("screeningState", filters.screeningState);
  }

  if (filters.intentStatus !== "all") {
    searchParams.set("intentStatus", filters.intentStatus);
  }

  return searchParams;
}
