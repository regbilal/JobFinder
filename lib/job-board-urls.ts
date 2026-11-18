import type { DateRangePreset } from "@/lib/types";

const LINKEDIN_F_TPR: Partial<Record<DateRangePreset, string>> = {
  "24h": "r86400",
  week: "r604800",
  month: "r2592000",
  "3months": "r7776000",
};

export function buildLinkedInContentSearchUrl(
  keywords: string,
  location?: string,
  dateRange?: DateRangePreset
): string {
  const query = [keywords, location].filter(Boolean).join(" ");
  const params = new URLSearchParams({ keywords: query });
  if (dateRange === "24h") params.set("datePosted", "past-24h");
  if (dateRange === "week") params.set("datePosted", "past-week");
  if (dateRange === "month") params.set("datePosted", "past-month");
  return `https://www.linkedin.com/search/results/content/?${params.toString()}`;
}

export function buildLinkedInJobSearchUrl(input: {
  keywords: string;
  location: string;
  dateRange?: DateRangePreset;
}): string {
  const params = new URLSearchParams({ keywords: input.keywords.trim() });
  if (input.location.trim()) params.set("location", input.location.trim());
  const tpr = input.dateRange ? LINKEDIN_F_TPR[input.dateRange] : undefined;
  if (tpr) params.set("f_TPR", tpr);
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}