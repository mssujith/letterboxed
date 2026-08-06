import { useMemo, useState } from "react";

const COLORS = ["#2c3440", "#0a4d24", "#0f7a37", "#1aa34a", "#00e054"];

function colorFor(count: number, max: number): string {
  if (count <= 0) return COLORS[0];
  if (max <= 1) return COLORS[4];
  const idx = Math.min(4, 1 + Math.floor((count / max) * 3.999));
  return COLORS[idx];
}

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * GitHub-style contribution heatmap. Renders a full span of weeks (columns) x
 * 7 days (rows) covering the min..max dates present in `counts`.
 */
export default function CalendarHeatmap({ counts }: { counts: Map<string, number> }) {
  const [hover, setHover] = useState<{ day: string; count: number } | null>(null);

  const { cells, max } = useMemo(() => {
    const keys = Array.from(counts.keys()).sort();
    if (keys.length === 0) return { cells: [] as { day: string; count: number }[], max: 0 };
    const start = new Date(keys[0]);
    const end = new Date(keys[keys.length - 1]);
    // Snap start back to Sunday.
    start.setDate(start.getDate() - start.getDay());
    const out: { day: string; count: number }[] = [];
    let m = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = toKey(d);
      const c = counts.get(key) ?? 0;
      if (c > m) m = c;
      out.push({ day: key, count: c });
    }
    return { cells: out, max: m };
  }, [counts]);

  if (cells.length === 0) return <p className="muted">No dated watches in this range.</p>;

  return (
    <div>
      <div className="heatmap">
        {cells.map((cell) => (
          <div
            key={cell.day}
            className="heat-cell"
            style={{ background: colorFor(cell.count, max) }}
            onMouseEnter={() => setHover(cell)}
            onMouseLeave={() => setHover(null)}
            title={`${cell.day}: ${cell.count} film${cell.count === 1 ? "" : "s"}`}
          />
        ))}
      </div>
      <div className="heat-legend">
        <span>{hover ? `${hover.day}: ${hover.count} film${hover.count === 1 ? "" : "s"}` : "Less"}</span>
        {!hover && (
          <>
            {COLORS.map((c) => (
              <span key={c} className="heat-cell" style={{ background: c }} />
            ))}
            <span>More</span>
          </>
        )}
      </div>
    </div>
  );
}
