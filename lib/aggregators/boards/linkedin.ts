import type { JobBoardAggregator } from "@/lib/aggregators/types";
import { fetchFromJSearch, isJSearchConfigured } from "@/lib/aggregators/jsearch/client";
import { simulateBoardJobs } from "@/lib/aggregators/simulator";

export const linkedInAggregator: JobBoardAggregator = {
  id: "linkedin",
  displayName: "LinkedIn",
  mode: "live",
  async fetchJobs(params) {
    if (isJSearchConfigured()) {
      return fetchFromJSearch(params, "linkedin", {
        publisherPatterns: ["linkedin"],
      });
    }
    return simulateBoardJobs(params, 8);
  },
};

export function linkedInUsesLiveData(): boolean {
  return isJSearchConfigured();
}