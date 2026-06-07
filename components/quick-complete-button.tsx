"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function QuickCompleteButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function complete() {
    setBusy(true);
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" })
      });
      if (!response.ok) {
        throw new Error("标记完成失败");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
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
  );
}
