"use client";

import { useDeferredValue, useEffectEvent, useState, useTransition } from "react";

import { isValidPhone, normalizePhone } from "@/lib/survey/normalizers";
import { getSurveyStatus, type SurveyStatusKind } from "@/lib/survey/status";
import {
  SURVEY_INTENT_CHOICE_LABELS,
  type CitizenRow,
  type DashboardData,
  type SurveyIntentChoice,
  type SurveyIntentResponse,
  type VolunteerOption,
} from "@/lib/survey/types";

interface SummaryCardProps {
  label: string;
  tone: "accent" | "neutral" | "warm";
  value: string;
}

interface CitizenStatusView {
  className: string;
  kind: SurveyStatusKind;
  label: string;
}

function SummaryCard({ label, tone, value }: SummaryCardProps) {
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

function EmptySelectionState() {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--line-strong)] bg-white/55 px-6 py-14 text-center">
      <h2 className="text-2xl font-semibold">เริ่มจากเลือกหมู่และชื่อ อสม.</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--muted)] md:text-base">
        เมื่อเลือกครบแล้ว ระบบจะแสดงรายชื่อประชาชนที่อยู่ในความรับผิดชอบของ อสม.
        พร้อมสถานะเดียวที่อ่านง่ายและช่องบันทึกความประสงค์สำหรับรายที่ยังไม่ได้ตรวจ
      </p>
    </div>
  );
}

function NoCitizenState({ volunteer }: { volunteer: VolunteerOption | null }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--line-strong)] bg-white/55 px-6 py-14 text-center">
      <h2 className="text-2xl font-semibold">ไม่พบรายชื่อประชาชนในรายการนี้</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)] md:text-base">
        {volunteer
          ? `ยังไม่มีรายชื่อที่เชื่อมกับ ${volunteer.fullName}`
          : "กรุณาเลือกชื่อ อสม. เพื่อแสดงรายการ"}
      </p>
    </div>
  );
}

function getCitizenStatusView(citizen: CitizenRow): CitizenStatusView {
  const status = getSurveyStatus(citizen);

  return {
    className:
      status.kind === "pending"
        ? "font-semibold text-rose-600"
        : status.kind === "declined" || status.kind === "legacy"
          ? "font-semibold text-[var(--muted)]"
          : "font-semibold text-[var(--accent-deep)]",
    kind: status.kind,
    label: status.label,
  };
}

function StatusPill({ citizen }: { citizen: CitizenRow }) {
  const status = getCitizenStatusView(citizen);
  const pillClass =
    status.kind === "pending"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status.kind === "declined" || status.kind === "legacy"
        ? "border-[var(--line)] bg-white text-[var(--muted)]"
        : "border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent-deep)]";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${pillClass}`}>
      {status.label}
    </span>
  );
}

export function SurveyDashboard({ citizens, stats, volunteers }: DashboardData) {
  const [selectedVillage, setSelectedVillage] = useState("");
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [rows, setRows] = useState(citizens);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>(
    Object.fromEntries(citizens.map((citizen) => [citizen.id, citizen.intentPhone || ""])),
  );
  const [intentChoiceDrafts, setIntentChoiceDrafts] = useState<
    Record<string, SurveyIntentChoice | "">
  >(Object.fromEntries(citizens.map((citizen) => [citizen.id, citizen.intentChoice ?? ""])));
  const [errorByCitizenId, setErrorByCitizenId] = useState<Record<string, string>>({});
  const [savingCitizenId, setSavingCitizenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const deferredVolunteerId = useDeferredValue(selectedVolunteerId);
  const volunteerOptions = selectedVillage
    ? volunteers.filter((volunteer) => volunteer.villageCode === selectedVillage)
    : [];
  const selectedVolunteer =
    volunteerOptions.find((volunteer) => volunteer.id === selectedVolunteerId) ?? null;
  const visibleRows = deferredVolunteerId
    ? rows.filter((citizen) => citizen.assignedVolunteerId === deferredVolunteerId)
    : [];
  const totalPendingCount = rows.filter(
    (citizen) => getCitizenStatusView(citizen).kind === "pending",
  ).length;
  const totalSavedCount = rows.filter((citizen) => citizen.hasIntent).length;
  const visiblePendingCount = visibleRows.filter(
    (citizen) => getCitizenStatusView(citizen).kind === "pending",
  ).length;
  const visibleSavedCount = visibleRows.filter((citizen) => citizen.hasIntent).length;

  const saveIntent = useEffectEvent(async (citizen: CitizenRow) => {
    const intentChoice = intentChoiceDrafts[citizen.id] ?? "";
    const rawPhone = phoneDrafts[citizen.id] ?? "";
    const normalizedPhone = normalizePhone(rawPhone);

    if (!intentChoice) {
      setErrorByCitizenId((current) => ({
        ...current,
        [citizen.id]: "กรุณาเลือกความประสงค์",
      }));
      return;
    }

    if (!isValidPhone(normalizedPhone)) {
      setErrorByCitizenId((current) => ({
        ...current,
        [citizen.id]: "กรุณากรอกเบอร์โทรให้ครบถ้วน",
      }));
      return;
    }

    setSavingCitizenId(citizen.id);

    try {
      const response = await fetch("/api/survey-intents", {
        body: JSON.stringify({
          citizenId: citizen.id,
          contactPhone: normalizedPhone,
          intentChoice,
          volunteerId: selectedVolunteerId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json()) as SurveyIntentResponse | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload ? payload.error : "ไม่สามารถบันทึกข้อมูลได้",
        );
      }

      startTransition(() => {
        setRows((current) =>
          current.map((row) =>
            row.id === citizen.id
              ? {
                  ...row,
                  hasIntent: payload.hasIntent,
                  intentChoice: payload.intentChoice,
                  intentPhone: payload.contactPhone,
                  intentUpdatedAt: payload.updatedAt,
                }
              : row,
          ),
        );
        setIntentChoiceDrafts((current) => ({
          ...current,
          [citizen.id]: payload.intentChoice,
        }));
        setPhoneDrafts((current) => ({
          ...current,
          [citizen.id]: payload.contactPhone,
        }));
        setErrorByCitizenId((current) => ({
          ...current,
          [citizen.id]: "",
        }));
      });
    } catch (error) {
      setErrorByCitizenId((current) => ({
        ...current,
        [citizen.id]:
          error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้",
      }));
    } finally {
      setSavingCitizenId(null);
    }
  });

  function handlePhoneChange(citizenId: string, value: string) {
    setPhoneDrafts((current) => ({
      ...current,
      [citizenId]: value,
    }));
    setErrorByCitizenId((current) => ({
      ...current,
      [citizenId]: "",
    }));
  }

  function handleIntentChoiceChange(citizenId: string, value: SurveyIntentChoice | "") {
    setIntentChoiceDrafts((current) => ({
      ...current,
      [citizenId]: value,
    }));
    setErrorByCitizenId((current) => ({
      ...current,
      [citizenId]: "",
    }));
  }

  function renderActionCell(citizen: CitizenRow) {
    if (citizen.screeningState !== "pending") {
      return (
        <div className="text-sm font-medium text-[var(--muted)]">
          รายนี้มีประวัติการตรวจเดิมแล้ว
        </div>
      );
    }

    const draftIntentChoice = intentChoiceDrafts[citizen.id] ?? "";
    const draftPhone = phoneDrafts[citizen.id] ?? "";
    const isSaving = savingCitizenId === citizen.id;

    return (
      <div className="space-y-2">
        <div>
          <select
            className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            onChange={(event) =>
              handleIntentChoiceChange(citizen.id, event.target.value as SurveyIntentChoice | "")
            }
            value={draftIntentChoice}
          >
            <option value="">เลือกความประสงค์</option>
            {(Object.entries(SURVEY_INTENT_CHOICE_LABELS) as Array<
              [SurveyIntentChoice, string]
            >).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <input
            className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
            inputMode="tel"
            onChange={(event) => handlePhoneChange(citizen.id, event.target.value)}
            placeholder="กรอกเบอร์โทรติดต่อ"
            value={draftPhone}
          />
          {citizen.sourcePhone ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              เบอร์ในข้อมูลเดิม: {citizen.sourcePhone}
            </p>
          ) : null}
        </div>
        <button
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,118,110,0.2)] transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:bg-[rgba(94,112,120,0.35)]"
          disabled={isSaving}
          onClick={() => void saveIntent(citizen)}
          type="button"
        >
          {isSaving
            ? "กำลังบันทึก..."
            : citizen.hasIntent
              ? "อัปเดตความประสงค์"
              : "บันทึกความประสงค์"}
        </button>
        {errorByCitizenId[citizen.id] ? (
          <p className="text-xs font-medium text-rose-600">
            {errorByCitizenId[citizen.id]}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[34px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_22px_80px_rgba(23,49,58,0.08)] backdrop-blur md:p-8">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[rgba(15,118,110,0.12)] blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-44 w-44 rounded-full bg-[rgba(217,119,6,0.14)] blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="inline-flex rounded-full border border-[var(--line)] bg-white/75 px-4 py-1 text-sm font-semibold text-[var(--accent-deep)]">
                ใช้งานภายในองค์กร
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                สำรวจความต้องการตรวจมะเร็งปากมดลูกด้วยตัวเอง
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)] md:text-lg">
                เลือกหมู่ เลือกชื่อ อสม. แล้วดูสถานะรวมแบบคอลัมน์เดียว
                สำหรับรายที่ยังไม่ได้ตรวจสามารถบันทึกความประสงค์ได้ทันที
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <SummaryCard
                label="ประชาชนทั้งหมด"
                tone="neutral"
                value={stats.totalCitizens.toLocaleString("th-TH")}
              />
              <SummaryCard
                label="ยังไม่ได้ตรวจ"
                tone="warm"
                value={totalPendingCount.toLocaleString("th-TH")}
              />
              <SummaryCard
                label="บันทึกความประสงค์แล้ว"
                tone="accent"
                value={totalSavedCount.toLocaleString("th-TH")}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[0_18px_60px_rgba(23,49,58,0.07)] backdrop-blur md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--muted)]">เลือกหมู่</span>
              <select
                className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
                onChange={(event) => {
                  setSelectedVillage(event.target.value);
                  setSelectedVolunteerId("");
                }}
                value={selectedVillage}
              >
                <option value="">เลือกหมู่</option>
                {stats.villages.map((village) => (
                  <option key={village} value={village}>
                    หมู่ {village}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--muted)]">เลือกชื่อ อสม.</span>
              <select
                className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:bg-[rgba(94,112,120,0.08)]"
                disabled={!selectedVillage}
                onChange={(event) => setSelectedVolunteerId(event.target.value)}
                value={selectedVolunteerId}
              >
                <option value="">เลือกชื่อ อสม.</option>
                {volunteerOptions.map((volunteer) => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.fullName}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <SummaryCard
                label="แสดงอยู่"
                tone="neutral"
                value={visibleRows.length.toLocaleString("th-TH")}
              />
              <SummaryCard
                label="ยังไม่ได้ตรวจในรายการนี้"
                tone="warm"
                value={visiblePendingCount.toLocaleString("th-TH")}
              />
            </div>
          </div>

          {selectedVolunteer ? (
            <div className="mt-5 rounded-[26px] border border-[var(--line)] bg-white/70 px-5 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--muted)]">อสม. ที่เลือก</p>
                  <p className="text-xl font-semibold">{selectedVolunteer.fullName}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[var(--accent-deep)]">
                    หมู่ {selectedVillage}
                  </span>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                    ยังไม่ได้ตรวจ {visiblePendingCount.toLocaleString("th-TH")} ราย
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {!selectedVillage || !selectedVolunteerId ? (
          <EmptySelectionState />
        ) : visibleRows.length === 0 ? (
          <NoCitizenState volunteer={selectedVolunteer} />
        ) : (
          <section className="space-y-4">
            <div className="grid gap-4 md:hidden">
              {visibleRows.map((citizen, index) => {
                const status = getCitizenStatusView(citizen);

                return (
                  <article
                    className="rounded-[28px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 shadow-[0_14px_40px_rgba(23,49,58,0.05)]"
                    key={citizen.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                          ลำดับ {index + 1}
                        </p>
                        <h2 className="mt-2 text-xl font-semibold">{citizen.fullName}</h2>
                      </div>
                      <StatusPill citizen={citizen} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[var(--muted)]">
                      <div className="rounded-2xl bg-[rgba(23,49,58,0.04)] px-3 py-3">
                        <p className="font-medium text-[var(--page-ink)]">บ้านเลขที่</p>
                        <p>{citizen.houseNo || "-"}</p>
                      </div>
                      <div className="rounded-2xl bg-[rgba(23,49,58,0.04)] px-3 py-3">
                        <p className="font-medium text-[var(--page-ink)]">อายุ</p>
                        <p>{citizen.ageYears ? `${citizen.ageYears} ปี` : "-"}</p>
                      </div>
                      <div className="col-span-2 rounded-2xl bg-[rgba(23,49,58,0.04)] px-3 py-3">
                        <p className="font-medium text-[var(--page-ink)]">สถานะ</p>
                        <p className={status.className}>{status.label}</p>
                      </div>
                    </div>
                    <div className="mt-4">{renderActionCell(citizen)}</div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_16px_52px_rgba(23,49,58,0.05)] md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--line)] bg-[rgba(23,49,58,0.04)] text-left text-sm text-[var(--muted)]">
                      <th className="px-5 py-4 font-semibold">ลำดับ</th>
                      <th className="px-5 py-4 font-semibold">ชื่อ-สกุล</th>
                      <th className="px-5 py-4 font-semibold">บ้านเลขที่</th>
                      <th className="px-5 py-4 font-semibold">อายุ</th>
                      <th className="px-5 py-4 font-semibold">สถานะ</th>
                      <th className="px-5 py-4 font-semibold">บันทึกความประสงค์</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((citizen, index) => {
                      const status = getCitizenStatusView(citizen);

                      return (
                        <tr
                          className="border-b border-[var(--line)] align-top last:border-b-0"
                          key={citizen.id}
                        >
                          <td className="px-5 py-5 text-sm font-medium text-[var(--muted)]">
                            {index + 1}
                          </td>
                          <td className="px-5 py-5">
                            <p className="text-base font-semibold">{citizen.fullName}</p>
                          </td>
                          <td className="px-5 py-5 text-sm">{citizen.houseNo || "-"}</td>
                          <td className="px-5 py-5 text-sm">
                            {citizen.ageYears ? `${citizen.ageYears} ปี` : "-"}
                          </td>
                          <td className="px-5 py-5 text-sm">
                            <span className={status.className}>{status.label}</span>
                          </td>
                          <td className="min-w-[320px] px-5 py-5">{renderActionCell(citizen)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
