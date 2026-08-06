import type { DiaryEntry, Film } from "../types";

const KEY = "myfilmstats.manualLog.v1";

export interface ManualEntry {
  id: string;
  title: string;
  year: number | null;
  rating: number | null;
  watchedDate: string;
  liked: boolean;
  rewatch: boolean;
}

export function loadManual(): ManualEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveManual(entries: ManualEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function manualToFilm(e: ManualEntry): Film {
  return {
    id: `manual/${e.id}`,
    title: e.title,
    year: e.year,
    uri: null,
    rating: e.rating,
    liked: e.liked,
    watchedDates: e.watchedDate ? [e.watchedDate] : [],
    watchCount: 1,
    rewatched: e.rewatch,
    logged: true,
    reviewCount: 0,
    tmdbId: null,
    posterUrl: null,
    genres: [],
    languages: [],
    countries: [],
    directors: [],
    cast: [],
    keywords: [],
    studios: [],
  };
}

export function manualToDiary(e: ManualEntry): DiaryEntry {
  return {
    date: e.watchedDate || null,
    title: e.title,
    year: e.year,
    rating: e.rating,
    rewatch: e.rewatch,
    posterUrl: null,
    tmdbId: null,
  };
}
