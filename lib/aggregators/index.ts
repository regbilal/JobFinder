import { linkedInAggregator, linkedInUsesLiveData } from "@/lib/aggregators/boards/linkedin";
import {
  fetchLinkedInPosts,
  linkedInPostsUseLiveData,
} from "@/lib/aggregators/boards/linkedin-posts";
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
  const parts: string[] = [];
  if (types.includes("job")) {
    parts.push(
      jobsLive
        ? "Jobs: live via JSearch (RAPIDAPI_KEY)."
        : "Jobs: demo until RAPIDAPI_KEY is set (JSearch on RapidAPI)."
    );
  }
  if (types.includes("post")) {
    parts.push(
      postsLive
        ? "Posts: live via SerpAPI Google index (SERPAPI_KEY)."
        : "Posts: demo until SERPAPI_KEY is set (serpapi.com)."
    );
  }
  parts.push(
    "Live posts are public LinkedIn URLs surfaced by search—not the official LinkedIn post search API (unavailable)."
  );
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
}> {
  const contentTypes = resolveContentTypes(params);
  const jobsLive = linkedInUsesLiveData();
  const postsLive = linkedInPostsUseLiveData();
  const dataMode = resolveDataMode(jobsLive, postsLive, contentTypes);

  const tasks: Promise<JobPost[]>[] = [];
  if (contentTypes.includes("job")) {
    tasks.push(linkedInAggregator.fetchJobs(params).catch(() => []));
  }
  if (contentTypes.includes("post")) {
    tasks.push(fetchLinkedInPosts(params).catch(() => []));
  }

  const results = await Promise.all(tasks);
  const merged = dedupeJobs(results.flat());
  merged.sort((a, b) => b.matchScore - a.matchScore);

  const anyLive = (contentTypes.includes("job") && jobsLive) ||
    (contentTypes.includes("post") && postsLive);

  return {
    jobs: merged,
    sources: ["linkedin"],
    dataMode,
    liveBoards: anyLive ? ["linkedin"] : [],
    liveContent: { jobs: jobsLive, posts: postsLive },
    notice: buildNotice(contentTypes, jobsLive, postsLive),
  };
}

function dedupeJobs(jobs: JobPost[]): JobPost[] {
  const seen = new Set<string>();
  const out: JobPost[] = [];
  for (const job of jobs) {
    const key = `${job.kind}|${job.title.toLowerCase()}|${job.company.toLowerCase()}|${job.applyUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}