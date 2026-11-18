import * as cheerio from "cheerio";
import type { DateRangePreset, JobPost, JobSearchParams } from "@/lib/types";
import { canonicalLinkedInJobUrl } from "@/lib/linkedin-url";
import { computeMatchScore } from "@/lib/match-score";
import { expandKeywordPlans } from "@/lib/search-plans";
import { parseFlexiblePostedDate } from "@/lib/parse-posted-date";

const GUEST_ENDPOINT =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

const F_TPR: Partial<Record<DateRangePreset, string>> = {
  "24h": "r86400",
  week: "r604800",
  month: "r2592000",
  "3months": "r7776000",
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseListDate(raw: string): string {
  const parsed = parseFlexiblePostedDate(raw);
  return (parsed ?? new Date()).toISOString();
}

export function parseGuestJobSearchHtml(
  html: string,
  keywordContext: string[]
): JobPost[] {
  const $ = cheerio.load(html);
  const jobs: JobPost[] = [];

  $("div.job-search-card, li div.base-search-card--link").each((_, el) => {
    const $el = $(el);
    const urn = $el.attr("data-entity-urn") ?? "";
    const idFromUrn = urn.match(/jobPosting:(\d+)/)?.[1];

    const href = $el.find("a.base-card__full-link").attr("href") ?? "";
    const applyUrl =
      (idFromUrn
        ? `https://www.linkedin.com/jobs/view/${idFromUrn}`
        : canonicalLinkedInJobUrl(href)) ?? null;
    if (!applyUrl) return;

    const title = $el.find("h3.base-search-card__title").text().trim();
    if (!title) return;

    const company =
      $el.find("h4.base-search-card__subtitle a.hidden-nested-link").text().trim() ||
      $el.find("h4.base-search-card__subtitle").text().trim() ||
      "—";

    const location =
      $el.find("span.job-search-card__location").text().trim() || "—";

    const listDate =
      $el.find("time").attr("datetime") ||
      $el.find(".job-search-card__listdate").text().trim() ||
      $el.find("time.job-search-card__listdate").text().trim();

    const snippet = `${title} at ${company} — ${location}`;

    jobs.push({
      id: `guest-${applyUrl.match(/(\d+)\/?$/)?.[1] ?? applyUrl}`,
      kind: "job",
      title,
      company,
      location,
      matchScore: computeMatchScore(keywordContext, title, snippet),
      datePosted: parseListDate(listDate),
      applyUrl,
      applyLinkType: "listing",
      source: "linkedin",
      dataProvider: "guest",
      descriptionSnippet: snippet,
    });
  });

  return jobs;
}

async function fetchGuestPage(
  keywords: string[],
  location: string,
  dateRange: DateRangePreset,
  start: number
): Promise<string> {
  const url = new URL(GUEST_ENDPOINT);
  url.searchParams.set("keywords", keywords.join(" "));
  if (location.trim()) url.searchParams.set("location", location.trim());
  url.searchParams.set("start", String(start));
  url.searchParams.set("count", "25");
  const tpr = F_TPR[dateRange];
  if (tpr) url.searchParams.set("f_TPR", tpr);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(
      `LinkedIn guest search returned HTTP ${res.status} (datacenter IPs are sometimes blocked—try API mode or link mode).`
    );
  }

  return res.text();
}

const PAGE_STARTS = [0, 25, 50];

export async function fetchGuestLinkedInJobs(
  params: JobSearchParams
): Promise<JobPost[]> {
  const plans = expandKeywordPlans(params.keywords);
  const merged: JobPost[] = [];
  const seen = new Set<string>();

  for (const kw of plans) {
    for (const start of PAGE_STARTS) {
      const html = await fetchGuestPage(
        kw,
        params.location,
        params.dateRange,
        start
      );
      const batch = parseGuestJobSearchHtml(html, params.keywords);
      if (batch.length === 0) break;

      for (const job of batch) {
        if (seen.has(job.applyUrl)) continue;
        seen.add(job.applyUrl);
        merged.push(job);
      }
    }
    if (merged.length >= 60) break;
  }

  merged.sort((a, b) => b.matchScore - a.matchScore);
  return merged;
}