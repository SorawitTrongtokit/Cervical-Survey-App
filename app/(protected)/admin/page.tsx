import { AdminConsole } from "@/components/admin-console";
import { getAdminDashboardData } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

function AdminSetupPanel({ message }: { message: string }) {
  return (
    <main className="min-h-[40vh]">
      <section className="overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_20px_70px_rgba(23,49,58,0.08)] backdrop-blur md:p-10">
        <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--accent-soft)] px-4 py-1 text-sm font-semibold text-[var(--accent-deep)]">
          ตรวจสอบการตั้งค่า admin
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          หน้า Admin ยังไม่พร้อมใช้งาน
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          {message}
        </p>
      </section>
    </main>
  );
}

export default async function AdminPage() {
  const { data, error } = await getAdminDashboardData();

  if (error || !data) {
    return <AdminSetupPanel message={error ?? "ไม่สามารถโหลดข้อมูลหน้า admin ได้"} />;
  }

  return <AdminConsole data={data} />;
}
