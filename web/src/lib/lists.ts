import type { CanonicalList, Film, ListFilm } from "../types";

export interface ListProgress {
  list: CanonicalList;
  total: number;
  seenCount: number;
  seen: ListFilm[];
  unseen: ListFilm[];
}

export function watchedTmdbIds(films: Film[]): Set<number> {
  const set = new Set<number>();
  for (const f of films) if (f.tmdbId) set.add(f.tmdbId);
  return set;
}

export function computeProgress(list: CanonicalList, watched: Set<number>): ListProgress {
  const seen: ListFilm[] = [];
  const unseen: ListFilm[] = [];
  for (const film of list.films) {
    if (watched.has(film.tmdbId)) seen.push(film);
    else unseen.push(film);
  }
  return {
    list,
    total: list.films.length,
    seenCount: seen.length,
    seen,
    unseen,
  };
}
