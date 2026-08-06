import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadAppData, type AppData } from "../lib/data";
import { applyFilters, defaultFilters, type Filters } from "../lib/filters";
import {
  loadManual,
  manualToDiary,
  manualToFilm,
  saveManual,
  type ManualEntry,
} from "../lib/manualLog";
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
  manual: ManualEntry[];
  setManual: (entries: ManualEntry[]) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({ films: [], diary: [], meta: null, lists: [], watchlist: [] });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [manual, setManualState] = useState<ManualEntry[]>([]);

  useEffect(() => {
    setManualState(loadManual());
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

  const setManual = useCallback((entries: ManualEntry[]) => {
    saveManual(entries);
    setManualState(entries);
  }, []);

  const films = useMemo(
    () => [...data.films, ...manual.map(manualToFilm)],
    [data.films, manual]
  );
  const diary = useMemo(
    () => [...data.diary, ...manual.map(manualToDiary)],
    [data.diary, manual]
  );

  const filteredFilms = useMemo(() => applyFilters(films, filters), [films, filters]);

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
    manual,
    setManual,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
