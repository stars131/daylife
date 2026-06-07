"use client";

import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { SerializedEvent } from "@/lib/event-service";

type EventFormState = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  type: string;
  scope: string;
  status: string;
  priority: string;
  tags: string;
  repeatRule: string;
  reminderAt: string;
  parentId: string;
};

function toLocalInput(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString();
}

function initialState(event?: SerializedEvent): EventFormState {
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    startAt: toLocalInput(event?.startAt ?? null),
    endAt: toLocalInput(event?.endAt ?? null),
    allDay: event?.allDay ?? false,
    type: event?.type ?? "TASK",
    scope: event?.scope ?? "DAY",
    status: event?.status ?? "TODO",
    priority: event?.priority ?? "MEDIUM",
    tags: event?.tags.join(", ") ?? "",
    repeatRule: event?.repeatRule ?? "",
    reminderAt: toLocalInput(event?.reminderAt ?? null),
    parentId: event?.parentId ?? ""
  };
}

function buildPayload(state: EventFormState) {
  return {
    title: state.title,
    description: state.description || null,
    startAt: fromLocalInput(state.startAt),
    endAt: fromLocalInput(state.endAt),
    allDay: state.allDay,
    type: state.type,
    scope: state.scope,
    status: state.status,
    priority: state.priority,
    tags: state.tags
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    repeatRule: state.repeatRule || null,
    reminderAt: fromLocalInput(state.reminderAt),
    parentId: state.parentId || null
  };
}

export function EventForm({ event }: { event?: SerializedEvent }) {
  const router = useRouter();
  const [state, setState] = useState<EventFormState>(() => initialState(event));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(event);

  const canSubmit = useMemo(() => state.title.trim().length > 0 && !busy, [busy, state.title]);

  function update<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch(isEdit ? `/api/events/${event?.id}` : "/api/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(state))
      });

      const data = (await response.json()) as { event?: SerializedEvent; error?: string };
      if (!response.ok || !data.event) {
        throw new Error(data.error || "保存失败");
      }

      router.push(`/events/${data.event.id}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!event) {
      return;
    }
    const confirmed = window.confirm("删除后无法在列表中恢复。确认删除这个事项？");
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "删除失败");
      }
      router.push("/");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}

      <div className="rounded-lg border border-line bg-white p-4">
        <label className="text-sm font-medium text-ink" htmlFor="title">
          标题
        </label>
        <input
          id="title"
          value={state.title}
          onChange={(eventValue) => update("title", eventValue.target.value)}
          className="mt-2 h-12 w-full rounded-md border border-line px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
          required
          maxLength={160}
        />

        <label className="mt-4 block text-sm font-medium text-ink" htmlFor="description">
          描述
        </label>
        <textarea
          id="description"
          value={state.description}
          onChange={(eventValue) => update("description", eventValue.target.value)}
          rows={4}
          className="mt-2 w-full rounded-md border border-line px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="grid gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          开始时间
          <input
            type="datetime-local"
            value={state.startAt}
            onChange={(eventValue) => update("startAt", eventValue.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-line px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          结束时间
          <input
            type="datetime-local"
            value={state.endAt}
            onChange={(eventValue) => update("endAt", eventValue.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-line px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          提醒时间
          <input
            type="datetime-local"
            value={state.reminderAt}
            onChange={(eventValue) => update("reminderAt", eventValue.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-line px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={state.allDay}
            onChange={(eventValue) => update("allDay", eventValue.target.checked)}
            className="h-5 w-5 rounded border-line text-accent"
          />
          全天
        </label>
      </div>

      <div className="grid gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-2">
        <Select label="类型" value={state.type} onChange={(value) => update("type", value)} options={["EVENT", "TASK", "HABIT", "GOAL"]} />
        <Select label="范围" value={state.scope} onChange={(value) => update("scope", value)} options={["DAY", "WEEK", "MONTH", "LONG_TERM"]} />
        <Select label="状态" value={state.status} onChange={(value) => update("status", value)} options={["TODO", "DOING", "DONE", "CANCELLED"]} />
        <Select label="优先级" value={state.priority} onChange={(value) => update("priority", value)} options={["LOW", "MEDIUM", "HIGH"]} />
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <label className="text-sm font-medium text-ink" htmlFor="tags">
          标签
        </label>
        <input
          id="tags"
          value={state.tags}
          onChange={(eventValue) => update("tags", eventValue.target.value)}
          placeholder="用逗号分隔"
          className="mt-2 h-12 w-full rounded-md border border-line px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
        />
        <label className="mt-4 block text-sm font-medium text-ink" htmlFor="repeatRule">
          重复规则
        </label>
        <input
          id="repeatRule"
          value={state.repeatRule}
          onChange={(eventValue) => update("repeatRule", eventValue.target.value)}
          placeholder="例如 FREQ=WEEKLY;BYDAY=MO"
          className="mt-2 h-12 w-full rounded-md border border-line px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
        />
        <label className="mt-4 block text-sm font-medium text-ink" htmlFor="parentId">
          父目标 ID
        </label>
        <input
          id="parentId"
          value={state.parentId}
          onChange={(eventValue) => update("parentId", eventValue.target.value)}
          className="mt-2 h-12 w-full rounded-md border border-line px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="touch-target inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white"
        >
          <Save aria-hidden className="h-4 w-4" />
          保存
        </button>
        {event ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="touch-target inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-danger"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            删除
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Select({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium text-ink">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-md border border-line bg-white px-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
