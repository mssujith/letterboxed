import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { Poster } from "../components/PosterCard";
import { computeProgress, watchedTmdbIds, type ListProgress } from "../lib/lists";
import { pct } from "../lib/format";
import type { ListFilm } from "../types";

type View = "unseen" | "seen" | "all";

function ListSection({ progress }: { progress: ListProgress }) {
  const [view, setView] = useState<View>("unseen");
  const [limit, setLimit] = useState(60);
  const { list, seen, unseen, seenCount, total } = progress;
  const percent = pct(seenCount, total);

  const seenIds = useMemo(() => new Set(seen.map((s) => s.tmdbId)), [seen]);
  const items: ListFilm[] =
    view === "seen" ? seen : view === "all" ? list.films : unseen;

  return (
    <div id={list.id} className="card" style={{ marginBottom: 20, scrollMarginTop: 80 }}>
      <div className="progress-head">
        <span className="name" style={{ fontSize: 18 }}>
          {list.name}
        </span>
        <span className="frac">
          {total === 0 ? "not configured" : `${seenCount} / ${total} (${percent}%)`}
        </span>
      </div>
      {list.description && <div className="muted small" style={{ marginBottom: 6 }}>{list.description}</div>}
      <div className="bar">
        <span style={{ width: `${percent}%` }} />
      </div>

      {total === 0 ? (
        <p className="muted small">
          This list has no source yet. See <code>scraper/lists_source/{list.id}.json</code> to add a
          TMDB list id or CSV.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
            {(["unseen", "seen", "all"] as View[]).map((v) => (
              <button
                key={v}
                className="btn"
                style={view === v ? { borderColor: "#00e054", color: "#00e054" } : undefined}
                onClick={() => {
                  setView(v);
                  setLimit(60);
                }}
              >
                {v === "unseen" ? `To watch (${unseen.length})` : v === "seen" ? `Seen (${seen.length})` : `All (${total})`}
              </button>
            ))}
          </div>

          <div className="poster-grid">
            {items.slice(0, limit).map((film) => {
              const isSeen = seenIds.has(film.tmdbId);
              return (
                <div key={film.tmdbId}>
                  <Poster
                    title={film.title}
                    year={film.year}
                    posterUrl={film.posterUrl}
                    seen={isSeen}
                    dim={!isSeen}
                    badge={isSeen ? "✓" : undefined}
                  />
                </div>
              );
            })}
          </div>

          {items.length > limit && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button className="btn" onClick={() => setLimit((l) => l + 60)}>
                Show more ({items.length - limit} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Lists() {
  const { films, lists } = useData();
  const watched = useMemo(() => watchedTmdbIds(films), [films]);
  const progresses = useMemo(
    () =>
      lists
        .map((l) => computeProgress(l, watched))
        .sort((a, b) => pct(b.seenCount, b.total) - pct(a.seenCount, a.total)),
    [lists, watched]
  );

  return (
    <div>
      <p className="muted small">
        Progress counts every film you've ever watched (matched to TMDB), regardless of filters.
        Green outline = seen.
      </p>
      {progresses.map((p) => (
        <ListSection key={p.list.id} progress={p} />
      ))}
    </div>
  );
}
