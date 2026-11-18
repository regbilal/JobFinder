import type { JobBoardAggregator } from "@/lib/aggregators/types";
import { simulateBoardJobs } from "@/lib/aggregators/simulator";

export const linkedInAggregator: JobBoardAggregator = {
  id: "linkedin",
  displayName: "LinkedIn",
  async fetchJobs(params) {
    await delay(120 + Math.random() * 180);
    return simulateBoardJobs("linkedin", params, 8);
  },
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}