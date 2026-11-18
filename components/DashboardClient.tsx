"use client";

import { AppShell } from "@/components/AppShell";
import { JobResults } from "@/components/JobResults";
import { SearchForm, type SearchFormValues } from "@/components/SearchForm";
import type { JobPost, JobSearchResponse } from "@/lib/types";
import { useState } from "react";

export function DashboardClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [lastSearch, setLastSearch] = useState<{
    keywords: string;
    location: string;
  }>({ keywords: "", location: "" });
  const [meta, setMeta] = useState<JobSearchResponse["meta"] | null>(null);

  async function runSearch(values: SearchFormValues) {
    if (values.sources.length === 0) {
      setError("Select at least one job board.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: values.keywords,
          location: values.location,
          dateRange: values.dateRange,
          sources: values.sources,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed.");
        return;
      }
      const payload = data as JobSearchResponse;
      setJobs(payload.jobs);
      setMeta(payload.meta);
      setLastSearch({
        keywords: values.keywords,
        location: values.location,
      });
    } catch {
      setError("Could not reach the search API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Job search dashboard"
      subtitle="Aggregate listings from LinkedIn, Indeed, Glassdoor, and regional boards. Demo results are simulated sample rows; Search opens a live filtered query on that board. Wire real APIs in lib/aggregators for direct Apply links."
    >
      <div className="space-y-8">
        <SearchForm onSearch={runSearch} loading={loading} />

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {meta ? (
          <p className="text-xs text-slate-500">
            Last query at {new Date(meta.queriedAt).toLocaleString()} ·{" "}
            {meta.total} results from {meta.sources.length} board
            {meta.sources.length === 1 ? "" : "s"}
          </p>
        ) : null}

        {jobs.length > 0 || meta ? (
          <JobResults
            jobs={jobs}
            keywords={lastSearch.keywords}
            location={lastSearch.location}
          />
        ) : (
          !loading && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-800">
                Ready when you are
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Enter keywords and run a search to populate the report.
              </p>
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}