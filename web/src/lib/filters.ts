import type { Film } from "../types";

export interface Filters {
  watchedYear: number | "all";
  decade: number | "all";
  genre: string | "all";
  language: string | "all";
  ratingMin: number;
  ratingMax: number;
}

export const defaultFilters: Filters = {
  watchedYear: "all",
  decade: "all",
  genre: "all",
  language: "all",
  ratingMin: 0,
  ratingMax: 5,
};

export function yearOf(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const y = parseInt(String(dateStr).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export function decadeOf(year: number | null | undefined): number | null {
  if (year == null) return null;
  return Math.floor(year / 10) * 10;
}

export function watchedInYear(film: Film, year: number): boolean {
  return film.watchedDates.some((d) => yearOf(d) === year);
}

export function applyFilters(films: Film[], f: Filters): Film[] {
  return films.filter((film) => {
    if (f.watchedYear !== "all" && !watchedInYear(film, f.watchedYear)) return false;
    if (f.decade !== "all" && decadeOf(film.year) !== f.decade) return false;
    if (f.genre !== "all" && !(film.genres ?? []).includes(f.genre)) return false;
    if (f.language !== "all" && !(film.languages ?? []).includes(f.language)) return false;
    if (film.rating != null) {
      if (film.rating < f.ratingMin || film.rating > f.ratingMax) return false;
    } else if (f.ratingMin > 0) {
      // Films with no rating are excluded once a positive minimum is set.
      return false;
    }
    return true;
  });
}

export interface WatchEvent {
  date: string;
  film: Film;
}

/** Flatten films to individual watch events, optionally scoped to a watched year. */
export function watchEvents(films: Film[], watchedYear: number | "all"): WatchEvent[] {
  const events: WatchEvent[] = [];
  for (const film of films) {
    for (const d of film.watchedDates) {
      if (!d) continue;
      if (watchedYear !== "all" && yearOf(d) !== watchedYear) continue;
      events.push({ date: d, film });
    }
  }
  return events;
}
