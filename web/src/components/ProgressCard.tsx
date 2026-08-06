import { Link } from "react-router-dom";
import type { ListProgress } from "../lib/lists";
import { pct } from "../lib/format";

export default function ProgressCard({ progress }: { progress: ListProgress }) {
  const { list, seenCount, total } = progress;
  const percent = pct(seenCount, total);

  return (
    <div className="card">
      <div className="progress-head">
        <span className="name">{list.name}</span>
        <span className="frac">
          {total === 0 ? "not configured" : `${seenCount} / ${total}`}
        </span>
      </div>
      <div className="bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-pct">
        {total === 0 ? (
          <span>Add a source for this list (see scraper/lists_source).</span>
        ) : (
          <>
            {percent}% complete &middot; {total - seenCount} to go &middot;{" "}
            <Link to={`/lists#${list.id}`}>view</Link>
          </>
        )}
      </div>
    </div>
  );
}
