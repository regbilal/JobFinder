export type DateRangePreset =
  | "24h"
  | "week"
  | "month"
  | "3months"
  | "any";

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  "24h": "Past 24 hours",
  week: "Past week",
  month: "Past month",
  "3months": "Past 3 months",
  any: "Any time",
};

export type JobSource =
  | "linkedin"
  | "indeed"
  | "glassdoor"
  | "regional";

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  regional: "Regional boards",
};

export interface JobSearchParams {
  keywords: string[];
  location: string;
  dateRange: DateRangePreset;
  sources?: JobSource[];
}

/** Listing = direct posting URL; search = opens a filtered search on that board (demo/simulated). */
export type ApplyLinkType = "listing" | "search";

export interface JobPost {
  id: string;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  datePosted: string;
  applyUrl: string;
  applyLinkType?: ApplyLinkType;
  source: JobSource;
  descriptionSnippet: string;
}

export interface JobSearchResponse {
  jobs: JobPost[];
  meta: {
    total: number;
    queriedAt: string;
    sources: JobSource[];
    params: JobSearchParams;
  };
}