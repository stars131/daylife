import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { confirmAiActions } from "@/lib/ai/service";
import { toErrorResponse } from "@/lib/errors";
import { aiConfirmRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    await requireSession();
    const input = aiConfirmRequestSchema.parse(await request.json());
    return NextResponse.json(await confirmAiActions(input.actions, input.userInput, input.safetyAcknowledged));
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
