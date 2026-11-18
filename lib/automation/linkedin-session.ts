import { resolveLinkedInLiAt } from "@/lib/linkedin-cookie-store";

export async function isLinkedInSessionConfigured(): Promise<boolean> {
  const { liAt } = await resolveLinkedInLiAt();
  return Boolean(liAt);
}

export function buildLinkedInPlaywrightCookies(liAt: string, jsessionId?: string) {
  const cookies = [
    {
      name: "li_at",
      value: liAt,
      domain: ".linkedin.com",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "None" as const,
    },
  ];

  if (jsessionId) {
    cookies.push({
      name: "JSESSIONID",
      value: jsessionId.replace(/^"/, "").replace(/"$/, ""),
      domain: ".www.linkedin.com",
      path: "/",
      secure: true,
      httpOnly: false,
      sameSite: "None" as const,
    });
  }

  return cookies;
}

export async function getLinkedInCookies(): Promise<
  Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: "Lax" | "None";
  }>
> {
  const { liAt } = await resolveLinkedInLiAt();
  if (!liAt) return [];

  const jsession = process.env.LINKEDIN_JSESSIONID?.trim();
  return buildLinkedInPlaywrightCookies(liAt, jsession);
}