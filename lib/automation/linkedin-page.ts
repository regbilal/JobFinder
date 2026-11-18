import type { Page } from "playwright-core";

export async function warmLinkedInHome(page: Page): Promise<void> {
  await page.goto("https://www.linkedin.com/", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.goto("https://www.linkedin.com/feed/", {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForTimeout(1500);

  const dismissers = [
    'button[aria-label*="Dismiss"]',
    'button[aria-label*="Fermer"]',
    'button[aria-label*="dismiss"]',
  ];
  for (const sel of dismissers) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => undefined);
      await page.waitForTimeout(400);
    }
  }
}

export function assertLinkedInSession(page: Page): void {
  const url = page.url();
  if (url.includes("/login") || url.includes("/authwall") || url.includes("/checkpoint")) {
    throw new Error(
      "LinkedIn session expired or needs verification. Reconnect or paste a fresh li_at cookie."
    );
  }
}

export async function gotoLinkedIn(
  page: Page,
  url: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 60_000;
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout,
      referer: "https://www.linkedin.com/feed/",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ERR_TOO_MANY_REDIRECTS")) {
      throw new Error(
        "LinkedIn blocked this search URL (redirect loop). Try job-only mode, shorter keywords, or reconnect LinkedIn."
      );
    }
    throw e;
  }
  assertLinkedInSession(page);
}