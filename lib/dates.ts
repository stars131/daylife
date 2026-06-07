import { getAppTimezone } from "@/lib/env";

export type DateRange = {
  from: Date;
  to: Date;
};

export function getNow(): Date {
  return new Date();
}

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

type LocalDateTimeParts = LocalDateParts & {
  hour: number;
  minute: number;
  second: number;
};

function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

function partsFor(date: Date, timezone = getAppTimezone()): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function timezoneOffsetMs(date: Date, timezone = getAppTimezone()): number {
  const parts = partsFor(date, timezone);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return localAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function zonedLocalToUtc(
  { year, month, day }: LocalDateParts,
  timezone = getAppTimezone(),
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const firstOffset = timezoneOffsetMs(new Date(utcGuess), timezone);
  const firstResult = new Date(utcGuess - firstOffset);
  const secondOffset = timezoneOffsetMs(firstResult, timezone);
  return new Date(utcGuess - secondOffset);
}

function addLocalDays(parts: LocalDateParts, days: number): LocalDateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

function localWeekday(parts: LocalDateParts): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function rangeFromLocalStart(start: LocalDateParts, nextStart: LocalDateParts, timezone = getAppTimezone()): DateRange {
  const from = zonedLocalToUtc(start, timezone);
  const to = new Date(zonedLocalToUtc(nextStart, timezone).getTime() - 1);
  return { from, to };
}

export function dayRange(date = getNow(), timezone = getAppTimezone()): DateRange {
  const parts = partsFor(date, timezone);
  return rangeFromLocalStart(parts, addLocalDays(parts, 1), timezone);
}

export function weekRange(date = getNow(), timezone = getAppTimezone()): DateRange {
  const parts = partsFor(date, timezone);
  const daysSinceMonday = (localWeekday(parts) + 6) % 7;
  const start = addLocalDays(parts, -daysSinceMonday);
  return rangeFromLocalStart(start, addLocalDays(start, 7), timezone);
}

export function monthRange(date = getNow(), timezone = getAppTimezone()): DateRange {
  const parts = partsFor(date, timezone);
  const start = { year: parts.year, month: parts.month, day: 1 };
  const nextStart = parts.month === 12 ? { year: parts.year + 1, month: 1, day: 1 } : { year: parts.year, month: parts.month + 1, day: 1 };
  return rangeFromLocalStart(start, nextStart, timezone);
}

function parseDateParam(value: string): LocalDateParts {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

export function dateParamToRange(from?: string, to?: string, timezone = getAppTimezone()): DateRange | null {
  if (!from && !to) {
    return null;
  }

  const parsedFrom = from ? zonedLocalToUtc(parseDateParam(from), timezone) : new Date(0);
  const parsedTo = to ? new Date(zonedLocalToUtc(addLocalDays(parseDateParam(to), 1), timezone).getTime() - 1) : new Date("9999-12-31T23:59:59.999Z");
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
  const parts = partsFor(new Date(value), getAppTimezone());
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatIsoWithTimezone(value: Date, timezone = getAppTimezone()): string {
  const parts = partsFor(value, timezone);
  const offsetMinutes = Math.round(timezoneOffsetMs(value, timezone) / 60000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${sign}${pad(
    Math.floor(absoluteOffset / 60)
  )}:${pad(absoluteOffset % 60)}`;
}
