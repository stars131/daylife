import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { safeRedirectPath } from "@/lib/redirects";

const publicPaths = ["/login"];
const publicApiPaths = ["/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicApiPath(pathname: string): boolean {
  return publicApiPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret || secret.length < 32) {
    return false;
  }

  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(secret));
    return verified.payload.role === "admin";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  const authed = await hasValidSession(request);
  if (authed) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", safeRedirectPath(`${pathname}${request.nextUrl.search}`));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"]
};
