import { timingSafeEqual } from "crypto";

export function verifyPassword(candidate: string): boolean {
  const expected = process.env.APP_PASSWORD?.trim();
  if (!expected) return false;

  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}