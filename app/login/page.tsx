import { redirect } from "next/navigation";

import { PasswordLoginForm } from "@/components/auth/password-login-form";
import { sanitizeRedirectPath } from "@/lib/auth/config";
import { getOptionalAuthorizedSession } from "@/lib/auth/session";

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    reason?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeRedirectPath(params.next, "/admin");
  const session = await getOptionalAuthorizedSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[34px] border border-[var(--line)] bg-[var(--paper)] p-7 shadow-[0_24px_80px_rgba(23,49,58,0.08)] backdrop-blur md:p-10">
          <div className="absolute -right-16 top-0 h-56 w-56 rounded-full bg-[rgba(15,118,110,0.12)] blur-3xl" />
          <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-[rgba(217,119,6,0.12)] blur-3xl" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-[var(--line)] bg-white/80 px-4 py-1 text-sm font-semibold text-[var(--accent-deep)]">
              Internal Access
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
              เข้าสู่ระบบเพื่อใช้งานส่วนจัดการข้อมูล
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
              หน้า admin สำหรับเจ้าหน้าที่ภายในใช้ติดตามผลสำรวจ ตรวจสอบความคืบหน้า
              แก้ไขข้อมูล และส่งออกรายงานเพื่อใช้งานต่อ
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[var(--line)] bg-white/70 px-4 py-4">
                <p className="text-sm font-semibold">Email + Password</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  ใช้อีเมลและรหัสผ่านของเจ้าหน้าที่ที่ได้รับสิทธิ์ไว้แล้ว
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--line)] bg-white/70 px-4 py-4">
                <p className="text-sm font-semibold">Admin Only</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  หน้าแบบสำรวจยังเปิดใช้งานได้ตามปกติ และป้องกันเฉพาะส่วน admin
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--line)] bg-white/70 px-4 py-4">
                <p className="text-sm font-semibold">Export Ready</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  ผู้มีสิทธิ์สามารถกรองข้อมูลและส่งออก Excel ได้จากหน้า admin
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_22px_72px_rgba(23,49,58,0.06)] backdrop-blur md:p-8">
          <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--accent-soft)] px-4 py-1 text-sm font-semibold text-[var(--accent-deep)]">
            Sign In
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            ใช้อีเมลและรหัสผ่านของผู้ดูแลระบบ
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            ถ้ายังไม่มีรหัสผ่านหรือยังไม่ได้รับสิทธิ์ กรุณาให้ผู้ดูแลสร้างบัญชีใน
            Supabase Auth ก่อน
          </p>

          <div className="mt-6">
            <PasswordLoginForm nextPath={nextPath} reason={params.reason ?? null} />
          </div>
        </section>
      </div>
    </main>
  );
}
