import { z } from "zod";
import { isValidTimezone } from "@/lib/timezone";

const appTimezoneSchema = z.string().min(1).refine(isValidTimezone, "must be a valid IANA timezone");
const bcryptHashSchema = z.string().regex(/^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/, "must be a valid bcrypt hash");
const placeholderProtectedKeys = ["SESSION_SECRET", "ADMIN_PASSWORD_HASH", "LLM_API_KEY"] as const;

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().optional(),
  APP_TIMEZONE: appTimezoneSchema.default("Australia/Perth"),
  DATABASE_URL: z.string().min(1)
});

const authEnvSchema = baseEnvSchema.extend({
  SESSION_SECRET: z.string().min(32),
  ADMIN_PASSWORD_HASH: bcryptHashSchema
});

const llmEnvSchema = baseEnvSchema.extend({
  LLM_BASE_URL: z.string().url().default("https://x666.me"),
  LLM_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  LLM_API_KEY: z.string().min(1),
  LLM_CHAT_COMPLETIONS_PATH: z.string().startsWith("/").default("/v1/chat/completions"),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000)
});

const serverEnvSchema = authEnvSchema.merge(llmEnvSchema);

export type AuthEnv = z.output<typeof authEnvSchema>;
export type LlmEnv = z.output<typeof llmEnvSchema>;
export type ServerEnv = z.output<typeof serverEnvSchema>;

function parseEnv<T extends z.ZodTypeAny>(schema: T, label: string): z.output<T> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid ${label} environment: ${message}`);
  }
  assertNoProductionPlaceholders(parsed.data, label);
  return parsed.data;
}

function assertNoProductionPlaceholders(env: unknown, label: string): void {
  if (!env || typeof env !== "object") {
    return;
  }

  const values = env as Partial<Record<(typeof placeholderProtectedKeys)[number] | "NODE_ENV", unknown>>;
  if (values.NODE_ENV !== "production") {
    return;
  }

  for (const key of placeholderProtectedKeys) {
    const value = values[key];
    if (typeof value === "string" && isPlaceholderValue(value)) {
      throw new Error(`Invalid ${label} environment: ${key}: must not use a placeholder value in production`);
    }
  }
}

function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("replace-with-") || normalized === "test-placeholder";
}

export function getServerEnv(): ServerEnv {
  return parseEnv(serverEnvSchema, "server");
}

export function getAuthEnv(): AuthEnv {
  return parseEnv(authEnvSchema, "auth");
}

export function getLlmEnv(): LlmEnv {
  return parseEnv(llmEnvSchema, "LLM");
}

export function getAppTimezone(): string {
  const timezone = process.env.APP_TIMEZONE || "Australia/Perth";
  if (!isValidTimezone(timezone)) {
    throw new Error("Invalid APP_TIMEZONE environment: APP_TIMEZONE must be a valid IANA timezone");
  }
  return timezone;
}

export function getOptionalAppUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}
