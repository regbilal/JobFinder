import type { DateRangePreset, JobPost, JobSearchParams } from "@/lib/types";
import { canonicalLinkedInJobUrl, normalizeLinkedInUrl } from "@/lib/linkedin-url";
import { computeMatchScore } from "@/lib/match-score";
import {
  expandKeywordPlans,
  inferSerpLocale,
} from "@/lib/search-plans";
import { isSerpApiConfigured } from "@/lib/aggregators/serp/linkedin-posts";

const DATE_TBS: Partial<Record<DateRangePreset, string>> = {
  "24h": "qdr:d",
  week: "qdr:w",
  month: "qdr:m",
};

type SerpOrganic = {
  title?: string;
  link?: string;
  redirect_link?: string;
  snippet?: string;
  date?: string;
};

type SerpResponse = {
  organic_results?: SerpOrganic[];
  error?: string;
};

function buildSerpJobQueries(keywords: string[], location: string): string[] {
  const loc = location.trim();
  const all = keywords.join(" ");
  const queries = [
    `site:linkedin.com/jobs/view ${all} ${loc}`.trim(),
    `site:linkedin.com/jobs ${all} ${loc}`.trim(),
  ];
  for (const kw of keywords) {
    queries.push(`site:linkedin.com/jobs/view "${kw}" ${loc}`.trim());
  }
  return [...new Set(queries)].slice(0, 8);
}

function pickRowUrl(row: SerpOrganic): string {
  return normalizeLinkedInUrl(row.link ?? row.redirect_link ?? "");
}

function parseCompanyFromSnippet(snippet: string, title: string): string {
  const dash = title.indexOf(" - ");
  if (dash > 0) return title.slice(0, dash).trim();
  const at = snippet.match(/\bat\s+([^.|\n]+)/i) ?? snippet.match(/\bchez\s+([^.|\n]+)/i);
  return at?.[1]?.trim() || "—";
}

async function runSerpQuery(
  q: string,
  params: JobSearchParams
): Promise<JobPost[]> {
  const apiKey = process.env.SERPAPI_KEY!.trim();
  const locale = inferSerpLocale(params);

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", q);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", "20");
  url.searchParams.set("gl", locale.gl);
  url.searchParams.set("hl", locale.hl);
  url.searchParams.set("google_domain", locale.google_domain);

  const tbs = DATE_TBS[params.dateRange];
  if (tbs) url.searchParams.set("tbs", tbs);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`);

  const body = (await res.json()) as SerpResponse;
  if (body.error) throw new Error(body.error);

  const jobs: JobPost[] = [];
  for (const row of body.organic_results ?? []) {
    const applyUrl = canonicalLinkedInJobUrl(pickRowUrl(row));
    if (!applyUrl) continue;

    const title =
      row.title?.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim() || "LinkedIn job";
    const snippet = (row.snippet ?? "").trim();

    jobs.push({
      id: `job-${applyUrl.match(/(\d+)/)?.[1] ?? applyUrl}`,
      kind: "job",
      title,
      company: parseCompanyFromSnippet(snippet, title),
      location: params.location.trim() || "—",
      matchScore: computeMatchScore(params.keywords, title, snippet),
      datePosted: new Date().toISOString(),
      applyUrl,
      applyLinkType: "listing",
      source: "linkedin",
      descriptionSnippet: snippet || title,
    });
  }
  return jobs;
}

export async function fetchLinkedInJobsFromSerp(
  params: JobSearchParams
): Promise<JobPost[]> {
  if (!isSerpApiConfigured()) {
    throw new Error("SERPAPI_KEY is not configured");
  }

  const plans = expandKeywordPlans(params.keywords);
  const merged: JobPost[] = [];
  const seen = new Set<string>();

  for (const kw of plans) {
    const queries = buildSerpJobQueries(kw, params.location);
    for (const q of queries) {
      const batch = await runSerpQuery(q, params);
      for (const job of batch) {
        if (seen.has(job.applyUrl)) continue;
        seen.add(job.applyUrl);
        merged.push(job);
      }
      if (merged.length >= 30) break;
    }
    if (merged.length >= 30) break;
  }

  return merged;
}