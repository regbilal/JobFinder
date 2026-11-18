import {
  linkedInAggregator,
  linkedInJobsSource,
  linkedInUsesLiveData,
} from "@/lib/aggregators/boards/linkedin";
import {
  fetchLinkedInPosts,
  linkedInPostsUseLiveData,
} from "@/lib/aggregators/boards/linkedin-posts";
import { isJSearchConfigured } from "@/lib/aggregators/jsearch/client";
import { isSerpApiConfigured } from "@/lib/aggregators/serp/linkedin-posts";
import { inferCountryCode } from "@/lib/search-plans";
import type {
  JobPost,
  JobSearchParams,
  JobSource,
  JobsDataMode,
  LinkedInContentType,
} from "@/lib/types";

const DEFAULT_CONTENT: LinkedInContentType[] = ["job", "post"];

function resolveContentTypes(params: JobSearchParams): LinkedInContentType[] {
  const requested = params.contentTypes?.filter((t) => t === "job" || t === "post");
  if (requested && requested.length > 0) return requested;
  return DEFAULT_CONTENT;
}

function resolveDataMode(jobsLive: boolean, postsLive: boolean, types: LinkedInContentType[]): JobsDataMode {
  const wantsJobs = types.includes("job");
  const wantsPosts = types.includes("post");
  if (wantsJobs && wantsPosts) {
    if (jobsLive && postsLive) return "live";
    if (jobsLive || postsLive) return "mixed";
    return "demo";
  }
  if (wantsJobs) return jobsLive ? "live" : "demo";
  if (wantsPosts) return postsLive ? "live" : "demo";
  return "demo";
}

function buildNotice(
  types: LinkedInContentType[],
  jobsLive: boolean,
  postsLive: boolean
): string {
  if (!jobsLive && !postsLive) {
    return "No API keys on the server (Vercel → Environment Variables). Add RAPIDAPI_KEY and/or SERPAPI_KEY, redeploy, then search again. Without keys the app returns zero rows by design.";
  }
  const parts: string[] = [];
  if (types.includes("job")) {
    if (!jobsLive) {
      parts.push("Jobs: set RAPIDAPI_KEY or SERPAPI_KEY.");
    } else {
      const src = linkedInJobsSource();
      parts.push(
        src === "jsearch"
          ? "Jobs: JSearch with direct linkedin.com/jobs/view/ links only."
          : "Jobs: SerpAPI indexed job URLs (linkedin.com/jobs/view/)."
      );
    }
  }
  if (types.includes("post")) {
    parts.push(
      postsLive
        ? "Posts: direct linkedin.com/posts/ URLs via SerpAPI."
        : "Posts: set SERPAPI_KEY."
    );
  }
  return parts.join(" ");
}

export async function aggregateJobs(
  params: JobSearchParams
): Promise<{
  jobs: JobPost[];
  sources: JobSource[];
  dataMode: JobsDataMode;
  liveBoards: JobSource[];
  liveContent: { jobs: boolean; posts: boolean };
  notice?: string;
  errors?: string[];
  keysConfigured: { rapidApi: boolean; serpApi: boolean };
  searchCountry: string;
}> {
  const contentTypes = resolveContentTypes(params);
  const jobsLive = linkedInUsesLiveData();
  const postsLive = linkedInPostsUseLiveData();
  const dataMode = resolveDataMode(jobsLive, postsLive, contentTypes);

  const errors: string[] = [];
  const chunks: JobPost[][] = [];

  if (contentTypes.includes("job")) {
    try {
      const jobs = await linkedInAggregator.fetchJobs(params);
      chunks.push(jobs);
      if (jobs.length === 0 && !jobsLive) {
        errors.push("Job search needs RAPIDAPI_KEY or SERPAPI_KEY.");
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Job search failed.");
    }
  }

  if (contentTypes.includes("post")) {
    try {
      const posts = await fetchLinkedInPosts(params);
      chunks.push(posts);
      if (posts.length === 0 && !postsLive) {
        errors.push("Post search needs SERPAPI_KEY.");
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Post search failed.");
    }
  }

  const merged = dedupeJobs(chunks.flat());
  merged.sort((a, b) => b.matchScore - a.matchScore);

  const anyLive = (contentTypes.includes("job") && jobsLive) ||
    (contentTypes.includes("post") && postsLive);

  let notice = buildNotice(contentTypes, jobsLive, postsLive);
  if (merged.length === 0 && errors.length > 0) {
    notice = `${notice} ${errors.join(" ")}`;
  }

  if (merged.length === 0 && anyLive) {
    errors.push(
      "APIs responded but no LinkedIn URLs matched. Try fewer keywords at once, set Location (e.g. France), or widen Date posted to Any time."
    );
  }

  return {
    jobs: merged,
    sources: ["linkedin"],
    dataMode: merged.length > 0 && anyLive ? dataMode : "demo",
    liveBoards: anyLive ? ["linkedin"] : [],
    liveContent: { jobs: jobsLive, posts: postsLive },
    notice,
    errors: errors.length > 0 ? errors : undefined,
    keysConfigured: {
      rapidApi: isJSearchConfigured(),
      serpApi: isSerpApiConfigured(),
    },
    searchCountry: inferCountryCode(params),
  };
}

function dedupeJobs(jobs: JobPost[]): JobPost[] {
  const seen = new Set<string>();
  const out: JobPost[] = [];
  for (const job of jobs) {
    const key = job.applyUrl.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}

export function getConfiguredProviders(): {
  jsearch: boolean;
  serp: boolean;
} {
  return {
    jsearch: isJSearchConfigured(),
    serp: isSerpApiConfigured(),
  };
}