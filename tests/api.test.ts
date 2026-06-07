import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listEvents, POST as createEventRoute } from "@/app/api/events/route";
import { POST as confirmAiRoute } from "@/app/api/ai/confirm-actions/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";

vi.mock("@/lib/auth", () => ({
  clearSessionCookie: vi.fn(),
  createSessionToken: vi.fn(async () => "test-token"),
  requireSession: vi.fn(async () => ({ role: "admin" })),
  setSessionCookie: vi.fn(),
  verifyAdminPassword: vi.fn(async (password) => password === "correct-password")
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

  it("returns a client error for malformed JSON", async () => {
    const request = new Request("http://localhost/api/events", {
      method: "POST",
      body: "{"
    });

    const response = await createEventRoute(request);
    const body = (await response.json()) as { code: string };

    expect(response.status).toBe(400);
    expect(body.code).toBe("INVALID_JSON");
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

describe("auth API", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { resetRateLimitsForTests } = await import("@/lib/rate-limit");
    resetRateLimitsForTests();
  });

  it("rate limits repeated failed logins by client", async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await loginRoute(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.10" },
          body: JSON.stringify({ password: "wrong-password" })
        })
      );
      expect(response.status).toBe(401);
    }

    const blocked = await loginRoute(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ password: "wrong-password" })
      })
    );
    const body = (await blocked.json()) as { code: string };

    expect(blocked.status).toBe(429);
    expect(body.code).toBe("RATE_LIMITED");
  });

  it("clears failed login attempts after a successful login", async () => {
    const client = "203.0.113.11";
    const failed = await loginRoute(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": client },
        body: JSON.stringify({ password: "wrong-password" })
      })
    );
    expect(failed.status).toBe(401);

    const successful = await loginRoute(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": client },
        body: JSON.stringify({ password: "correct-password" })
      })
    );

    expect(successful.status).toBe(200);
  });

  it("separates login limits by client", async () => {
    for (let index = 0; index < 5; index += 1) {
      await loginRoute(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.12" },
          body: JSON.stringify({ password: "wrong-password" })
        })
      );
    }

    const differentClient = await loginRoute(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.13" },
        body: JSON.stringify({ password: "wrong-password" })
      })
    );

    expect(differentClient.status).toBe(401);
  });

  it("clears the session cookie on logout even without revalidating the session", async () => {
    const { clearSessionCookie, requireSession } = await import("@/lib/auth");

    const response = await logoutRoute();

    expect(response.status).toBe(200);
    expect(clearSessionCookie).toHaveBeenCalled();
    expect(requireSession).not.toHaveBeenCalled();
  });
});
