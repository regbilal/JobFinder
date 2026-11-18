import { cookies } from "next/headers";

export const LINKEDIN_SESSION_COOKIE = "jobfinder_linkedin";

function getSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.APP_PASSWORD?.trim() ||
    ""
  );
}

async function deriveAesKey(): Promise<CryptoKey> {
  const secret = getSecret();
  if (!secret) throw new Error("APP_PASSWORD / AUTH_SECRET required");
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`linkedin-session:${secret}`)
  );
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function sealLiAt(liAt: string): Promise<string> {
  const key = await deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(liAt)
  );
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.length);
  return `v1.${Buffer.from(packed).toString("base64url")}`;
}

export async function unsealLiAt(sealed: string): Promise<string | null> {
  if (!sealed.startsWith("v1.")) return null;
  try {
    const raw = Buffer.from(sealed.slice(3), "base64url");
    const iv = raw.subarray(0, 12);
    const data = raw.subarray(12);
    const key = await deriveAesKey();
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export async function resolveLinkedInLiAt(): Promise<{
  liAt: string | null;
  source: "env" | "cookie" | "none";
}> {
  const fromEnv = process.env.LINKEDIN_LI_AT?.trim();
  if (fromEnv) return { liAt: fromEnv, source: "env" };

  const jar = await cookies();
  const sealed = jar.get(LINKEDIN_SESSION_COOKIE)?.value;
  if (sealed) {
    const liAt = await unsealLiAt(sealed);
    if (liAt) return { liAt, source: "cookie" };
  }

  return { liAt: null, source: "none" };
}

export function linkedInSessionCookieOptions(maxAge = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}