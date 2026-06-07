import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "BAD_REQUEST",
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function toErrorResponse(error: unknown): { status: number; body: { error: string; code: string; details?: unknown } } {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: error.message, code: error.code, details: error.details }
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 422,
      body: { error: "输入或输出格式不符合要求", code: "VALIDATION_ERROR", details: error.flatten() }
    };
  }

  return {
    status: 500,
    body: { error: "服务器处理失败", code: "INTERNAL_ERROR" }
  };
}
