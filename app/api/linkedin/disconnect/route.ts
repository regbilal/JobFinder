import { NextResponse } from "next/server";
import { LINKEDIN_SESSION_COOKIE } from "@/lib/linkedin-cookie-store";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(LINKEDIN_SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}