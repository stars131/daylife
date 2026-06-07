import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie, verifyAdminPassword } from "@/lib/auth";
import { AppError, toErrorResponse } from "@/lib/errors";
import { assertLoginAllowed, clearLoginFailures, loginRateLimitKey, recordFailedLogin } from "@/lib/rate-limit";
import { parseJsonRequest } from "@/lib/request";
import { loginRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const rateLimitKey = loginRateLimitKey(request);
    assertLoginAllowed(rateLimitKey);

    const input = await parseJsonRequest(request, loginRequestSchema);
    const valid = await verifyAdminPassword(input.password);
    if (!valid) {
      recordFailedLogin(rateLimitKey);
      throw new AppError("密码不正确", 401, "INVALID_CREDENTIALS");
    }

    clearLoginFailures(rateLimitKey);
    setSessionCookie(await createSessionToken());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
