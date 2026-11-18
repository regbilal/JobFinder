import { glassdoorAggregator } from "@/lib/aggregators/boards/glassdoor";
import { indeedAggregator } from "@/lib/aggregators/boards/indeed";
import { linkedInAggregator } from "@/lib/aggregators/boards/linkedin";
import { regionalAggregator } from "@/lib/aggregators/boards/regional";
import type { JobBoardAggregator } from "@/lib/aggregators/types";
import type { JobPost, JobSearchParams, JobSource } from "@/lib/types";

const ALL_AGGREGATORS: JobBoardAggregator[] = [
  linkedInAggregator,
  indeedAggregator,
  glassdoorAggregator,
  regionalAggregator,
];

const byId = new Map<JobSource, JobBoardAggregator>(
  ALL_AGGREGATORS.map((a) => [a.id, a])
);

export function listAggregators(): JobBoardAggregator[] {
  return ALL_AGGREGATORS;
}

export async function aggregateJobs(
  params: JobSearchParams
): Promise<{ jobs: JobPost[]; sources: JobSource[] }> {
  const selected =
    params.sources && params.sources.length > 0
      ? params.sources
          .map((id) => byId.get(id))
          .filter((a): a is JobBoardAggregator => Boolean(a))
      : ALL_AGGREGATORS;

  const results = await Promise.all(
    selected.map((aggregator) =>
      aggregator.fetchJobs(params).catch(() => [] as JobPost[])
    )
  );

  const merged = dedupeJobs(results.flat());
  merged.sort((a, b) => b.matchScore - a.matchScore);

  return {
    jobs: merged,
    sources: selected.map((s) => s.id),
  };
}

function dedupeJobs(jobs: JobPost[]): JobPost[] {
  const seen = new Set<string>();
  const out: JobPost[] = [];
  for (const job of jobs) {
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}