import { z } from "zod";

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().optional(),
  APP_TIMEZONE: z.string().min(1).default("Australia/Perth"),
  DATABASE_URL: z.string().min(1)
});

const authEnvSchema = baseEnvSchema.extend({
  SESSION_SECRET: z.string().min(32),
  ADMIN_PASSWORD_HASH: z.string().min(20)
});

const llmEnvSchema = baseEnvSchema.extend({
  LLM_BASE_URL: z.string().url().default("https://x666.me"),
  LLM_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  LLM_API_KEY: z.string().min(1),
  LLM_CHAT_COMPLETIONS_PATH: z.string().startsWith("/").default("/v1/chat/completions")
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
  return parsed.data;
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
  return process.env.APP_TIMEZONE || "Australia/Perth";
}

export function getOptionalAppUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}
