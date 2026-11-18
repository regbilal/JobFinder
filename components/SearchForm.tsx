"use client";

import {
  DATE_RANGE_LABELS,
  LINKEDIN_CONTENT_LABELS,
  type DateRangePreset,
  type LinkedInContentType,
  type SearchMode,
} from "@/lib/types";
import clsx from "clsx";
import { FormEvent, useState } from "react";

export interface SearchFormValues {
  keywords: string;
  location: string;
  dateRange: DateRangePreset;
  contentTypes: LinkedInContentType[];
  searchMode: SearchMode;
}

const CONTENT_OPTIONS: LinkedInContentType[] = ["job", "post"];

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
  const [contentTypes, setContentTypes] =
    useState<LinkedInContentType[]>(CONTENT_OPTIONS);
  const [searchMode, setSearchMode] = useState<SearchMode>("live");

  function toggleContent(type: LinkedInContentType) {
    setContentTypes((prev) => {
      if (prev.includes(type)) {
        const next = prev.filter((t) => t !== type);
        return next.length === 0 ? prev : next;
      }
      return [...prev, type];
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (contentTypes.length === 0) return;
    onSearch({ keywords, location, dateRange, contentTypes, searchMode });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex gap-2 rounded-lg border border-[#0a66c2]/20 bg-[#0a66c2]/5 px-3 py-2 text-xs text-slate-700">
        <LinkedInIcon />
        <span>
          <strong className="font-semibold text-[#0a66c2]">LinkedIn only.</strong>{" "}
          <strong>Live mode</strong> opens linkedin.com with your filters (no API, always
          fresh). API mode needs keys and may return older cached listings.
        </span>
      </div>

      <div className="mb-5">
        <p className="text-sm font-medium text-slate-700">Search mode</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <ModeButton
            active={searchMode === "live"}
            onClick={() => setSearchMode("live")}
            label="Live on LinkedIn (no API)"
          />
          <ModeButton
            active={searchMode === "api"}
            onClick={() => setSearchMode("api")}
            label="API aggregation"
          />
        </div>
      </div>

      <div className="mb-5">
        <p className="text-sm font-medium text-slate-700">Search on</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONTENT_OPTIONS.map((type) => {
            const on = contentTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleContent(type)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  on
                    ? "border-[#0a66c2]/40 bg-[#0a66c2]/10 text-[#004182]"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                )}
              >
                {LINKEDIN_CONTENT_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Keywords
          </label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            placeholder="Senior .NET Developer, Azure AI, hiring"
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
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={loading || contentTypes.length === 0}
          className="rounded-lg bg-[#0a66c2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#004182] disabled:opacity-60"
        >
          {loading
            ? "Working…"
            : searchMode === "live"
              ? "Build live LinkedIn searches"
              : "Search via API"}
        </button>
      </div>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-[#0a66c2] bg-[#0a66c2] text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      )}
    >
      {label}
    </button>
  );
}

function LinkedInIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-[#0a66c2]"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.127 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}