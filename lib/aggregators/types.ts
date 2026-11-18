import type { JobPost, JobSearchParams } from "@/lib/types";

export interface JobBoardAggregator {
  id: import("@/lib/types").JobSource;
  displayName: string;
  fetchJobs(params: JobSearchParams): Promise<JobPost[]>;
}