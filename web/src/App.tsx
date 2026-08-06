import { NavLink, Route, Routes } from "react-router-dom";
import { useData } from "./context/DataContext";
import Dashboard from "./pages/Dashboard";
import Stats from "./pages/Stats";
import Diary from "./pages/Diary";
import Films from "./pages/Films";
import Lists from "./pages/Lists";
import ManualLog from "./pages/ManualLog";

function Nav() {
  const { meta } = useData();
  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");
  return (
    <nav className="nav">
      <div className="nav-inner">
        <span className="brand">
          MY FILM <span className="dot-g">S</span>
          <span className="dot-b">T</span>
          <span className="dot-o">A</span>TS
        </span>
        <div className="nav-links">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/stats" className={linkClass}>
            Stats
          </NavLink>
          <NavLink to="/diary" className={linkClass}>
            Diary
          </NavLink>
          <NavLink to="/films" className={linkClass}>
            Films
          </NavLink>
          <NavLink to="/lists" className={linkClass}>
            Lists
          </NavLink>
          <NavLink to="/log" className={linkClass}>
            Log
          </NavLink>
        </div>
        <span className="nav-spacer" />
        {meta && (
          <span className="nav-meta">
            {meta.counts.films.toLocaleString()} films &middot; updated{" "}
            {new Date(meta.generatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  const { loading, films } = useData();

  return (
    <>
      <Nav />
      <div className="app">
        {loading ? (
          <div className="loading">Loading your film data&hellip;</div>
        ) : (
          <>
            {films.length === 0 && (
              <div className="notice">
                <strong>No data yet.</strong> Run the pipeline in <code>scraper/</code>{" "}
                (<code>import_csv.py</code> &rarr; <code>enrich.py</code> &rarr;{" "}
                <code>build_lists.py</code>) to generate{" "}
                <code>web/public/data/films.json</code>, then reload &mdash; or add films on the{" "}
                <strong>Log</strong> tab. See the project README for setup steps.
              </div>
            )}
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/diary" element={<Diary />} />
              <Route path="/films" element={<Films />} />
              <Route path="/lists" element={<Lists />} />
              <Route path="/log" element={<ManualLog />} />
            </Routes>
          </>
        )}
      </div>
    </>
  );
}
