import { EventList } from "@/components/event-list";
import { groupGoalEvents, listEvents } from "@/lib/event-service";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [goals, tasks] = await Promise.all([listEvents({ type: "GOAL" }), listEvents({ type: "TASK" })]);
  const { longTerm, yearGoals, monthGoals, taskGoals } = groupGoalEvents([...goals, ...tasks]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-ink">目标</h1>
        <p className="text-sm text-muted">长期目标、年度目标、月度目标和关联任务</p>
      </div>
      <EventList title="长期目标" events={longTerm} empty="暂无长期目标" />
      <EventList title="年度目标" events={yearGoals.filter((goal) => goal.tags.includes("年度") || goal.scope === "LONG_TERM")} empty="暂无年度目标" />
      <EventList title="月度目标" events={monthGoals} empty="暂无月度目标" />
      <EventList title="目标拆解任务" events={taskGoals.filter((task) => task.parentId)} empty="暂无关联任务" compact />
    </div>
  );
}
