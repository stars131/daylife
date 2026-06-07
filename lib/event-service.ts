import type { Prisma } from "@prisma/client/index";
import { prisma } from "@/lib/prisma";
import { dateParamToRange, dayRange, getNow, monthRange, weekRange, type DateRange } from "@/lib/dates";
import type { EventMutationInput, EventPatchInput, EventQueryInput } from "@/lib/schemas";
import { AppError } from "@/lib/errors";

type EventDb = typeof prisma | Prisma.TransactionClient;

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
const unfinishedStatuses = ["TODO", "DOING"] as const;

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
    Object.assign(where, buildDateRangeOverlapWhere(range));
  }

  if (query.scope) where.scope = query.scope;
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.tag) where.tags = { contains: JSON.stringify(query.tag) };

  return where;
}

export function buildDateRangeOverlapWhere(range: DateRange): Prisma.EventWhereInput {
  return {
    OR: [
      { startAt: { gte: range.from, lte: range.to } },
      { endAt: { gte: range.from, lte: range.to } },
      {
        AND: [{ startAt: { lte: range.from } }, { endAt: { gte: range.to } }]
      }
    ]
  };
}

export async function listEvents(query: EventQueryInput = {}): Promise<SerializedEvent[]> {
  const events = await prisma.event.findMany({
    where: buildEventWhere(query),
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }]
  });
  const serialized = events.map(serializeEvent);
  return query.tag ? serialized.filter((event) => event.tags.includes(query.tag as string)) : serialized;
}

export async function getEvent(id: string): Promise<SerializedEvent> {
  const event = await getEventRecord(id);
  return serializeEvent(event);
}

async function getEventRecord(id: string, db: EventDb = prisma): Promise<EventRecord> {
  const event = await db.event.findUnique({ where: { id } });
  if (!event) {
    throw new AppError("事项不存在", 404, "EVENT_NOT_FOUND");
  }
  return event;
}

export async function createEvent(input: EventMutationInput, db: EventDb = prisma): Promise<SerializedEvent> {
  if (input.parentId) {
    await assertEventExists(input.parentId, db);
  }
  const event = await db.event.create({ data: toCreateData(input) });
  return serializeEvent(event);
}

export async function updateEvent(id: string, input: EventPatchInput, db: EventDb = prisma): Promise<SerializedEvent> {
  await assertEventExists(id, db);
  if (Object.keys(input).length === 0) {
    throw new AppError("至少提供一个要修改的字段", 422, "EVENT_EMPTY_UPDATE");
  }
  if (input.parentId !== undefined) {
    await assertParentChangeIsValid(id, input.parentId, db);
  }
  const event = await db.event.update({ where: { id }, data: toUpdateData(input) });
  return serializeEvent(event);
}

export async function deleteEvent(id: string, db: EventDb = prisma): Promise<SerializedEvent> {
  await assertEventExists(id, db);
  const existing = await db.event.findUniqueOrThrow({ where: { id } });
  await db.eventAuditLog.create({
    data: {
      eventId: existing.id,
      action: "delete",
      snapshotJson: JSON.stringify(serializeEvent(existing))
    }
  });
  const event = await db.event.delete({ where: { id } });
  return serializeEvent(event);
}

export async function deleteEventWithAudit(id: string): Promise<SerializedEvent> {
  return prisma.$transaction((tx) => deleteEvent(id, tx));
}

export async function setEventStatus(id: string, status: "DONE" | "CANCELLED", db: EventDb = prisma): Promise<SerializedEvent> {
  return updateEvent(id, { status }, db);
}

export async function assertEventExists(id: string, db: EventDb = prisma): Promise<void> {
  const count = await db.event.count({ where: { id } });
  if (count === 0) {
    throw new AppError("目标事项不存在", 404, "EVENT_NOT_FOUND");
  }
}

async function assertParentChangeIsValid(id: string, parentId: string | null, db: EventDb): Promise<void> {
  if (!parentId) {
    return;
  }

  if (parentId === id) {
    throw new AppError("父目标不能指向自身", 422, "EVENT_PARENT_SELF_REFERENCE");
  }

  let currentParentId: string | null = parentId;
  const visited = new Set<string>([id]);

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      throw new AppError("父目标关系不能形成循环", 422, "EVENT_PARENT_CYCLE");
    }

    visited.add(currentParentId);
    const parent: { parentId: string | null } | null = await db.event.findUnique({
      where: { id: currentParentId },
      select: { parentId: true }
    });

    if (!parent) {
      throw new AppError("父目标不存在", 404, "EVENT_PARENT_NOT_FOUND");
    }

    currentParentId = parent.parentId;
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
          buildDateRangeOverlapWhere(day),
          { scope: "DAY", status: { notIn: ["DONE", "CANCELLED"] } }
        ]
      },
      orderBy: [{ startAt: "asc" }, { priority: "desc" }]
    }),
    prisma.event.findMany({
      where: {
        status: { notIn: ["DONE", "CANCELLED"] },
        OR: [{ endAt: { lt: now } }, { startAt: { lt: now }, endAt: null }]
      },
      orderBy: [{ startAt: "asc" }]
    }),
    prisma.event.findMany({
      where: {
        OR: [buildDateRangeOverlapWhere(week), { scope: "WEEK" }]
      },
      orderBy: [{ startAt: "asc" }, { priority: "desc" }]
    }),
    prisma.event.findMany({
      where: {
        OR: [buildDateRangeOverlapWhere(month), { scope: "MONTH" }]
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
          status: { in: [...unfinishedStatuses] },
          OR: [
            ...keywords.flatMap((word) => [{ title: { contains: word } }, { description: { contains: word } }, { tags: { contains: word } }]),
            { scope: "LONG_TERM" },
            { type: "GOAL" }
          ]
        }
      : { status: { in: [...unfinishedStatuses] } };

  const events = await prisma.event.findMany({
    where,
    take: Math.min(limit * 2, 50),
    orderBy: [{ status: "asc" }, { startAt: "asc" }, { updatedAt: "desc" }]
  });

  const serialized = events.map(serializeEvent);
  const exactTagMatches = keywords.length > 0 ? serialized.filter((event) => event.tags.some((tag) => keywords.includes(tag))) : [];
  const titleOrDescriptionMatches =
    keywords.length > 0
      ? serialized.filter((event) =>
          keywords.some((word) => event.title.includes(word) || (event.description ? event.description.includes(word) : false))
        )
      : serialized;
  const byId = new Map([...exactTagMatches, ...titleOrDescriptionMatches, ...serialized].map((event) => [event.id, event]));
  return Array.from(byId.values()).slice(0, limit);
}
