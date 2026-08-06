import type { Film } from "../types";
import { decadeOf, watchEvents, yearOf } from "./filters";

export interface Headline {
  films: number;
  watches: number;
  hours: number;
  minutes: number;
  directors: number;
  likes: number;
  rewatches: number;
  avgRating: number | null;
  ratedCount: number;
}

export function headline(films: Film[], watchedYear: number | "all"): Headline {
  const events = watchEvents(films, watchedYear);
  const ratings = films.map((f) => f.rating).filter((r): r is number => r != null);
  const directors = new Set<string>();
  let minutes = 0;
  let likes = 0;
  let rewatches = 0;
  for (const f of films) {
    (f.directors ?? []).forEach((d) => directors.add(d));
    if (f.runtime) minutes += f.runtime * (watchedYear === "all" ? Math.max(1, f.watchCount) : eventsForFilm(f, watchedYear));
    if (f.liked) likes += 1;
    if (f.rewatched) rewatches += 1;
  }
  return {
    films: films.length,
    watches: events.length,
    hours: Math.round(minutes / 60),
    minutes,
    directors: directors.size,
    likes,
    rewatches,
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    ratedCount: ratings.length,
  };
}

function eventsForFilm(f: Film, watchedYear: number | "all"): number {
  if (watchedYear === "all") return Math.max(1, f.watchCount);
  return f.watchedDates.filter((d) => yearOf(d) === watchedYear).length || 0;
}

export interface Bin {
  label: string;
  value: number;
}

export function ratingDistribution(films: Film[]): Bin[] {
  const buckets = new Map<number, number>();
  for (let r = 0.5; r <= 5; r += 0.5) buckets.set(r, 0);
  for (const f of films) {
    if (f.rating != null && buckets.has(f.rating)) {
      buckets.set(f.rating, (buckets.get(f.rating) ?? 0) + 1);
    }
  }
  return Array.from(buckets.entries()).map(([r, v]) => ({ label: `${r}`, value: v }));
}

export function watchesOverTime(films: Film[], watchedYear: number | "all"): Bin[] {
  const events = watchEvents(films, watchedYear);
  const map = new Map<string, number>();
  if (watchedYear === "all") {
    for (const e of events) {
      const y = yearOf(e.date);
      if (y == null) continue;
      const k = String(y);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const counts = new Array(12).fill(0);
  for (const e of events) {
    const m = parseInt(e.date.slice(5, 7), 10) - 1;
    if (m >= 0 && m < 12) counts[m] += 1;
  }
  return months.map((label, i) => ({ label, value: counts[i] }));
}

export function byReleaseDecade(films: Film[]): Bin[] {
  const map = new Map<number, number>();
  for (const f of films) {
    const d = decadeOf(f.year);
    if (d == null) continue;
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([d, v]) => ({ label: `${d}s`, value: v }));
}

export function countBy(films: Film[], pick: (f: Film) => string[] | undefined, limit = 15): Bin[] {
  const map = new Map<string, number>();
  for (const f of films) {
    for (const item of pick(f) ?? []) {
      if (!item) continue;
      map.set(item, (map.get(item) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export interface RatedFilm {
  film: Film;
  rating: number;
}

export function topRated(films: Film[], limit = 12): RatedFilm[] {
  return films
    .filter((f) => f.rating != null)
    .map((f) => ({ film: f, rating: f.rating as number }))
    .sort((a, b) => b.rating - a.rating || (b.film.tmdbRating ?? 0) - (a.film.tmdbRating ?? 0))
    .slice(0, limit);
}

export function bottomRated(films: Film[], limit = 12): RatedFilm[] {
  return films
    .filter((f) => f.rating != null)
    .map((f) => ({ film: f, rating: f.rating as number }))
    .sort((a, b) => a.rating - b.rating)
    .slice(0, limit);
}

export interface Contrarian {
  film: Film;
  userRating: number;
  tmdbRating5: number;
  delta: number; // positive => you liked it more than the crowd
}

/** Films where your rating diverges most from the TMDB average (scaled to 5). */
export function contrarian(films: Film[], limit = 10): { over: Contrarian[]; under: Contrarian[] } {
  const scored: Contrarian[] = [];
  for (const f of films) {
    if (f.rating == null || f.tmdbRating == null || !f.tmdbVotes || f.tmdbVotes < 50) continue;
    const tmdb5 = f.tmdbRating / 2;
    scored.push({ film: f, userRating: f.rating, tmdbRating5: tmdb5, delta: f.rating - tmdb5 });
  }
  const over = [...scored].sort((a, b) => b.delta - a.delta).slice(0, limit);
  const under = [...scored].sort((a, b) => a.delta - b.delta).slice(0, limit);
  return { over, under };
}

export interface HeatCell {
  date: string;
  count: number;
}

export interface RatingPersonality {
  ratedCount: number;
  overlapCount: number;
  avgUser: number | null;
  avgCrowd5: number | null;
  generosity: number | null; // avgUser - avgCrowd5
  mostCommon: number | null;
  spread: number | null; // std dev of your ratings
  pctAboveCrowd: number;
  pctBelowCrowd: number;
}

export function ratingPersonality(films: Film[]): RatingPersonality {
  const rated = films.filter((f) => f.rating != null) as (Film & { rating: number })[];
  const ratings = rated.map((f) => f.rating);
  const avgUser = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  // Most common rating.
  const buckets = new Map<number, number>();
  for (const r of ratings) buckets.set(r, (buckets.get(r) ?? 0) + 1);
  let mostCommon: number | null = null;
  let best = -1;
  for (const [r, c] of buckets) if (c > best) { best = c; mostCommon = r; }

  // Std dev.
  let spread: number | null = null;
  if (avgUser != null && ratings.length > 1) {
    const variance = ratings.reduce((a, r) => a + (r - avgUser) ** 2, 0) / ratings.length;
    spread = Math.sqrt(variance);
  }

  // Overlap with TMDB.
  const overlap = rated.filter((f) => f.tmdbRating != null && (f.tmdbVotes ?? 0) >= 50);
  const crowd5 = overlap.map((f) => (f.tmdbRating as number) / 2);
  const avgCrowd5 = crowd5.length ? crowd5.reduce((a, b) => a + b, 0) / crowd5.length : null;
  let above = 0;
  let below = 0;
  for (const f of overlap) {
    const c = (f.tmdbRating as number) / 2;
    if (f.rating > c) above += 1;
    else if (f.rating < c) below += 1;
  }
  const n = overlap.length || 1;

  return {
    ratedCount: ratings.length,
    overlapCount: overlap.length,
    avgUser,
    avgCrowd5,
    generosity: avgUser != null && avgCrowd5 != null ? avgUser - avgCrowd5 : null,
    mostCommon,
    spread,
    pctAboveCrowd: Math.round((above / n) * 100),
    pctBelowCrowd: Math.round((below / n) * 100),
  };
}

export interface BoxOffice {
  totalRevenue: number;
  totalBudget: number;
  withData: number;
  highestGrossing: Film | null;
  biggestBudget: Film | null;
  mostProfitable: { film: Film; ratio: number } | null;
  biggestFlop: { film: Film; loss: number } | null;
}

export function boxOffice(films: Film[]): BoxOffice {
  let totalRevenue = 0;
  let totalBudget = 0;
  let withData = 0;
  let highestGrossing: Film | null = null;
  let biggestBudget: Film | null = null;
  let mostProfitable: { film: Film; ratio: number } | null = null;
  let biggestFlop: { film: Film; loss: number } | null = null;

  for (const f of films) {
    const rev = f.revenue ?? 0;
    const bud = f.budget ?? 0;
    if (rev > 0 || bud > 0) withData += 1;
    totalRevenue += rev;
    totalBudget += bud;
    if (rev > 0 && (!highestGrossing || rev > (highestGrossing.revenue ?? 0))) highestGrossing = f;
    if (bud > 0 && (!biggestBudget || bud > (biggestBudget.budget ?? 0))) biggestBudget = f;
    if (rev > 0 && bud > 1_000_000) {
      const ratio = rev / bud;
      if (!mostProfitable || ratio > mostProfitable.ratio) mostProfitable = { film: f, ratio };
      const loss = bud - rev;
      if (loss > 0 && (!biggestFlop || loss > biggestFlop.loss)) biggestFlop = { film: f, loss };
    }
  }

  return { totalRevenue, totalBudget, withData, highestGrossing, biggestBudget, mostProfitable, biggestFlop };
}

/** Films you rated highly but that few people have seen (low TMDB vote counts). */
export function hiddenGems(films: Film[], minRating = 4, limit = 12): Film[] {
  return films
    .filter((f) => f.rating != null && f.rating >= minRating && (f.tmdbVotes ?? 0) > 0)
    .sort((a, b) => (a.tmdbVotes ?? 0) - (b.tmdbVotes ?? 0))
    .slice(0, limit);
}

export interface Superlatives {
  longest: Film | null;
  shortest: Film | null;
  oldest: Film | null;
  newest: Film | null;
  mostRewatched: Film | null;
}

/**
 * Comparable release key. Uses the exact TMDB release date (YYYY-MM-DD) when
 * available so ties within a year resolve to the film that actually came out
 * first; falls back to a mid-year date when only the year is known so a film
 * with a precise date still outranks a year-only entry correctly.
 */
function releaseKey(f: Film): string | null {
  if (f.releaseDate && /^\d{4}-\d{2}-\d{2}/.test(f.releaseDate)) return f.releaseDate.slice(0, 10);
  if (f.year) return `${f.year}-06-30`;
  return null;
}

export function superlatives(films: Film[]): Superlatives {
  let longest: Film | null = null;
  let shortest: Film | null = null;
  let oldest: Film | null = null;
  let newest: Film | null = null;
  let oldestKey: string | null = null;
  let newestKey: string | null = null;
  let mostRewatched: Film | null = null;
  for (const f of films) {
    if (f.runtime && f.runtime > 0) {
      if (!longest || f.runtime > (longest.runtime ?? 0)) longest = f;
      if (!shortest || f.runtime < (shortest.runtime ?? Infinity)) shortest = f;
    }
    const rk = releaseKey(f);
    if (rk) {
      if (oldestKey == null || rk < oldestKey) { oldest = f; oldestKey = rk; }
      if (newestKey == null || rk > newestKey) { newest = f; newestKey = rk; }
    }
    if (!mostRewatched || f.watchCount > mostRewatched.watchCount) mostRewatched = f;
  }
  return { longest, shortest, oldest, newest, mostRewatched };
}

export function dailyCounts(films: Film[], watchedYear: number | "all"): Map<string, number> {
  const events = watchEvents(films, watchedYear);
  const map = new Map<string, number>();
  for (const e of events) {
    const day = e.date.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return map;
}

export interface ActivityStats {
  activeDays: number;
  totalWatches: number;
  longestStreak: number;
  longestStreakEnd: string | null;
  currentStreak: number;
  busiestDay: { date: string; count: number } | null;
  perActiveDay: number;
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/** GitHub-style activity metrics derived from per-day watch counts. */
export function activityStats(counts: Map<string, number>): ActivityStats {
  const days = Array.from(counts.entries())
    .filter(([, c]) => c > 0)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));

  if (days.length === 0) {
    return {
      activeDays: 0,
      totalWatches: 0,
      longestStreak: 0,
      longestStreakEnd: null,
      currentStreak: 0,
      busiestDay: null,
      perActiveDay: 0,
    };
  }

  let total = 0;
  let busiest = { date: days[0][0], count: days[0][1] };
  let longest = 1;
  let longestEnd = days[0][0];
  let run = 1;

  for (let i = 0; i < days.length; i++) {
    const [date, count] = days[i];
    total += count;
    if (count > busiest.count) busiest = { date, count };
    if (i > 0) {
      const gap = dayDiff(days[i - 1][0], date);
      if (gap === 1) {
        run += 1;
      } else {
        run = 1;
      }
      if (run > longest) {
        longest = run;
        longestEnd = date;
      }
    }
  }

  // Current streak: consecutive days counting back from the most recent active day.
  const lastDate = days[days.length - 1][0];
  let current = 1;
  for (let i = days.length - 2; i >= 0; i--) {
    if (dayDiff(days[i][0], days[i + 1][0]) === 1) current += 1;
    else break;
  }
  // If the most recent watch is old, the "current" streak is stale; keep it as
  // the trailing run but it naturally reflects the last active window.
  void lastDate;

  return {
    activeDays: days.length,
    totalWatches: total,
    longestStreak: longest,
    longestStreakEnd: longestEnd,
    currentStreak: current,
    busiestDay: busiest,
    perActiveDay: total / days.length,
  };
}
