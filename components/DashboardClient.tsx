"use client";

import { AppShell } from "@/components/AppShell";
import { JobResults } from "@/components/JobResults";
import { SearchForm, type SearchFormValues } from "@/components/SearchForm";
import { buildLiveLinkedInResults } from "@/lib/live-linkedin-search";
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
    setError("");
    setLoading(true);
    setLastSearch({ keywords: values.keywords, location: values.location });

    try {
      if (values.searchMode === "live") {
        const liveJobs = buildLiveLinkedInResults({
          keywords: values.keywords,
          location: values.location,
          dateRange: values.dateRange,
          contentTypes: values.contentTypes,
        });
        if (liveJobs.length === 0) {
          setError("Enter at least one keyword.");
          setJobs([]);
          setMeta(null);
          return;
        }
        setJobs(liveJobs);
        setMeta({
          total: liveJobs.length,
          queriedAt: new Date().toISOString(),
          sources: ["linkedin"],
          params: {
            keywords: values.keywords.split(",").map((k) => k.trim()).filter(Boolean),
            location: values.location,
            dateRange: values.dateRange,
            contentTypes: values.contentTypes,
          },
          dataMode: "live",
          liveBoards: ["linkedin"],
          liveContent: { jobs: true, posts: true },
          notice:
            "Live mode — no API. Each row opens linkedin.com with your keywords, location, and date filter. Apply and save jobs on LinkedIn; use CSV export to keep this link list.",
          keysConfigured: { rapidApi: false, serpApi: false },
          searchCountry: values.location || "—",
        });
        return;
      }

      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: values.keywords,
          location: values.location,
          dateRange: values.dateRange,
          contentTypes: values.contentTypes,
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
    } catch {
      setError("Could not reach the search API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="LinkedIn job search"
      subtitle="Default: Live mode (no API keys). Switch to API aggregation if you use JSearch / SerpAPI."
    >
      <div className="space-y-8">
        <SearchForm onSearch={runSearch} loading={loading} />

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {meta ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Last query at {new Date(meta.queriedAt).toLocaleString()} ·{" "}
              {meta.total} links · mode:{" "}
              <span className="font-medium text-slate-700">{meta.dataMode}</span>
              {meta.dataMode !== "live"
                ? ` · RAPIDAPI ${meta.keysConfigured?.rapidApi ? "on" : "off"} · SERPAPI ${meta.keysConfigured?.serpApi ? "on" : "off"}`
                : ""}
            </p>
            {meta.notice ? (
              <p
                className={`rounded-lg border px-3 py-2 text-xs ${
                  meta.dataMode === "demo" || (meta.errors?.length ?? 0) > 0
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-sky-200 bg-sky-50 text-sky-900"
                }`}
              >
                {meta.notice}
              </p>
            ) : null}
          </div>
        ) : null}

        {jobs.length > 0 ? (
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
                Use <strong>Live on LinkedIn</strong>, enter your titles, then open each
                row on linkedin.com.
              </p>
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}