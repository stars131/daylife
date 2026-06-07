import { clsx } from "clsx";

const statusText: Record<string, string> = {
  TODO: "待办",
  DOING: "进行中",
  DONE: "已完成",
  CANCELLED: "已取消"
};

const priorityText: Record<string, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高"
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex h-6 items-center rounded px-2 text-xs font-medium",
        status === "DONE" && "bg-emerald-50 text-emerald-700",
        status === "DOING" && "bg-blue-50 text-blue-700",
        status === "CANCELLED" && "bg-slate-100 text-slate-600",
        status === "TODO" && "bg-amber-50 text-amber-700"
      )}
    >
      {statusText[status] || status}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: string }) {
  return (
    <span
      className={clsx(
        "inline-flex h-6 items-center rounded px-2 text-xs font-medium",
        priority === "HIGH" && "bg-red-50 text-danger",
        priority === "MEDIUM" && "bg-teal-50 text-accent",
        priority === "LOW" && "bg-slate-100 text-slate-600"
      )}
    >
      {priorityText[priority] || priority}
    </span>
  );
}
