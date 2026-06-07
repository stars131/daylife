import { getAppTimezone } from "@/lib/env";
import { addLocalDays, getTimezoneOffsetMs, getZonedDateTimeParts, pad, zonedLocalToUtc, type LocalDateParts } from "@/lib/timezone";

export type DateRange = {
  from: Date;
  to: Date;
};

export function getNow(): Date {
  return new Date();
}

function localWeekday(parts: LocalDateParts): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function rangeFromLocalStart(start: LocalDateParts, nextStart: LocalDateParts, timezone = getAppTimezone()): DateRange {
  const from = zonedLocalToUtc(localDateOnly(start), timezone);
  const to = new Date(zonedLocalToUtc(nextStart, timezone).getTime() - 1);
  return { from, to };
}

function localDateOnly({ year, month, day }: LocalDateParts): LocalDateParts {
  return { year, month, day };
}

export function dayRange(date = getNow(), timezone = getAppTimezone()): DateRange {
  const parts = getZonedDateTimeParts(date, timezone);
  return rangeFromLocalStart(parts, addLocalDays(parts, 1), timezone);
}

export function weekRange(date = getNow(), timezone = getAppTimezone()): DateRange {
  const parts = getZonedDateTimeParts(date, timezone);
  const daysSinceMonday = (localWeekday(parts) + 6) % 7;
  const start = addLocalDays(parts, -daysSinceMonday);
  return rangeFromLocalStart(start, addLocalDays(start, 7), timezone);
}

export function monthRange(date = getNow(), timezone = getAppTimezone()): DateRange {
  const parts = getZonedDateTimeParts(date, timezone);
  const start = { year: parts.year, month: parts.month, day: 1 };
  const nextStart = parts.month === 12 ? { year: parts.year + 1, month: 1, day: 1 } : { year: parts.year, month: parts.month + 1, day: 1 };
  return rangeFromLocalStart(start, nextStart, timezone);
}

function parseDateParam(value: string): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const parts = {
    year: Number(yearValue),
    month: Number(monthValue),
    day: Number(dayValue)
  };
  const normalized = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    normalized.getUTCFullYear() !== parts.year ||
    normalized.getUTCMonth() + 1 !== parts.month ||
    normalized.getUTCDate() !== parts.day
  ) {
    return null;
  }

  return parts;
}

export function dateParamToRange(from?: string, to?: string, timezone = getAppTimezone()): DateRange | null {
  if (!from && !to) {
    return null;
  }

  const fromParts = from ? parseDateParam(from) : null;
  const toParts = to ? parseDateParam(to) : null;
  if ((from && !fromParts) || (to && !toParts)) {
    return null;
  }

  const parsedFrom = fromParts ? zonedLocalToUtc(fromParts, timezone) : new Date(0);
  const parsedTo = toParts ? new Date(zonedLocalToUtc(addLocalDays(toParts, 1), timezone).getTime() - 1) : new Date("9999-12-31T23:59:59.999Z");
  if (parsedFrom.getTime() > parsedTo.getTime()) {
    return null;
  }
  return { from: parsedFrom, to: parsedTo };
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) {
    return "未设置";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: getAppTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  })
    .format(new Date(value))
    .replace(/\//g, "-");
}

export function formatDateOnly(value: Date | string | null | undefined): string {
  if (!value) {
    return "未设置";
  }
  const parts = getZonedDateTimeParts(new Date(value), getAppTimezone());
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatIsoWithTimezone(value: Date, timezone = getAppTimezone()): string {
  const parts = getZonedDateTimeParts(value, timezone);
  const offsetMinutes = Math.round(getTimezoneOffsetMs(value, timezone) / 60000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${sign}${pad(
    Math.floor(absoluteOffset / 60)
  )}:${pad(absoluteOffset % 60)}`;
}
