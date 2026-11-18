import { NextResponse } from "next/server";
import { loginLinkedInWithCredentials } from "@/lib/automation/linkedin-login";
import {
  LINKEDIN_SESSION_COOKIE,
  linkedInSessionCookieOptions,
  sealLiAt,
} from "@/lib/linkedin-cookie-store";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; liAt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (typeof body.liAt === "string" && body.liAt.trim().length > 20) {
    const sealed = await sealLiAt(body.liAt.trim());
    const response = NextResponse.json({ ok: true, method: "paste" });
    response.cookies.set(
      LINKEDIN_SESSION_COOKIE,
      sealed,
      linkedInSessionCookieOptions()
    );
    return response;
  }

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Provide email and password, or paste li_at." },
      { status: 400 }
    );
  }

  const result = await loginLinkedInWithCredentials(email, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  const sealed = await sealLiAt(result.liAt);
  const response = NextResponse.json({ ok: true, method: "login" });
  response.cookies.set(
    LINKEDIN_SESSION_COOKIE,
    sealed,
    linkedInSessionCookieOptions()
  );
  return response;
}