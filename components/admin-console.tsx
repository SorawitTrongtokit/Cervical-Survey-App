"use client";

import { useDeferredValue, useEffectEvent, useState, useTransition } from "react";

import {
  buildFilteredAdminDataset,
  createAdminFilterSearchParams,
  DEFAULT_ADMIN_FILTERS,
} from "@/lib/admin/filters";
import type {
  AdminCitizenRow,
  AdminCitizenUpdateResponse,
  AdminDashboardData,
  AdminFilters,
  AdminVolunteerRow,
  AdminVolunteerUpdateResponse,
} from "@/lib/admin/types";
import { isValidPhone, normalizePhone } from "@/lib/survey/normalizers";

interface AdminConsoleProps {
  data: AdminDashboardData;
}

function SummaryCard({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "accent" | "neutral" | "warm";
  value: string;
}) {
  const toneClass =
    tone === "accent"
      ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
      : tone === "warm"
        ? "bg-[rgba(217,119,6,0.12)] text-[var(--warm)]"
        : "bg-white/70 text-[var(--page-ink)]";

  return (
    <div className={`rounded-[24px] border border-[var(--line)] px-4 py-4 ${toneClass}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ citizen }: { citizen: AdminCitizenRow }) {
  if (citizen.screeningState === "completed") {
    return (
      <span className="inline-flex rounded-full border border-[var(--line)] bg-[rgba(94,112,120,0.12)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
        ตรวจแล้ว
      </span>
    );
  }

  if (citizen.hasIntent) {
    return (
      <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-deep)]">
        มีความประสงค์
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-[var(--line)] bg-[rgba(217,119,6,0.12)] px-3 py-1 text-xs font-semibold text-[var(--warm)]">
      รอสำรวจ
    </span>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function buildVolunteerRows(
  volunteers: AdminVolunteerRow[],
  citizens: AdminCitizenRow[],
): AdminVolunteerRow[] {
  return volunteers.map((volunteer) => {
    const assignedCitizens = citizens.filter(
      (citizen) => citizen.assignedVolunteerId === volunteer.id,
    );

    return {
      ...volunteer,
      assignedCitizenCount: assignedCitizens.length,
      intentCount: assignedCitizens.filter((citizen) => citizen.hasIntent).length,
      pendingCitizenCount: assignedCitizens.filter(
        (citizen) => citizen.screeningState === "pending",
      ).length,
    };
  });
}

function buildStats(
  citizens: AdminCitizenRow[],
  volunteers: AdminVolunteerRow[],
  villages: string[],
) {
  return {
    totalCitizens: citizens.length,
    totalCompleted: citizens.filter((citizen) => citizen.screeningState === "completed")
      .length,
    totalPending: citizens.filter((citizen) => citizen.screeningState === "pending").length,
    totalSavedIntent: citizens.filter((citizen) => citizen.hasIntent).length,
    totalVolunteers: volunteers.length,
    villages,
  };
}

export function AdminConsole({ data }: AdminConsoleProps) {
  const [filters, setFilters] = useState<AdminFilters>(DEFAULT_ADMIN_FILTERS);
  const [citizens, setCitizens] = useState(data.citizens);
  const [volunteers, setVolunteers] = useState(data.volunteers);
  const [citizenDrafts, setCitizenDrafts] = useState(() =>
    Object.fromEntries(
      data.citizens.map((citizen) => [
        citizen.id,
        {
          assignedVolunteerId: citizen.assignedVolunteerId ?? "",
          intentPhone: citizen.intentPhone,
          screeningState: citizen.screeningState,
        },
      ]),
    ),
  );
  const [volunteerDrafts, setVolunteerDrafts] = useState(() =>
    Object.fromEntries(
      data.volunteers.map((volunteer) => [
        volunteer.id,
        {
          fullName: volunteer.fullName,
          phone: volunteer.phone ?? "",
        },
      ]),
    ),
  );
  const [citizenErrors, setCitizenErrors] = useState<Record<string, string>>({});
  const [citizenMessages, setCitizenMessages] = useState<Record<string, string>>({});
  const [volunteerErrors, setVolunteerErrors] = useState<Record<string, string>>({});
  const [volunteerMessages, setVolunteerMessages] = useState<Record<string, string>>({});
  const [savingCitizenId, setSavingCitizenId] = useState<string | null>(null);
  const [savingVolunteerId, setSavingVolunteerId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const deferredSearch = useDeferredValue(filters.search);
  const computedVolunteers = buildVolunteerRows(volunteers, citizens);
  const fullData = {
    citizens,
    stats: buildStats(citizens, computedVolunteers, data.stats.villages),
    volunteers: computedVolunteers,
  };
  const filtered = buildFilteredAdminDataset(fullData, {
    ...filters,
    search: deferredSearch,
  });
  const exportQuery = createAdminFilterSearchParams({
    ...filters,
    search: deferredSearch,
  }).toString();
  const filteredVolunteerOptions = filters.village
    ? computedVolunteers.filter((volunteer) => volunteer.villageCode === filters.village)
    : computedVolunteers;

  const saveCitizen = useEffectEvent(async (citizen: AdminCitizenRow) => {
    const draft = citizenDrafts[citizen.id];

    if (!draft) {
      return;
    }

    const normalizedPhone = normalizePhone(draft.intentPhone);

    setCitizenErrors((current) => ({ ...current, [citizen.id]: "" }));
    setCitizenMessages((current) => ({ ...current, [citizen.id]: "" }));

    if (!draft.assignedVolunteerId) {
      setCitizenErrors((current) => ({
        ...current,
        [citizen.id]: "กรุณาเลือก อสม. ก่อนบันทึก",
      }));
      return;
    }

    if (
      draft.screeningState === "pending" &&
      normalizedPhone.length > 0 &&
      !isValidPhone(normalizedPhone)
    ) {
      setCitizenErrors((current) => ({
        ...current,
        [citizen.id]: "กรุณากรอกเบอร์โทรให้ถูกต้อง",
      }));
      return;
    }

    setSavingCitizenId(citizen.id);

    try {
      const response = await fetch(`/api/admin/citizens/${citizen.id}`, {
        body: JSON.stringify({
          assignedVolunteerId: draft.assignedVolunteerId,
          intentPhone: draft.screeningState === "completed" ? "" : normalizedPhone,
          screeningState: draft.screeningState,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const payload =
        (await response.json()) as AdminCitizenUpdateResponse | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload ? payload.error : "ไม่สามารถบันทึกข้อมูลได้",
        );
      }

      const assignedVolunteer =
        computedVolunteers.find((volunteer) => volunteer.id === payload.assignedVolunteerId) ??
        null;

      startTransition(() => {
        setCitizens((current) =>
          current.map((row) =>
            row.id === citizen.id
              ? {
                  ...row,
                  assignedVolunteerId: payload.assignedVolunteerId,
                  assignedVolunteerName: assignedVolunteer?.fullName ?? null,
                  hasIntent: payload.hasIntent,
                  intentPhone: payload.intentPhone,
                  intentUpdatedAt: payload.intentUpdatedAt,
                  screeningState: payload.screeningState,
                  updatedAt: payload.updatedAt,
                }
              : row,
          ),
        );
        setCitizenDrafts((current) => ({
          ...current,
          [citizen.id]: {
            assignedVolunteerId: payload.assignedVolunteerId ?? "",
            intentPhone: payload.intentPhone,
            screeningState: payload.screeningState,
          },
        }));
        setCitizenMessages((current) => ({
          ...current,
          [citizen.id]: "บันทึกแล้ว",
        }));
      });
    } catch (error) {
      setCitizenErrors((current) => ({
        ...current,
        [citizen.id]:
          error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้",
      }));
    } finally {
      setSavingCitizenId(null);
    }
  });

  const saveVolunteer = useEffectEvent(async (volunteer: AdminVolunteerRow) => {
    const draft = volunteerDrafts[volunteer.id];

    if (!draft) {
      return;
    }

    const normalizedPhone = normalizePhone(draft.phone);

    setVolunteerErrors((current) => ({ ...current, [volunteer.id]: "" }));
    setVolunteerMessages((current) => ({ ...current, [volunteer.id]: "" }));

    if (!draft.fullName.trim()) {
      setVolunteerErrors((current) => ({
        ...current,
        [volunteer.id]: "กรุณากรอกชื่อ อสม.",
      }));
      return;
    }

    if (normalizedPhone.length > 0 && !isValidPhone(normalizedPhone)) {
      setVolunteerErrors((current) => ({
        ...current,
        [volunteer.id]: "กรุณากรอกเบอร์โทรให้ถูกต้อง",
      }));
      return;
    }

    setSavingVolunteerId(volunteer.id);

    try {
      const response = await fetch(`/api/admin/volunteers/${volunteer.id}`, {
        body: JSON.stringify({
          fullName: draft.fullName,
          phone: normalizedPhone,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const payload =
        (await response.json()) as AdminVolunteerUpdateResponse | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload ? payload.error : "ไม่สามารถบันทึกข้อมูล อสม. ได้",
        );
      }

      startTransition(() => {
        setVolunteers((current) =>
          current.map((row) =>
            row.id === volunteer.id
              ? {
                  ...row,
                  fullName: payload.fullName,
                  phone: payload.phone,
                  updatedAt: payload.updatedAt,
                }
              : row,
          ),
        );
        setCitizens((current) =>
          current.map((row) =>
            row.assignedVolunteerId === volunteer.id
              ? {
                  ...row,
                  assignedVolunteerName: payload.fullName,
                }
              : row,
          ),
        );
        setVolunteerDrafts((current) => ({
          ...current,
          [volunteer.id]: {
            fullName: payload.fullName,
            phone: payload.phone ?? "",
          },
        }));
        setVolunteerMessages((current) => ({
          ...current,
          [volunteer.id]: "บันทึกแล้ว",
        }));
      });
    } catch (error) {
      setVolunteerErrors((current) => ({
        ...current,
        [volunteer.id]:
          error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้",
      }));
    } finally {
      setSavingVolunteerId(null);
    }
  });

  function updateFilter<Key extends keyof AdminFilters>(key: Key, value: AdminFilters[Key]) {
    setFilters((current) => {
      if (key === "village") {
        return {
          ...current,
          village: value as string,
          volunteerId:
            current.volunteerId &&
            computedVolunteers.some(
              (volunteer) =>
                volunteer.id === current.volunteerId &&
                volunteer.villageCode === value,
            )
              ? current.volunteerId
              : "",
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  function updateCitizenDraft(
    citizenId: string,
    field: "assignedVolunteerId" | "intentPhone" | "screeningState",
    value: string,
  ) {
    setCitizenDrafts((current) => ({
      ...current,
      [citizenId]: {
        ...current[citizenId],
        [field]: value,
        ...(field === "screeningState" && value === "completed" ? { intentPhone: "" } : {}),
      },
    }));
    setCitizenErrors((current) => ({ ...current, [citizenId]: "" }));
    setCitizenMessages((current) => ({ ...current, [citizenId]: "" }));
  }

  function updateVolunteerDraft(
    volunteerId: string,
    field: "fullName" | "phone",
    value: string,
  ) {
    setVolunteerDrafts((current) => ({
      ...current,
      [volunteerId]: {
        ...current[volunteerId],
        [field]: value,
      },
    }));
    setVolunteerErrors((current) => ({ ...current, [volunteerId]: "" }));
    setVolunteerMessages((current) => ({ ...current, [volunteerId]: "" }));
  }

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[34px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_22px_80px_rgba(23,49,58,0.08)] backdrop-blur md:p-8">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[rgba(15,118,110,0.12)] blur-3xl" />
        <div className="absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-[rgba(217,119,6,0.14)] blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="inline-flex rounded-full border border-[var(--line)] bg-white/75 px-4 py-1 text-sm font-semibold text-[var(--accent-deep)]">
              Admin Workspace
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              จัดการข้อมูลภาคสนามและส่งออกรายงานจากจุดเดียว
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)] md:text-lg">
              ใช้สำหรับเจ้าหน้าที่หน่วยงานในการตรวจสอบข้อมูลประชาชน แก้ไขผู้รับผิดชอบ
              ปรับสถานะในระบบ ดูภาพรวมรายหมู่ และส่งออกข้อมูลที่พร้อมใช้งานต่อ
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard
              label="ประชาชนที่แสดง"
              tone="neutral"
              value={filtered.stats.totalCitizens.toLocaleString("th-TH")}
            />
            <SummaryCard
              label="รอการตรวจ"
              tone="warm"
              value={filtered.stats.totalPending.toLocaleString("th-TH")}
            />
            <SummaryCard
              label="มีความประสงค์"
              tone="accent"
              value={filtered.stats.totalSavedIntent.toLocaleString("th-TH")}
            />
            <SummaryCard
              label="อสม.ที่แสดง"
              tone="neutral"
              value={filtered.stats.totalVolunteers.toLocaleString("th-TH")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[0_18px_60px_rgba(23,49,58,0.07)] backdrop-blur md:p-6">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr_auto]">
          <input
            className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="ค้นหาจากชื่อ, บ้านเลขที่, เบอร์ หรือ อสม."
            value={filters.search}
          />
          <select
            className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            onChange={(event) => updateFilter("village", event.target.value)}
            value={filters.village}
          >
            <option value="">ทุกหมู่</option>
            {data.stats.villages.map((village) => (
              <option key={village} value={village}>
                หมู่ {village}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            onChange={(event) => updateFilter("volunteerId", event.target.value)}
            value={filters.volunteerId}
          >
            <option value="">ทุก อสม.</option>
            {filteredVolunteerOptions.map((volunteer) => (
              <option key={volunteer.id} value={volunteer.id}>
                หมู่ {volunteer.villageCode} • {volunteer.fullName}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            onChange={(event) =>
              updateFilter("screeningState", event.target.value as AdminFilters["screeningState"])
            }
            value={filters.screeningState}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="pending">pending</option>
            <option value="completed">completed</option>
          </select>
          <select
            className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            onChange={(event) =>
              updateFilter("intentStatus", event.target.value as AdminFilters["intentStatus"])
            }
            value={filters.intentStatus}
          >
            <option value="all">ทุกความประสงค์</option>
            <option value="saved">มีความประสงค์</option>
            <option value="unsaved">ยังไม่มีความประสงค์</option>
          </select>
          <a
            className="inline-flex items-center justify-center rounded-2xl bg-[var(--page-ink)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)]"
            href={exportQuery ? `/api/admin/export?${exportQuery}` : "/api/admin/export"}
          >
            Export Excel
          </a>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">จัดการข้อมูลประชาชน</h2>
          <p className="text-sm leading-7 text-[var(--muted)]">
            กำลังแสดง {filtered.citizens.length.toLocaleString("th-TH")} ราย จากทั้งหมด{" "}
            {citizens.length.toLocaleString("th-TH")} ราย
          </p>
        </div>

        <div className="grid gap-4">
          {filtered.citizens.map((citizen, index) => {
            const draft = citizenDrafts[citizen.id];
            const isSaving = savingCitizenId === citizen.id;

            return (
              <article
                className="rounded-[28px] border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[0_14px_40px_rgba(23,49,58,0.05)]"
                key={citizen.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      ลำดับ {index + 1} • หมู่ {citizen.villageCode}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">{citizen.fullName}</h3>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                      <span>บ้านเลขที่ {citizen.houseNo || "-"}</span>
                      <span>อายุ {citizen.ageYears ? `${citizen.ageYears} ปี` : "-"}</span>
                      <span>ต้นทาง {citizen.screeningStatusRaw}</span>
                    </div>
                  </div>
                  <StatusBadge citizen={citizen} />
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_1fr_auto]">
                  <select
                    className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                    onChange={(event) =>
                      updateCitizenDraft(citizen.id, "assignedVolunteerId", event.target.value)
                    }
                    value={draft?.assignedVolunteerId ?? ""}
                  >
                    <option value="">เลือก อสม.</option>
                    {computedVolunteers.map((volunteer) => (
                      <option key={volunteer.id} value={volunteer.id}>
                        หมู่ {volunteer.villageCode} • {volunteer.fullName}
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                    onChange={(event) =>
                      updateCitizenDraft(citizen.id, "screeningState", event.target.value)
                    }
                    value={draft?.screeningState ?? citizen.screeningState}
                  >
                    <option value="pending">pending</option>
                    <option value="completed">completed</option>
                  </select>
                  <input
                    className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:bg-[rgba(94,112,120,0.08)]"
                    disabled={(draft?.screeningState ?? citizen.screeningState) === "completed"}
                    inputMode="tel"
                    onChange={(event) =>
                      updateCitizenDraft(citizen.id, "intentPhone", event.target.value)
                    }
                    placeholder="เบอร์ที่ติดตาม"
                    value={draft?.intentPhone ?? citizen.intentPhone}
                  />
                  <button
                    className="inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,118,110,0.18)] transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:bg-[rgba(94,112,120,0.35)]"
                    disabled={isSaving}
                    onClick={() => void saveCitizen(citizen)}
                    type="button"
                  >
                    {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
                  <span>เบอร์ต้นทาง: {citizen.sourcePhone || "-"}</span>
                  <span>อัปเดตล่าสุด: {formatDateTime(citizen.intentUpdatedAt ?? citizen.updatedAt)}</span>
                </div>

                {citizenMessages[citizen.id] ? (
                  <p className="mt-3 text-xs font-semibold text-[var(--accent-deep)]">
                    {citizenMessages[citizen.id]}
                  </p>
                ) : null}
                {citizenErrors[citizen.id] ? (
                  <p className="mt-3 text-xs font-medium text-rose-600">
                    {citizenErrors[citizen.id]}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">จัดการข้อมูล อสม.</h2>
          <p className="text-sm leading-7 text-[var(--muted)]">
            แก้ชื่อและเบอร์โทร พร้อมดูภาระงานแต่ละคน
          </p>
        </div>

        <div className="grid gap-4">
          {filtered.volunteers.map((volunteer) => {
            const draft = volunteerDrafts[volunteer.id];
            const isSaving = savingVolunteerId === volunteer.id;

            return (
              <article
                className="rounded-[28px] border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[0_14px_40px_rgba(23,49,58,0.05)]"
                key={volunteer.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      หมู่ {volunteer.villageCode}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">{volunteer.fullName}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-2xl bg-[rgba(23,49,58,0.04)] px-3 py-3">
                      <p className="font-semibold">{volunteer.assignedCitizenCount.toLocaleString("th-TH")}</p>
                      <p className="mt-1 text-[var(--muted)]">ประชาชน</p>
                    </div>
                    <div className="rounded-2xl bg-[rgba(217,119,6,0.08)] px-3 py-3">
                      <p className="font-semibold">{volunteer.pendingCitizenCount.toLocaleString("th-TH")}</p>
                      <p className="mt-1 text-[var(--muted)]">รอการตรวจ</p>
                    </div>
                    <div className="rounded-2xl bg-[var(--accent-soft)] px-3 py-3 text-[var(--accent-deep)]">
                      <p className="font-semibold">{volunteer.intentCount.toLocaleString("th-TH")}</p>
                      <p className="mt-1">มีความประสงค์</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr_auto]">
                  <input
                    className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                    onChange={(event) =>
                      updateVolunteerDraft(volunteer.id, "fullName", event.target.value)
                    }
                    placeholder="ชื่อ-สกุล อสม."
                    value={draft?.fullName ?? volunteer.fullName}
                  />
                  <input
                    className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                    inputMode="tel"
                    onChange={(event) =>
                      updateVolunteerDraft(volunteer.id, "phone", event.target.value)
                    }
                    placeholder="เบอร์โทร"
                    value={draft?.phone ?? volunteer.phone ?? ""}
                  />
                  <button
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm font-semibold text-[var(--page-ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isSaving}
                    onClick={() => void saveVolunteer(volunteer)}
                    type="button"
                  >
                    {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>

                <p className="mt-3 text-xs text-[var(--muted)]">
                  อัปเดตล่าสุด: {formatDateTime(volunteer.updatedAt)}
                </p>

                {volunteerMessages[volunteer.id] ? (
                  <p className="mt-3 text-xs font-semibold text-[var(--accent-deep)]">
                    {volunteerMessages[volunteer.id]}
                  </p>
                ) : null}
                {volunteerErrors[volunteer.id] ? (
                  <p className="mt-3 text-xs font-medium text-rose-600">
                    {volunteerErrors[volunteer.id]}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
