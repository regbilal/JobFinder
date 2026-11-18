import { NextResponse } from "next/server";
import { aggregateJobs } from "@/lib/aggregators";
import {
  browserMeta,
  fetchLinkedInBrowser,
} from "@/lib/aggregators/browser-linkedin";
import {
  fetchLinkedInDirect,
  guestFetchMeta,
} from "@/lib/aggregators/fetch-linkedin";

export const maxDuration = 120;
export const dynamic = "force-dynamic";
import type {
  DateRangePreset,
  JobSearchParams,
  LinkedInContentType,
  SearchMode,
} from "@/lib/types";

const VALID_RANGES: DateRangePreset[] = [
  "24h",
  "week",
  "month",
  "3months",
  "any",
];

function parseContentTypes(raw: unknown): LinkedInContentType[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter(
    (t): t is LinkedInContentType => t === "job" || t === "post"
  );
}

function parseKeywords(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const keywords = parseKeywords(body.keywords);
  if (keywords.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one keyword or job title." },
      { status: 400 }
    );
  }

  const location =
    typeof body.location === "string" ? body.location.trim() : "";

  const dateRange = VALID_RANGES.includes(body.dateRange as DateRangePreset)
    ? (body.dateRange as DateRangePreset)
    : "week";

  const contentTypes = parseContentTypes(body.contentTypes);

  const searchMode: SearchMode =
    body.searchMode === "api" ||
    body.searchMode === "links" ||
    body.searchMode === "browser"
      ? body.searchMode
      : "fetch";

  const params: JobSearchParams = {
    keywords,
    location,
    dateRange,
    sources: ["linkedin"],
    contentTypes,
  };

  if (searchMode === "browser") {
    const browser = await fetchLinkedInBrowser(params);
    const extra = browserMeta(params);
    return NextResponse.json({
      jobs: browser.jobs,
      meta: {
        total: browser.jobs.length,
        queriedAt: new Date().toISOString(),
        sources: ["linkedin"],
        params,
        dataMode: "live" as const,
        liveBoards: ["linkedin"],
        liveContent: { jobs: true, posts: true },
        notice: browser.notice,
        errors: browser.errors.length ? browser.errors : undefined,
        searchMode: "browser",
        linkedInSession: extra.linkedInSession,
        keysConfigured: extra.keysConfigured,
        searchCountry: extra.searchCountry,
      },
    });
  }

  if (searchMode === "fetch") {
    const direct = await fetchLinkedInDirect(params);
    const extra = guestFetchMeta(params, direct.jobs.length);
    return NextResponse.json({
      jobs: direct.jobs,
      meta: {
        total: direct.jobs.length,
        queriedAt: new Date().toISOString(),
        sources: ["linkedin"],
        params,
        dataMode: "live" as const,
        liveBoards: ["linkedin"],
        liveContent: { jobs: true, posts: true },
        notice: direct.notice,
        errors: direct.errors.length ? direct.errors : undefined,
        searchMode: "fetch",
        ...extra,
      },
    });
  }

  const result = await aggregateJobs(params);

  return NextResponse.json({
    jobs: result.jobs,
    meta: {
      total: result.jobs.length,
      queriedAt: new Date().toISOString(),
      sources: result.sources,
      params,
      dataMode: result.dataMode,
      liveBoards: result.liveBoards,
      liveContent: result.liveContent,
      notice: result.notice,
      errors: result.errors,
      keysConfigured: result.keysConfigured,
      searchCountry: result.searchCountry,
      searchMode: "api",
    },
  });
}