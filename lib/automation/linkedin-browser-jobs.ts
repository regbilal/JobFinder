import { BROWSER_LIMITS, browserKeywordPlans } from "@/lib/automation/browser-fast";
import { withLinkedInBrowser } from "@/lib/automation/browser";
import { gotoLinkedIn } from "@/lib/automation/linkedin-page";
import { buildLinkedInJobSearchUrl } from "@/lib/job-board-urls";
import { computeMatchScore } from "@/lib/match-score";
import { parseGuestJobSearchHtml } from "@/lib/scrapers/linkedin-guest-jobs";
import type { BrowserContext, Page } from "playwright-core";
import type { JobPost, JobSearchParams } from "@/lib/types";

const GUEST_ENDPOINT =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

const F_TPR: Partial<Record<JobSearchParams["dateRange"], string>> = {
  "24h": "r86400",
  week: "r604800",
  month: "r2592000",
  "3months": "r7776000",
};

type ScrapedJob = {
  title: string;
  company: string;
  location: string;
  applyUrl: string;
  snippet: string;
};

function guestSearchUrl(
  keywords: string[],
  location: string,
  dateRange: JobSearchParams["dateRange"],
  start: number
): string {
  const url = new URL(GUEST_ENDPOINT);
  url.searchParams.set("keywords", keywords.join(" "));
  if (location.trim()) url.searchParams.set("location", location.trim());
  url.searchParams.set("start", String(start));
  url.searchParams.set("count", String(BROWSER_LIMITS.guestPageSize));
  const tpr = F_TPR[dateRange];
  if (tpr) url.searchParams.set("f_TPR", tpr);
  return url.toString();
}

const GUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
};

async function fetchGuestJobsInBrowser(
  page: Page,
  kw: string[],
  params: JobSearchParams
): Promise<JobPost[]> {
  const mapBatch = (html: string) =>
    parseGuestJobSearchHtml(html, params.keywords).map((job) => ({
      ...job,
      dataProvider: "browser" as const,
    }));

  const firstUrl = guestSearchUrl(kw, params.location, params.dateRange, 0);
  const first = await page.request.get(firstUrl, { headers: GUEST_HEADERS });
  if (!first.ok()) return [];

  const firstHtml = await first.text();
  const firstJobs = mapBatch(firstHtml);
  if (firstJobs.length < BROWSER_LIMITS.guestSecondPageMinFirst) {
    return firstJobs;
  }

  const second = await page.request.get(
    guestSearchUrl(kw, params.location, params.dateRange, BROWSER_LIMITS.guestPageSize),
    { headers: GUEST_HEADERS }
  );
  if (!second.ok()) return firstJobs;

  return [...firstJobs, ...mapBatch(await second.text())];
}

async function scrapeJobsFromDom(page: Page): Promise<ScrapedJob[]> {
  await page
    .waitForSelector('a[href*="/jobs/view/"]', {
      timeout: BROWSER_LIMITS.selectorTimeoutMs,
    })
    .catch(() => undefined);

  await page.evaluate(() => {
    window.scrollTo(0, Math.min(1200, document.body.scrollHeight));
  });

  return page.evaluate(() => {
    const results: ScrapedJob[] = [];
    const seen = new Set<string>();

    const pushCard = (card: Element, link: HTMLAnchorElement) => {
      const href = link.href.split("?")[0];
      if (!href.includes("/jobs/view/") || seen.has(href)) return;
      seen.add(href);

      const title =
        link.textContent?.trim() ||
        card.querySelector(".job-card-list__title")?.textContent?.trim() ||
        card.querySelector("h3")?.textContent?.trim() ||
        "";
      if (!title) return;

      const company =
        card
          .querySelector(
            ".job-card-container__company-name, .artdeco-entity-lockup__subtitle, h4"
          )
          ?.textContent?.trim() || "—";

      const location =
        card
          .querySelector(
            ".job-card-container__metadata-item, .job-card-container__metadata-wrapper, .job-search-card__location"
          )
          ?.textContent?.trim() || "—";

      const id = href.match(/jobs\/view\/(\d+)/)?.[1];
      const applyUrl = id ? `https://www.linkedin.com/jobs/view/${id}` : href;

      results.push({
        title,
        company,
        location,
        applyUrl,
        snippet: `${title} — ${company}`,
      });
    };

    document.querySelectorAll<HTMLAnchorElement>("a[href*='/jobs/view/']").forEach((link) => {
      const card = link.closest("li, div") ?? link;
      pushCard(card, link);
    });

    return results;
  });
}

function domRowsToJobs(
  dom: ScrapedJob[],
  params: JobSearchParams
): JobPost[] {
  return dom.map((row) => ({
    id: `browser-${row.applyUrl.match(/(\d+)/)?.[1] ?? row.applyUrl}`,
    kind: "job" as const,
    title: row.title,
    company: row.company,
    location: row.location || params.location || "—",
    matchScore: computeMatchScore(params.keywords, row.title, row.snippet),
    datePosted: new Date().toISOString(),
    applyUrl: row.applyUrl,
    applyLinkType: "listing" as const,
    source: "linkedin" as const,
    dataProvider: "browser" as const,
    descriptionSnippet: row.snippet,
  }));
}

async function runJobsInContext(
  context: BrowserContext,
  params: JobSearchParams
): Promise<JobPost[]> {
  const plans = browserKeywordPlans(params.keywords);
  const merged: JobPost[] = [];
  const seen = new Set<string>();

  const page = context.pages()[0] ?? (await context.newPage());

  const addBatch = (batch: JobPost[]) => {
    for (const job of batch) {
      if (seen.has(job.applyUrl)) continue;
      seen.add(job.applyUrl);
      merged.push(job);
    }
  };

  for (const kw of plans) {
    let batch: JobPost[] = [];
    try {
      batch = await fetchGuestJobsInBrowser(page, kw, params);
    } catch {
      batch = [];
    }
    addBatch(batch);
    if (merged.length >= BROWSER_LIMITS.maxJobs) break;
  }

  if (
    merged.length === 0 &&
    BROWSER_LIMITS.domFallback &&
    plans.length > 0
  ) {
    const kw = plans[0];
    const url = buildLinkedInJobSearchUrl({
      keywords: kw.join(" "),
      location: params.location,
      dateRange: params.dateRange,
    });
    await gotoLinkedIn(page, url);
    const dom = await scrapeJobsFromDom(page);
    addBatch(domRowsToJobs(dom, params));
  }

  return merged.slice(0, BROWSER_LIMITS.maxJobs);
}

export async function fetchJobsWithBrowser(
  params: JobSearchParams,
  context?: BrowserContext
): Promise<JobPost[]> {
  if (context) return runJobsInContext(context, params);
  return withLinkedInBrowser((ctx) => runJobsInContext(ctx, params));
}