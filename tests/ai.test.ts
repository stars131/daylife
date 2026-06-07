import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { parseStrictJson } from "@/lib/ai/json";
import { confirmAiActions, parseScheduleInput, validateAiBusinessRules } from "@/lib/ai/service";
import type { SerializedEvent } from "@/lib/event-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback) =>
      callback({
        event: {
          count: vi.fn(async () => 1),
          findMany: vi.fn(async () => []),
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
          findUnique: vi.fn(async ({ select }) => (select ? { parentId: null } : existingEvent))
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

vi.mock("@/lib/event-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/event-service")>();
  return {
    ...actual,
    findRelevantEvents: vi.fn(async () => [])
  };
});

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

  it("preserves the original business error when failure logging also fails", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.aiActionLog.create).mockRejectedValueOnce(new Error("log unavailable") as never);

    await expect(
      confirmAiActions(
        [
          {
            action: "update",
            targetId: "event_1",
            matchQuery: null,
            data: null,
            confidence: 0.95,
            reason: ""
          }
        ],
        "更新事项",
        true
      )
    ).rejects.toMatchObject({
      code: "AI_UPDATE_DATA_INVALID"
    });
  });
});

describe("AI upstream resilience", () => {
  it("maps aborted LLM requests to an AI timeout error", async () => {
    const originalFetch = global.fetch;
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
          init?.signal?.dispatchEvent(new Event("abort"));
          throw new DOMException("aborted", "AbortError");
        })
      );

      await expect(parseScheduleInput("明天提醒我交报告")).rejects.toMatchObject({
        code: "AI_TIMEOUT"
      });
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});

describe("AI prompt context", () => {
  it("sends the current time in the configured app timezone", async () => {
    const originalFetch = global.fetch;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T01:30:00.000Z"));

    try {
      const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    clarificationNeeded: false,
                    clarificationQuestion: null,
                    actions: []
                  })
                }
              }
            ]
          }),
          { status: 200 }
        );
      });
      vi.stubGlobal("fetch", fetchMock);

      await parseScheduleInput("明天提醒我交报告");

      const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
        messages: Array<{ role: string; content: string }>;
      };
      const userPrompt = JSON.parse(body.messages.find((message) => message.role === "user")?.content ?? "{}") as {
        currentDateTime: string;
        timezone: string;
      };

      expect(userPrompt.timezone).toBe("Australia/Perth");
      expect(userPrompt.currentDateTime).toBe("2026-06-08T09:30:00+08:00");
    } finally {
      vi.useRealTimers();
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});
