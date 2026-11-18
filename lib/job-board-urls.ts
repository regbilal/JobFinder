import type { JobSource } from "@/lib/types";

export function buildBoardSearchUrl(
  source: JobSource,
  query: { title: string; company: string; location: string }
): string {
  const title = query.title.trim();
  const company = query.company.trim();
  const location = query.location.trim();

  const keyword = [title, company].filter(Boolean).join(" ");

  switch (source) {
    case "linkedin": {
      const params = new URLSearchParams({ keywords: keyword });
      if (location) params.set("location", location);
      return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
    }
    case "indeed": {
      const params = new URLSearchParams({ q: keyword });
      if (location) params.set("l", location);
      return `https://www.indeed.com/jobs?${params.toString()}`;
    }
    case "glassdoor": {
      const params = new URLSearchParams({ "sc.keyword": keyword });
      if (location) params.set("locKeyword", location);
      return `https://www.glassdoor.com/Job/jobs.htm?${params.toString()}`;
    }
    case "regional": {
      const q = [title, company, "jobs", location].filter(Boolean).join(" ");
      return `https://www.google.com/search?q=${encodeURIComponent(q)}&udm=8`;
    }
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(
        `${keyword} jobs ${location}`.trim()
      )}&udm=8`;
  }
}