import type { BrowserContext } from "playwright-core";
import type { JobSearchParams } from "@/lib/types";
import { expandKeywordPlans } from "@/lib/search-plans";

/** Cap work per browser search so requests finish in ~30–45s instead of minutes. */
export const BROWSER_LIMITS = {
  maxJobPlans: 3,
  maxPostPlans: 1,
  maxJobs: 32,
  maxPosts: 18,
  guestPageSize: 25,
  /** Second guest page only when the first page is full. */
  guestSecondPageMinFirst: 20,
  domFallback: true,
  warmupMs: 400,
  navTimeoutMs: 35_000,
  selectorTimeoutMs: 10_000,
} as const;

export function browserKeywordPlans(keywords: string[]): string[][] {
  const expanded = expandKeywordPlans(keywords);
  if (expanded.length <= BROWSER_LIMITS.maxJobPlans) return expanded;

  const plans: string[][] = [expanded[0]];
  const singles = expanded.slice(1).filter((p) => p.length === 1);
  if (singles.length > 0) {
    singles.sort((a, b) => b[0].length - a[0].length);
    plans.push(singles[0]);
  }
  return plans.slice(0, BROWSER_LIMITS.maxJobPlans);
}

export function browserPostPlans(params: JobSearchParams): string[][] {
  const plans = browserKeywordPlans(params.keywords);
  return plans.slice(0, BROWSER_LIMITS.maxPostPlans);
}

/** Block heavy assets; keep HTML/JS/CSS for scraping. */
export async function attachFastNetworking(
  context: BrowserContext
): Promise<void> {
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.includes("jobs-guest") || url.includes("/voyager/api/")) {
      void route.continue();
      return;
    }
    const type = route.request().resourceType();
    if (type === "image" || type === "media" || type === "font") {
      void route.abort();
      return;
    }
    void route.continue();
  });
}