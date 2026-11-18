/** Normalize Google redirect wrappers and trim tracking params on LinkedIn URLs. */

export function unwrapRedirectUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    if (
      (u.hostname.includes("google.") || u.hostname === "www.google.com") &&
      u.searchParams.has("url")
    ) {
      return decodeURIComponent(u.searchParams.get("url")!);
    }
    if (u.hostname === "l.wl.co" || u.hostname === "lnkd.in") {
      return trimmed;
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

export function normalizeLinkedInUrl(url: string): string {
  return unwrapRedirectUrl(url);
}

export function isLinkedInJobListingUrl(url: string): boolean {
  const lower = normalizeLinkedInUrl(url).toLowerCase();
  return (
    lower.includes("linkedin.com/jobs/view/") ||
    lower.includes("linkedin.com/jobs/view?")
  );
}

export function isLinkedInPostUrl(url: string): boolean {
  const lower = normalizeLinkedInUrl(url).toLowerCase();
  return (
    lower.includes("linkedin.com/posts/") ||
    lower.includes("linkedin.com/feed/update/") ||
    lower.includes("linkedin.com/pulse/")
  );
}

export function extractLinkedInJobId(url: string): string | null {
  const normalized = normalizeLinkedInUrl(url);
  const match = normalized.match(/linkedin\.com\/jobs\/view\/(\d+)/i);
  return match?.[1] ?? null;
}

/** Returns a direct linkedin.com/jobs/view/{id} URL or null if not a real job listing link. */
export function canonicalLinkedInJobUrl(
  applyLink?: string,
  jobId?: string
): string | null {
  for (const candidate of [applyLink, jobId].filter(Boolean) as string[]) {
    const normalized = normalizeLinkedInUrl(candidate);
    const idFromUrl = extractLinkedInJobId(normalized);
    if (idFromUrl) {
      return `https://www.linkedin.com/jobs/view/${idFromUrl}`;
    }
    if (/^\d{8,}$/.test(candidate.trim())) {
      return `https://www.linkedin.com/jobs/view/${candidate.trim()}`;
    }
    if (isLinkedInJobListingUrl(normalized)) {
      return normalized.split("?")[0];
    }
  }
  return null;
}

export function canonicalLinkedInPostUrl(link?: string): string | null {
  if (!link?.trim()) return null;
  const normalized = normalizeLinkedInUrl(link);
  if (!isLinkedInPostUrl(normalized)) return null;
  try {
    const u = new URL(normalized);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return normalized.split("?")[0];
  }
}