export const APP_NAME = "日程安排";

export const EVENT_TYPES = ["EVENT", "TASK", "HABIT", "GOAL"] as const;
export const EVENT_SCOPES = ["DAY", "WEEK", "MONTH", "LONG_TERM"] as const;
export const EVENT_STATUSES = ["TODO", "DOING", "DONE", "CANCELLED"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const AI_ACTIONS = ["create", "update", "delete", "complete", "cancel"] as const;

export const unsafeAiActionKinds = ["update", "delete", "complete", "cancel"] as const;

export const LOW_CONFIDENCE_THRESHOLD = 0.75;

export const SESSION_COOKIE_NAME = "schedule_session";
