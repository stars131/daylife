"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-20 max-w-sm rounded-lg border border-red-200 bg-red-50 p-5 text-center text-danger">
      <AlertTriangle aria-hidden className="mx-auto h-8 w-8" />
      <h1 className="mt-3 text-lg font-semibold">页面加载失败</h1>
      <p className="mt-2 text-sm">{error.message}</p>
      <button type="button" onClick={reset} className="mt-4 h-11 rounded-md bg-danger px-4 text-sm font-semibold text-white">
        重试
      </button>
    </div>
  );
}
