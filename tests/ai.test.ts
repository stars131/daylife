import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { parseStrictJson } from "@/lib/ai/json";
import { validateAiBusinessRules } from "@/lib/ai/service";
import type { SerializedEvent } from "@/lib/event-service";

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
