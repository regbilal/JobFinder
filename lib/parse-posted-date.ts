/** Best-effort parse for API / Google result date strings. */

export function parseFlexiblePostedDate(raw?: string): Date | null {
  if (!raw?.trim()) return null;
  const s = raw.trim().toLowerCase();

  const absolute = new Date(raw);
  if (!Number.isNaN(absolute.getTime()) && absolute.getFullYear() > 2010) {
    return absolute;
  }

  const mins = s.match(/(\d+)\s*min/);
  if (mins) return new Date(Date.now() - Number(mins[1]) * 60_000);

  const hours = s.match(/(\d+)\s*hour/);
  if (hours) return new Date(Date.now() - Number(hours[1]) * 3_600_000);

  const days = s.match(/(\d+)\s*day/);
  if (days) return new Date(Date.now() - Number(days[1]) * 86_400_000);

  const weeks = s.match(/(\d+)\s*week/);
  if (weeks) return new Date(Date.now() - Number(weeks[1]) * 7 * 86_400_000);

  const months = s.match(/(\d+)\s*month/);
  if (months) return new Date(Date.now() - Number(months[1]) * 30 * 86_400_000);

  return null;
}