import type { Prisma } from "@prisma/client/index";
import { prisma } from "@/lib/prisma";
import { dateParamToRange, dayRange, getNow, monthRange, weekRange } from "@/lib/dates";
import type { EventMutationInput, EventPatchInput, EventQueryInput } from "@/lib/schemas";
import { AppError } from "@/lib/errors";

export type SerializedEvent = {
  id: string;
  title: string;
  description: string | null;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  type: string;
  scope: string;
  status: string;
  priority: string;
  tags: string[];
  repeatRule: string | null;
  reminderAt: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

type EventRecord = Prisma.EventGetPayload<object>;

export function parseTags(tags: string): string[] {
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

export function serializeEvent(event: EventRecord): SerializedEvent {
  return {
    ...event,
    startAt: event.startAt?.toISOString() ?? null,
    endAt: event.endAt?.toISOString() ?? null,
    tags: parseTags(event.tags),
    reminderAt: event.reminderAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString()
  };
}

function toCreateData(input: EventMutationInput): Prisma.EventUncheckedCreateInput {
  return {
    title: input.title,
    description: input.description,
    startAt: input.startAt ? new Date(input.startAt) : null,
    endAt: input.endAt ? new Date(input.endAt) : null,
    allDay: input.allDay,
    type: input.type,
    scope: input.scope,
    status: input.status,
    priority: input.priority,
    tags: JSON.stringify(input.tags),
    repeatRule: input.repeatRule,
    reminderAt: input.reminderAt ? new Date(input.reminderAt) : null,
    parentId: input.parentId
  };
}

function toUpdateData(input: EventPatchInput): Prisma.EventUncheckedUpdateInput {
  const data: Prisma.EventUncheckedUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.startAt !== undefined) data.startAt = input.startAt ? new Date(input.startAt) : null;
  if (input.endAt !== undefined) data.endAt = input.endAt ? new Date(input.endAt) : null;
  if (input.allDay !== undefined) data.allDay = input.allDay;
  if (input.type !== undefined) data.type = input.type;
  if (input.scope !== undefined) data.scope = input.scope;
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);
  if (input.repeatRule !== undefined) data.repeatRule = input.repeatRule;
  if (input.reminderAt !== undefined) data.reminderAt = input.reminderAt ? new Date(input.reminderAt) : null;
  if (input.parentId !== undefined) data.parentId = input.parentId;

  return data;
}

export function buildEventWhere(query: EventQueryInput): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {};
  const range = dateParamToRange(query.from, query.to);

  if (range) {
    where.OR = [
      { startAt: { gte: range.from, lte: range.to } },
      { endAt: { gte: range.from, lte: range.to } }
    ];
  }

  if (query.scope) where.scope = query.scope;
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.tag) where.tags = { contains: query.tag };

  return where;
}

export async function listEvents(query: EventQueryInput = {}): Promise<SerializedEvent[]> {
  const events = await prisma.event.findMany({
    where: buildEventWhere(query),
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }]
  });
  return events.map(serializeEvent);
}

export async function getEvent(id: string): Promise<SerializedEvent> {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    throw new AppError("事项不存在", 404, "EVENT_NOT_FOUND");
  }
  return serializeEvent(event);
}

export async function createEvent(input: EventMutationInput): Promise<SerializedEvent> {
  if (input.parentId) {
    await assertEventExists(input.parentId);
  }
  const event = await prisma.event.create({ data: toCreateData(input) });
  return serializeEvent(event);
}

export async function updateEvent(id: string, input: EventPatchInput): Promise<SerializedEvent> {
  await assertEventExists(id);
  if (input.parentId) {
    await assertEventExists(input.parentId);
  }
  const event = await prisma.event.update({ where: { id }, data: toUpdateData(input) });
  return serializeEvent(event);
}

export async function deleteEvent(id: string): Promise<SerializedEvent> {
  await assertEventExists(id);
  const event = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.event.findUniqueOrThrow({ where: { id } });
    await tx.eventAuditLog.create({
      data: {
        eventId: existing.id,
        action: "delete",
        snapshotJson: JSON.stringify(serializeEvent(existing))
      }
    });
    return tx.event.delete({ where: { id } });
  });
  return serializeEvent(event);
}

export async function setEventStatus(id: string, status: "DONE" | "CANCELLED"): Promise<SerializedEvent> {
  return updateEvent(id, { status });
}

export async function assertEventExists(id: string): Promise<void> {
  const count = await prisma.event.count({ where: { id } });
  if (count === 0) {
    throw new AppError("目标事项不存在", 404, "EVENT_NOT_FOUND");
  }
}

export async function dashboardBuckets(now = getNow()): Promise<{
  today: SerializedEvent[];
  overdue: SerializedEvent[];
  week: SerializedEvent[];
  month: SerializedEvent[];
  goals: SerializedEvent[];
}> {
  const day = dayRange(now);
  const week = weekRange(now);
  const month = monthRange(now);

  const [today, overdue, weekItems, monthItems, goals] = await Promise.all([
    prisma.event.findMany({
      where: {
        OR: [
          { startAt: { gte: day.from, lte: day.to } },
          { scope: "DAY", status: { notIn: ["DONE", "CANCELLED"] } }
        ]
      },
      orderBy: [{ startAt: "asc" }, { priority: "desc" }]
    }),
    prisma.event.findMany({
      where: { startAt: { lt: now }, status: { notIn: ["DONE", "CANCELLED"] } },
      orderBy: [{ startAt: "asc" }]
    }),
    prisma.event.findMany({
      where: {
        OR: [{ startAt: { gte: week.from, lte: week.to } }, { scope: "WEEK" }]
      },
      orderBy: [{ startAt: "asc" }, { priority: "desc" }]
    }),
    prisma.event.findMany({
      where: {
        OR: [{ startAt: { gte: month.from, lte: month.to } }, { scope: "MONTH" }]
      },
      orderBy: [{ startAt: "asc" }, { priority: "desc" }]
    }),
    prisma.event.findMany({
      where: {
        OR: [{ scope: "LONG_TERM" }, { type: "GOAL", startAt: null }]
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
    })
  ]);

  return {
    today: today.map(serializeEvent),
    overdue: overdue.map(serializeEvent),
    week: weekItems.map(serializeEvent),
    month: monthItems.map(serializeEvent),
    goals: goals.map(serializeEvent)
  };
}

export async function findRelevantEvents(input: string, limit = 20): Promise<SerializedEvent[]> {
  const keywords = input
    .split(/[\s,，。.!！?？、]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    .slice(0, 8);

  const where: Prisma.EventWhereInput =
    keywords.length > 0
      ? {
          OR: keywords.flatMap((word) => [
            { title: { contains: word } },
            { description: { contains: word } },
            { tags: { contains: word } }
          ])
        }
      : {};

  const events = await prisma.event.findMany({
    where,
    take: limit,
    orderBy: [{ startAt: "asc" }, { updatedAt: "desc" }]
  });

  return events.map(serializeEvent);
}
