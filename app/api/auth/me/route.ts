import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();
    return NextResponse.json({ user: session });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
