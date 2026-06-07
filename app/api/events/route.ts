import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createEvent, listEvents } from "@/lib/event-service";
import { toErrorResponse } from "@/lib/errors";
import { parseJsonRequest } from "@/lib/request";
import { eventMutationSchema, eventQuerySchema } from "@/lib/schemas";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const query = eventQuerySchema.parse(Object.fromEntries(searchParams.entries()));
    return NextResponse.json({ events: await listEvents(query) });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const input = await parseJsonRequest(request, eventMutationSchema);
    return NextResponse.json({ event: await createEvent(input) }, { status: 201 });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
