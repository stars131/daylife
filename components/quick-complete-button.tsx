"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function QuickCompleteButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function complete() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "标记完成失败");
      }
      router.refresh();
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "标记完成失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={complete}
        disabled={disabled || busy}
        className="touch-target inline-flex items-center justify-center rounded-md border border-line bg-white text-accent"
        title="标记完成"
        aria-label="标记完成"
      >
        <Check aria-hidden className="h-4 w-4" />
      </button>
      {error ? (
        <span role="alert" className="max-w-32 text-right text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
