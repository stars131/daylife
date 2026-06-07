import { addDays, format, startOfMonth, startOfWeek } from "date-fns";
import { CalendarFilters } from "@/components/calendar-filters";
import { EventList } from "@/components/event-list";
import { EmptyState } from "@/components/empty-state";
import { dateParamToRange, dayRange, monthRange, weekRange } from "@/lib/dates";
import { listEvents } from "@/lib/event-service";
import { eventQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const normalized = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );
  const view = normalized.view || "day";
  const now = new Date();
  const range =
    view === "week" ? weekRange(now) : view === "month" ? monthRange(now) : dateParamToRange(normalized.from, normalized.to) || dayRange(now);
  const query = eventQuerySchema.parse({
    ...normalized,
    from: format(range.from, "yyyy-MM-dd"),
    to: format(range.to, "yyyy-MM-dd")
  });
  const events = await listEvents(query);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink">日历</h1>
          <p className="text-sm text-muted">{format(range.from, "yyyy-MM-dd")} 至 {format(range.to, "yyyy-MM-dd")}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-line bg-white">
        {[
          ["day", "日视图"],
          ["week", "周视图"],
          ["month", "月视图"]
        ].map(([value, label]) => (
          <a
            key={value}
            href={`/calendar?view=${value}`}
            className={view === value ? "bg-accent px-3 py-2 text-center text-sm font-semibold text-white" : "px-3 py-2 text-center text-sm text-ink"}
          >
            {label}
          </a>
        ))}
      </div>

      <CalendarFilters />

      {view === "month" ? <MonthGrid date={now} /> : null}
      <EventList title="事项列表" events={events} empty="当前范围没有事项" />
    </div>
  );
}

function MonthGrid({ date }: { date: Date }) {
  const monthStart = startOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const days = Array.from({ length: 35 }, (_, index) => addDays(gridStart, index));

  if (days.length === 0) {
    return <EmptyState title="暂无日历数据" />;
  }

  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-line bg-white text-center text-xs">
      {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
        <div key={day} className="border-b border-line bg-slate-50 py-2 font-semibold text-muted">
          {day}
        </div>
      ))}
      {days.map((day) => (
        <div key={day.toISOString()} className="min-h-12 border-b border-r border-line p-2 text-ink">
          {format(day, "d")}
        </div>
      ))}
    </div>
  );
}
