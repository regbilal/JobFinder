import { formatPlaywrightLaunchError } from "@/lib/automation/chromium-launch";
import { fetchJobsWithBrowser } from "@/lib/automation/linkedin-browser-jobs";
import { fetchPostsWithBrowser } from "@/lib/automation/linkedin-browser-posts";
import { isLinkedInSessionConfigured } from "@/lib/automation/linkedin-session";
import { resolveLinkedInLiAt } from "@/lib/linkedin-cookie-store";
import { filterJobsByDateRange } from "@/lib/date-range-filter";
import { inferCountryCode } from "@/lib/search-plans";
import type { JobPost, JobSearchParams, LinkedInContentType } from "@/lib/types";

function resolveContentTypes(
  raw?: LinkedInContentType[]
): LinkedInContentType[] {
  if (raw && raw.length > 0) return raw;
  return ["job", "post"];
}

export async function fetchLinkedInBrowser(params: JobSearchParams): Promise<{
  jobs: JobPost[];
  notice: string;
  errors: string[];
}> {
  if (!(await isLinkedInSessionConfigured())) {
    return {
      jobs: [],
      notice: "",
      errors: [
        'Click "Connect LinkedIn" on the dashboard, or set LINKEDIN_LI_AT in the server environment.',
      ],
    };
  }

  const contentTypes = resolveContentTypes(params.contentTypes);
  const errors: string[] = [];
  const chunks: JobPost[] = [];

  if (contentTypes.includes("job")) {
    try {
      let jobs = await fetchJobsWithBrowser(params);
      jobs = filterJobsByDateRange(jobs, params.dateRange);
      chunks.push(...jobs);
      if (jobs.length === 0) {
        errors.push("No job cards found in browser session—check keywords/location.");
      }
    } catch (e) {
      errors.push(formatPlaywrightLaunchError(e));
    }
  }

  if (contentTypes.includes("post")) {
    try {
      const posts = await fetchPostsWithBrowser(params);
      chunks.push(...posts);
      if (posts.length === 0) {
        errors.push("No posts found in content search.");
      }
    } catch (e) {
      errors.push(formatPlaywrightLaunchError(e));
    }
  }

  return {
    jobs: chunks,
    notice:
      "Logged-in browser mode uses your connected LinkedIn session (encrypted cookie) with Playwright. Host on Railway/Docker with Chromium.",
    errors,
  };
}

export async function browserMeta(params: JobSearchParams) {
  const { liAt } = await resolveLinkedInLiAt();
  return {
    searchCountry: inferCountryCode(params),
    keysConfigured: {
      rapidApi: Boolean(process.env.RAPIDAPI_KEY),
      serpApi: Boolean(process.env.SERPAPI_KEY),
    },
    linkedInSession: Boolean(liAt),
  };
}