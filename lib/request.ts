import type { z } from "zod";
import { AppError } from "@/lib/errors";

export async function parseJsonRequest<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("请求体必须是合法 JSON", 400, "INVALID_JSON");
  }

  return schema.parse(body);
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
