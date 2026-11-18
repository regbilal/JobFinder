import type { JobPost, JobSearchParams } from "@/lib/types";
import { buildLinkedInContentSearchUrl } from "@/lib/job-board-urls";
import { computeMatchScore } from "@/lib/match-score";
import { mulberry32, hashSeed } from "@/lib/aggregators/simulator-utils";

const AUTHORS = [
  "Alex Chen",
  "Priya Sharma",
  "Marco Rossi",
  "Jordan Lee",
  "Fatima Noor",
];

const POST_HOOKS = [
  "We're hiring a {kw}!",
  "Open role: {kw} — DM me if interested.",
  "My team is growing. Looking for a {kw}.",
  "{kw} opportunity — link in comments.",
  "Excited to share we're recruiting a {kw}.",
];

export function simulateLinkedInPosts(
  params: JobSearchParams,
  count: number
): JobPost[] {
  const seed = hashSeed(
    `posts|${params.location}|${params.keywords.join(",")}|${params.dateRange}`
  );
  const rand = mulberry32(seed);
  const primaryKw = params.keywords[0]?.trim() || "engineer";
  const now = Date.now();

  const posts: JobPost[] = [];
  for (let i = 0; i < count; i++) {
    const hook = POST_HOOKS[Math.floor(rand() * POST_HOOKS.length)].replace(
      "{kw}",
      primaryKw
    );
    const author = AUTHORS[Math.floor(rand() * AUTHORS.length)];
    const daysAgo = rand() * (params.dateRange === "24h" ? 1 : 14);
    const posted = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const snippet = `${hook} ${params.keywords.slice(1, 3).join(", ") || "Great team, remote-friendly."} ${params.location ? `(${params.location})` : ""}`;

    posts.push({
      id: `post-demo-${seed}-${i}`,
      kind: "post",
      title: hook,
      company: author,
      location: params.location.trim() || "—",
      matchScore: computeMatchScore(params.keywords, hook, snippet),
      datePosted: posted.toISOString(),
      applyUrl: buildLinkedInContentSearchUrl(
        [hook, ...params.keywords].join(" "),
        params.location
      ),
      applyLinkType: "search",
      source: "linkedin",
      descriptionSnippet: snippet,
    });
  }

  return posts.sort(
    (a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()
  );
}