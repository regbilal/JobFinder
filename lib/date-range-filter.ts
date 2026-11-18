import type { DateRangePreset, JobPost } from "@/lib/types";

export function maxAgeMs(range: DateRangePreset): number | null {
  switch (range) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "week":
      return 7 * 24 * 60 * 60 * 1000;
    case "month":
      return 30 * 24 * 60 * 60 * 1000;
    case "3months":
      return 90 * 24 * 60 * 60 * 1000;
    case "any":
      return null;
    default:
      return null;
  }
}

export function filterJobsByDateRange(
  jobs: JobPost[],
  range: DateRangePreset,
  opts?: { keepUnknownPosted?: boolean }
): JobPost[] {
  const maxAge = maxAgeMs(range);
  if (maxAge === null) return jobs;

  const cutoff = Date.now() - maxAge;
  return jobs.filter((job) => {
    if (job.unknownPostedDate) return opts?.keepUnknownPosted === true;
    const posted = new Date(job.datePosted).getTime();
    if (Number.isNaN(posted)) return opts?.keepUnknownPosted === true;
    return posted >= cutoff;
  });
}