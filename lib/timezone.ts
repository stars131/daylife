export type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

export type LocalDateTimeParts = LocalDateParts & {
  hour: number;
  minute: number;
  second: number;
};

type ZonedLocalInput = LocalDateParts & {
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
};

const dateTimeInputPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

export function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

export function isValidTimezone(timezone: string): boolean {
  if (!timezone.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function assertValidTimezone(timezone: string): string {
  if (!isValidTimezone(timezone)) {
    throw new RangeError(`Invalid timezone: ${timezone}`);
  }
  return timezone;
}

export function getZonedDateTimeParts(date: Date, timezone: string): LocalDateTimeParts {
  assertValidTimezone(timezone);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Invalid date");
  }

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

export function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = getZonedDateTimeParts(date, timezone);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return localAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedLocalToUtc(parts: ZonedLocalInput, timezone: string): Date {
  assertValidTimezone(timezone);
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
    parts.millisecond ?? 0
  );
  const firstOffset = getTimezoneOffsetMs(new Date(utcGuess), timezone);
  const firstResult = new Date(utcGuess - firstOffset);
  const secondOffset = getTimezoneOffsetMs(firstResult, timezone);
  return new Date(utcGuess - secondOffset);
}

export function addLocalDays(parts: LocalDateParts, days: number): LocalDateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

export function formatDateTimeInput(value: Date | string | null | undefined, timezone: string): string {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  const parts = getZonedDateTimeParts(date, timezone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function dateTimeInputToIso(value: string, timezone: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parts = parseDateTimeInput(trimmed);
  if (!parts) {
    throw new RangeError("时间格式无效");
  }

  const utcDate = zonedLocalToUtc(parts, timezone);
  const expectedMinuteValue = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
  if (formatDateTimeInput(utcDate, timezone) !== expectedMinuteValue) {
    throw new RangeError("该时间在当前应用时区不存在");
  }

  return utcDate.toISOString();
}

function parseDateTimeInput(value: string): (LocalDateTimeParts & { millisecond: number }) | null {
  const match = dateTimeInputPattern.exec(value);
  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue = "0", millisecondValue = "0"] = match;
  const parts = {
    year: Number(yearValue),
    month: Number(monthValue),
    day: Number(dayValue),
    hour: Number(hourValue),
    minute: Number(minuteValue),
    second: Number(secondValue),
    millisecond: Number(millisecondValue.padEnd(3, "0"))
  };

  if (
    parts.month < 1 ||
    parts.month > 12 ||
    parts.day < 1 ||
    parts.day > 31 ||
    parts.hour < 0 ||
    parts.hour > 23 ||
    parts.minute < 0 ||
    parts.minute > 59 ||
    parts.second < 0 ||
    parts.second > 59
  ) {
    return null;
  }

  const normalized = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond));
  if (
    normalized.getUTCFullYear() !== parts.year ||
    normalized.getUTCMonth() + 1 !== parts.month ||
    normalized.getUTCDate() !== parts.day ||
    normalized.getUTCHours() !== parts.hour ||
    normalized.getUTCMinutes() !== parts.minute ||
    normalized.getUTCSeconds() !== parts.second
  ) {
    return null;
  }

  return parts;
}
