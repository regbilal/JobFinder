"use client";

import {
  buildLinkedInContentSearchUrl,
  buildLinkedInJobSearchUrl,
} from "@/lib/job-board-urls";
import type { DateRangePreset, LinkedInContentType } from "@/lib/types";

export function LiveLinkedInLinks({
  keywords,
  location,
  dateRange,
  contentTypes,
}: {
  keywords: string;
  location: string;
  dateRange: DateRangePreset;
  contentTypes: LinkedInContentType[];
}) {
  const showJobs = contentTypes.includes("job");
  const showPosts = contentTypes.includes("post");
  if (!showJobs && !showPosts) return null;

  return (
    <div className="rounded-xl border border-[#0a66c2]/25 bg-[#0a66c2]/5 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Always-fresh (no API)
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Third-party APIs often return older indexed jobs. These open LinkedIn directly with
        your filters—same keywords, up-to-date on their site.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {showJobs ? (
          <a
            className="inline-flex rounded-lg bg-[#0a66c2] px-3 py-2 text-xs font-semibold text-white hover:bg-[#004182]"
            href={buildLinkedInJobSearchUrl({ keywords, location, dateRange })}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open LinkedIn Jobs (live)
          </a>
        ) : null}
        {showPosts ? (
          <a
            className="inline-flex rounded-lg border border-[#0a66c2] bg-white px-3 py-2 text-xs font-semibold text-[#0a66c2] hover:bg-[#0a66c2]/10"
            href={buildLinkedInContentSearchUrl(keywords, location, dateRange)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open LinkedIn posts (live)
          </a>
        ) : null}
      </div>
    </div>
  );
}