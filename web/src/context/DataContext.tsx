import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadAppData, type AppData } from "../lib/data";
import { applyFilters, defaultFilters, type Filters } from "../lib/filters";
import type { DiaryEntry, Film } from "../types";

interface DataContextValue {
  films: Film[];
  diary: DiaryEntry[];
  meta: AppData["meta"];
  lists: AppData["lists"];
  watchlist: AppData["watchlist"];
  loading: boolean;
  filters: Filters;
  setFilters: (f: Filters) => void;
  filteredFilms: Film[];
  /** filteredFilms restricted to diary-logged films (excludes "marked watched"). */
  filteredLogged: Film[];
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({ films: [], diary: [], meta: null, lists: [], watchlist: [] });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  useEffect(() => {
    let cancelled = false;
    loadAppData().then((d) => {
      if (!cancelled) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const films = data.films;
  const diary = data.diary;

  const filteredFilms = useMemo(() => applyFilters(films, filters), [films, filters]);
  const filteredLogged = useMemo(() => filteredFilms.filter((f) => f.logged), [filteredFilms]);

  const value: DataContextValue = {
    films,
    diary,
    meta: data.meta,
    lists: data.lists,
    watchlist: data.watchlist,
    loading,
    filters,
    setFilters,
    filteredFilms,
    filteredLogged,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
