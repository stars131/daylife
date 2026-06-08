"use client";

import { AlertTriangle, Bot, CheckCircle2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AiAction } from "@/lib/schemas";

type ParseResponse = {
  clarificationNeeded: boolean;
  clarificationQuestion: string | null;
  actions: AiAction[];
  error?: string;
};

const examples = [
  "明天下午 3 点提醒我交报告",
  "每周一晚上 8 点安排健身",
  "把本周的读书任务标记完成",
  "给我增加一个长期目标：三个月内完成英语口语训练"
];

const actionText: Record<string, string> = {
  create: "创建",
  update: "修改",
  delete: "删除",
  complete: "完成",
  cancel: "取消"
};

export function AiWorkbench() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState("");

  function updateInput(value: string) {
    setInput(value);
    setParsed(null);
    setError("");
    setSuccess("");
  }

  async function parse() {
    setBusy(true);
    setError("");
    setSuccess("");
    setParsed(null);

    try {
      const response = await fetch("/api/ai/parse-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input })
      });
      const data = (await response.json()) as ParseResponse;
      if (!response.ok) {
        throw new Error(data.error || "AI 解析失败");
      }
      setParsed(data);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "AI 解析失败");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!parsed?.actions.length || parsed.clarificationNeeded) {
      return;
    }

    const risky = parsed.actions.some((action) => action.action !== "create" || action.confidence < 0.75);
    const safetyAcknowledged = risky ? window.confirm("包含删除、修改、完成、取消或低置信度操作。确认执行这些修改？") : false;
    if (risky && !safetyAcknowledged) {
      return;
    }

    setConfirming(true);
    setError("");
    try {
      const response = await fetch("/api/ai/confirm-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: input, actions: parsed.actions, safetyAcknowledged })
      });
      const data = (await response.json()) as { applied?: unknown[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "确认执行失败");
      }
      setSuccess(`已执行 ${data.applied?.length ?? 0} 项修改`);
      setParsed(null);
      setInput("");
      router.refresh();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "确认执行失败");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-lg border border-line bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bot aria-hidden className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold text-ink">AI 管理</h1>
        </div>
        <textarea
          value={input}
          onChange={(event) => updateInput(event.target.value)}
          rows={5}
          placeholder="输入自然语言日程请求"
          className="w-full rounded-md border border-line px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => updateInput(example)}
              className="rounded-md border border-line bg-slate-50 px-2.5 py-1.5 text-xs text-muted"
            >
              {example}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={parse}
          disabled={busy || !input.trim()}
          className="mt-4 touch-target inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white sm:w-auto"
        >
          <Send aria-hidden className="h-4 w-4" />
          {busy ? "解析中..." : "解析"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">
          <div className="flex gap-2">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <div className="flex gap-2">
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4" />
            <span>{success}</span>
          </div>
        </div>
      ) : null}

      {parsed ? (
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">待确认修改</h2>
              {parsed.clarificationNeeded ? (
                <p className="mt-1 text-sm text-warn">{parsed.clarificationQuestion || "需要进一步确认。"}</p>
              ) : null}
            </div>
            <span className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-warn">{parsed.actions.length} 项</span>
          </div>
          <div className="mt-4 space-y-3">
            {parsed.actions.map((action, index) => (
              <div
                key={`${action.action}-${index}`}
                className={action.action === "delete" ? "rounded-md border border-red-200 bg-red-50 p-3" : "rounded-md border border-line bg-slate-50 p-3"}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-ink">{actionText[action.action]}</span>
                  <span className="text-xs text-muted">置信度 {Math.round(action.confidence * 100)}%</span>
                  {action.targetId ? <span className="text-xs text-muted">目标 {action.targetId}</span> : null}
                </div>
                {action.data?.title ? <p className="mt-2 text-sm font-medium text-ink">{action.data.title}</p> : null}
                {action.reason ? <p className="mt-1 text-xs text-muted">{action.reason}</p> : null}
                {action.action === "delete" ? <p className="mt-2 text-xs font-medium text-danger">删除操作需要明确二次确认。</p> : null}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={confirm}
            disabled={confirming || parsed.actions.length === 0 || parsed.clarificationNeeded}
            className="mt-4 touch-target w-full rounded-md bg-accent px-4 text-sm font-semibold text-white"
          >
            {confirming ? "执行中..." : "确认执行"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
