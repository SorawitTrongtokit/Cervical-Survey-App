import { SurveyDashboard } from "@/components/survey-dashboard";
import { getDashboardData } from "@/lib/survey/data";

export const dynamic = "force-dynamic";

function SetupPanel({ message }: { message: string }) {
  return (
    <main className="min-h-screen px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl">
        <section className="overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_20px_70px_rgba(23,49,58,0.08)] backdrop-blur md:p-10">
          <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--accent-soft)] px-4 py-1 text-sm font-semibold text-[var(--accent-deep)]">
            ตั้งค่าระบบก่อนเริ่มใช้งาน
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            ระบบสำรวจความต้องการตรวจมะเร็งปากมดลูก
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            {message}
          </p>
          <ol className="mt-8 space-y-3 text-sm leading-7 text-[var(--page-ink)] md:text-base">
            <li>1. รัน SQL migration ใน Supabase SQL Editor</li>
            <li>2. เติมค่า `SUPABASE_SERVICE_ROLE_KEY` ในไฟล์ `.env.local`</li>
            <li>3. รัน `npm.cmd run import:excel` เพื่อดึงข้อมูลจาก Excel เข้า database</li>
            <li>4. รีเฟรชหน้านี้อีกครั้ง</li>
          </ol>
        </section>
      </div>
    </main>
  );
}

export default async function Page() {
  const { data, error } = await getDashboardData();

  if (error) {
    return <SetupPanel message={error} />;
  }

  if (!data || data.stats.totalCitizens === 0) {
    return (
      <SetupPanel message="ยังไม่พบข้อมูลประชาชนในฐานข้อมูล กรุณานำเข้าข้อมูลจากไฟล์ Excel ก่อนเริ่มสำรวจ" />
    );
  }

  return <SurveyDashboard {...data} />;
}
