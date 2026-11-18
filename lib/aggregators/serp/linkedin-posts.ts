import type { DateRangePreset, JobPost, JobSearchParams } from "@/lib/types";
import {
  canonicalLinkedInPostUrl,
  normalizeLinkedInUrl,
} from "@/lib/linkedin-url";
import { computeMatchScore } from "@/lib/match-score";
import { expandKeywordPlans, inferSerpLocale } from "@/lib/search-plans";

export function isSerpApiConfigured(): boolean {
  return Boolean(process.env.SERPAPI_KEY?.trim());
}

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

function buildSerpPostQueries(keywords: string[], location: string): string[] {
  const loc = location.trim();
  const all = keywords.join(" ");
  const queries = [
    `site:linkedin.com/posts ${all} recrutement ${loc}`.trim(),
    `site:linkedin.com/posts ${all} hiring ${loc}`.trim(),
  ];
  for (const kw of keywords.slice(0, 6)) {
    queries.push(`site:linkedin.com/posts "${kw}" ${loc}`.trim());
  }
  return [...new Set(queries)].slice(0, 8);
}

function pickRowUrl(row: SerpOrganic): string {
  return normalizeLinkedInUrl(row.link ?? row.redirect_link ?? "");
}

function parseAuthor(title: string, snippet: string): string {
  const onLinkedIn = title.split(" - ")[0]?.trim();
  if (onLinkedIn && onLinkedIn.length < 80 && !onLinkedIn.toLowerCase().includes("linkedin"))
    return onLinkedIn;
  const match = title.match(/^(.+?)\s+on\s+LinkedIn/i);
  if (match?.[1]) return match[1].trim();
  return "LinkedIn member";
}

function parsePostedDate(raw?: string): string {
  if (!raw) return new Date().toISOString();
  const tryDate = new Date(raw);
  if (!Number.isNaN(tryDate.getTime())) return tryDate.toISOString();
  return new Date().toISOString();
}

async function runSerpPostQuery(
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
    const applyUrl = canonicalLinkedInPostUrl(pickRowUrl(row));
    if (!applyUrl) continue;

    const title =
      row.title?.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim() || "LinkedIn post";
    const snippet = (row.snippet ?? "").trim();

    jobs.push({
      id: `post-${applyUrl}`,
      kind: "post",
      title,
      company: parseAuthor(title, snippet),
      location: params.location.trim() || "—",
      matchScore: computeMatchScore(params.keywords, title, snippet),
      datePosted: parsePostedDate(row.date),
      applyUrl,
      applyLinkType: "listing",
      source: "linkedin",
      descriptionSnippet: snippet || title,
    });
  }
  return jobs;
}

export async function fetchLinkedInPostsFromSerp(
  params: JobSearchParams
): Promise<JobPost[]> {
  if (!isSerpApiConfigured()) {
    throw new Error("SERPAPI_KEY is not configured");
  }

  const plans = expandKeywordPlans(params.keywords);
  const merged: JobPost[] = [];
  const seen = new Set<string>();

  for (const kw of plans) {
    const queries = buildSerpPostQueries(kw, params.location);
    for (const q of queries) {
      const batch = await runSerpPostQuery(q, params);
      for (const job of batch) {
        if (seen.has(job.applyUrl)) continue;
        seen.add(job.applyUrl);
        merged.push(job);
      }
      if (merged.length >= 25) break;
    }
    if (merged.length >= 25) break;
  }

  return merged;
}