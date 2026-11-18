export function isLinkedInSessionConfigured(): boolean {
  return Boolean(process.env.LINKEDIN_LI_AT?.trim());
}

export function getLinkedInCookies(): Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "Lax" | "None";
}> {
  const liAt = process.env.LINKEDIN_LI_AT?.trim();
  if (!liAt) return [];

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

  const jsession = process.env.LINKEDIN_JSESSIONID?.trim();
  if (jsession) {
    cookies.push({
      name: "JSESSIONID",
      value: jsession.replace(/^"/, "").replace(/"$/, ""),
      domain: ".www.linkedin.com",
      path: "/",
      secure: true,
      httpOnly: false,
      sameSite: "None" as const,
    });
  }

  return cookies;
}