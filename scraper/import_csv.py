"""Parse a Letterboxd data export (ZIP or extracted folder) into out/raw.json.

Usage:
    python import_csv.py [path-to-export-zip-or-folder]

If no path is given, the newest export found under scraper/exports/ is used.
"""
from __future__ import annotations

import csv
import io
import os
import sys
import tempfile
import zipfile
from pathlib import Path

from dotenv import load_dotenv

from common import EXPORTS_DIR, RAW_FILE, ensure_dirs, write_json

load_dotenv()


def _find_export(explicit: str | None) -> Path:
    if explicit:
        p = Path(explicit).expanduser()
        if not p.exists():
            sys.exit(f"Export path not found: {p}")
        return p

    candidates = [p for p in EXPORTS_DIR.iterdir() if p.name != ".gitkeep"] if EXPORTS_DIR.exists() else []
    if not candidates:
        sys.exit(
            "No export found. Put your Letterboxd export ZIP (or folder) in "
            f"{EXPORTS_DIR} or pass a path as an argument."
        )
    # Newest first (by mtime).
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return candidates[0]


def _open_reader(source: Path):
    """Return a callable name -> list[dict] rows, working for both a folder and a zip."""
    if source.is_dir():
        def reader(name: str):
            path = source / name
            if not path.exists():
                return []
            with path.open("r", encoding="utf-8-sig", newline="") as f:
                return list(csv.DictReader(f))
        return reader, lambda: None

    # ZIP file
    zf = zipfile.ZipFile(source)
    names = set(zf.namelist())

    def reader(name: str):
        # Letterboxd zips sometimes nest inside a top folder; try a couple of prefixes.
        for candidate in (name, *(n for n in names if n.endswith("/" + name) or n == name)):
            if candidate in names:
                data = zf.read(candidate).decode("utf-8-sig")
                return list(csv.DictReader(io.StringIO(data)))
        return []

    return reader, zf.close


def _num(val):
    if val is None:
        return None
    val = str(val).strip()
    if val == "":
        return None
    try:
        return float(val)
    except ValueError:
        return None


def _year(val):
    if val is None:
        return None
    val = str(val).strip()
    if val == "":
        return None
    try:
        return int(float(val))
    except ValueError:
        return None


def _get(row: dict, *keys):
    for k in keys:
        if k in row and row[k] not in (None, ""):
            return row[k]
    return None


def main() -> None:
    ensure_dirs()
    source = _find_export(sys.argv[1] if len(sys.argv) > 1 else None)
    print(f"Reading export from: {source}")
    read, close = _open_reader(source)

    try:
        watched = read("watched.csv")
        diary = read("diary.csv")
        ratings = read("ratings.csv")
        reviews = read("reviews.csv")
        watchlist = read("watchlist.csv")
        likes = read("likes/films.csv") or read("likes.csv")
    finally:
        close()

    # Films keyed by Letterboxd URI (falls back to title+year if missing).
    films: dict[str, dict] = {}

    def key_of(row: dict) -> str:
        uri = _get(row, "Letterboxd URI", "URL")
        if uri:
            return uri
        return f"{_get(row, 'Name')}|{_year(row.get('Year'))}"

    def ensure_film(row: dict) -> dict:
        k = key_of(row)
        if k not in films:
            films[k] = {
                "key": k,
                "title": _get(row, "Name"),
                "year": _year(row.get("Year")),
                "uri": _get(row, "Letterboxd URI", "URL"),
                "rating": None,
                "liked": False,
                "watches": [],
                "reviews": [],
            }
        return films[k]

    for row in watched:
        ensure_film(row)

    # Overall ratings (a film's single "your rating").
    for row in ratings:
        f = ensure_film(row)
        f["rating"] = _num(row.get("Rating"))

    # Likes.
    for row in likes:
        f = ensure_film(row)
        f["liked"] = True

    # Diary entries = individual watch events.
    diary_entries: list[dict] = []
    for row in diary:
        f = ensure_film(row)
        watched_date = _get(row, "Watched Date", "Date")
        rewatch = str(_get(row, "Rewatch") or "").strip().lower() in ("yes", "true", "1")
        rating = _num(row.get("Rating"))
        entry = {
            "key": f["key"],
            "title": f["title"],
            "year": f["year"],
            "date": watched_date,
            "rating": rating,
            "rewatch": rewatch,
            "tags": [t.strip() for t in (_get(row, "Tags") or "").split(",") if t.strip()],
        }
        f["watches"].append({"date": watched_date, "rating": rating, "rewatch": rewatch})
        diary_entries.append(entry)

    # Reviews (attach text to the film).
    for row in reviews:
        f = ensure_film(row)
        text = _get(row, "Review")
        if text:
            f["reviews"].append({
                "date": _get(row, "Watched Date", "Date"),
                "rating": _num(row.get("Rating")),
                "text": text,
            })

    # For films that were watched but never logged in the diary, synthesize a
    # single "watch" from watched.csv's date so they still appear on a timeline.
    for row in watched:
        f = films[key_of(row)]
        if not f["watches"]:
            f["watches"].append({
                "date": _get(row, "Date"),
                "rating": f["rating"],
                "rewatch": False,
                "approx": True,
            })

    watchlist_out = [
        {
            "title": _get(row, "Name"),
            "year": _year(row.get("Year")),
            "uri": _get(row, "Letterboxd URI", "URL"),
        }
        for row in watchlist
    ]

    raw = {
        "films": list(films.values()),
        "diary": diary_entries,
        "watchlist": watchlist_out,
        "counts": {
            "films": len(films),
            "diaryEntries": len(diary_entries),
            "watchlist": len(watchlist_out),
        },
    }
    write_json(RAW_FILE, raw)
    print(
        f"Parsed {raw['counts']['films']} films, "
        f"{raw['counts']['diaryEntries']} diary entries, "
        f"{raw['counts']['watchlist']} watchlist items -> {RAW_FILE}"
    )


if __name__ == "__main__":
    main()
