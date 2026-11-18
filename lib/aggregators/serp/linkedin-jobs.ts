import type { DateRangePreset, JobPost, JobSearchParams } from "@/lib/types";
import {
  canonicalLinkedInJobUrl,
  normalizeLinkedInUrl,
} from "@/lib/linkedin-url";
import { computeMatchScore } from "@/lib/match-score";
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

function buildSerpJobQuery(params: JobSearchParams): string {
  const kw = params.keywords.join(" ");
  const loc = params.location.trim();
  return [`site:linkedin.com/jobs/view`, kw, loc].filter(Boolean).join(" ");
}

function pickRowUrl(row: SerpOrganic): string {
  return normalizeLinkedInUrl(row.link ?? row.redirect_link ?? "");
}

function parseCompanyFromSnippet(snippet: string, title: string): string {
  const loc = title.indexOf(" - ");
  if (loc > 0) return title.slice(0, loc).trim();
  const at = snippet.match(/\bat\s+([^.|\n]+)/i);
  return at?.[1]?.trim() || "—";
}

export async function fetchLinkedInJobsFromSerp(
  params: JobSearchParams
): Promise<JobPost[]> {
  if (!isSerpApiConfigured()) {
    throw new Error("SERPAPI_KEY is not configured");
  }
  const apiKey = process.env.SERPAPI_KEY!.trim();

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", buildSerpJobQuery(params));
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", "20");
  url.searchParams.set("hl", "en");

  const tbs = DATE_TBS[params.dateRange];
  if (tbs) url.searchParams.set("tbs", tbs);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`);

  const body = (await res.json()) as SerpResponse;
  if (body.error) throw new Error(body.error);

  const jobs: JobPost[] = [];
  for (const row of body.organic_results ?? []) {
    const raw = pickRowUrl(row);
    const applyUrl = canonicalLinkedInJobUrl(raw);
    if (!applyUrl) continue;

    const title =
      row.title?.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim() ||
      "LinkedIn job";
    const snippet = (row.snippet ?? "").trim();

    jobs.push({
      id: `job-${extractId(applyUrl)}`,
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

function extractId(applyUrl: string): string {
  return applyUrl.match(/(\d+)\/?$/)?.[1] ?? applyUrl;
}