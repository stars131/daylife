import { endOfDay, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";

export type DateRange = {
  from: Date;
  to: Date;
};

export function getNow(): Date {
  return new Date();
}

export function dayRange(date = getNow()): DateRange {
  return { from: startOfDay(date), to: endOfDay(date) };
}

export function weekRange(date = getNow()): DateRange {
  return { from: startOfWeek(date, { weekStartsOn: 1 }), to: endOfWeek(date, { weekStartsOn: 1 }) };
}

export function monthRange(date = getNow()): DateRange {
  return { from: startOfMonth(date), to: endOfMonth(date) };
}

export function dateParamToRange(from?: string, to?: string): DateRange | null {
  if (!from && !to) {
    return null;
  }

  const parsedFrom = from ? startOfDay(new Date(`${from}T00:00:00`)) : new Date(0);
  const parsedTo = to ? endOfDay(new Date(`${to}T00:00:00`)) : new Date("9999-12-31T23:59:59.999Z");
  return { from: parsedFrom, to: parsedTo };
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) {
    return "未设置";
  }
  return format(new Date(value), "yyyy-MM-dd HH:mm");
}

export function formatDateOnly(value: Date | string | null | undefined): string {
  if (!value) {
    return "未设置";
  }
  return format(new Date(value), "yyyy-MM-dd");
}
