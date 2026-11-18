import type { JobPost } from "@/lib/types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "to",
  "in",
  "of",
  "with",
  "senior",
  "junior",
  "developer",
  "engineer",
]);

export function tokenizeKeywords(keywords: string[]): string[] {
  return keywords
    .flatMap((k) => k.toLowerCase().split(/[\s,;/]+/))
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function computeMatchScore(
  keywords: string[],
  title: string,
  snippet: string
): number {
  const tokens = tokenizeKeywords(keywords);
  if (tokens.length === 0) return 50;

  const haystack = `${title} ${snippet}`.toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) hits += 1;
  }

  const ratio = hits / tokens.length;
  const base = Math.round(40 + ratio * 55);
  return Math.min(99, Math.max(10, base));
}

export function rescoreJobs(
  jobs: JobPost[],
  keywords: string[]
): JobPost[] {
  return jobs.map((job) => ({
    ...job,
    matchScore: computeMatchScore(keywords, job.title, job.descriptionSnippet),
  }));
}