import type {
  CanonicalList,
  DiaryEntry,
  Film,
  ListIndexEntry,
  Meta,
  WatchlistFilm,
} from "../types";

const base = import.meta.env.BASE_URL; // "./" in production, "/" in dev

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${base}data/${path}`);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export interface AppData {
  films: Film[];
  diary: DiaryEntry[];
  meta: Meta | null;
  lists: CanonicalList[];
  watchlist: WatchlistFilm[];
}

export async function loadAppData(): Promise<AppData> {
  const [films, diary, meta, listIndex, watchlist] = await Promise.all([
    fetchJson<Film[]>("films.json", []),
    fetchJson<DiaryEntry[]>("diary.json", []),
    fetchJson<Meta | null>("meta.json", null),
    fetchJson<ListIndexEntry[]>("lists/index.json", []),
    fetchJson<WatchlistFilm[]>("watchlist.json", []),
  ]);

  const lists = await Promise.all(
    listIndex.map((entry) =>
      fetchJson<CanonicalList>(`lists/${entry.id}.json`, {
        id: entry.id,
        name: entry.name,
        source: entry.source,
        count: 0,
        films: [],
      })
    )
  );

  return { films, diary, meta, lists, watchlist };
}
