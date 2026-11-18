import type { JobSearchParams } from "@/lib/types";

const MAX_PLANS = 10;

/** Run combined keywords first, then each comma-separated term (helps long French title lists). */
export function expandKeywordPlans(keywords: string[]): string[][] {
  const cleaned = keywords.map((k) => k.trim()).filter(Boolean);
  if (cleaned.length === 0) return [];

  const plans: string[][] = [cleaned];
  for (const kw of cleaned) {
    if (kw.length >= 3) plans.push([kw]);
  }

  const seen = new Set<string>();
  const unique: string[][] = [];
  for (const plan of plans) {
    const key = plan.join("|").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(plan);
  }

  return unique.slice(0, MAX_PLANS);
}

const FR_HINT =
  /france|paris|lyon|toulouse|belg|suisse|swiss|quebec|montréal|canada|réf|responsable|ingénieur|ingenieur|méthode|methode|atelier|coordinateur|planificateur|superviseur|équipe|equipe|chef d/i;

export function inferCountryCode(params: JobSearchParams): string {
  const text = `${params.location} ${params.keywords.join(" ")}`;
  if (FR_HINT.test(text)) return "fr";
  const loc = params.location.trim().toLowerCase();
  if (loc.length === 2 && /^[a-z]{2}$/.test(loc)) return loc;
  return "us";
}

export function inferSerpLocale(params: JobSearchParams): {
  gl: string;
  hl: string;
  google_domain: string;
} {
  const country = inferCountryCode(params);
  if (country === "fr") {
    return { gl: "fr", hl: "fr", google_domain: "google.fr" };
  }
  if (country === "de") {
    return { gl: "de", hl: "de", google_domain: "google.de" };
  }
  return { gl: "us", hl: "en", google_domain: "google.com" };
}