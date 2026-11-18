import { withLinkedInBrowser } from "@/lib/automation/browser";
import { buildLinkedInJobSearchUrl } from "@/lib/job-board-urls";
import { computeMatchScore } from "@/lib/match-score";
import { expandKeywordPlans } from "@/lib/search-plans";
import type { JobPost, JobSearchParams } from "@/lib/types";

type ScrapedJob = {
  title: string;
  company: string;
  location: string;
  applyUrl: string;
  snippet: string;
};

export async function fetchJobsWithBrowser(
  params: JobSearchParams
): Promise<JobPost[]> {
  const plans = expandKeywordPlans(params.keywords).slice(0, 5);
  const merged: JobPost[] = [];
  const seen = new Set<string>();

  await withLinkedInBrowser(async (context) => {
    const page = context.pages()[0] ?? (await context.newPage());

    for (const kw of plans) {
      const url = buildLinkedInJobSearchUrl({
        keywords: kw.join(" "),
        location: params.location,
        dateRange: params.dateRange,
      });

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(2000);

      const batch = await page.evaluate(() => {
        const results: ScrapedJob[] = [];
        const cards = document.querySelectorAll(
          ".job-card-container, .jobs-search-results__list-item, li.jobs-search-results__list-item"
        );

        cards.forEach((card) => {
          const link =
            card.querySelector<HTMLAnchorElement>(
              "a[href*='/jobs/view/'], a.job-card-list__title"
            ) ??
            card.querySelector<HTMLAnchorElement>("a[href*='/jobs/view/']");
          if (!link?.href) return;

          const title =
            link.textContent?.trim() ||
            card.querySelector(".job-card-list__title")?.textContent?.trim() ||
            "";
          if (!title) return;

          const company =
            card
              .querySelector(
                ".job-card-container__company-name, .artdeco-entity-lockup__subtitle"
              )
              ?.textContent?.trim() || "—";

          const location =
            card
              .querySelector(
                ".job-card-container__metadata-item, .job-card-container__metadata-wrapper"
              )
              ?.textContent?.trim() || "—";

          const id = link.href.match(/jobs\/view\/(\d+)/)?.[1];
          const applyUrl = id
            ? `https://www.linkedin.com/jobs/view/${id}`
            : link.href.split("?")[0];

          results.push({
            title,
            company,
            location,
            applyUrl,
            snippet: `${title} — ${company}`,
          });
        });

        return results;
      });

      for (const row of batch) {
        if (seen.has(row.applyUrl)) continue;
        seen.add(row.applyUrl);
        merged.push({
          id: `browser-${row.applyUrl.match(/(\d+)/)?.[1] ?? row.applyUrl}`,
          kind: "job",
          title: row.title,
          company: row.company,
          location: row.location || params.location || "—",
          matchScore: computeMatchScore(
            params.keywords,
            row.title,
            row.snippet
          ),
          datePosted: new Date().toISOString(),
          applyUrl: row.applyUrl,
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