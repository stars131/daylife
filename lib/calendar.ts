import { addLocalDays, getZonedDateTimeParts, type LocalDateParts } from "@/lib/timezone";

export type CalendarView = "day" | "week" | "month";

const persistentFilterParams = ["status", "type", "tag"] as const;

export function normalizeCalendarView(value: unknown): CalendarView {
  return value === "week" || value === "month" ? value : "day";
}

export function buildCalendarViewHref(searchParams: Record<string, string | string[] | undefined>, view: CalendarView): string {
  const params = new URLSearchParams();
  params.set("view", view);

  for (const key of persistentFilterParams) {
    const rawValue = searchParams[key];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    const normalizedValue = value?.trim();
    if (normalizedValue) {
      params.set(key, normalizedValue);
    }
  }

  return `/calendar?${params.toString()}`;
}

export function buildMonthGridDays(date: Date, timezone: string): LocalDateParts[] {
  const current = getZonedDateTimeParts(date, timezone);
  const monthStart = { year: current.year, month: current.month, day: 1 };
  const nextMonthStart =
    current.month === 12 ? { year: current.year + 1, month: 1, day: 1 } : { year: current.year, month: current.month + 1, day: 1 };
  const gridStart = addLocalDays(monthStart, -daysSinceMonday(monthStart));
  const gridEnd = addLocalDays(nextMonthStart, daysUntilMonday(nextMonthStart));
  const dayCount = Math.max(35, daysBetween(gridStart, gridEnd));

  return Array.from({ length: dayCount }, (_value, index) => addLocalDays(gridStart, index));
}

function localWeekday(parts: LocalDateParts): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function daysSinceMonday(parts: LocalDateParts): number {
  return (localWeekday(parts) + 6) % 7;
}

function daysUntilMonday(parts: LocalDateParts): number {
  return (8 - localWeekday(parts)) % 7;
}

function daysBetween(from: LocalDateParts, to: LocalDateParts): number {
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUtc - fromUtc) / 86400000);
}
