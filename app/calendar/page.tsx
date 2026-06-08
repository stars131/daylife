import { CalendarFilters } from "@/components/calendar-filters";
import { EventList } from "@/components/event-list";
import { EmptyState } from "@/components/empty-state";
import { buildCalendarViewHref, buildMonthGridDays, normalizeCalendarFilters, normalizeCalendarView } from "@/lib/calendar";
import { dateParamToRange, dayRange, formatDateOnly, monthRange, weekRange } from "@/lib/dates";
import { getAppTimezone } from "@/lib/env";
import { listEvents } from "@/lib/event-service";
import { eventQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const calendarViews = [
  ["day", "日视图"],
  ["week", "周视图"],
  ["month", "月视图"]
] as const;

export default async function CalendarPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const normalized = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );
  const view = normalizeCalendarView(normalized.view);
  const filters = normalizeCalendarFilters(normalized);
  const now = new Date();
  const timezone = getAppTimezone();
  const range =
    view === "week" ? weekRange(now, timezone) : view === "month" ? monthRange(now, timezone) : dateParamToRange(normalized.from, normalized.to, timezone) || dayRange(now, timezone);
  const rangeFrom = formatDateOnly(range.from);
  const rangeTo = formatDateOnly(range.to);
  const query = eventQuerySchema.parse({
    ...filters,
    from: rangeFrom,
    to: rangeTo
  });
  const events = await listEvents(query);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink">日历</h1>
          <p className="text-sm text-muted">{rangeFrom} 至 {rangeTo}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-line bg-white">
        {calendarViews.map(([value, label]) => (
          <a
            key={value}
            href={buildCalendarViewHref(filters, value)}
            className={view === value ? "bg-accent px-3 py-2 text-center text-sm font-semibold text-white" : "px-3 py-2 text-center text-sm text-ink"}
          >
            {label}
          </a>
        ))}
      </div>

      <CalendarFilters filters={filters} />

      {view === "month" ? <MonthGrid date={now} timezone={timezone} /> : null}
      <EventList title="事项列表" events={events} empty="当前范围没有事项" />
    </div>
  );
}

function MonthGrid({ date, timezone }: { date: Date; timezone: string }) {
  const days = buildMonthGridDays(date, timezone);

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
        <div key={`${day.year}-${day.month}-${day.day}`} className="min-h-12 border-b border-r border-line p-2 text-ink">
          {day.day}
        </div>
      ))}
    </div>
  );
}
