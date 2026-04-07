"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { normalizeEmail } from "@/lib/auth/shared";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

interface PasswordLoginFormProps {
  nextPath: string;
  reason: string | null;
}

function reasonMessage(reason: string | null) {
  if (reason === "unauthorized") {
    return "บัญชีนี้ยังไม่ได้รับสิทธิ์เข้าใช้งานหน้า admin กรุณาติดต่อผู้ดูแลระบบ";
  }

  return "เข้าสู่ระบบด้วยอีเมลและรหัสผ่านสำหรับใช้งานส่วนจัดการข้อมูล";
}

export function PasswordLoginForm({
  nextPath,
  reason,
}: PasswordLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const helperMessage = useMemo(() => reasonMessage(reason), [reason]);

  useEffect(() => {
    if (reason !== "unauthorized") {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    void supabase.auth.signOut();
  }, [reason]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const normalizedEmail = normalizeEmail(email);

      setError("");

      if (!normalizedEmail || !password) {
        setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--muted)]" htmlFor="email">
          อีเมล
        </label>
        <input
          className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@organization.go.th"
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-semibold text-[var(--muted)]"
          htmlFor="password"
        >
          รหัสผ่าน
        </label>
        <input
          className="w-full rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </div>

      <p className="text-sm leading-7 text-[var(--muted)]">{helperMessage}</p>

      <button
        className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(15,118,110,0.18)] transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:bg-[rgba(94,112,120,0.35)]"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>

      {error ? (
        <p className="rounded-2xl border border-[var(--line)] bg-[var(--rose-soft)] px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
