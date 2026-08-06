import { useMemo } from "react";
import { useData } from "../context/DataContext";
import FilterBar from "../components/FilterBar";
import StatCard from "../components/StatCard";
import { Poster } from "../components/PosterCard";
import {
  boxOffice,
  hiddenGems,
  ratingPersonality,
  superlatives,
} from "../lib/stats";
import { compactHours, money, stars } from "../lib/format";
import type { Film } from "../types";

function personalityBlurb(generosity: number | null): string {
  if (generosity == null) return "Not enough overlapping ratings to compare.";
  if (generosity >= 0.75) return "You're a very generous rater — you love more than the crowd.";
  if (generosity >= 0.25) return "You rate a bit higher than the crowd. Warm-hearted.";
  if (generosity > -0.25) return "You're right in line with the crowd. Balanced taste.";
  if (generosity > -0.75) return "You're a tougher critic than most.";
  return "You're a harsh grader — the crowd likes things far more than you do.";
}

function MiniFilm({ film, note }: { film: Film; note?: string }) {
  return (
    <div>
      <Poster title={film.title} year={film.year} posterUrl={film.posterUrl} badge={film.liked ? "\u2665" : undefined} />
      <div className="poster-caption">
        {film.title}
        {film.rating != null && <span className="r"> {stars(film.rating)}</span>}
        {note && <div className="muted small">{note}</div>}
      </div>
    </div>
  );
}

function Highlight({ label, film, sub }: { label: string; film: Film | null; sub?: string }) {
  if (!film) return null;
  return (
    <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 64, flexShrink: 0 }}>
        <Poster title={film.title} year={film.year} posterUrl={film.posterUrl} />
      </div>
      <div>
        <div className="label" style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {label}
        </div>
        <div style={{ fontWeight: 700 }}>
          {film.title} {film.year ? <span className="muted">({film.year})</span> : null}
        </div>
        {sub && <div className="muted small">{sub}</div>}
      </div>
    </div>
  );
}

export default function Insights() {
  const { filteredLogged } = useData();
  const f = filteredLogged;

  const p = useMemo(() => ratingPersonality(f), [f]);
  const box = useMemo(() => boxOffice(f), [f]);
  const gems = useMemo(() => hiddenGems(f, 4, 12), [f]);
  const sup = useMemo(() => superlatives(f), [f]);

  return (
    <div>
      <FilterBar />

      <div className="section-title">Rating personality</div>
      <div className="grid stat-grid">
        <StatCard value={p.avgUser != null ? p.avgUser.toFixed(2) : "–"} label="Your average" sub={`${p.ratedCount.toLocaleString()} rated`} />
        <StatCard value={p.avgCrowd5 != null ? p.avgCrowd5.toFixed(2) : "–"} label="TMDB average" sub="same films" />
        <StatCard
          value={p.generosity != null ? `${p.generosity >= 0 ? "+" : ""}${p.generosity.toFixed(2)}` : "–"}
          label="Generosity"
          sub="you minus TMDB"
        />
        <StatCard value={p.mostCommon != null ? `${p.mostCommon}\u2605` : "–"} label="Most common rating" />
        <StatCard value={p.spread != null ? p.spread.toFixed(2) : "–"} label="Rating spread" sub="std. deviation" />
        <StatCard value={`${p.pctAboveCrowd}%`} label="Rated above crowd" sub={`${p.pctBelowCrowd}% below`} />
      </div>
      <div className="notice" style={{ borderLeftColor: "var(--green)" }}>{personalityBlurb(p.generosity)}</div>

      <div className="section-title">Hidden gems</div>
      <p className="muted small" style={{ marginTop: -6 }}>
        Films you rated 4&#9733;+ that the fewest TMDB users have seen.
      </p>
      {gems.length === 0 ? (
        <p className="muted">No qualifying films in this range.</p>
      ) : (
        <div className="poster-grid">
          {gems.map((film) => (
            <MiniFilm key={film.id} film={film} note={`${(film.tmdbVotes ?? 0).toLocaleString()} TMDB votes`} />
          ))}
        </div>
      )}

      <div className="section-title">Box office</div>
      <div className="grid stat-grid">
        <StatCard value={money(box.totalRevenue)} label="Total box office" sub={`${box.withData} films w/ data`} />
        <StatCard value={money(box.totalBudget)} label="Total budgets" />
        <StatCard
          value={box.mostProfitable ? `${box.mostProfitable.ratio.toFixed(0)}x` : "–"}
          label="Most profitable"
          sub={box.mostProfitable?.film.title}
        />
      </div>
      <div className="grid two-col" style={{ marginTop: 16 }}>
        <Highlight label="Highest grossing" film={box.highestGrossing} sub={money(box.highestGrossing?.revenue)} />
        <Highlight label="Biggest budget" film={box.biggestBudget} sub={money(box.biggestBudget?.budget)} />
        {box.biggestFlop && (
          <Highlight label="Biggest flop" film={box.biggestFlop.film} sub={`lost ${money(box.biggestFlop.loss)}`} />
        )}
        {box.mostProfitable && (
          <Highlight
            label="Best return on budget"
            film={box.mostProfitable.film}
            sub={`${box.mostProfitable.ratio.toFixed(1)}x its budget`}
          />
        )}
      </div>

      <div className="section-title">Superlatives</div>
      <div className="grid two-col">
        <Highlight label="Longest film" film={sup.longest} sub={sup.longest?.runtime ? compactHours(sup.longest.runtime) : undefined} />
        <Highlight label="Shortest film" film={sup.shortest} sub={sup.shortest?.runtime ? compactHours(sup.shortest.runtime) : undefined} />
        <Highlight label="Oldest film" film={sup.oldest} sub={sup.oldest?.year ? `${sup.oldest.year}` : undefined} />
        <Highlight label="Newest film" film={sup.newest} sub={sup.newest?.year ? `${sup.newest.year}` : undefined} />
        <Highlight
          label="Most rewatched"
          film={sup.mostRewatched}
          sub={sup.mostRewatched ? `${sup.mostRewatched.watchCount} watches` : undefined}
        />
      </div>
    </div>
  );
}
