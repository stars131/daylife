import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiWorkbench } from "@/components/ai-workbench";
import { CalendarFilters } from "@/components/calendar-filters";
import { EventList } from "@/components/event-list";
import type { SerializedEvent } from "@/lib/event-service";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigationMocks.refresh, push: navigationMocks.push, replace: navigationMocks.replace }),
  usePathname: () => "/",
  useSearchParams: () => navigationMocks.searchParams
}));

beforeEach(() => {
  vi.clearAllMocks();
  navigationMocks.searchParams = new URLSearchParams();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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
  reminderAt: "2026-06-08T06:30:00.000Z",
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
    expect(screen.getByText(/提醒/)).toBeInTheDocument();
    expect(screen.getByLabelText("标记完成")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<EventList events={[]} empty="暂无事项" />);

    expect(screen.getByText("暂无事项")).toBeInTheDocument();
  });

  it("shows an error when quick completion fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "事项不存在" }), { status: 404 }))
    );

    render(<EventList title="今日事项" events={[event]} />);

    await userEvent.click(screen.getByLabelText("标记完成"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("事项不存在");
    });
  });

  it("shows a fallback error when quick completion returns non-JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Bad gateway</html>", { status: 502 })));

    render(<EventList title="今日事项" events={[event]} />);

    await userEvent.click(screen.getByLabelText("标记完成"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("标记完成失败");
    });
  });
});

describe("AiWorkbench", () => {
  it("clears stale parsed actions when the input changes", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          clarificationNeeded: false,
          clarificationQuestion: null,
          actions: [
            {
              action: "create",
              targetId: null,
              matchQuery: null,
              data: {
                title: "交报告",
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
              reason: "用户要求新增"
            }
          ]
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AiWorkbench />);

    const input = screen.getByPlaceholderText("输入自然语言日程请求");
    await userEvent.type(input, "明天提醒我交报告");
    await userEvent.click(screen.getByText("解析"));

    await waitFor(() => {
      expect(screen.getByText("待确认修改")).toBeInTheDocument();
    });
    expect(screen.getByText("交报告")).toBeInTheDocument();

    await userEvent.type(input, "，改成买菜");

    expect(screen.queryByText("待确认修改")).not.toBeInTheDocument();
    expect(screen.queryByText("交报告")).not.toBeInTheDocument();
  });

  it("shows a fallback error when AI parsing returns non-JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Bad gateway</html>", { status: 502 })));

    render(<AiWorkbench />);

    await userEvent.type(screen.getByPlaceholderText("输入自然语言日程请求"), "明天提醒我交报告");
    await userEvent.click(screen.getByText("解析"));

    await waitFor(() => {
      expect(screen.getByText("AI 解析失败")).toBeInTheDocument();
    });
  });

  it("does not allow confirmation while clarification is required", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          clarificationNeeded: true,
          clarificationQuestion: "请确认具体事项",
          actions: [
            {
              action: "complete",
              targetId: null,
              matchQuery: "读书任务",
              data: null,
              confidence: 0.9,
              reason: "匹配不明确"
            }
          ]
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AiWorkbench />);

    await userEvent.type(screen.getByPlaceholderText("输入自然语言日程请求"), "完成读书任务");
    await userEvent.click(screen.getByText("解析"));

    await waitFor(() => {
      expect(screen.getByText("请确认具体事项")).toBeInTheDocument();
    });

    expect(screen.getByText("确认执行")).toBeDisabled();
  });
});

describe("CalendarFilters", () => {
  it("cleans invalid URL filters when updating a filter", async () => {
    navigationMocks.searchParams = new URLSearchParams("view=day&status=BAD&type=TASK&tag=%E5%B7%A5%E4%BD%9C");

    render(<CalendarFilters filters={{ type: "TASK", tag: "工作" }} />);

    await userEvent.selectOptions(screen.getByLabelText("类型"), "GOAL");

    expect(navigationMocks.push).toHaveBeenCalledWith("/calendar?view=day&type=GOAL&tag=%E5%B7%A5%E4%BD%9C");
  });
});
