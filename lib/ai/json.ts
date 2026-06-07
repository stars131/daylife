import { AppError } from "@/lib/errors";

export function parseStrictJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AppError("AI 返回为空", 502, "AI_EMPTY_RESPONSE");
  }

  if (trimmed.startsWith("```")) {
    throw new AppError("AI 返回了 Markdown 代码块而不是纯 JSON", 502, "AI_NON_JSON_RESPONSE");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new AppError("AI 返回的内容不是合法 JSON", 502, "AI_INVALID_JSON");
  }
}
