import { useEffect } from "react";
import type { Film } from "../types";
import { FilmPoster } from "./PosterCard";

export interface Drill {
  title: string;
  films: Film[];
}

export default function FilmModal({ drill, onClose }: { drill: Drill | null; onClose: () => void }) {
  useEffect(() => {
    if (!drill) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drill, onClose]);

  if (!drill) return null;

  const films = drill.films;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3 style={{ margin: 0 }}>{drill.title}</h3>
            <span className="muted small">
              {films.length} film{films.length === 1 ? "" : "s"}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          {films.length === 0 ? (
            <p className="muted">No films to show.</p>
          ) : (
            <div className="poster-grid">
              {films.map((f) => (
                <FilmPoster key={f.id} film={f} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
