"use client";

import {
  DATE_RANGE_LABELS,
  JOB_SOURCE_LABELS,
  type DateRangePreset,
  type JobSource,
} from "@/lib/types";
import { FormEvent, useState } from "react";
import clsx from "clsx";

export interface SearchFormValues {
  keywords: string;
  location: string;
  dateRange: DateRangePreset;
  sources: JobSource[];
}

const ALL_SOURCES: JobSource[] = [
  "linkedin",
  "indeed",
  "glassdoor",
  "regional",
];

export function SearchForm({
  onSearch,
  loading,
}: {
  onSearch: (values: SearchFormValues) => void;
  loading: boolean;
}) {
  const [keywords, setKeywords] = useState(
    "Senior .NET Developer, Azure AI"
  );
  const [location, setLocation] = useState("");
  const [dateRange, setDateRange] = useState<DateRangePreset>("week");
  const [sources, setSources] = useState<JobSource[]>(ALL_SOURCES);

  function toggleSource(id: JobSource) {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (sources.length === 0) return;
    onSearch({ keywords, location, dateRange, sources });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Job descriptions / keywords
          </label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            placeholder="Senior .NET Developer, Azure AI"
          />
          <p className="mt-1 text-xs text-slate-500">
            Comma-separated skills, titles, or phrases.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Location
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            placeholder="Germany, Berlin, Remote EU…"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Date posted
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          >
            {(Object.keys(DATE_RANGE_LABELS) as DateRangePreset[]).map((key) => (
              <option key={key} value={key}>
                {DATE_RANGE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <p className="text-sm font-medium text-slate-700">Job boards</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_SOURCES.map((id) => {
              const active = sources.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleSource(id)}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    active
                      ? "border-brand-300 bg-brand-50 text-brand-800"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {JOB_SOURCE_LABELS[id]}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Modular aggregators (simulated). Swap implementations under{" "}
            <code className="rounded bg-slate-100 px-1">lib/aggregators</code>.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Searching boards…" : "Search jobs"}
        </button>
        {sources.length === 0 ? (
          <span className="text-xs text-amber-700">
            Select at least one job board.
          </span>
        ) : null}
      </div>
    </form>
  );
}