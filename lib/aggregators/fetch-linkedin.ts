import { buildLiveLinkedInResults } from "@/lib/live-linkedin-search";
import { fetchGuestLinkedInJobs } from "@/lib/scrapers/linkedin-guest-jobs";
import { filterJobsByDateRange } from "@/lib/date-range-filter";
import { inferCountryCode } from "@/lib/search-plans";
import type { JobPost, JobSearchParams, LinkedInContentType } from "@/lib/types";

function resolveContentTypes(
  raw?: LinkedInContentType[]
): LinkedInContentType[] {
  if (raw && raw.length > 0) return raw;
  return ["job", "post"];
}

export async function fetchLinkedInDirect(params: JobSearchParams): Promise<{
  jobs: JobPost[];
  notice: string;
  errors: string[];
}> {
  const contentTypes = resolveContentTypes(params.contentTypes);
  const errors: string[] = [];
  const chunks: JobPost[] = [];

  if (contentTypes.includes("job")) {
    try {
      let jobs = await fetchGuestLinkedInJobs(params);
      jobs = filterJobsByDateRange(jobs, params.dateRange);
      chunks.push(...jobs);
      if (jobs.length === 0) {
        errors.push(
          "No jobs parsed from LinkedIn guest search—try broader keywords, set Location (e.g. France), or use Links mode."
        );
      }
    } catch (e) {
      errors.push(
        e instanceof Error
          ? e.message
          : "LinkedIn guest fetch failed."
      );
    }
  }

  if (contentTypes.includes("post")) {
    const links = buildLiveLinkedInResults({
      keywords: params.keywords.join(", "),
      location: params.location,
      dateRange: params.dateRange,
      contentTypes: ["post"],
    });
    chunks.push(...links);
  }

  const notice =
    "Fetch mode: job rows come from LinkedIn’s public job search (same data as the website, no RapidAPI/SerpAPI). Feed posts still open as live links (LinkedIn does not expose public post search HTML).";

  return {
    jobs: chunks,
    notice,
    errors,
  };
}

export function guestFetchMeta(params: JobSearchParams, total: number) {
  return {
    searchCountry: inferCountryCode(params),
    keysConfigured: { rapidApi: false, serpApi: false },
  };
}