import {
  fetchLinkedInPostsFromSerp,
  isSerpApiConfigured,
} from "@/lib/aggregators/serp/linkedin-posts";
import { simulateLinkedInPosts } from "@/lib/aggregators/simulator-posts";
import type { JobSearchParams } from "@/lib/types";
import type { JobPost } from "@/lib/types";

export async function fetchLinkedInPosts(
  params: JobSearchParams
): Promise<JobPost[]> {
  if (isSerpApiConfigured()) {
    return fetchLinkedInPostsFromSerp(params);
  }
  return simulateLinkedInPosts(params, 8);
}

export function linkedInPostsUseLiveData(): boolean {
  return isSerpApiConfigured();
}