import { useMemo } from "react";
import { useData } from "../context/DataContext";
import FilterBar from "../components/FilterBar";
import CalendarHeatmap from "../charts/CalendarHeatmap";
import { dailyCounts } from "../lib/stats";
import { yearOf } from "../lib/filters";
import { stars } from "../lib/format";
import { Poster } from "../components/PosterCard";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Diary() {
  const { filteredFilms, diary, filters } = useData();
  const wy = filters.watchedYear;

  const counts = useMemo(() => dailyCounts(filteredFilms, wy), [filteredFilms, wy]);

  const entries = useMemo(() => {
    return diary
      .filter((e) => e.date && (wy === "all" || yearOf(e.date) === wy))
      .sort((a, b) => (b.date! > a.date! ? 1 : -1));
  }, [diary, wy]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      const key = e.date!.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  return (
    <div>
      <FilterBar showSecondary={false} />

      <div className="section-title">Watch calendar</div>
      <div className="card">
        <CalendarHeatmap counts={counts} />
      </div>

      <div className="section-title">
        Diary {wy !== "all" ? wy : ""} &middot; {entries.length.toLocaleString()} entries
      </div>

      {grouped.length === 0 && <p className="muted">No diary entries in this range.</p>}

      {grouped.map(([key, month]) => {
        const [y, m] = key.split("-");
        return (
          <div key={key} style={{ marginBottom: 24 }}>
            <h3 style={{ color: "#9ab", marginBottom: 10 }}>
              {MONTHS[parseInt(m, 10) - 1]} {y} &middot; {month.length}
            </h3>
            <div className="poster-grid">
              {month.map((e, i) => (
                <div key={`${e.tmdbId}-${e.date}-${i}`}>
                  <Poster
                    title={e.title}
                    year={e.year}
                    posterUrl={e.posterUrl}
                    badge={e.rewatch ? "↻" : undefined}
                  />
                  <div className="poster-caption">
                    {e.date?.slice(8, 10)} {MONTHS[parseInt(m, 10) - 1].slice(0, 3)}
                    {e.rating != null && <span className="r"> {stars(e.rating)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
