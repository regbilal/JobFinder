import { BROWSER_LIMITS, browserPostPlans } from "@/lib/automation/browser-fast";
import { withLinkedInBrowser } from "@/lib/automation/browser";
import { gotoLinkedIn } from "@/lib/automation/linkedin-page";
import { buildLinkedInContentSearchUrl } from "@/lib/job-board-urls";
import { canonicalLinkedInPostUrl } from "@/lib/linkedin-url";
import { computeMatchScore } from "@/lib/match-score";
import type { BrowserContext, Page } from "playwright-core";
import type { JobPost, JobSearchParams } from "@/lib/types";

async function scrapePostsFromPage(page: Page): Promise<
  {
    title: string;
    author: string;
    href: string;
    snippet: string;
  }[]
> {
  await page
    .waitForSelector(".reusable-search__result-container, a[href*='/posts/']", {
      timeout: BROWSER_LIMITS.selectorTimeoutMs,
    })
    .catch(() => undefined);

  return page.evaluate(() => {
    const items: {
      title: string;
      author: string;
      href: string;
      snippet: string;
    }[] = [];

    const cards = document.querySelectorAll(
      ".reusable-search__result-container, li.reusable-search__result-container"
    );

    cards.forEach((card) => {
      const link = card.querySelector<HTMLAnchorElement>(
        "a[href*='/posts/'], a[href*='feed/update']"
      );
      if (!link?.href) return;

      const title =
        card
          .querySelector(
            ".entity-result__title-text a span[aria-hidden='true']"
          )
          ?.textContent?.trim() ||
        link.textContent?.trim() ||
        "LinkedIn post";

      const author =
        card
          .querySelector(".entity-result__primary-subtitle")
          ?.textContent?.trim() || "LinkedIn member";

      const snippet =
        card.querySelector(".entity-result__summary")?.textContent?.trim() ||
        title;

      items.push({
        title,
        author,
        href: link.href,
        snippet,
      });
    });

    return items;
  });
}

async function runPostsInContext(
  context: BrowserContext,
  params: JobSearchParams
): Promise<JobPost[]> {
  const plans = browserPostPlans(params);
  const merged: JobPost[] = [];
  const seen = new Set<string>();

  const page = context.pages()[0] ?? (await context.newPage());

  for (const kw of plans) {
    const phrase = kw.join(" ");
    const url = buildLinkedInContentSearchUrl(
      phrase,
      params.location,
      params.dateRange,
      { forBrowser: true }
    );

    try {
      await gotoLinkedIn(page, url);
    } catch {
      const minimal = buildLinkedInContentSearchUrl(
        kw[0] ?? phrase,
        undefined,
        undefined,
        { forBrowser: true }
      );
      await gotoLinkedIn(page, minimal);
    }

    const batch = await scrapePostsFromPage(page);

    for (const row of batch) {
      const applyUrl = canonicalLinkedInPostUrl(row.href);
      if (!applyUrl || seen.has(applyUrl)) continue;
      seen.add(applyUrl);

      merged.push({
        id: `browser-post-${applyUrl}`,
        kind: "post",
        title: row.title,
        company: row.author,
        location: params.location.trim() || "—",
        matchScore: computeMatchScore(params.keywords, row.title, row.snippet),
        datePosted: new Date().toISOString(),
        applyUrl,
        applyLinkType: "listing",
        source: "linkedin",
        dataProvider: "browser",
        descriptionSnippet: row.snippet,
      });
      if (merged.length >= BROWSER_LIMITS.maxPosts) break;
    }
    if (merged.length >= BROWSER_LIMITS.maxPosts) break;
  }

  return merged;
}

export async function fetchPostsWithBrowser(
  params: JobSearchParams,
  context?: BrowserContext
): Promise<JobPost[]> {
  if (context) return runPostsInContext(context, params);
  return withLinkedInBrowser((ctx) => runPostsInContext(ctx, params));
}