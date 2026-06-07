import Link from "next/link";
import { Check, Clock, Tag } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PriorityPill, StatusPill } from "@/components/status-pill";
import { QuickCompleteButton } from "@/components/quick-complete-button";
import { formatDateTime } from "@/lib/dates";
import type { SerializedEvent } from "@/lib/event-service";

const typeText: Record<string, string> = {
  EVENT: "日程",
  TASK: "任务",
  HABIT: "习惯",
  GOAL: "目标"
};

export function EventList({
  title,
  events,
  empty = "暂无事项",
  compact = false
}: {
  title?: string;
  events: SerializedEvent[];
  empty?: string;
  compact?: boolean;
}) {
  return (
    <section className="space-y-3">
      {title ? <h2 className="text-base font-semibold text-ink">{title}</h2> : null}
      {events.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
          {events.map((event) => (
            <article key={event.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/events/${event.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {event.status === "DONE" ? <Check aria-hidden className="h-4 w-4 text-emerald-600" /> : null}
                    <h3 className="truncate text-sm font-semibold text-ink">{event.title}</h3>
                  </div>
                  {!compact && event.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{event.description}</p>
                  ) : null}
                </Link>
                <QuickCompleteButton id={event.id} disabled={event.status === "DONE" || event.status === "CANCELLED"} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock aria-hidden className="h-3.5 w-3.5" />
                  {formatDateTime(event.startAt)}
                </span>
                <span>{typeText[event.type] || event.type}</span>
                <StatusPill status={event.status} />
                <PriorityPill priority={event.priority} />
              </div>
              {event.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {event.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      <Tag aria-hidden className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
