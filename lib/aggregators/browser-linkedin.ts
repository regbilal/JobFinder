import { withLinkedInBrowser } from "@/lib/automation/browser";
import { formatPlaywrightLaunchError } from "@/lib/automation/chromium-launch";
import { fetchJobsWithBrowser } from "@/lib/automation/linkedin-browser-jobs";
import { fetchPostsWithBrowser } from "@/lib/automation/linkedin-browser-posts";
import { isLinkedInSessionConfigured } from "@/lib/automation/linkedin-session";
import { resolveLinkedInLiAt } from "@/lib/linkedin-cookie-store";
import { filterBrowserJobs } from "@/lib/aggregators/browser-jobs-filter";
import { fetchGuestLinkedInJobs } from "@/lib/scrapers/linkedin-guest-jobs";
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
  const wantJobs = contentTypes.includes("job");
  const wantPosts = contentTypes.includes("post");

  try {
    await withLinkedInBrowser(async (context) => {
      if (wantJobs) {
        try {
          const raw = await fetchJobsWithBrowser(params, context);
          const jobs = filterBrowserJobs(raw, params.dateRange);
          chunks.push(...jobs);
        } catch (e) {
          errors.push(formatPlaywrightLaunchError(e));
        }
      }

      if (wantPosts) {
        try {
          const posts = await fetchPostsWithBrowser(params, context);
          chunks.push(...posts);
          if (posts.length === 0) {
            errors.push("No posts in content search—try shorter keywords or job-only.");
          }
        } catch (e) {
          errors.push(formatPlaywrightLaunchError(e));
        }
      }
    });
  } catch (e) {
    errors.push(formatPlaywrightLaunchError(e));
  }

  if (wantJobs) {
    const jobCount = chunks.filter((j) => j.kind === "job").length;
    if (jobCount === 0) {
      try {
        const fallback = filterBrowserJobs(
          await fetchGuestLinkedInJobs(params),
          params.dateRange
        );
        if (fallback.length > 0) {
          chunks.push(
            ...fallback.map((j) => ({ ...j, dataProvider: "browser" as const }))
          );
        }
      } catch (e) {
        errors.push(
          e instanceof Error ? e.message : "Guest job fallback failed."
        );
      }
    }

    if (chunks.filter((j) => j.kind === "job").length === 0) {
      errors.push(
        "No jobs found—set Location (e.g. France), widen date range, or use Guest fetch mode."
      );
    }
  }

  return {
    jobs: chunks,
    notice:
      "Browser mode (fast): up to 2 job keyword passes via in-session API, 1 content search if posts enabled—uncheck Posts for quickest job-only runs.",
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