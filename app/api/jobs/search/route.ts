import { NextResponse } from "next/server";
import { aggregateJobs } from "@/lib/aggregators";
import type { DateRangePreset, JobSearchParams, JobSource } from "@/lib/types";

const VALID_RANGES: DateRangePreset[] = [
  "24h",
  "week",
  "month",
  "3months",
  "any",
];

const VALID_SOURCES: JobSource[] = [
  "linkedin",
  "indeed",
  "glassdoor",
  "regional",
];

function parseKeywords(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSources(raw: unknown): JobSource[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((s): s is JobSource =>
    VALID_SOURCES.includes(s as JobSource)
  );
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

  const sources = parseSources(body.sources);

  const params: JobSearchParams = {
    keywords,
    location,
    dateRange,
    sources,
  };

  const { jobs, sources: usedSources } = await aggregateJobs(params);

  return NextResponse.json({
    jobs,
    meta: {
      total: jobs.length,
      queriedAt: new Date().toISOString(),
      sources: usedSources,
      params,
    },
  });
}