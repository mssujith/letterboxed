import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import FilterBar from "../components/FilterBar";
import { FilmPoster } from "../components/PosterCard";
import type { Film } from "../types";

type SortKey = "watched" | "rating" | "year" | "title" | "tmdb";

function lastWatched(f: Film): string {
  return f.watchedDates.length ? f.watchedDates[f.watchedDates.length - 1] : "";
}

const SORTERS: Record<SortKey, (a: Film, b: Film) => number> = {
  watched: (a, b) => (lastWatched(b) > lastWatched(a) ? 1 : -1),
  rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
  year: (a, b) => (b.year ?? 0) - (a.year ?? 0),
  title: (a, b) => a.title.localeCompare(b.title),
  tmdb: (a, b) => (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0),
};

export default function Films() {
  const { filteredFilms } = useData();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("watched");
  const [limit, setLimit] = useState(120);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? filteredFilms.filter(
          (f) =>
            f.title.toLowerCase().includes(q) ||
            (f.directors ?? []).some((d) => d.toLowerCase().includes(q))
        )
      : filteredFilms;
    return [...filtered].sort(SORTERS[sort]);
  }, [filteredFilms, query, sort]);

  return (
    <div>
      <FilterBar />

      <div className="filterbar">
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>Search</label>
          <input
            type="search"
            placeholder="Title or director…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(120);
            }}
          />
        </div>
        <div className="field">
          <label>Sort by</label>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="watched">Recently watched</option>
            <option value="rating">Your rating</option>
            <option value="tmdb">TMDB rating</option>
            <option value="year">Release year</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <span className="muted small">{rows.length.toLocaleString()} films</span>
        </div>
      </div>

      <div className="poster-grid">
        {rows.slice(0, limit).map((f) => (
          <FilmPoster key={f.id} film={f} />
        ))}
      </div>

      {rows.length > limit && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button className="btn" onClick={() => setLimit((l) => l + 120)}>
            Show more ({rows.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
