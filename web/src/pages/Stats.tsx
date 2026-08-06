import { useMemo, useState, type ReactNode } from "react";
import { useData } from "../context/DataContext";
import FilterBar from "../components/FilterBar";
import FilmModal, { type Drill } from "../components/FilmModal";
import { HBar, TimeLine, VBar } from "../charts/Charts";
import {
  byReleaseDecade,
  contrarian,
  countBy,
  topRated,
  bottomRated,
  watchesOverTime,
} from "../lib/stats";
import { decadeOf, watchEvents, yearOf } from "../lib/filters";
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dedupe(films: Film[]): Film[] {
  const seen = new Set<string>();
  const out: Film[] = [];
  for (const f of films) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
  }
  return out;
}

export default function Stats() {
  const { filteredLogged, filters } = useData();
  const f = filteredLogged;
  const wy = filters.watchedYear;

  const [drill, setDrill] = useState<Drill | null>(null);

  const timeline = useMemo(() => watchesOverTime(f, wy), [f, wy]);
  const decades = useMemo(() => byReleaseDecade(f), [f]);
  const langKey = (x: Film) => (x.primaryLanguage ? [x.primaryLanguage] : x.languages);
  const countryKey = (x: Film) => (x.primaryCountry ? [x.primaryCountry] : x.countries);

  const genres = useMemo(() => countBy(f, (x) => x.genres, 12), [f]);
  const languages = useMemo(() => countBy(f, langKey, 12), [f]);
  const countries = useMemo(() => countBy(f, countryKey, 12), [f]);
  const keywords = useMemo(() => countBy(f, (x) => x.keywords, 25), [f]);
  const directors = useMemo(() => countBy(f, (x) => x.directors, 12), [f]);
  const actors = useMemo(() => countBy(f, (x) => x.cast, 12), [f]);
  const studios = useMemo(() => countBy(f, (x) => x.studios, 12), [f]);
  const best = useMemo(() => topRated(f, 12), [f]);
  const worst = useMemo(() => bottomRated(f, 12), [f]);
  const contra = useMemo(() => contrarian(f, 8), [f]);

  const byField = (field: (x: Film) => string[] | undefined, label: string) =>
    f.filter((x) => (field(x) ?? []).includes(label));

  const openField = (title: string, field: (x: Film) => string[] | undefined) => (label: string) =>
    setDrill({ title: `${title}: ${label}`, films: byField(field, label) });

  const openDecade = (label: string) => {
    const d = parseInt(label, 10);
    setDrill({ title: `Released in the ${label}`, films: f.filter((x) => decadeOf(x.year) === d) });
  };

  const openTimeline = (label: string) => {
    const evs = watchEvents(f, wy);
    const matched =
      wy === "all"
        ? evs.filter((e) => String(yearOf(e.date)) === label)
        : evs.filter((e) => parseInt(e.date.slice(5, 7), 10) - 1 === MONTHS.indexOf(label));
    const title = wy === "all" ? `Watched in ${label}` : `Watched in ${label} ${wy}`;
    setDrill({ title, films: dedupe(matched.map((e) => e.film)) });
  };

  return (
    <div>
      <FilterBar />

      <Card title={wy === "all" ? "Films watched per year" : `Films watched per month in ${wy}`}>
        <TimeLine data={timeline} onSelect={openTimeline} />
      </Card>

      <div className="section-title">By release decade</div>
      <div className="card">
        <VBar data={decades} height={320} onSelect={openDecade} />
      </div>

      <div className="grid two-col" style={{ marginTop: 16 }}>
        <Card title="Genres">
          <HBar data={genres} onSelect={openField("Genre", (x) => x.genres)} />
        </Card>
        <Card title="Languages">
          <HBar data={languages} onSelect={openField("Language", langKey)} />
        </Card>
      </div>

      <div className="grid" style={{ marginTop: 16 }}>
        <Card title="Countries">
          <HBar data={countries} onSelect={openField("Country", countryKey)} />
        </Card>
      </div>

      <div className="section-title">Nano-genres (top TMDB keywords)</div>
      <div className="card">
        {keywords.length === 0 ? (
          <p className="muted">No keyword data. Re-run enrich.py to fetch TMDB keywords.</p>
        ) : (
          keywords.map((k) => (
            <span
              className="pill clickable"
              key={k.label}
              onClick={() => setDrill({ title: `Nano-genre: ${k.label}`, films: byField((x) => x.keywords, k.label) })}
            >
              {k.label} <strong style={{ color: "#e4e7eb" }}>{k.value}</strong>
            </span>
          ))
        )}
      </div>

      <div className="section-title">People &amp; studios</div>
      <div className="grid two-col">
        <Card title="Top directors">
          <HBar data={directors} onSelect={openField("Director", (x) => x.directors)} />
        </Card>
        <Card title="Top actors">
          <HBar data={actors} onSelect={openField("Actor", (x) => x.cast)} />
        </Card>
      </div>
      <div className="grid" style={{ marginTop: 16 }}>
        <Card title="Top studios">
          <HBar data={studios} onSelect={openField("Studio", (x) => x.studios)} />
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
      <p className="muted small" style={{ marginTop: -6, marginBottom: 12 }}>
        "Crowd" is the <strong>TMDB</strong> community average, rescaled to 5 stars.
      </p>
      <div className="grid two-col">
        <Card title="You liked more than average">
          <ContrarianTable rows={contra.over} />
        </Card>
        <Card title="You liked less than average">
          <ContrarianTable rows={contra.under} />
        </Card>
      </div>

      <FilmModal drill={drill} onClose={() => setDrill(null)} />
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
          <th>TMDB</th>
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
