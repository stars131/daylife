import { LOW_CONFIDENCE_THRESHOLD, unsafeAiActionKinds } from "@/lib/constants";
import { getAppTimezone, getLlmEnv } from "@/lib/env";
import { formatIsoWithTimezone } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import {
  assertEventExists,
  createEvent,
  deleteEvent,
  findRelevantEvents,
  getEvent,
  setEventStatus,
  updateEvent,
  type SerializedEvent
} from "@/lib/event-service";
import { prisma } from "@/lib/prisma";
import { aiParseResultSchema, eventMutationSchema, nonEmptyEventPatchSchema, type AiAction, type AiParseResult } from "@/lib/schemas";
import { parseStrictJson } from "@/lib/ai/json";
import { scheduleSystemPrompt } from "@/lib/ai/prompts";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export type ConfirmResult = {
  applied: SerializedEvent[];
  skipped: Array<{ action: AiAction; reason: string }>;
};

function currentDateTimeWithOffset(timezone: string): string {
  return formatIsoWithTimezone(new Date(), timezone);
}

function assertTargetedAction(action: AiAction): asserts action is AiAction & { targetId: string } {
  if (action.action !== "create" && !action.targetId) {
    throw new AppError("非创建操作必须包含明确 targetId", 422, "AI_TARGET_REQUIRED", action);
  }
}

function assertSafeToExecute(action: AiAction, safetyAcknowledged: boolean): void {
  if (action.confidence < LOW_CONFIDENCE_THRESHOLD && !safetyAcknowledged) {
    throw new AppError("低置信度操作需要二次确认", 409, "AI_LOW_CONFIDENCE", action);
  }

  if (action.action !== "create" && action.matchQuery && !action.targetId) {
    throw new AppError("模糊匹配操作不能直接执行", 409, "AI_FUZZY_MATCH_FORBIDDEN", action);
  }

  if (unsafeAiActionKinds.includes(action.action as (typeof unsafeAiActionKinds)[number]) && !safetyAcknowledged) {
    throw new AppError("修改、删除、完成或取消操作需要二次确认", 409, "AI_RISK_ACK_REQUIRED", action);
  }

  if (unsafeAiActionKinds.includes(action.action as (typeof unsafeAiActionKinds)[number])) {
    assertTargetedAction(action);
  }
}

export async function parseScheduleInput(input: string): Promise<AiParseResult & { existingEvents: SerializedEvent[]; rawResponse: string }> {
  const env = getLlmEnv();
  const timezone = getAppTimezone();
  const existingEvents = await findRelevantEvents(input);
  const userPrompt = {
    currentDateTime: currentDateTimeWithOffset(timezone),
    timezone,
    userInput: input,
    existingEvents: existingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startAt: event.startAt,
      endAt: event.endAt,
      type: event.type,
      scope: event.scope,
      status: event.status,
      priority: event.priority,
      tags: event.tags
    }))
  };

  const endpoint = new URL(env.LLM_CHAT_COMPLETIONS_PATH, env.LLM_BASE_URL).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.LLM_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.LLM_API_KEY}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.LLM_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: scheduleSystemPrompt },
          { role: "user", content: JSON.stringify(userPrompt) }
        ]
      })
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new AppError("AI 服务响应超时", 504, "AI_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new AppError("AI 服务调用失败", 502, "AI_HTTP_ERROR", { status: response.status });
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const rawResponse = payload.choices?.[0]?.message?.content;
  if (!rawResponse) {
    throw new AppError("AI 响应缺少内容", 502, "AI_EMPTY_RESPONSE");
  }

  const parsed = aiParseResultSchema.parse(parseStrictJson(rawResponse));
  const checked = validateAiBusinessRules(parsed, existingEvents);

  await prisma.aiActionLog.create({
    data: {
      userInput: input,
      rawResponse,
      actionsJson: JSON.stringify(checked.actions),
      status: checked.clarificationNeeded ? "parsed_needs_clarification" : "parsed"
    }
  });

  return { ...checked, existingEvents, rawResponse };
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export function validateAiBusinessRules(result: AiParseResult, existingEvents: SerializedEvent[]): AiParseResult {
  const existingIds = new Set(existingEvents.map((event) => event.id));
  let clarificationNeeded = result.clarificationNeeded;
  let clarificationQuestion = result.clarificationQuestion;

  const actions = result.actions.map((action) => {
    if (action.action !== "create") {
      if (!action.targetId) {
        clarificationNeeded = true;
        clarificationQuestion ||= "请确认要操作的具体事项。";
      } else if (!existingIds.has(action.targetId)) {
        throw new AppError("AI 返回了不存在的目标事项", 422, "AI_UNKNOWN_TARGET", action);
      }
    }

    if (action.confidence < LOW_CONFIDENCE_THRESHOLD) {
      clarificationNeeded = true;
      clarificationQuestion ||= "AI 对这次操作不够确定，请确认后再执行。";
    }

    if (action.action !== "create" && action.matchQuery && !action.targetId) {
      clarificationNeeded = true;
      clarificationQuestion ||= "匹配到的事项不明确，请选择具体事项。";
    }

    return action;
  });

  return {
    clarificationNeeded,
    clarificationQuestion,
    actions
  };
}

export async function confirmAiActions(actions: AiAction[], userInput = "", safetyAcknowledged = false): Promise<ConfirmResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const applied: SerializedEvent[] = [];

      for (const action of actions) {
        assertSafeToExecute(action, safetyAcknowledged);

        if (action.action === "create") {
          if (!action.data?.title) {
            throw new AppError("创建操作缺少标题", 422, "AI_CREATE_DATA_INVALID", action);
          }
          applied.push(await createEvent(eventMutationSchema.parse(action.data), tx));
          continue;
        }

        assertTargetedAction(action);
        await assertEventExists(action.targetId, tx);

        if (action.action === "update") {
          if (!action.data || Object.keys(action.data).length === 0) {
            throw new AppError("更新操作缺少修改内容", 422, "AI_UPDATE_DATA_INVALID", action);
          }
          applied.push(await updateEvent(action.targetId, nonEmptyEventPatchSchema.parse(action.data), tx));
        } else if (action.action === "delete") {
          applied.push(await deleteEvent(action.targetId, tx));
        } else if (action.action === "complete") {
          applied.push(await setEventStatus(action.targetId, "DONE", tx));
        } else if (action.action === "cancel") {
          applied.push(await setEventStatus(action.targetId, "CANCELLED", tx));
        }
      }

      await tx.aiActionLog.create({
        data: {
          userInput,
          rawResponse: "",
          actionsJson: JSON.stringify(actions),
          status: "confirmed"
        }
      });

      return { applied, skipped: [] };
    });

    return result;
  } catch (error) {
    await recordFailedAiActionLog(actions, userInput, error);
    throw error;
  }
}

async function recordFailedAiActionLog(actions: AiAction[], userInput: string, error: unknown): Promise<void> {
  try {
    await prisma.aiActionLog.create({
      data: {
        userInput,
        rawResponse: "",
        actionsJson: JSON.stringify(actions),
        status: "failed",
        error: error instanceof Error ? error.message : "unknown error"
      }
    });
  } catch {
    // Failure logging must not mask the business error that caused the rollback.
  }
}

export async function actionPreview(actions: AiAction[]): Promise<Array<{ action: AiAction; target?: SerializedEvent }>> {
  return Promise.all(
    actions.map(async (action) => {
      if (!action.targetId) {
        return { action };
      }

      try {
        return { action, target: await getEvent(action.targetId) };
      } catch {
        return { action };
      }
    })
  );
}
