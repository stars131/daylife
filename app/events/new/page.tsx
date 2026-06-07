import { EventForm } from "@/components/event-form";
import { getAppTimezone } from "@/lib/env";

export default function NewEventPage() {
  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-lg font-semibold text-ink">新增日程</h1>
        <p className="text-sm text-muted">手动创建任务、日程、习惯或目标</p>
      </div>
      <EventForm timezone={getAppTimezone()} />
    </div>
  );
}
