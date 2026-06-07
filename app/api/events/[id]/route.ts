import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { deleteEventWithAudit, getEvent, updateEvent } from "@/lib/event-service";
import { toErrorResponse } from "@/lib/errors";
import { nonEmptyEventPatchSchema } from "@/lib/schemas";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    await requireSession();
    const { id } = paramsSchema.parse(context.params);
    return NextResponse.json({ event: await getEvent(id) });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    await requireSession();
    const { id } = paramsSchema.parse(context.params);
    const input = nonEmptyEventPatchSchema.parse(await request.json());
    return NextResponse.json({ event: await updateEvent(id, input) });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  try {
    await requireSession();
    const { id } = paramsSchema.parse(context.params);
    return NextResponse.json({ event: await deleteEventWithAudit(id) });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
