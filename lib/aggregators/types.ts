import type { JobPost, JobSearchParams } from "@/lib/types";

export interface JobBoardAggregator {
  id: import("@/lib/types").JobSource;
  displayName: string;
  /** live = can use external API when configured; demo = simulator only today */
  mode?: "live" | "demo";
  fetchJobs(params: JobSearchParams): Promise<JobPost[]>;
}