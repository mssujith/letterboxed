import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { decadeOf, defaultFilters, yearOf } from "../lib/filters";

export default function FilterBar({ showSecondary = true }: { showSecondary?: boolean }) {
  const { films, meta, filters, setFilters } = useData();

  const decades = useMemo(() => {
    const set = new Set<number>();
    for (const f of films) {
      const d = decadeOf(f.year);
      if (d != null) set.add(d);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [films]);

  const years = useMemo(() => {
    const set = new Set<number>(meta?.watchedYears ?? []);
    for (const f of films) {
      for (const d of f.watchedDates) {
        const y = yearOf(d);
        if (y != null) set.add(y);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [films, meta]);

  return (
    <div className="filterbar">
      <div className="field">
        <label>Watched year</label>
        <select
          value={filters.watchedYear}
          onChange={(e) =>
            setFilters({
              ...filters,
              watchedYear: e.target.value === "all" ? "all" : Number(e.target.value),
            })
          }
        >
          <option value="all">All time</option>
          {[...years].reverse().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {showSecondary && (
        <>
          <div className="field">
            <label>Release decade</label>
            <select
              value={filters.decade}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  decade: e.target.value === "all" ? "all" : Number(e.target.value),
                })
              }
            >
              <option value="all">All</option>
              {decades.map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Genre</label>
            <select
              value={filters.genre}
              onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
            >
              <option value="all">All</option>
              {(meta?.genres ?? []).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Language</label>
            <select
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
            >
              <option value="all">All</option>
              {(meta?.languages ?? []).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Min rating</label>
            <select
              value={filters.ratingMin}
              onChange={(e) => setFilters({ ...filters, ratingMin: Number(e.target.value) })}
            >
              {[0, 1, 2, 3, 3.5, 4, 4.5, 5].map((r) => (
                <option key={r} value={r}>
                  {r === 0 ? "Any" : `${r}★`}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <button className="btn" onClick={() => setFilters(defaultFilters)}>
        Reset
      </button>
    </div>
  );
}
