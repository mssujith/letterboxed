import { useMemo } from "react";
import { useData } from "../context/DataContext";
import FilterBar from "../components/FilterBar";
import StatCard from "../components/StatCard";
import ProgressCard from "../components/ProgressCard";
import { RatingBar } from "../charts/Charts";
import CalendarHeatmap from "../charts/CalendarHeatmap";
import { activityStats, dailyCounts, headline, ratingDistribution } from "../lib/stats";
import { computeProgress, watchedTmdbIds } from "../lib/lists";
import { compactHours } from "../lib/format";

function fmtDate(d: string | null): string {
  if (!d) return "–";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { filteredFilms, filters, lists } = useData();

  const h = useMemo(() => headline(filteredFilms, filters.watchedYear), [filteredFilms, filters.watchedYear]);
  const ratings = useMemo(() => ratingDistribution(filteredFilms), [filteredFilms]);
  const daily = useMemo(() => dailyCounts(filteredFilms, filters.watchedYear), [filteredFilms, filters.watchedYear]);
  const activity = useMemo(() => activityStats(daily), [daily]);
  const watched = useMemo(() => watchedTmdbIds(filteredFilms), [filteredFilms]);
  const progresses = useMemo(
    () => lists.map((l) => computeProgress(l, watched)),
    [lists, watched]
  );

  return (
    <div>
      <FilterBar />

      <div className="grid stat-grid">
        <StatCard value={h.films.toLocaleString()} label="Films" sub={`${h.watches.toLocaleString()} total watches`} />
        <StatCard value={compactHours(h.minutes)} label="Runtime" sub="of enriched films" />
        <StatCard value={h.directors.toLocaleString()} label="Directors" />
        <StatCard value={h.rewatches.toLocaleString()} label="Rewatched" />
        <StatCard value={h.likes.toLocaleString()} label="Liked" />
        <StatCard
          value={h.avgRating != null ? h.avgRating.toFixed(2) : "–"}
          label="Avg rating"
          sub={`${h.ratedCount.toLocaleString()} rated`}
        />
      </div>

      <div className="section-title">Activity</div>
      <div className="grid stat-grid">
        <StatCard
          value={activity.longestStreak}
          label="Longest streak"
          sub={activity.longestStreakEnd ? `ended ${fmtDate(activity.longestStreakEnd)}` : undefined}
        />
        <StatCard value={activity.currentStreak} label="Latest streak" sub="days in a row" />
        <StatCard
          value={activity.busiestDay?.count ?? 0}
          label="Busiest day"
          sub={activity.busiestDay ? fmtDate(activity.busiestDay.date) : undefined}
        />
        <StatCard value={activity.activeDays.toLocaleString()} label="Active days" />
        <StatCard value={activity.perActiveDay.toFixed(1)} label="Films / active day" />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <CalendarHeatmap counts={daily} />
      </div>

      <div className="section-title">Rating distribution</div>
      <div className="card">
        <RatingBar data={ratings} />
      </div>

      <div className="section-title">List progress</div>
      <div className="grid two-col">
        {progresses.map((p) => (
          <ProgressCard key={p.list.id} progress={p} />
        ))}
      </div>
    </div>
  );
}
