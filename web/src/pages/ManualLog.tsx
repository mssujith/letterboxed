import { useState } from "react";
import { useData } from "../context/DataContext";
import { newId, type ManualEntry } from "../lib/manualLog";
import { stars } from "../lib/format";

const RATINGS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export default function ManualLog() {
  const { manual, setManual } = useData();
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [rating, setRating] = useState(0);
  const [watchedDate, setWatchedDate] = useState(new Date().toISOString().slice(0, 10));
  const [liked, setLiked] = useState(false);
  const [rewatch, setRewatch] = useState(false);

  function add() {
    if (!title.trim()) return;
    const entry: ManualEntry = {
      id: newId(),
      title: title.trim(),
      year: year ? parseInt(year, 10) : null,
      rating: rating || null,
      watchedDate,
      liked,
      rewatch,
    };
    setManual([entry, ...manual]);
    setTitle("");
    setYear("");
    setRating(0);
    setLiked(false);
    setRewatch(false);
  }

  function remove(id: string) {
    setManual(manual.filter((e) => e.id !== id));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(manual, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manual-log.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="notice">
        Manually logged films are stored <strong>only in this browser</strong> and are merged into
        all stats above. Use <em>Export</em> to save them, then fold them into your pipeline data if
        you want them permanent and enriched (posters, genres, list matching).
      </div>

      <div className="section-title">Log a film</div>
      <div className="card">
        <div className="filterbar" style={{ background: "transparent", border: "none", padding: 0 }}>
          <div className="field" style={{ flex: 2, minWidth: 220 }}>
            <label>Title</label>
            <input
              type="text"
              value={title}
              placeholder="e.g. La La Land"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </div>
          <div className="field">
            <label>Year</label>
            <input type="text" value={year} placeholder="2016" onChange={(e) => setYear(e.target.value)} style={{ minWidth: 80 }} />
          </div>
          <div className="field">
            <label>Rating</label>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {RATINGS.map((r) => (
                <option key={r} value={r}>
                  {r === 0 ? "—" : `${r}★`}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Watched</label>
            <input type="text" value={watchedDate} onChange={(e) => setWatchedDate(e.target.value)} style={{ minWidth: 120 }} />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <label className="small" style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={liked} onChange={(e) => setLiked(e.target.checked)} /> Liked
            </label>
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <label className="small" style={{ textTransform: "none", display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} /> Rewatch
            </label>
          </div>
          <button className="btn" onClick={add}>
            Add
          </button>
        </div>
      </div>

      <div className="section-title">
        Logged in this browser &middot; {manual.length}
        {manual.length > 0 && (
          <>
            <button className="btn" style={{ marginLeft: 12 }} onClick={exportJson}>
              Export JSON
            </button>
            <button
              className="btn"
              style={{ marginLeft: 8 }}
              onClick={() => {
                if (confirm("Remove all manually logged films from this browser?")) setManual([]);
              }}
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {manual.length === 0 ? (
        <p className="muted">Nothing logged yet.</p>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Year</th>
                <th>Watched</th>
                <th>Rating</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {manual.map((e) => (
                <tr key={e.id}>
                  <td>
                    {e.title} {e.liked && <span style={{ color: "#ff506a" }}>♥</span>}{" "}
                    {e.rewatch && <span className="muted">↻</span>}
                  </td>
                  <td className="muted">{e.year ?? ""}</td>
                  <td className="muted">{e.watchedDate}</td>
                  <td className="rating-cell">{stars(e.rating)}</td>
                  <td>
                    <button className="btn" onClick={() => remove(e.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
