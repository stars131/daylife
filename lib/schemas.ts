import { z } from "zod";
import { AI_ACTIONS, EVENT_SCOPES, EVENT_STATUSES, EVENT_TYPES, PRIORITIES } from "@/lib/constants";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const stringBooleanToBoolean = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return value;
};

const strictBooleanSchema = z.preprocess(stringBooleanToBoolean, z.boolean());
const nullableDateString = z
  .preprocess(emptyToUndefined, z.string().datetime({ offset: true }).nullable().optional())
  .transform((value) => value ?? null);
const tagSchema = z.string().trim().min(1).max(30);
const tagListSchema = z
  .array(tagSchema)
  .transform((tags) => Array.from(new Set(tags)))
  .pipe(z.array(tagSchema).max(12));
const repeatRulePattern = /^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;[A-Z][A-Z0-9_]*=[A-Z0-9_,+-]+)*$/;
const emptyStringToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const repeatRuleSchema = z
  .preprocess(
    emptyStringToUndefined,
    z.string().trim().max(200).regex(repeatRulePattern, "重复规则必须使用 RRULE 格式，例如 FREQ=WEEKLY;BYDAY=MO").nullable().optional()
  )
  .transform((value) => value ?? null);

export const eventTypeSchema = z.enum(EVENT_TYPES);
export const eventScopeSchema = z.enum(EVENT_SCOPES);
export const eventStatusSchema = z.enum(EVENT_STATUSES);
export const prioritySchema = z.enum(PRIORITIES);

const eventObjectSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(160),
  description: z.string().trim().max(2000).nullable().optional().transform((value) => value || null),
  startAt: nullableDateString,
  endAt: nullableDateString,
  allDay: strictBooleanSchema.default(false),
  type: eventTypeSchema.default("TASK"),
  scope: eventScopeSchema.default("DAY"),
  status: eventStatusSchema.default("TODO"),
  priority: prioritySchema.default("MEDIUM"),
  tags: tagListSchema.default([]),
  repeatRule: repeatRuleSchema,
  reminderAt: nullableDateString,
  parentId: z.string().trim().min(1).nullable().optional().transform((value) => value || null)
});

function validateDateOrder(value: { startAt?: string | null; endAt?: string | null }, ctx: z.RefinementCtx) {
  if (value.startAt && value.endAt && new Date(value.endAt).getTime() < new Date(value.startAt).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endAt"],
      message: "结束时间不能早于开始时间"
    });
  }
}

export const eventMutationSchema = eventObjectSchema.superRefine(validateDateOrder);

export const eventPatchSchema = eventObjectSchema.partial().superRefine(validateDateOrder);

export const eventQuerySchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    scope: eventScopeSchema.optional(),
    status: eventStatusSchema.optional(),
    type: eventTypeSchema.optional(),
    tag: z.string().trim().min(1).optional()
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "结束日期不能早于开始日期"
      });
    }
  });

export const nonEmptyEventPatchSchema = eventPatchSchema.refine((value) => Object.keys(value).length > 0, {
  message: "至少提供一个要修改的字段"
});

export const aiActionDataSchema = eventObjectSchema.partial().extend({
  tags: tagListSchema.optional()
});

export const aiActionSchema = z
  .object({
    action: z.enum(AI_ACTIONS),
    targetId: z.string().trim().min(1).nullable().optional(),
    matchQuery: z.string().trim().min(1).nullable().optional(),
    data: aiActionDataSchema.nullable().optional(),
    confidence: z.number().min(0).max(1),
    reason: z.string().trim().max(500).optional().default("")
  })
  .superRefine((value, ctx) => {
    if (value.action === "create" && !value.data?.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data", "title"],
        message: "创建操作必须包含标题"
      });
    }
  });

export const aiParseResultSchema = z.object({
  clarificationNeeded: z.boolean(),
  clarificationQuestion: z.string().trim().max(500).nullable(),
  actions: z.array(aiActionSchema).max(10)
});

export const aiParseRequestSchema = z.object({
  input: z.string().trim().min(1, "请输入要处理的内容").max(2000)
});

export const aiConfirmRequestSchema = z.object({
  userInput: z.string().trim().max(2000).optional().default(""),
  actions: z.array(aiActionSchema).min(1).max(10),
  safetyAcknowledged: strictBooleanSchema.optional().default(false)
});

export const loginRequestSchema = z.object({
  password: z.string().min(1).max(500)
});

export type EventMutationInput = z.infer<typeof eventMutationSchema>;
export type EventPatchInput = z.infer<typeof eventPatchSchema>;
export type NonEmptyEventPatchInput = z.infer<typeof nonEmptyEventPatchSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type AiAction = z.infer<typeof aiActionSchema>;
export type AiParseResult = z.infer<typeof aiParseResultSchema>;
