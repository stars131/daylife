import { AppError } from "@/lib/errors";
import { getClientIp } from "@/lib/request";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const records = new Map<string, RateLimitRecord>();
let lastPrunedAt = 0;

const loginLimit = {
  limit: 5,
  windowMs: 15 * 60 * 1000
} satisfies RateLimitOptions;

const aiLimit = {
  limit: 30,
  windowMs: 60 * 1000
} satisfies RateLimitOptions;

function activeRecord(key: string, options: RateLimitOptions, now = Date.now()): RateLimitRecord {
  pruneExpiredRecords(now);
  const existing = records.get(key);
  if (existing && existing.resetAt > now) {
    return existing;
  }

  const created = { count: 0, resetAt: now + options.windowMs };
  records.set(key, created);
  return created;
}

function pruneExpiredRecords(now = Date.now()): void {
  if (now - lastPrunedAt < 60 * 1000) {
    return;
  }

  lastPrunedAt = now;
  for (const [key, record] of records) {
    if (record.resetAt <= now) {
      records.delete(key);
    }
  }
}

function retryAfterSeconds(record: RateLimitRecord, now = Date.now()): number {
  return Math.max(1, Math.ceil((record.resetAt - now) / 1000));
}

export function loginRateLimitKey(request: Request): string {
  return `login:${getClientIp(request)}`;
}

export function aiRateLimitKey(request: Request): string {
  return `ai:${getClientIp(request)}`;
}

export function assertLoginAllowed(key: string): void {
  const record = activeRecord(key, loginLimit);
  if (record.count >= loginLimit.limit) {
    throw new AppError("登录尝试过于频繁，请稍后再试", 429, "RATE_LIMITED", {
      retryAfterSeconds: retryAfterSeconds(record)
    });
  }
}

export function recordFailedLogin(key: string): void {
  const record = activeRecord(key, loginLimit);
  record.count += 1;
}

export function clearLoginFailures(key: string): void {
  records.delete(key);
}

export function assertAiRequestAllowed(key: string): void {
  const record = activeRecord(key, aiLimit);
  if (record.count >= aiLimit.limit) {
    throw new AppError("AI 请求过于频繁，请稍后再试", 429, "RATE_LIMITED", {
      retryAfterSeconds: retryAfterSeconds(record)
    });
  }
  record.count += 1;
}

export function resetRateLimitsForTests(): void {
  records.clear();
  lastPrunedAt = 0;
}
