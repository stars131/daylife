import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listEvents, POST as createEventRoute } from "@/app/api/events/route";
import { POST as confirmAiRoute } from "@/app/api/ai/confirm-actions/route";

vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(async () => ({ role: "admin" }))
}));

vi.mock("@/lib/event-service", () => ({
  createEvent: vi.fn(async (input) => ({
    id: "event_1",
    title: input.title,
    description: input.description ?? null,
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    allDay: input.allDay,
    type: input.type,
    scope: input.scope,
    status: input.status,
    priority: input.priority,
    tags: input.tags,
    repeatRule: input.repeatRule ?? null,
    reminderAt: input.reminderAt ?? null,
    parentId: input.parentId ?? null,
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z"
  })),
  listEvents: vi.fn(async () => [])
}));

vi.mock("@/lib/ai/service", () => ({
  confirmAiActions: vi.fn(async () => ({ applied: [], skipped: [] }))
}));

describe("events API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists events with query validation", async () => {
    const response = await listEvents(new Request("http://localhost/api/events?status=TODO&type=TASK"));
    const body = (await response.json()) as { events: unknown[] };

    expect(response.status).toBe(200);
    expect(body.events).toEqual([]);
  });

  it("creates an event through the validated API route", async () => {
    const request = new Request("http://localhost/api/events", {
      method: "POST",
      body: JSON.stringify({
        title: "创建 API 测试",
        type: "TASK",
        scope: "DAY",
        status: "TODO",
        priority: "MEDIUM",
        tags: []
      })
    });

    const response = await createEventRoute(request);
    const body = (await response.json()) as { event: { title: string } };

    expect(response.status).toBe(201);
    expect(body.event.title).toBe("创建 API 测试");
  });

  it("rejects invalid event payloads", async () => {
    const request = new Request("http://localhost/api/events", {
      method: "POST",
      body: JSON.stringify({
        title: "",
        type: "TASK",
        scope: "DAY",
        status: "TODO",
        priority: "MEDIUM",
        tags: []
      })
    });

    const response = await createEventRoute(request);

    expect(response.status).toBe(422);
  });
});

describe("AI confirm API", () => {
  it("passes safety acknowledgement to the service", async () => {
    const { confirmAiActions } = await import("@/lib/ai/service");
    const request = new Request("http://localhost/api/ai/confirm-actions", {
      method: "POST",
      body: JSON.stringify({
        userInput: "删除牙医预约",
        safetyAcknowledged: true,
        actions: [
          {
            action: "delete",
            targetId: "event_1",
            matchQuery: null,
            data: null,
            confidence: 0.95,
            reason: "用户确认删除"
          }
        ]
      })
    });

    const response = await confirmAiRoute(request);

    expect(response.status).toBe(200);
    expect(confirmAiActions).toHaveBeenCalledWith(expect.any(Array), "删除牙医预约", true);
  });
});
