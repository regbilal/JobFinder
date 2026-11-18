import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-password";
import {
  AUTH_COOKIE_NAME,
  cookieOptions,
  createSessionToken,
  isAppPasswordConfigured,
} from "@/lib/auth-session";

export async function POST(request: Request) {
  if (!isAppPasswordConfigured()) {
    return NextResponse.json(
      { error: "Server is not configured (APP_PASSWORD missing)." },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const password = body.password ?? "";
  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, cookieOptions());
  return response;
}