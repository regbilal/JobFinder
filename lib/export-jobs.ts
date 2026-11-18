import type { JobPost } from "@/lib/types";
import { JOB_SOURCE_LABELS, LINKEDIN_CONTENT_LABELS } from "@/lib/types";

export function jobsToCsv(jobs: JobPost[]): string {
  const headers = [
    "Type",
    "Title",
    "Company",
    "Location",
    "Match Score",
    "Date Posted",
    "Source",
    "Apply URL",
  ];
  const rows = jobs.map((j) =>
    [
      LINKEDIN_CONTENT_LABELS[j.kind],
      j.title,
      j.company,
      j.location,
      String(j.matchScore),
      j.datePosted,
      JOB_SOURCE_LABELS[j.source],
      j.applyUrl,
    ].map(escapeCsvField)
  );
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildSummaryText(
  jobs: JobPost[],
  context: { keywords: string; location: string }
): string {
  const lines = [
    "JobFinder Report",
    `Generated: ${new Date().toISOString()}`,
    `Keywords: ${context.keywords || "—"}`,
    `Location: ${context.location || "—"}`,
    `Total matches: ${jobs.length}`,
    "",
    ...jobs.map(
      (j, i) =>
        `${i + 1}. ${j.title} @ ${j.company} (${j.location}) — Match ${j.matchScore}% — ${JOB_SOURCE_LABELS[j.source]}`
    ),
  ];
  return lines.join("\n");
}