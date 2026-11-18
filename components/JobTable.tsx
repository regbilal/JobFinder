"use client";

import type { JobPost } from "@/lib/types";
import { LINKEDIN_CONTENT_LABELS } from "@/lib/types";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 60) return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

export function JobTable({ jobs }: { jobs: JobPost[] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
        No results match your filters. Run a search or adjust filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Company / author</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Posted</th>
              <th className="px-4 py-3 text-right">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      job.liveSearch
                        ? "bg-emerald-100 text-emerald-900"
                        : job.kind === "post"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-sky-100 text-sky-900"
                    }`}
                  >
                    {job.liveSearch ? "Live link" : LINKEDIN_CONTENT_LABELS[job.kind]}
                  </span>
                </td>
                <td className="max-w-xs px-4 py-3 font-medium text-slate-900">
                  <div className="line-clamp-2">{job.title}</div>
                  <p className="mt-0.5 line-clamp-1 text-xs font-normal text-slate-500">
                    {job.descriptionSnippet}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {job.company}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {job.location}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor(job.matchScore)}`}
                  >
                    {job.matchScore}%
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatDate(job.datePosted)}
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={
                      job.applyLinkType === "search"
                        ? "Opens LinkedIn search (demo row)"
                        : undefined
                    }
                    className="inline-flex rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                  >
                    {job.liveSearch
                      ? "Open on LinkedIn"
                      : job.kind === "post"
                        ? "View post"
                        : "Open job"}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}