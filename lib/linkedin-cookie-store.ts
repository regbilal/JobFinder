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

export type LinkedInStoredSession = {
  liAt: string;
  jsessionId?: string;
};

function parseStoredSession(plain: string): LinkedInStoredSession | null {
  const trimmed = plain.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as LinkedInStoredSession;
      if (typeof data.liAt === "string" && data.liAt.length > 10) return data;
    } catch {
      return null;
    }
  }
  if (trimmed.length > 20) return { liAt: trimmed };
  return null;
}

export async function sealLinkedInSession(
  session: LinkedInStoredSession
): Promise<string> {
  return sealLiAt(JSON.stringify(session));
}

export async function resolveLinkedInSession(): Promise<{
  liAt: string | null;
  jsessionId: string | null;
  source: "env" | "cookie" | "none";
}> {
  const fromEnv = process.env.LINKEDIN_LI_AT?.trim();
  if (fromEnv) {
    return {
      liAt: fromEnv,
      jsessionId: process.env.LINKEDIN_JSESSIONID?.trim() ?? null,
      source: "env",
    };
  }

  const jar = await cookies();
  const sealed = jar.get(LINKEDIN_SESSION_COOKIE)?.value;
  if (sealed) {
    const plain = await unsealLiAt(sealed);
    const session = plain ? parseStoredSession(plain) : null;
    if (session) {
      return {
        liAt: session.liAt,
        jsessionId: session.jsessionId ?? null,
        source: "cookie",
      };
    }
  }

  return { liAt: null, jsessionId: null, source: "none" };
}

export async function resolveLinkedInLiAt(): Promise<{
  liAt: string | null;
  source: "env" | "cookie" | "none";
}> {
  const { liAt, source } = await resolveLinkedInSession();
  return { liAt, source };
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