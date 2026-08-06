"""Build canonical comparison lists into web/public/data/lists/*.json.

Each source file in lists_source/*.json is one of:

  A) Curated films array:
     {
       "id": "afi100",
       "name": "AFI 100 Years...100 Movies (2007)",
       "source": "AFI",
       "films": [ {"title": "Citizen Kane", "year": 1941}, ... ]
     }
     Films are resolved to TMDB ids by title+year (cached).

  B) A public TMDB list (gives TMDB ids directly, great for big/volatile lists
     like IMDb Top 250 or TSPDT 1000):
     {
       "id": "imdb250",
       "name": "IMDb Top 250",
       "source": "IMDb (via TMDB list)",
       "tmdbListId": 12345
     }

Run after enrich.py so TMDB responses are already cached:
    python build_lists.py
"""
from __future__ import annotations

import csv

from dotenv import load_dotenv

from common import (
    LISTS_SOURCE_DIR,
    WEB_LISTS_DIR,
    ensure_dirs,
    load_json,
    write_json,
)
from enrich import pick_match
from tmdb import TMDB, poster_url

load_dotenv()


def read_csv_films(filename: str) -> list[dict]:
    path = LISTS_SOURCE_DIR / filename
    if not path.exists():
        print(f"  (csv {filename} not found, skipping)")
        return []
    films = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            lower = {k.lower().strip(): v for k, v in row.items()}
            title = lower.get("title") or lower.get("name")
            if not title:
                continue
            year = lower.get("year")
            try:
                year = int(str(year)[:4]) if year else None
            except ValueError:
                year = None
            tmdb_id = lower.get("tmdbid") or lower.get("tmdb_id")
            films.append({
                "title": title.strip(),
                "year": year,
                "tmdbId": int(tmdb_id) if tmdb_id else None,
            })
    return films


def resolve_curated(client: TMDB, films: list[dict]) -> list[dict]:
    out = []
    for entry in films:
        title = entry.get("title", "")
        year = entry.get("year")
        tmdb_id = entry.get("tmdbId")
        poster = None
        if tmdb_id is None:
            results = client.search_movie(title, year)
            match = pick_match(results, title, year)
            if match:
                tmdb_id = match["id"]
                poster = poster_url(match.get("poster_path"))
        if tmdb_id is not None and poster is None:
            details = client.get(f"/movie/{tmdb_id}")
            if details:
                poster = poster_url(details.get("poster_path"))
                title = details.get("title", title)
                if details.get("release_date"):
                    try:
                        year = int(details["release_date"][:4])
                    except ValueError:
                        pass
        out.append({"tmdbId": tmdb_id, "title": title, "year": year, "posterUrl": poster})
    return out


def resolve_tmdb_list(client: TMDB, list_id: int) -> list[dict]:
    data = client.get(f"/list/{list_id}")
    items = (data or {}).get("items", []) if data else []
    out = []
    for m in items:
        year = None
        if m.get("release_date"):
            try:
                year = int(m["release_date"][:4])
            except ValueError:
                year = None
        out.append({
            "tmdbId": m.get("id"),
            "title": m.get("title") or m.get("name"),
            "year": year,
            "posterUrl": poster_url(m.get("poster_path")),
        })
    return out


def main() -> None:
    ensure_dirs()
    if not LISTS_SOURCE_DIR.exists():
        raise SystemExit(f"No lists_source directory at {LISTS_SOURCE_DIR}")

    client = TMDB()
    index = []

    for src_path in sorted(LISTS_SOURCE_DIR.glob("*.json")):
        src = load_json(src_path)
        if not src or not src.get("id"):
            continue
        list_id = src["id"]
        print(f"Building list '{list_id}'...")

        if src.get("tmdbListId"):
            films = resolve_tmdb_list(client, int(src["tmdbListId"]))
        elif src.get("csv"):
            films = resolve_curated(client, read_csv_films(src["csv"]))
        else:
            films = resolve_curated(client, src.get("films", []))

        films = [f for f in films if f.get("tmdbId")]
        out = {
            "id": list_id,
            "name": src.get("name", list_id),
            "source": src.get("source", ""),
            "description": src.get("description", ""),
            "count": len(films),
            "films": films,
        }
        write_json(WEB_LISTS_DIR / f"{list_id}.json", out)
        index.append({
            "id": list_id,
            "name": out["name"],
            "source": out["source"],
            "count": out["count"],
        })
        print(f"  -> {len(films)} films")

    write_json(WEB_LISTS_DIR / "index.json", index)
    print(f"\nWrote {len(index)} lists to {WEB_LISTS_DIR}")


if __name__ == "__main__":
    main()
