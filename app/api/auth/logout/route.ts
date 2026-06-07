import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";

export async function POST() {
  try {
    clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
