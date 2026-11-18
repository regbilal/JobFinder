import {
  fetchLinkedInPostsFromSerp,
  isSerpApiConfigured,
} from "@/lib/aggregators/serp/linkedin-posts";
import type { JobSearchParams } from "@/lib/types";
import type { JobPost } from "@/lib/types";

export async function fetchLinkedInPosts(
  params: JobSearchParams
): Promise<JobPost[]> {
  if (!isSerpApiConfigured()) {
    return [];
  }
  return fetchLinkedInPostsFromSerp(params);
}

export function linkedInPostsUseLiveData(): boolean {
  return isSerpApiConfigured();
}