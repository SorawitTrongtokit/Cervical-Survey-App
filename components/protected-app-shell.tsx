"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";

interface ProtectedAppShellProps {
  children: React.ReactNode;
  userEmail: string;
}

function navClass(isActive: boolean) {
  return isActive
    ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,118,110,0.18)]"
    : "rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-white/75 hover:text-[var(--page-ink)]";
}

export function ProtectedAppShell({
  children,
  userEmail,
}: ProtectedAppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-[30px] border border-[var(--line)] bg-[var(--paper)] px-5 py-4 shadow-[0_18px_60px_rgba(23,49,58,0.06)] backdrop-blur md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--accent-deep)]">
                ระบบภายในหน่วยงาน
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                สำรวจและจัดการข้อมูลการตรวจมะเร็งปากมดลูก
              </h1>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <nav className="flex flex-wrap gap-2">
                <Link className={navClass(pathname === "/")} href="/">
                  หน้าสำรวจ
                </Link>
                <Link className={navClass(pathname.startsWith("/admin"))} href="/admin">
                  หน้า Admin
                </Link>
              </nav>

              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
                  Signed in
                </p>
                <p className="mt-1 text-sm font-semibold">{userEmail}</p>
              </div>

              <SignOutButton className="inline-flex items-center justify-center rounded-full border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--page-ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-70" />
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
