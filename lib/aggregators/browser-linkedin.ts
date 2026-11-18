import { fetchJobsWithBrowser } from "@/lib/automation/linkedin-browser-jobs";
import { fetchPostsWithBrowser } from "@/lib/automation/linkedin-browser-posts";
import { isLinkedInSessionConfigured } from "@/lib/automation/linkedin-session";
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
  if (!isLinkedInSessionConfigured()) {
    return {
      jobs: [],
      notice: "",
      errors: [
        "Set LINKEDIN_LI_AT in Vercel/your .env.local (session cookie from your browser after signing in to LinkedIn).",
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
      errors.push(e instanceof Error ? e.message : "Browser job scrape failed.");
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
      errors.push(e instanceof Error ? e.message : "Browser post scrape failed.");
    }
  }

  return {
    jobs: chunks,
    notice:
      "Logged-in browser mode uses your LINKEDIN_LI_AT cookie with Playwright. Run on a Node host with Chromium (local, Railway, Docker)—not typical Vercel serverless. Never commit cookies to git.",
    errors,
  };
}

export function browserMeta(params: JobSearchParams) {
  return {
    searchCountry: inferCountryCode(params),
    keysConfigured: {
      rapidApi: Boolean(process.env.RAPIDAPI_KEY),
      serpApi: Boolean(process.env.SERPAPI_KEY),
    },
    linkedInSession: isLinkedInSessionConfigured(),
  };
}