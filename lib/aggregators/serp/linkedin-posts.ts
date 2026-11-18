import type { DateRangePreset, JobPost, JobSearchParams } from "@/lib/types";
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

function isLinkedInPostUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("linkedin.com/posts/") ||
    lower.includes("linkedin.com/feed/update/") ||
    lower.includes("linkedin.com/pulse/")
  );
}

function parseAuthor(title: string): string {
  const onLinkedIn = title.split(" - ")[0]?.trim();
  if (onLinkedIn && onLinkedIn.length < 80) return onLinkedIn;
  const match = title.match(/^(.+?)\s+on\s+LinkedIn/i);
  return match?.[1]?.trim() || "LinkedIn member";
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

  const rows = (body.organic_results ?? []).filter(
    (r) => r.link && isLinkedInPostUrl(r.link)
  );

  const jobs: JobPost[] = [];
  for (const row of rows) {
    const title = row.title?.trim() || "LinkedIn post";
    const snippet = (row.snippet ?? "").trim();
    const link = row.link!;

    jobs.push({
      id: `post-${link}`,
      kind: "post",
      title,
      company: parseAuthor(title),
      location: params.location.trim() || "—",
      matchScore: computeMatchScore(params.keywords, title, snippet),
      datePosted: parsePostedDate(row.date),
      applyUrl: link,
      applyLinkType: "listing",
      source: "linkedin",
      descriptionSnippet: snippet || title,
    });
  }

  return jobs;
}