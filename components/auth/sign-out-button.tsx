"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createBrowserSupabaseClient } from "@/utils/supabase/client";

interface SignOutButtonProps {
  className?: string;
  label?: string;
}

export function SignOutButton({
  className,
  label = "ออกจากระบบ",
}: SignOutButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      setError("");

      const supabase = createBrowserSupabaseClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError.message);
        return;
      }

      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        className={className}
        disabled={isPending}
        onClick={handleSignOut}
        type="button"
      >
        {isPending ? "กำลังออกจากระบบ..." : label}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
