import {
  buildLinkedInContentSearchUrl,
  buildLinkedInJobSearchUrl,
} from "@/lib/job-board-urls";
import type {
  DateRangePreset,
  JobPost,
  LinkedInContentType,
} from "@/lib/types";

export type SearchMode = "live" | "api";

export function parseKeywordList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function liveJobRow(
  label: string,
  keywordPhrase: string,
  location: string,
  dateRange: DateRangePreset
): JobPost {
  const url = buildLinkedInJobSearchUrl({
    keywords: keywordPhrase,
    location,
    dateRange,
  });
  return {
    id: `live-job-${label}`,
    kind: "job",
    title: label,
    company: "LinkedIn (live)",
    location: location.trim() || "—",
    matchScore: 100,
    datePosted: new Date().toISOString(),
    applyUrl: url,
    applyLinkType: "listing",
    source: "linkedin",
    liveSearch: true,
    descriptionSnippet: `Open fresh job results on LinkedIn for “${keywordPhrase}”.`,
  };
}

function livePostRow(
  label: string,
  keywordPhrase: string,
  location: string,
  dateRange: DateRangePreset
): JobPost {
  const url = buildLinkedInContentSearchUrl(keywordPhrase, location, dateRange);
  return {
    id: `live-post-${label}`,
    kind: "post",
    title: label,
    company: "LinkedIn (live)",
    location: location.trim() || "—",
    matchScore: 100,
    datePosted: new Date().toISOString(),
    applyUrl: url,
    applyLinkType: "listing",
    source: "linkedin",
    liveSearch: true,
    descriptionSnippet: `Open fresh feed posts on LinkedIn for “${keywordPhrase}”.`,
  };
}

/**
 * No external APIs — builds direct LinkedIn search URLs (jobs + posts).
 */
export function buildLiveLinkedInResults(input: {
  keywords: string;
  location: string;
  dateRange: DateRangePreset;
  contentTypes: LinkedInContentType[];
}): JobPost[] {
  const terms = parseKeywordList(input.keywords);
  if (terms.length === 0) return [];

  const loc = input.location;
  const { dateRange, contentTypes } = input;
  const rows: JobPost[] = [];

  if (contentTypes.includes("job")) {
    const combined = terms.join(" ");
    rows.push(liveJobRow("All keywords (jobs)", combined, loc, dateRange));
    for (const term of terms) {
      rows.push(liveJobRow(`Jobs: ${term}`, term, loc, dateRange));
    }
  }

  if (contentTypes.includes("post")) {
    const combined = terms.join(" ");
    rows.push(
      livePostRow("All keywords (posts)", combined, loc, dateRange)
    );
    for (const term of terms) {
      rows.push(livePostRow(`Posts: ${term}`, term, loc, dateRange));
    }
  }

  return rows;
}