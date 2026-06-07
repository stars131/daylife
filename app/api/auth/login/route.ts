import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie, verifyAdminPassword } from "@/lib/auth";
import { AppError, toErrorResponse } from "@/lib/errors";
import { loginRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const input = loginRequestSchema.parse(await request.json());
    const valid = await verifyAdminPassword(input.password);
    if (!valid) {
      throw new AppError("密码不正确", 401, "INVALID_CREDENTIALS");
    }

    setSessionCookie(await createSessionToken());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
