import type { JobBoardAggregator } from "@/lib/aggregators/types";
import { simulateBoardJobs } from "@/lib/aggregators/simulator";

export const regionalAggregator: JobBoardAggregator = {
  id: "regional",
  displayName: "Regional job boards",
  async fetchJobs(params) {
    await delay(90 + Math.random() * 140);
    const extra =
      params.location.trim().length > 0
        ? ` Local market: ${params.location}.`
        : "";
    const jobs = simulateBoardJobs("regional", params, 6);
    return jobs.map((j) => ({
      ...j,
      descriptionSnippet: j.descriptionSnippet + extra,
    }));
  },
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}