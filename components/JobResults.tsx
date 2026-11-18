"use client";

import { ExportReport } from "@/components/ExportReport";
import { JobTable } from "@/components/JobTable";
import type { JobPost, JobSource } from "@/lib/types";
import { JOB_SOURCE_LABELS } from "@/lib/types";
import { useMemo, useState } from "react";

export function JobResults({
  jobs,
  keywords,
  location,
}: {
  jobs: JobPost[];
  keywords: string;
  location: string;
}) {
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [source, setSource] = useState<JobSource | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (job.matchScore < minScore) return false;
      if (source !== "all" && job.source !== source) return false;
      if (!q) return true;
      const haystack = `${job.title} ${job.company} ${job.location}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [jobs, query, minScore, source]);

  const sourcesInResults = useMemo(() => {
    const set = new Set(jobs.map((j) => j.source));
    return Array.from(set);
  }, [jobs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-slate-600">
              Filter text
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Company, title…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Min match ({minScore}%)
            </label>
            <input
              type="range"
              min={0}
              max={95}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="mt-2 w-full accent-brand-600"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Source</label>
            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as JobSource | "all")
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All sources</option>
              {sourcesInResults.map((s) => (
                <option key={s} value={s}>
                  {JOB_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Showing{" "}
          <span className="font-semibold text-slate-900">{filtered.length}</span>{" "}
          of {jobs.length}
        </p>
      </div>

      <ExportReport jobs={filtered} keywords={keywords} location={location} />

      <JobTable jobs={filtered} />
    </div>
  );
}