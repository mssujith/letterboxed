import { useMemo, type ReactNode } from "react";
import { useData } from "../context/DataContext";
import FilterBar from "../components/FilterBar";
import { HBar, TimeLine, VBar } from "../charts/Charts";
import {
  byReleaseDecade,
  contrarian,
  countBy,
  topRated,
  bottomRated,
  watchesOverTime,
} from "../lib/stats";
import { stars } from "../lib/format";
import type { Film } from "../types";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function Stats() {
  const { filteredFilms, filters } = useData();
  const f = filteredFilms;
  const wy = filters.watchedYear;

  const timeline = useMemo(() => watchesOverTime(f, wy), [f, wy]);
  const decades = useMemo(() => byReleaseDecade(f), [f]);
  const genres = useMemo(() => countBy(f, (x) => x.genres, 12), [f]);
  const languages = useMemo(() => countBy(f, (x) => x.languages, 12), [f]);
  const countries = useMemo(() => countBy(f, (x) => x.countries, 12), [f]);
  const keywords = useMemo(() => countBy(f, (x) => x.keywords, 25), [f]);
  const directors = useMemo(() => countBy(f, (x) => x.directors, 12), [f]);
  const actors = useMemo(() => countBy(f, (x) => x.cast, 12), [f]);
  const studios = useMemo(() => countBy(f, (x) => x.studios, 12), [f]);
  const best = useMemo(() => topRated(f, 12), [f]);
  const worst = useMemo(() => bottomRated(f, 12), [f]);
  const contra = useMemo(() => contrarian(f, 8), [f]);

  return (
    <div>
      <FilterBar />

      <Card title={wy === "all" ? "Films watched per year" : `Films watched per month in ${wy}`}>
        <TimeLine data={timeline} />
      </Card>

      <div className="grid two-col" style={{ marginTop: 16 }}>
        <Card title="By release decade">
          <VBar data={decades} color="#ff8000" />
        </Card>
        <Card title="Genres">
          <HBar data={genres} />
        </Card>
      </div>

      <div className="grid two-col" style={{ marginTop: 16 }}>
        <Card title="Languages">
          <HBar data={languages} />
        </Card>
        <Card title="Countries">
          <HBar data={countries} />
        </Card>
      </div>

      <div className="section-title">Nano-genres (top TMDB keywords)</div>
      <div className="card">
        {keywords.length === 0 ? (
          <p className="muted">No keyword data. Re-run enrich.py to fetch TMDB keywords.</p>
        ) : (
          keywords.map((k) => (
            <span className="pill" key={k.label}>
              {k.label} <strong style={{ color: "#e4e7eb" }}>{k.value}</strong>
            </span>
          ))
        )}
      </div>

      <div className="section-title">People &amp; studios</div>
      <div className="grid two-col">
        <Card title="Top directors">
          <HBar data={directors} />
        </Card>
        <Card title="Top actors">
          <HBar data={actors} />
        </Card>
      </div>
      <div className="grid" style={{ marginTop: 16 }}>
        <Card title="Top studios">
          <HBar data={studios} />
        </Card>
      </div>

      <div className="section-title">Highest rated</div>
      <div className="card">
        <RatedTable rows={best} />
      </div>

      <div className="section-title">Lowest rated</div>
      <div className="card">
        <RatedTable rows={worst} />
      </div>

      <div className="section-title">Contrarian takes (you vs the crowd)</div>
      <div className="grid two-col">
        <Card title="You liked more than average">
          <ContrarianTable rows={contra.over} />
        </Card>
        <Card title="You liked less than average">
          <ContrarianTable rows={contra.under} />
        </Card>
      </div>
    </div>
  );
}

function RatedTable({ rows }: { rows: { film: Film; rating: number }[] }) {
  if (rows.length === 0) return <p className="muted">No rated films in this range.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Film</th>
          <th>Year</th>
          <th>Your rating</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ film, rating }) => (
          <tr key={film.id}>
            <td>{film.title}</td>
            <td className="muted">{film.year ?? ""}</td>
            <td className="rating-cell">{stars(rating)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ContrarianTable({ rows }: { rows: { film: Film; userRating: number; tmdbRating5: number; delta: number }[] }) {
  if (rows.length === 0) return <p className="muted">Not enough overlapping ratings.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Film</th>
          <th>You</th>
          <th>Crowd</th>
          <th>Δ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.film.id}>
            <td>{r.film.title}</td>
            <td className="rating-cell">{r.userRating.toFixed(1)}</td>
            <td className="muted">{r.tmdbRating5.toFixed(1)}</td>
            <td style={{ color: r.delta >= 0 ? "#00e054" : "#ff506a" }}>
              {r.delta >= 0 ? "+" : ""}
              {r.delta.toFixed(1)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
