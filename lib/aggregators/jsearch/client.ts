import type { DateRangePreset, JobPost, JobSearchParams } from "@/lib/types";
import { canonicalLinkedInJobUrl } from "@/lib/linkedin-url";
import { computeMatchScore } from "@/lib/match-score";

const HOST = "jsearch.p.rapidapi.com";

export function isJSearchConfigured(): boolean {
  return Boolean(process.env.RAPIDAPI_KEY?.trim());
}

const DATE_POSTED: Record<DateRangePreset, string> = {
  "24h": "today",
  week: "week",
  month: "month",
  "3months": "all",
  any: "all",
};

type JSearchJob = {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_posted_at_datetime_utc?: string;
  job_apply_link?: string;
  job_description?: string;
  job_publisher?: string;
};

type JSearchResponse = {
  data?: JSearchJob[];
  status?: string;
  message?: string;
};

export type JSearchFilters = {
  publisherPatterns?: string[];
};

function buildQuery(params: JobSearchParams): string {
  const keywords = params.keywords.join(" ");
  const loc = params.location.trim();
  if (loc) return `${keywords} jobs in ${loc} site:linkedin.com`;
  return `${keywords} linkedin jobs`;
}

function formatLocation(job: JSearchJob): string {
  const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  return parts.join(", ") || "—";
}

function matchesPublisher(job: JSearchJob, patterns: string[]): boolean {
  const publisher = (job.job_publisher ?? "").toLowerCase();
  const link = (job.job_apply_link ?? "").toLowerCase();
  return patterns.some(
    (p) => publisher.includes(p.toLowerCase()) || link.includes(p.toLowerCase())
  );
}

function mapToJobPost(
  job: JSearchJob,
  keywords: string[]
): JobPost | null {
  const title = job.job_title?.trim();
  if (!title) return null;

  const applyUrl = canonicalLinkedInJobUrl(
    job.job_apply_link,
    job.job_id
  );
  if (!applyUrl) return null;

  const snippet = (job.job_description ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);

  const id = extractId(applyUrl);
  const posted =
    job.job_posted_at_datetime_utc ?? new Date().toISOString();

  return {
    id: `job-${id}`,
    kind: "job",
    title,
    company: job.employer_name?.trim() || "—",
    location: formatLocation(job),
    matchScore: computeMatchScore(keywords, title, snippet),
    datePosted: posted,
    applyUrl,
    applyLinkType: "listing",
    source: "linkedin",
    descriptionSnippet: snippet || `${title} at ${job.employer_name ?? "company"}`,
  };
}

function extractId(applyUrl: string): string {
  return applyUrl.match(/jobs\/view\/(\d+)/)?.[1] ?? applyUrl;
}

export async function fetchFromJSearch(
  params: JobSearchParams,
  filters?: JSearchFilters
): Promise<JobPost[]> {
  const apiKey = process.env.RAPIDAPI_KEY?.trim();
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }

  const query = buildQuery(params);
  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "2");
  url.searchParams.set("date_posted", DATE_POSTED[params.dateRange]);
  url.searchParams.set("employment_types", "FULLTIME,PARTTIME,CONTRACTOR");

  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": HOST,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JSearch HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as JSearchResponse;
  let rows = body.data ?? [];

  if (filters?.publisherPatterns?.length) {
    rows = rows.filter((job) =>
      matchesPublisher(job, filters.publisherPatterns!)
    );
  }

  const jobs: JobPost[] = [];
  for (const row of rows) {
    const mapped = mapToJobPost(row, params.keywords);
    if (mapped) jobs.push(mapped);
  }

  jobs.sort(
    (a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()
  );

  return jobs;
}