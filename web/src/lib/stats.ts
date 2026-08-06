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
