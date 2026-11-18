import type { Browser, BrowserContext } from "playwright-core";
import {
  formatPlaywrightLaunchError,
  launchChromium,
} from "@/lib/automation/chromium-launch";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type LinkedInLoginResult =
  | { ok: true; liAt: string; jsessionId?: string }
  | { ok: false; reason: string };

async function launchBrowser(): Promise<Browser> {
  return launchChromium();
}

export async function loginLinkedInWithCredentials(
  email: string,
  password: string
): Promise<LinkedInLoginResult> {
  if (!email.trim() || !password) {
    return { ok: false, reason: "Email and password are required." };
  }

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const context: BrowserContext = await browser.newContext({
      userAgent: USER_AGENT,
      locale: "fr-FR",
    });
    const page = await context.newPage();

    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.fill('input[name="session_key"]', email.trim());
    await page.fill('input[name="session_password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForLoadState("domcontentloaded", { timeout: 90_000 });
    await page.waitForTimeout(3000);

    const url = page.url();
    if (url.includes("/checkpoint/") || url.includes("/challenge")) {
      return {
        ok: false,
        reason:
          "LinkedIn asked for verification (2FA / CAPTCHA). Complete login in a browser, copy li_at, and use “Paste cookie” instead.",
      };
    }

    if (url.includes("/login") && (await page.locator("#error-for-password").count()) > 0) {
      return { ok: false, reason: "LinkedIn rejected the email or password." };
    }

    await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    if (page.url().includes("/login") || page.url().includes("authwall")) {
      return { ok: false, reason: "Login did not complete. Check credentials." };
    }

    const cookies = await context.cookies("https://www.linkedin.com");
    const liAt = cookies.find((c) => c.name === "li_at")?.value;
    if (!liAt) {
      return {
        ok: false,
        reason: "Login seemed to succeed but no session cookie was returned.",
      };
    }

    const jsession = cookies.find((c) => c.name === "JSESSIONID")?.value;

    return { ok: true, liAt, jsessionId: jsession };
  } catch (e) {
    return {
      ok: false,
      reason: formatPlaywrightLaunchError(e),
    };
  } finally {
    await browser?.close();
  }
}