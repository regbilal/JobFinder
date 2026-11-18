import type { JobBoardAggregator } from "@/lib/aggregators/types";
import { simulateBoardJobs } from "@/lib/aggregators/simulator";

export const indeedAggregator: JobBoardAggregator = {
  id: "indeed",
  displayName: "Indeed",
  async fetchJobs(params) {
    await delay(80 + Math.random() * 150);
    return simulateBoardJobs("indeed", params, 10);
  },
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}