import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildEventWhere, dashboardBuckets, deleteEvent, parseTags, updateEvent, type SerializedEvent } from "@/lib/event-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findMany: vi.fn()
    }
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function event(overrides: Partial<SerializedEvent>): SerializedEvent {
  return {
    id: "event_1",
    title: "事项",
    description: null,
    startAt: "2026-06-08T01:00:00.000Z",
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
    updatedAt: "2026-06-08T00:00:00.000Z",
    ...overrides
  };
}

function dbEvent(input: SerializedEvent) {
  return {
    ...input,
    startAt: input.startAt ? new Date(input.startAt) : null,
    endAt: input.endAt ? new Date(input.endAt) : null,
    reminderAt: input.reminderAt ? new Date(input.reminderAt) : null,
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt),
    tags: JSON.stringify(input.tags)
  };
}

describe("event query helpers", () => {
  it("uses a JSON string fragment for tag pre-filtering", () => {
    expect(buildEventWhere({ tag: "work" })).toEqual({ tags: { contains: "\"work\"" } });
  });

  it("includes events that fully span a queried date range", () => {
    const from = new Date("2026-06-07T16:00:00.000Z");
    const to = new Date("2026-06-08T15:59:59.999Z");

    expect(buildEventWhere({ from: "2026-06-08", to: "2026-06-08" })).toEqual({
      OR: [
        { startAt: { gte: from, lte: to } },
        { endAt: { gte: from, lte: to } },
        { AND: [{ startAt: { lte: from } }, { endAt: { gte: to } }] }
      ]
    });
  });

  it("parses stored tag JSON defensively", () => {
    expect(parseTags('["work","health"]')).toEqual(["work", "health"]);
    expect(parseTags("not-json")).toEqual([]);
  });
});

describe("event parent validation", () => {
  it("rejects empty updates before writing", async () => {
    const existing = dbEvent(event({ id: "event_1" }));
    const db = {
      event: {
        findUnique: vi.fn(async () => existing)
      }
    };

    await expect(updateEvent("event_1", {}, db as never)).rejects.toThrow("至少提供一个要修改的字段");
  });

  it("rejects self-referencing parent IDs", async () => {
    const existing = dbEvent(event({ id: "event_1" }));
    const db = {
      event: {
        findUnique: vi.fn(async () => existing)
      }
    };

    await expect(updateEvent("event_1", { parentId: "event_1" }, db as never)).rejects.toThrow("父目标不能指向自身");
  });

  it("rejects cyclic parent relationships", async () => {
    const existing = dbEvent(event({ id: "event_1" }));
    const db = {
      event: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({ parentId: "event_2" })
          .mockResolvedValueOnce({ parentId: "event_1" })
      }
    };

    await expect(updateEvent("event_1", { parentId: "event_3" }, db as never)).rejects.toThrow("父目标关系不能形成循环");
  });

  it("validates partial date updates against the existing stored event", async () => {
    const existing = dbEvent(
      event({
        id: "event_1",
        startAt: "2026-06-08T10:00:00.000Z",
        endAt: "2026-06-08T12:00:00.000Z"
      })
    );
    const db = {
      event: {
        findUnique: vi.fn(async () => existing)
      }
    };

    await expect(updateEvent("event_1", { endAt: "2026-06-08T09:00:00.000Z" }, db as never)).rejects.toThrow("结束时间不能早于开始时间");
  });
});

describe("event deletion audit", () => {
  it("stores the deleted event and direct children in the audit snapshot", async () => {
    const parent = dbEvent(event({ id: "parent", title: "父目标" }));
    const child = dbEvent(event({ id: "child", title: "子任务", parentId: "parent" }));
    const auditCreate = vi.fn(async (_input: { data: { snapshotJson: string } }) => ({}));
    const db = {
      event: {
        findUnique: vi.fn(async () => parent),
        findMany: vi.fn(async () => [child]),
        delete: vi.fn(async () => parent)
      },
      eventAuditLog: {
        create: auditCreate
      }
    };

    await deleteEvent("parent", db as never);

    const snapshotJson = auditCreate.mock.calls[0]?.[0].data.snapshotJson;
    const snapshot = JSON.parse(snapshotJson) as { event: SerializedEvent; children: SerializedEvent[] };
    expect(snapshot.event.id).toBe("parent");
    expect(snapshot.children.map((item) => item.id)).toEqual(["child"]);
    expect(snapshot.children[0]?.parentId).toBe("parent");
  });
});

describe("dashboard ordering", () => {
  it("sorts same-time items by business priority instead of enum text", async () => {
    const { prisma } = await import("@/lib/prisma");
    const low = event({ id: "low", priority: "LOW", createdAt: "2026-06-08T00:00:01.000Z" });
    const high = event({ id: "high", priority: "HIGH", createdAt: "2026-06-08T00:00:00.000Z" });

    vi.mocked(prisma.event.findMany)
      .mockResolvedValueOnce([dbEvent(low), dbEvent(high)] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    const buckets = await dashboardBuckets(new Date("2026-06-08T01:00:00.000Z"));

    expect(buckets.today.map((item) => item.id)).toEqual(["high", "low"]);
  });

  it("excludes finished items from dashboard task buckets", async () => {
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.event.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    await dashboardBuckets(new Date("2026-06-08T01:00:00.000Z"));

    expect(vi.mocked(prisma.event.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: { status: { notIn: ["DONE", "CANCELLED"] } }
    });
    expect(vi.mocked(prisma.event.findMany).mock.calls[2]?.[0]).toMatchObject({
      where: { status: { notIn: ["DONE", "CANCELLED"] } }
    });
    expect(vi.mocked(prisma.event.findMany).mock.calls[3]?.[0]).toMatchObject({
      where: { status: { notIn: ["DONE", "CANCELLED"] } }
    });
  });

  it("uses scoped dashboard fallbacks only for unscheduled items", async () => {
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.event.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);

    await dashboardBuckets(new Date("2026-06-08T01:00:00.000Z"));

    expect(vi.mocked(prisma.event.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: {
        OR: [expect.any(Object), { scope: "DAY", startAt: null, endAt: null }]
      }
    });
    expect(vi.mocked(prisma.event.findMany).mock.calls[2]?.[0]).toMatchObject({
      where: {
        OR: [expect.any(Object), { scope: "WEEK", startAt: null, endAt: null }]
      }
    });
    expect(vi.mocked(prisma.event.findMany).mock.calls[3]?.[0]).toMatchObject({
      where: {
        OR: [expect.any(Object), { scope: "MONTH", startAt: null, endAt: null }]
      }
    });
  });
});
