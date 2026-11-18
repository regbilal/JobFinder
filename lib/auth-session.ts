export const AUTH_COOKIE_NAME = "jobfinder_auth";

const SESSION_VERSION = "v1";

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.APP_PASSWORD?.trim() ||
    ""
  );
}

export function isAppPasswordConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD?.trim());
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(): Promise<string> {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error("APP_PASSWORD is not configured");
  }
  const payload = `${SESSION_VERSION}:${Date.now()}`;
  const sig = await hmacSha256Hex(secret, payload);
  return `${payload}:${sig}`;
}

export async function validateSessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const secret = getAuthSecret();
  if (!secret) return false;

  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [version, , sig] = parts;
  if (version !== SESSION_VERSION) return false;

  const payload = `${parts[0]}:${parts[1]}`;
  const expected = await hmacSha256Hex(secret, payload);

  if (sig.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function cookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}