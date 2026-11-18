import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  isAppPasswordConfigured,
  validateSessionToken,
} from "@/lib/auth-session";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  if (!isAppPasswordConfigured()) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "APP_PASSWORD is not configured on the server." },
        { status: 503 }
      );
    }
    return new NextResponse(
      "JobFinder is not configured. Set APP_PASSWORD in your environment.",
      { status: 503 }
    );
  }

  if (isPublicPath(pathname)) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (pathname === "/login" && (await validateSessionToken(token))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!(await validateSessionToken(token))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};