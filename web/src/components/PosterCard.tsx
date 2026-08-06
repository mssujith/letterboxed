import type { Film } from "../types";
import { stars } from "../lib/format";

export function Poster({
  title,
  year,
  posterUrl,
  seen,
  dim,
  badge,
}: {
  title: string;
  year?: number | null;
  posterUrl?: string | null;
  seen?: boolean;
  dim?: boolean;
  badge?: string;
}) {
  return (
    <div className={`poster ${seen ? "seen" : ""} ${dim ? "unseen" : ""}`} title={`${title}${year ? ` (${year})` : ""}`}>
      {posterUrl ? (
        <img src={posterUrl} alt={title} loading="lazy" />
      ) : (
        <div className="fallback">
          {title}
          {year ? ` (${year})` : ""}
        </div>
      )}
      {badge && <span className="badge">{badge}</span>}
    </div>
  );
}

export function FilmPoster({ film }: { film: Film }) {
  return (
    <div>
      <Poster
        title={film.title}
        year={film.year}
        posterUrl={film.posterUrl}
        seen={false}
        badge={film.liked ? "♥" : undefined}
      />
      <div className="poster-caption">
        {film.title}
        {film.rating != null && <span className="r"> {stars(film.rating)}</span>}
      </div>
    </div>
  );
}
