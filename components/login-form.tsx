"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "登录失败");
      }

      router.replace(searchParams.get("next") || "/");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-20 w-full max-w-sm rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-accent">
          <LockKeyhole aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-ink">登录管理页</h1>
          <p className="text-sm text-muted">请输入管理员密码</p>
        </div>
      </div>

      <label className="block text-sm font-medium text-ink" htmlFor="password">
        密码
      </label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-2 h-12 w-full rounded-md border border-line bg-white px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
        autoComplete="current-password"
      />
      {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || !password}
        className="mt-5 h-12 w-full rounded-md bg-accent px-4 text-sm font-semibold text-white"
      >
        {busy ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
