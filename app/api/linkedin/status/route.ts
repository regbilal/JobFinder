import { NextResponse } from "next/server";
import { resolveLinkedInLiAt } from "@/lib/linkedin-cookie-store";

export async function GET() {
  const { liAt, source } = await resolveLinkedInLiAt();
  return NextResponse.json({
    connected: Boolean(liAt),
    source,
  });
}