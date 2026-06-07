"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="touch-target inline-flex items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-medium text-ink shadow-sm"
      title="退出登录"
      aria-label="退出登录"
    >
      <LogOut aria-hidden className="h-4 w-4" />
    </button>
  );
}
