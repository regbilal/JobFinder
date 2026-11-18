import type { DateRangePreset, JobPost, JobSource } from "@/lib/types";
import { buildBoardSearchUrl } from "@/lib/job-board-urls";
import { computeMatchScore } from "@/lib/match-score";

const COMPANIES = [
  "Northwind Digital",
  "Contoso Labs",
  "Fabrikam Systems",
  "Globex Cloud",
  "Initech",
  "Umbrella Analytics",
  "Stark Industries EU",
  "Wayne Enterprises",
];

const TITLE_TEMPLATES = [
  "{kw} — Full Remote",
  "Senior {kw}",
  "{kw} Specialist",
  "Lead {kw} Engineer",
  "{kw} (Contract)",
  "Principal {kw}",
];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysAgoForRange(range: DateRangePreset, rand: () => number): number {
  switch (range) {
    case "24h":
      return rand() * 1;
    case "week":
      return rand() * 7;
    case "month":
      return rand() * 30;
    case "3months":
      return rand() * 90;
    case "any":
      return rand() * 120;
    default:
      return rand() * 30;
  }
}

export function simulateBoardJobs(
  source: JobSource,
  params: import("@/lib/types").JobSearchParams,
  count: number
): JobPost[] {
  const seed = hashSeed(
    `${source}|${params.location}|${params.keywords.join(",")}|${params.dateRange}`
  );
  const rand = mulberry32(seed);
  const primaryKw =
    params.keywords[0]?.trim() || "Software Engineer";

  const jobs: JobPost[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const tpl = TITLE_TEMPLATES[Math.floor(rand() * TITLE_TEMPLATES.length)];
    const title = tpl.replace("{kw}", primaryKw);
    const company = COMPANIES[Math.floor(rand() * COMPANIES.length)];
    const daysAgo = daysAgoForRange(params.dateRange, rand);
    const posted = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const loc =
      params.location.trim() ||
      (rand() > 0.5 ? "Remote" : "Hybrid — EU");

    const snippet = `We are hiring for ${primaryKw}. Stack may include ${
      rand() > 0.5 ? ".NET, Azure, AI" : "TypeScript, React, cloud"
    }. ${params.keywords.slice(1, 4).join(", ") || "Great benefits"}.`;

    const id = `${source}-${seed.toString(36)}-${i}`;
    const matchScore = computeMatchScore(params.keywords, title, snippet);

    jobs.push({
      id,
      title,
      company,
      location: loc,
      matchScore,
      datePosted: posted.toISOString(),
      applyUrl: buildBoardSearchUrl(source, {
        title,
        company,
        location: loc,
      }),
      applyLinkType: "search",
      source,
      descriptionSnippet: snippet,
    });
  }

  return jobs.sort(
    (a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()
  );
}