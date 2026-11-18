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

export type JobSource = "linkedin";

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  linkedin: "LinkedIn",
};

export type SearchMode = "live" | "api";

export type LinkedInContentKind = "job" | "post";

export type LinkedInContentType = LinkedInContentKind;

export const LINKEDIN_CONTENT_LABELS: Record<LinkedInContentKind, string> = {
  job: "Job listing",
  post: "Feed post",
};

export interface JobSearchParams {
  keywords: string[];
  location: string;
  dateRange: DateRangePreset;
  sources?: JobSource[];
  /** Which LinkedIn surfaces to search (default both). */
  contentTypes?: LinkedInContentType[];
}

/** Listing = direct posting URL; search = opens a filtered search on that board (demo/simulated). */
export type ApplyLinkType = "listing" | "search";

export interface JobPost {
  id: string;
  kind: LinkedInContentKind;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  datePosted: string;
  applyUrl: string;
  applyLinkType?: ApplyLinkType;
  source: JobSource;
  descriptionSnippet: string;
  /** Serp rows without a parseable date (often stale Google index). */
  unknownPostedDate?: boolean;
  dataProvider?: "jsearch" | "serp";
  /** Row is a direct LinkedIn search link (no third-party API). */
  liveSearch?: boolean;
}

export type JobsDataMode = "live" | "demo" | "mixed";

export interface JobSearchResponse {
  jobs: JobPost[];
  meta: {
    total: number;
    queriedAt: string;
    sources: JobSource[];
    params: JobSearchParams;
    dataMode: JobsDataMode;
    liveBoards: JobSource[];
    liveContent: { jobs: boolean; posts: boolean };
    notice?: string;
    errors?: string[];
    keysConfigured?: { rapidApi: boolean; serpApi: boolean };
    searchCountry?: string;
  };
}