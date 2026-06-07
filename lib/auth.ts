import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { getAuthEnv } from "@/lib/env";

type SessionPayload = {
  role: "admin";
};

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getAuthEnv().SESSION_SECRET);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" satisfies SessionPayload["role"] })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, getSecret());
    if (verified.payload.role !== "admin") {
      return null;
    }
    return { role: "admin" };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    throw new AppError("请先登录", 401, "UNAUTHORIZED");
  }
  return session;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const { ADMIN_PASSWORD_HASH } = getAuthEnv();
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

export function setSessionCookie(token: string): void {
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearSessionCookie(): void {
  cookies().set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
