import type { JobBoardAggregator } from "@/lib/aggregators/types";
import { simulateBoardJobs } from "@/lib/aggregators/simulator";

export const glassdoorAggregator: JobBoardAggregator = {
  id: "glassdoor",
  displayName: "Glassdoor",
  async fetchJobs(params) {
    await delay(100 + Math.random() * 160);
    return simulateBoardJobs("glassdoor", params, 7);
  },
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}