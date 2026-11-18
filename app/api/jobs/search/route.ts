import { NextResponse } from "next/server";
import { aggregateJobs } from "@/lib/aggregators";
import type {
  DateRangePreset,
  JobSearchParams,
  LinkedInContentType,
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

  const params: JobSearchParams = {
    keywords,
    location,
    dateRange,
    sources: ["linkedin"],
    contentTypes,
  };

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
    },
  });
}