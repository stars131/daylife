import { describe, expect, it, vi } from "vitest";
import { buildEventWhere, parseTags, updateEvent } from "@/lib/event-service";

describe("event query helpers", () => {
  it("uses a JSON string fragment for tag pre-filtering", () => {
    expect(buildEventWhere({ tag: "work" })).toEqual({ tags: { contains: "\"work\"" } });
  });

  it("parses stored tag JSON defensively", () => {
    expect(parseTags('["work","health"]')).toEqual(["work", "health"]);
    expect(parseTags("not-json")).toEqual([]);
  });
});

describe("event parent validation", () => {
  it("rejects empty updates before writing", async () => {
    const db = {
      event: {
        count: vi.fn(async () => 1)
      }
    };

    await expect(updateEvent("event_1", {}, db as never)).rejects.toThrow("至少提供一个要修改的字段");
  });

  it("rejects self-referencing parent IDs", async () => {
    const db = {
      event: {
        count: vi.fn(async () => 1)
      }
    };

    await expect(updateEvent("event_1", { parentId: "event_1" }, db as never)).rejects.toThrow("父目标不能指向自身");
  });

  it("rejects cyclic parent relationships", async () => {
    const db = {
      event: {
        count: vi.fn(async () => 1),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ parentId: "event_2" })
          .mockResolvedValueOnce({ parentId: "event_1" })
      }
    };

    await expect(updateEvent("event_1", { parentId: "event_3" }, db as never)).rejects.toThrow("父目标关系不能形成循环");
  });
});
