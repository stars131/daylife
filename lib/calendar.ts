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
