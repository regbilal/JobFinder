import type { JobBoardAggregator } from "@/lib/aggregators/types";
import { fetchFromJSearch, isJSearchConfigured } from "@/lib/aggregators/jsearch/client";
import { fetchLinkedInJobsFromSerp } from "@/lib/aggregators/serp/linkedin-jobs";
import { isSerpApiConfigured } from "@/lib/aggregators/serp/linkedin-posts";
import type { JobPost } from "@/lib/types";

function dedupeByUrl(jobs: JobPost[]): JobPost[] {
  const seen = new Set<string>();
  const out: JobPost[] = [];
  for (const job of jobs) {
    if (seen.has(job.applyUrl)) continue;
    seen.add(job.applyUrl);
    out.push(job);
  }
  return out;
}

/** Serp uses Google index — often stale. Use only to top up JSearch. */
const SERP_TOP_UP_MIN = 8;

export const linkedInAggregator: JobBoardAggregator = {
  id: "linkedin",
  displayName: "LinkedIn",
  mode: "live",
  async fetchJobs(params) {
    let jobs: JobPost[] = [];

    if (isJSearchConfigured()) {
      const fromJsearch = await fetchFromJSearch(params, {
        publisherPatterns: ["linkedin"],
      });
      jobs = dedupeByUrl([...jobs, ...fromJsearch]);
      if (jobs.length === 0) {
        const relaxed = await fetchFromJSearch(params);
        jobs = dedupeByUrl([...jobs, ...relaxed]);
      }
    }

    if (
      isSerpApiConfigured() &&
      (jobs.length === 0 || jobs.length < SERP_TOP_UP_MIN)
    ) {
      const fromSerp = await fetchLinkedInJobsFromSerp(params);
      jobs = dedupeByUrl([...jobs, ...fromSerp]);
    }

    return jobs;
  },
};

export function linkedInUsesLiveData(): boolean {
  return isJSearchConfigured() || isSerpApiConfigured();
}

export function linkedInJobsSource(): "jsearch" | "serp" | "both" | "none" {
  const j = isJSearchConfigured();
  const s = isSerpApiConfigured();
  if (j && s) return "both";
  if (j) return "jsearch";
  if (s) return "serp";
  return "none";
}