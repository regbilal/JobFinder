import { BROWSER_LIMITS } from "@/lib/automation/browser-fast";
import { filterJobsByDateRange } from "@/lib/date-range-filter";
import type { DateRangePreset, JobPost } from "@/lib/types";

/** LinkedIn often omits precise post dates in scraped rows — avoid empty result sets. */
export function filterBrowserJobs(
  jobs: JobPost[],
  range: DateRangePreset
): JobPost[] {
  const filtered = filterJobsByDateRange(jobs, range, {
    keepUnknownPosted: true,
  });
  if (filtered.length === 0 && jobs.length > 0) {
    return jobs.slice(0, BROWSER_LIMITS.maxJobs);
  }
  return filtered.slice(0, BROWSER_LIMITS.maxJobs);
}