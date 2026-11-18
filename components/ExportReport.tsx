"use client";

import type { JobPost } from "@/lib/types";
import { buildSummaryText, jobsToCsv } from "@/lib/export-jobs";
import { useState } from "react";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportReport({
  jobs,
  keywords,
  location,
}: {
  jobs: JobPost[];
  keywords: string;
  location: string;
}) {
  const [showSummary, setShowSummary] = useState(false);
  const summary = buildSummaryText(jobs, { keywords, location });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={jobs.length === 0}
        onClick={() =>
          downloadFile(
            `jobfinder-report-${Date.now()}.csv`,
            jobsToCsv(jobs),
            "text/csv;charset=utf-8"
          )
        }
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        Download CSV
      </button>
      <button
        type="button"
        disabled={jobs.length === 0}
        onClick={() =>
          downloadFile(
            `jobfinder-report-${Date.now()}.json`,
            JSON.stringify(jobs, null, 2),
            "application/json"
          )
        }
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        Download JSON
      </button>
      <button
        type="button"
        disabled={jobs.length === 0}
        onClick={() => setShowSummary((v) => !v)}
        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-50"
      >
        {showSummary ? "Hide summary" : "View summary"}
      </button>
      {showSummary ? (
        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4">
          <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700">
            {summary}
          </pre>
        </div>
      ) : null}
    </div>
  );
}