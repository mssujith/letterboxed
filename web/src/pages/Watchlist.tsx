import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { Poster } from "../components/PosterCard";
import type { WatchlistFilm } from "../types";

type SortKey = "added" | "year" | "rating" | "title";

const SORTERS: Record<SortKey, (a: WatchlistFilm, b: WatchlistFilm) => number> = {
  added: () => 0, // preserve export order (most-recently-added first from Letterboxd)
  year: (a, b) => (b.year ?? 0) - (a.year ?? 0),
  rating: (a, b) => (b.tmdbRating ?? 0) - (a.tmdbRating ?? 0),
  title: (a, b) => a.title.localeCompare(b.title),
};

export default function Watchlist() {
  const { watchlist } = useData();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("added");
  const [limit, setLimit] = useState(120);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? watchlist.filter((w) => w.title.toLowerCase().includes(q)) : watchlist;
    const arr = [...filtered];
    if (sort !== "added") arr.sort(SORTERS[sort]);
    return arr;
  }, [watchlist, query, sort]);

  if (watchlist.length === 0) {
    return (
      <div className="notice">
        <strong>No watchlist data.</strong> Re-run <code>enrich.py</code> after this update to
        generate <code>web/public/data/watchlist.json</code> from your export's{" "}
        <code>watchlist.csv</code>, then reload.
      </div>
    );
  }

  return (
    <div>
      <div className="filterbar">
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>Search</label>
          <input
            type="search"
            placeholder="Title…"
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
            <option value="added">Recently added</option>
            <option value="rating">TMDB rating</option>
            <option value="year">Release year</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <span className="muted small">{rows.length.toLocaleString()} to watch</span>
        </div>
      </div>

      <div className="poster-grid">
        {rows.slice(0, limit).map((w, i) => (
          <div key={`${w.tmdbId ?? w.title}-${i}`}>
            <Poster title={w.title} year={w.year} posterUrl={w.posterUrl} />
            <div className="poster-caption">
              {w.title}
              {w.tmdbRating ? <span className="muted"> {w.tmdbRating.toFixed(1)}</span> : null}
            </div>
          </div>
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
