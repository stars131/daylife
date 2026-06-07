import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventList } from "@/components/event-list";
import type { SerializedEvent } from "@/lib/event-service";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams()
}));

const event: SerializedEvent = {
  id: "event_1",
  title: "提交报告",
  description: "周一前完成",
  startAt: "2026-06-08T07:00:00.000Z",
  endAt: null,
  allDay: false,
  type: "TASK",
  scope: "DAY",
  status: "TODO",
  priority: "HIGH",
  tags: ["工作"],
  repeatRule: null,
  reminderAt: null,
  parentId: null,
  createdAt: "2026-06-08T00:00:00.000Z",
  updatedAt: "2026-06-08T00:00:00.000Z"
};

describe("EventList", () => {
  it("renders event details and quick complete control", () => {
    render(<EventList title="今日事项" events={[event]} />);

    expect(screen.getByText("今日事项")).toBeInTheDocument();
    expect(screen.getByText("提交报告")).toBeInTheDocument();
    expect(screen.getByText("工作")).toBeInTheDocument();
    expect(screen.getByLabelText("标记完成")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<EventList events={[]} empty="暂无事项" />);

    expect(screen.getByText("暂无事项")).toBeInTheDocument();
  });
});
