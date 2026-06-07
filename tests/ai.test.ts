import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { parseStrictJson } from "@/lib/ai/json";
import { confirmAiActions, validateAiBusinessRules } from "@/lib/ai/service";
import type { SerializedEvent } from "@/lib/event-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback) =>
      callback({
        event: {
          count: vi.fn(async () => 1),
          create: vi.fn(async ({ data }) => ({
            id: "created_1",
            title: data.title,
            description: data.description ?? null,
            startAt: data.startAt ?? null,
            endAt: data.endAt ?? null,
            allDay: data.allDay,
            type: data.type,
            scope: data.scope,
            status: data.status,
            priority: data.priority,
            tags: data.tags,
            repeatRule: data.repeatRule ?? null,
            reminderAt: data.reminderAt ?? null,
            parentId: data.parentId ?? null,
            createdAt: new Date("2026-06-08T00:00:00Z"),
            updatedAt: new Date("2026-06-08T00:00:00Z")
          })),
          update: vi.fn(async () => existingEvent),
          delete: vi.fn(async () => existingEvent),
          findUnique: vi.fn(async () => ({ parentId: null })),
          findUniqueOrThrow: vi.fn(async () => existingEvent)
        },
        eventAuditLog: {
          create: vi.fn(async () => ({}))
        },
        aiActionLog: {
          create: vi.fn(async () => ({}))
        }
      })
    ),
    aiActionLog: {
      create: vi.fn(async () => ({}))
    }
  }
}));

const existingEvent: SerializedEvent = {
  id: "event_1",
  title: "牙医预约",
  description: null,
  startAt: "2026-06-10T15:00:00.000Z",
  endAt: null,
  allDay: false,
  type: "TASK",
  scope: "DAY",
  status: "TODO",
  priority: "MEDIUM",
  tags: [],
  repeatRule: null,
  reminderAt: null,
  parentId: null,
  createdAt: "2026-06-08T00:00:00.000Z",
  updatedAt: "2026-06-08T00:00:00.000Z"
};

describe("AI JSON parser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects markdown-wrapped output", () => {
    expect(() => parseStrictJson("```json\n{}\n```")).toThrow(AppError);
  });

  it("parses strict JSON", () => {
    expect(parseStrictJson('{"ok":true}')).toEqual({ ok: true });
  });
});

describe("AI business validation", () => {
  it("requires clarification for low confidence actions", () => {
    const result = validateAiBusinessRules(
      {
        clarificationNeeded: false,
        clarificationQuestion: null,
        actions: [
          {
            action: "complete",
            targetId: "event_1",
            matchQuery: null,
            data: null,
            confidence: 0.5,
            reason: ""
          }
        ]
      },
      [existingEvent]
    );

    expect(result.clarificationNeeded).toBe(true);
  });

  it("rejects unknown target IDs", () => {
    expect(() =>
      validateAiBusinessRules(
        {
          clarificationNeeded: false,
          clarificationQuestion: null,
          actions: [
            {
              action: "delete",
              targetId: "missing",
              matchQuery: null,
              data: null,
              confidence: 0.95,
              reason: ""
            }
          ]
        },
        [existingEvent]
      )
    ).toThrow(AppError);
  });

  it("does not allow fuzzy non-create operations to pass as executable", () => {
    const result = validateAiBusinessRules(
      {
        clarificationNeeded: false,
        clarificationQuestion: null,
        actions: [
          {
            action: "update",
            targetId: null,
            matchQuery: "读书任务",
            data: { status: "DONE" },
            confidence: 0.9,
            reason: ""
          }
        ]
      },
      [existingEvent]
    );

    expect(result.clarificationNeeded).toBe(true);
  });
});

describe("AI confirmation execution", () => {
  it("executes confirmed actions inside one database transaction", async () => {
    const { prisma } = await import("@/lib/prisma");

    const result = await confirmAiActions(
      [
        {
          action: "create",
          targetId: null,
          matchQuery: null,
          data: {
            title: "事务测试",
            startAt: null,
            endAt: null,
            allDay: false,
            type: "TASK",
            scope: "DAY",
            status: "TODO",
            priority: "MEDIUM",
            tags: []
          },
          confidence: 0.95,
          reason: ""
        }
      ],
      "创建事务测试"
    );

    expect(result.applied).toHaveLength(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
