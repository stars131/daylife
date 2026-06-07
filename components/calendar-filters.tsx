"use client";

import { Filter } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function CalendarFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/calendar?${params.toString()}`);
  }

  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <Filter aria-hidden className="h-4 w-4" />
        筛选
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          aria-label="状态"
          value={searchParams.get("status") || ""}
          onChange={(event) => update("status", event.target.value)}
          className="h-11 rounded-md border border-line bg-white px-3 text-sm"
        >
          <option value="">全部状态</option>
          <option value="TODO">待办</option>
          <option value="DOING">进行中</option>
          <option value="DONE">已完成</option>
          <option value="CANCELLED">已取消</option>
        </select>
        <select
          aria-label="类型"
          value={searchParams.get("type") || ""}
          onChange={(event) => update("type", event.target.value)}
          className="h-11 rounded-md border border-line bg-white px-3 text-sm"
        >
          <option value="">全部类型</option>
          <option value="EVENT">日程</option>
          <option value="TASK">任务</option>
          <option value="HABIT">习惯</option>
          <option value="GOAL">目标</option>
        </select>
        <input
          aria-label="标签"
          placeholder="标签"
          value={searchParams.get("tag") || ""}
          onChange={(event) => update("tag", event.target.value)}
          className="h-11 rounded-md border border-line bg-white px-3 text-sm"
        />
      </div>
    </div>
  );
}
