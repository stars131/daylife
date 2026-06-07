-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL CHECK ("type" IN ('EVENT', 'TASK', 'HABIT', 'GOAL')),
    "scope" TEXT NOT NULL CHECK ("scope" IN ('DAY', 'WEEK', 'MONTH', 'LONG_TERM')),
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM' CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH')),
    "tags" TEXT NOT NULL DEFAULT '[]',
    "repeatRule" TEXT,
    "reminderAt" DATETIME,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CHECK ("status" IN ('TODO', 'DOING', 'DONE', 'CANCELLED')),
    CHECK ("endAt" IS NULL OR "startAt" IS NULL OR "endAt" >= "startAt"),
    CHECK ("parentId" IS NULL OR "parentId" <> "id")
);

-- CreateTable
CREATE TABLE "AiActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userInput" TEXT NOT NULL,
    "rawResponse" TEXT NOT NULL,
    "actionsJson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EventAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Event_startAt_idx" ON "Event"("startAt");

-- CreateIndex
CREATE INDEX "Event_scope_idx" ON "Event"("scope");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_parentId_idx" ON "Event"("parentId");

-- CreateIndex
CREATE INDEX "EventAuditLog_eventId_idx" ON "EventAuditLog"("eventId");

-- CreateIndex
CREATE INDEX "EventAuditLog_action_idx" ON "EventAuditLog"("action");
