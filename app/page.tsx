import Link from "next/link";
import { Bot, CalendarDays, Plus, Target } from "lucide-react";
import { EventList } from "@/components/event-list";
import { dashboardBuckets } from "@/lib/event-service";

export const dynamic = "force-dynamic";

const shortcuts = [
  { href: "/events/new", label: "新增日程", icon: Plus },
  { href: "/ai", label: "AI 管理", icon: Bot },
  { href: "/calendar", label: "日历视图", icon: CalendarDays },
  { href: "/goals", label: "目标页", icon: Target }
];

export default async function HomePage() {
  const buckets = await dashboardBuckets();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="touch-target flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-3 text-sm font-semibold text-ink shadow-sm"
            >
              <Icon aria-hidden className="h-4 w-4 text-accent" />
              {shortcut.label}
            </Link>
          );
        })}
      </div>

      <EventList title="今日事项" events={buckets.today} empty="今天没有待处理事项" />
      <EventList title="逾期未完成" events={buckets.overdue} empty="没有逾期事项" />
      <EventList title="本周任务" events={buckets.week} empty="本周暂无任务" compact />
      <EventList title="本月任务" events={buckets.month} empty="本月暂无任务" compact />
      <EventList title="长期目标" events={buckets.goals} empty="暂无长期目标" compact />
    </div>
  );
}
