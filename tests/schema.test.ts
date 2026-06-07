import { describe, expect, it } from "vitest";
import { aiParseResultSchema, eventMutationSchema } from "@/lib/schemas";

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
