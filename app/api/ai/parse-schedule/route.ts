import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { parseScheduleInput } from "@/lib/ai/service";
import { toErrorResponse } from "@/lib/errors";
import { aiParseRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    await requireSession();
    const input = aiParseRequestSchema.parse(await request.json());
    const result = await parseScheduleInput(input.input);
    return NextResponse.json({
      clarificationNeeded: result.clarificationNeeded,
      clarificationQuestion: result.clarificationQuestion,
      actions: result.actions,
      existingEvents: result.existingEvents
    });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
