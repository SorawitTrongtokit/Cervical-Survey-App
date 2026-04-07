import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { getAdminDashboardData } from "@/lib/admin/data";
import { buildFilteredAdminDataset, parseAdminFilters } from "@/lib/admin/filters";
import { requireApiAuthorizedSession } from "@/lib/auth/session";

export const runtime = "nodejs";

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

function yesNo(value: boolean) {
  return value ? "มี" : "ไม่มี";
}

export async function GET(request: Request) {
  const session = await requireApiAuthorizedSession();

  if ("response" in session) {
    return session.response;
  }

  const { data, error } = await getAdminDashboardData();

  if (error || !data) {
    return NextResponse.json(
      { error: error ?? "โหลดข้อมูลสำหรับ export ไม่สำเร็จ" },
      { status: 500 },
    );
  }

  const filters = parseAdminFilters(new URL(request.url).searchParams);
  const filtered = buildFilteredAdminDataset(data, filters);
  const volunteerName =
    filters.volunteerId
      ? data.volunteers.find((row) => row.id === filters.volunteerId)?.fullName ?? "-"
      : "ทั้งหมด";

  const villageSummary = filtered.stats.villages.map((villageCode) => {
    const rows = filtered.citizens.filter((citizen) => citizen.villageCode === villageCode);

    return [
      villageCode,
      rows.length,
      rows.filter((citizen) => citizen.screeningState === "pending").length,
      rows.filter((citizen) => citizen.screeningState === "completed").length,
      rows.filter((citizen) => citizen.hasIntent).length,
    ];
  });

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["รายงานส่งออกจากหน้า admin"],
    ["สร้างเมื่อ", formatDateTime(new Date().toISOString())],
    ["คำค้นหา", filters.search || "ทั้งหมด"],
    ["หมู่", filters.village || "ทั้งหมด"],
    ["อสม.", volunteerName],
    ["สถานะการตรวจ", filters.screeningState === "all" ? "ทั้งหมด" : filters.screeningState],
    ["สถานะความประสงค์", filters.intentStatus],
    [],
    ["ประชาชนที่แสดง", filtered.stats.totalCitizens],
    ["รอการตรวจ", filtered.stats.totalPending],
    ["ตรวจแล้ว", filtered.stats.totalCompleted],
    ["มีความประสงค์", filtered.stats.totalSavedIntent],
    ["อสม.ที่แสดง", filtered.stats.totalVolunteers],
    [],
    ["หมู่", "ประชาชนทั้งหมด", "รอการตรวจ", "ตรวจแล้ว", "มีความประสงค์"],
    ...villageSummary,
  ]);

  summarySheet["!cols"] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];

  const citizensSheet = XLSX.utils.json_to_sheet(
    filtered.citizens.map((citizen) => ({
      "หมู่": citizen.villageCode,
      "อสม.": citizen.assignedVolunteerName ?? "-",
      "ชื่อ-สกุล": citizen.fullName,
      "บ้านเลขที่": citizen.houseNo ?? "-",
      อายุ: citizen.ageYears ?? "-",
      "สถานะจากต้นทาง": citizen.screeningStatusRaw,
      "สถานะในระบบ": citizen.screeningState,
      "เบอร์จากต้นทาง": citizen.sourcePhone ?? "-",
      "เบอร์ที่บันทึกติดตาม": citizen.intentPhone || "-",
      "มีความประสงค์": yesNo(citizen.hasIntent),
      "อัปเดตล่าสุด": formatDateTime(citizen.intentUpdatedAt ?? citizen.updatedAt),
    })),
  );

  citizensSheet["!cols"] = [
    { wch: 8 },
    { wch: 26 },
    { wch: 28 },
    { wch: 12 },
    { wch: 8 },
    { wch: 26 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, summarySheet, "summary");
  XLSX.utils.book_append_sheet(workbook, citizensSheet, "citizens");

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });
  const fileName = `admin-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
