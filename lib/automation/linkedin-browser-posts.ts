import { withLinkedInBrowser } from "@/lib/automation/browser";
import { buildLinkedInContentSearchUrl } from "@/lib/job-board-urls";
import { canonicalLinkedInPostUrl } from "@/lib/linkedin-url";
import { computeMatchScore } from "@/lib/match-score";
import { expandKeywordPlans } from "@/lib/search-plans";
import type { JobPost, JobSearchParams } from "@/lib/types";

export async function fetchPostsWithBrowser(
  params: JobSearchParams
): Promise<JobPost[]> {
  const plans = expandKeywordPlans(params.keywords).slice(0, 4);
  const merged: JobPost[] = [];
  const seen = new Set<string>();

  await withLinkedInBrowser(async (context) => {
    const page = context.pages()[0] ?? (await context.newPage());

    for (const kw of plans) {
      const phrase = kw.join(" ");
      const url = buildLinkedInContentSearchUrl(
        phrase,
        params.location,
        params.dateRange
      );

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(2500);

      const batch = await page.evaluate(() => {
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
            card
              .querySelector(".entity-result__summary")
              ?.textContent?.trim() || title;

          items.push({
            title,
            author,
            href: link.href,
            snippet,
          });
        });

        return items;
      });

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
          matchScore: computeMatchScore(
            params.keywords,
            row.title,
            row.snippet
          ),
          datePosted: new Date().toISOString(),
          applyUrl,
          applyLinkType: "listing",
          source: "linkedin",
          dataProvider: "browser",
          descriptionSnippet: row.snippet,
        });
      }
    }
  });

  return merged;
}