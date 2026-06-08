import { afterEach, describe, expect, it } from "vitest";
import { buildCalendarViewHref, buildMonthGridDays, normalizeCalendarFilters, normalizeCalendarView } from "@/lib/calendar";
import { getAuthEnv, getLlmEnv } from "@/lib/env";
import { aiParseResultSchema, eventMutationSchema, eventQuerySchema, nonEmptyEventPatchSchema } from "@/lib/schemas";
import { dateParamToRange, dayRange, formatIsoWithTimezone } from "@/lib/dates";
import { safeRedirectPath } from "@/lib/redirects";
import { dateTimeInputToIso, formatDateTimeInput, isValidTimezone } from "@/lib/timezone";

const originalEnv = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
});

describe("event schema", () => {
  it("accepts a valid event mutation", () => {
    const parsed = eventMutationSchema.parse({
      title: "写周报",
      startAt: "2026-06-08T09:00:00+08:00",
      endAt: "2026-06-08T10:00:00+08:00",
      type: "TASK",
      scope: "DAY",
      status: "TODO",
      priority: "HIGH",
      tags: ["工作"]
    });

    expect(parsed.title).toBe("写周报");
    expect(parsed.tags).toEqual(["工作"]);
  });

  it("parses explicit string booleans without treating every non-empty string as true", () => {
    expect(eventMutationSchema.parse({ title: "全天测试", allDay: "false" }).allDay).toBe(false);
    expect(eventMutationSchema.parse({ title: "全天测试", allDay: "true" }).allDay).toBe(true);
    expect(() => eventMutationSchema.parse({ title: "全天测试", allDay: "yes" })).toThrow();
  });

  it("normalizes tags before storage", () => {
    const parsed = eventMutationSchema.parse({
      title: "标签测试",
      tags: [" 工作 ", "工作", "生活"]
    });

    expect(parsed.tags).toEqual(["工作", "生活"]);
  });

  it("accepts only RRULE-like repeat rules", () => {
    expect(eventMutationSchema.parse({ title: "重复测试", repeatRule: "FREQ=WEEKLY;BYDAY=MO" }).repeatRule).toBe("FREQ=WEEKLY;BYDAY=MO");
    expect(eventMutationSchema.parse({ title: "重复测试", repeatRule: "" }).repeatRule).toBeNull();
    expect(() => eventMutationSchema.parse({ title: "重复测试", repeatRule: "每周一" })).toThrow("重复规则必须使用 RRULE 格式");
  });

  it("rejects an end time before start time", () => {
    expect(() =>
      eventMutationSchema.parse({
        title: "错误时间",
        startAt: "2026-06-08T10:00:00+08:00",
        endAt: "2026-06-08T09:00:00+08:00",
        type: "TASK",
        scope: "DAY",
        status: "TODO",
        priority: "MEDIUM",
        tags: []
      })
    ).toThrow();
  });

  it("rejects empty event patches", () => {
    expect(() => nonEmptyEventPatchSchema.parse({})).toThrow();
  });

  it("rejects reversed query date ranges", () => {
    expect(() => eventQuerySchema.parse({ from: "2026-06-10", to: "2026-06-08" })).toThrow("结束日期不能早于开始日期");
  });
});

describe("AI parse schema", () => {
  it("validates structured AI actions", () => {
    const parsed = aiParseResultSchema.parse({
      clarificationNeeded: false,
      clarificationQuestion: null,
      actions: [
        {
          action: "create",
          targetId: null,
          matchQuery: null,
          data: {
            title: "健身",
            startAt: "2026-06-08T20:00:00+08:00",
            type: "HABIT",
            scope: "WEEK",
            status: "TODO",
            priority: "MEDIUM",
            tags: ["健康"]
          },
          confidence: 0.92,
          reason: "用户明确要求新增"
        }
      ]
    });

    expect(parsed.actions[0].data?.title).toBe("健身");
  });
});

describe("safe redirects", () => {
  it("allows internal paths with query strings", () => {
    expect(safeRedirectPath("/calendar?view=week")).toBe("/calendar?view=week");
  });

  it("rejects external or malformed redirect targets", () => {
    expect(safeRedirectPath("https://example.com")).toBe("/");
    expect(safeRedirectPath("//example.com/path")).toBe("/");
    expect(safeRedirectPath("/\\evil")).toBe("/");
  });
});

describe("timezone date utilities", () => {
  it("uses the configured app timezone for day boundaries", () => {
    const range = dayRange(new Date("2026-06-08T01:30:00Z"), "Australia/Perth");

    expect(formatIsoWithTimezone(range.from, "Australia/Perth")).toBe("2026-06-08T00:00:00+08:00");
    expect(formatIsoWithTimezone(range.to, "Australia/Perth")).toBe("2026-06-08T23:59:59+08:00");
  });

  it("converts datetime-local values using the app timezone instead of the browser timezone", () => {
    expect(dateTimeInputToIso("2026-06-08T09:30", "Australia/Perth")).toBe("2026-06-08T01:30:00.000Z");
    expect(formatDateTimeInput("2026-06-08T01:30:00.000Z", "Australia/Perth")).toBe("2026-06-08T09:30");
  });

  it("validates IANA timezone names", () => {
    expect(isValidTimezone("Australia/Perth")).toBe(true);
    expect(isValidTimezone("Invalid/Timezone")).toBe(false);
  });

  it("ignores invalid date query parameters before timezone conversion", () => {
    expect(dateParamToRange("not-a-date", "2026-06-08", "Australia/Perth")).toBeNull();
    expect(dateParamToRange("2026-06-10", "2026-06-08", "Australia/Perth")).toBeNull();
  });
});

describe("calendar helpers", () => {
  it("preserves filters while changing views without carrying stale date ranges", () => {
    expect(
      buildCalendarViewHref(
        {
          view: "day",
          status: "TODO",
          type: "TASK",
          tag: " 工作 ",
          from: "2026-06-01",
          to: "2026-06-30"
        },
        "month"
      )
    ).toBe("/calendar?view=month&status=TODO&type=TASK&tag=%E5%B7%A5%E4%BD%9C");
  });

  it("normalizes unknown calendar views to day", () => {
    expect(normalizeCalendarView("week")).toBe("week");
    expect(normalizeCalendarView("agenda")).toBe("day");
  });

  it("drops invalid calendar filters while preserving valid tag filters", () => {
    expect(normalizeCalendarFilters({ status: "BAD", type: "NOPE", tag: " 工作 " })).toEqual({ tag: "工作" });
  });

  it("does not carry invalid filters into calendar view links", () => {
    expect(buildCalendarViewHref({ status: "BAD", type: "TASK", tag: " 工作 " }, "week")).toBe(
      "/calendar?view=week&type=TASK&tag=%E5%B7%A5%E4%BD%9C"
    );
  });

  it("renders six calendar rows when a month spans six weeks", () => {
    const days = buildMonthGridDays(new Date("2026-08-15T00:00:00.000Z"), "Australia/Perth");

    expect(days).toHaveLength(42);
    expect(days[0]).toEqual({ year: 2026, month: 7, day: 27 });
    expect(days[41]).toEqual({ year: 2026, month: 9, day: 6 });
    expect(days).toContainEqual({ year: 2026, month: 8, day: 31 });
  });

  it("keeps at least five calendar rows for compact months", () => {
    const days = buildMonthGridDays(new Date("2026-02-15T00:00:00.000Z"), "Australia/Perth");

    expect(days).toHaveLength(35);
  });
});

describe("environment validation", () => {
  it("requires a real bcrypt admin password hash", () => {
    process.env.ADMIN_PASSWORD_HASH = "replace-with-bcrypt-hash";

    expect(() => getAuthEnv()).toThrow("ADMIN_PASSWORD_HASH");
  });

  it("rejects production placeholder LLM API keys", () => {
    Object.assign(process.env, {
      NODE_ENV: "production",
      ADMIN_PASSWORD_HASH: "$2a$10$K8sGbWa8TZ.Kh0gWm8c0e.Ak2P5v4uCjG50UnkPGmBb2QvS8GAmDe",
      SESSION_SECRET: "test-session-secret-with-at-least-32-bytes",
      LLM_API_KEY: "replace-with-llm-api-key"
    });

    expect(() => getLlmEnv()).toThrow("LLM_API_KEY");
  });
});
