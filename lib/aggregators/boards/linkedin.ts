import type { JobBoardAggregator } from "@/lib/aggregators/types";
import { fetchFromJSearch, isJSearchConfigured } from "@/lib/aggregators/jsearch/client";
import { fetchLinkedInJobsFromSerp } from "@/lib/aggregators/serp/linkedin-jobs";
import { isSerpApiConfigured } from "@/lib/aggregators/serp/linkedin-posts";
import type { JobPost } from "@/lib/types";

export const linkedInAggregator: JobBoardAggregator = {
  id: "linkedin",
  displayName: "LinkedIn",
  mode: "live",
  async fetchJobs(params) {
    let jobs: JobPost[] = [];
    if (isJSearchConfigured()) {
      jobs = await fetchFromJSearch(params, { publisherPatterns: ["linkedin"] });
    }
    if (jobs.length === 0 && isSerpApiConfigured()) {
      jobs = await fetchLinkedInJobsFromSerp(params);
    }
    return jobs;
  },
};

export function linkedInUsesLiveData(): boolean {
  return isJSearchConfigured() || isSerpApiConfigured();
}

export function linkedInJobsSource(): "jsearch" | "serp" | "none" {
  if (isJSearchConfigured()) return "jsearch";
  if (isSerpApiConfigured()) return "serp";
  return "none";
}