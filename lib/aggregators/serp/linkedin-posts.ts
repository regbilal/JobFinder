import type { DateRangePreset, JobPost, JobSearchParams } from "@/lib/types";
import {
  canonicalLinkedInPostUrl,
  normalizeLinkedInUrl,
} from "@/lib/linkedin-url";
import { computeMatchScore } from "@/lib/match-score";

export function isSerpApiConfigured(): boolean {
  return Boolean(process.env.SERPAPI_KEY?.trim());
}

const DATE_TBS: Partial<Record<DateRangePreset, string>> = {
  "24h": "qdr:d",
  week: "qdr:w",
  month: "qdr:m",
};

type SerpOrganic = {
  position?: number;
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

function buildSerpQuery(params: JobSearchParams): string {
  const kw = params.keywords.join(" ");
  const loc = params.location.trim();
  const locPart = loc ? ` ${loc}` : "";
  return `site:linkedin.com/posts ${kw}${locPart}`;
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
  const fromSnippet = snippet.match(/^([^.]{3,60})/);
  return fromSnippet?.[1]?.trim() || "LinkedIn member";
}

function parsePostedDate(raw?: string): string {
  if (!raw) return new Date().toISOString();
  const tryDate = new Date(raw);
  if (!Number.isNaN(tryDate.getTime())) return tryDate.toISOString();
  return new Date().toISOString();
}

export async function fetchLinkedInPostsFromSerp(
  params: JobSearchParams
): Promise<JobPost[]> {
  const apiKey = process.env.SERPAPI_KEY?.trim();
  if (!apiKey) {
    throw new Error("SERPAPI_KEY is not configured");
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", buildSerpQuery(params));
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", "20");
  url.searchParams.set("hl", "en");

  const tbs = DATE_TBS[params.dateRange];
  if (tbs) url.searchParams.set("tbs", tbs);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`SerpAPI HTTP ${res.status}`);
  }

  const body = (await res.json()) as SerpResponse;
  if (body.error) {
    throw new Error(body.error);
  }

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