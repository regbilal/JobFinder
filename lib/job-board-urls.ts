export function buildLinkedInContentSearchUrl(
  keywords: string,
  location?: string
): string {
  const query = [keywords, location].filter(Boolean).join(" ");
  const params = new URLSearchParams({ keywords: query });
  return `https://www.linkedin.com/search/results/content/?${params.toString()}`;
}

export function buildLinkedInJobSearchUrl(query: {
  title: string;
  company: string;
  location: string;
}): string {
  const keyword = [query.title, query.company].filter(Boolean).join(" ");
  const params = new URLSearchParams({ keywords: keyword });
  if (query.location.trim()) params.set("location", query.location.trim());
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}