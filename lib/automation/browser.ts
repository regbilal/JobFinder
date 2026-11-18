import {
  getLinkedInCookies,
} from "@/lib/automation/linkedin-session";
import { attachFastNetworking } from "@/lib/automation/browser-fast";
import { assertLinkedInSession, warmLinkedInHome } from "@/lib/automation/linkedin-page";
import { resolveLinkedInLiAt } from "@/lib/linkedin-cookie-store";
import type { BrowserContext } from "playwright-core";
import { launchChromium } from "@/lib/automation/chromium-launch";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function withLinkedInBrowser<T>(
  fn: (context: BrowserContext) => Promise<T>
): Promise<T> {
  const { liAt } = await resolveLinkedInLiAt();
  if (!liAt) {
    throw new Error(
      'Click "Connect LinkedIn" on the dashboard (or set LINKEDIN_LI_AT).'
    );
  }

  let browser: Awaited<ReturnType<typeof launchChromium>> | null = null;
  try {
    browser = await launchChromium();

    const context = await browser.newContext({
      userAgent: USER_AGENT,
      locale: "fr-FR",
      viewport: { width: 1280, height: 900 },
    });

    await attachFastNetworking(context);

    const seeded = await getLinkedInCookies();
    await context.addCookies([
      ...seeded,
      {
        name: "lang",
        value: "v=2&lang=fr-fr",
        domain: ".linkedin.com",
        path: "/",
      },
    ]);

    const page = await context.newPage();
    await warmLinkedInHome(page);
    assertLinkedInSession(page);

    return await fn(context);
  } finally {
    await browser?.close();
  }
}