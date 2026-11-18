import { getLinkedInCookies, isLinkedInSessionConfigured } from "@/lib/automation/linkedin-session";
import type { Browser, BrowserContext } from "playwright-core";
import { chromium } from "playwright-core";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function withLinkedInBrowser<T>(
  fn: (context: BrowserContext) => Promise<T>
): Promise<T> {
  if (!isLinkedInSessionConfigured()) {
    throw new Error(
      "LINKEDIN_LI_AT is not set. Export your session cookie from linkedin.com (see README)."
    );
  }

  let browser: Browser | null = null;
  try {
    const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() ||
    process.env.CHROME_PATH?.trim();

    browser = await chromium.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const context = await browser.newContext({
      userAgent: USER_AGENT,
      locale: "fr-FR",
      viewport: { width: 1280, height: 900 },
    });

    await context.addCookies(getLinkedInCookies());

    const page = await context.newPage();
    await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    if (page.url().includes("/login") || page.url().includes("/authwall")) {
      throw new Error(
        "LinkedIn session cookie expired or invalid. Sign in again and update LINKEDIN_LI_AT."
      );
    }

    return await fn(context);
  } finally {
    await browser?.close();
  }
}