export interface Film {
  id: string;
  title: string;
  year: number | null;
  uri?: string | null;
  rating: number | null;
  liked: boolean;
  watchedDates: string[];
  watchCount: number;
  rewatched: boolean;
  /** True only when the film has a real diary entry (not just "marked watched"). */
  logged?: boolean;
  reviewCount: number;
  // TMDB enrichment (present when matched)
  tmdbId?: number | null;
  posterUrl?: string | null;
  runtime?: number | null;
  releaseDate?: string | null;
  tmdbRating?: number | null;
  tmdbVotes?: number | null;
  budget?: number | null;
  revenue?: number | null;
  genres?: string[];
  languages?: string[];
  originalLanguage?: string | null;
  primaryLanguage?: string | null;
  countries?: string[];
  primaryCountry?: string | null;
  studios?: string[];
  directors?: string[];
  writers?: string[];
  cast?: string[];
  keywords?: string[];
}

export interface DiaryEntry {
  date: string | null;
  title: string;
  year: number | null;
  rating: number | null;
  rewatch: boolean;
  posterUrl?: string | null;
  tmdbId?: number | null;
}

export interface WatchlistFilm {
  tmdbId: number | null;
  title: string;
  year: number | null;
  posterUrl?: string | null;
  tmdbRating?: number | null;
  releaseDate?: string | null;
}

export interface Meta {
  generatedAt: string;
  counts: {
    films: number;
    matched: number;
    unmatched: number;
    diaryEntries: number;
    watchlist: number;
  };
  watchedYears: number[];
  genres: string[];
  languages: string[];
}

export interface ListFilm {
  tmdbId: number;
  title: string;
  year: number | null;
  posterUrl?: string | null;
}

export interface CanonicalList {
  id: string;
  name: string;
  source: string;
  description?: string;
  count: number;
  films: ListFilm[];
}

export interface ListIndexEntry {
  id: string;
  name: string;
  source: string;
  count: number;
}
