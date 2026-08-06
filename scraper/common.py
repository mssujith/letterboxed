"""Shared paths and small helpers for the Letterboxd data pipeline."""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

SCRAPER_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRAPER_DIR.parent

EXPORTS_DIR = SCRAPER_DIR / "exports"
OUT_DIR = SCRAPER_DIR / "out"
CACHE_DIR = SCRAPER_DIR / "cache"
LISTS_SOURCE_DIR = SCRAPER_DIR / "lists_source"
OVERRIDES_FILE = SCRAPER_DIR / "overrides.json"

WEB_DATA_DIR = REPO_ROOT / "web" / "public" / "data"
WEB_LISTS_DIR = WEB_DATA_DIR / "lists"

RAW_FILE = OUT_DIR / "raw.json"
FILMS_FILE = WEB_DATA_DIR / "films.json"
DIARY_FILE = WEB_DATA_DIR / "diary.json"
META_FILE = WEB_DATA_DIR / "meta.json"


def ensure_dirs() -> None:
    for d in (EXPORTS_DIR, OUT_DIR, CACHE_DIR, WEB_DATA_DIR, WEB_LISTS_DIR):
        d.mkdir(parents=True, exist_ok=True)


def load_json(path: Path, default=None):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def film_key(title: str, year) -> str:
    """A stable key of the form 'Title (Year)' used for overrides and matching."""
    year_part = f" ({year})" if year not in (None, "", 0) else ""
    return f"{title}{year_part}"


def norm_title(title: str) -> str:
    """Normalize a title for fuzzy matching: lowercase, strip accents/punctuation."""
    if not title:
        return ""
    t = unicodedata.normalize("NFKD", title)
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = t.lower()
    t = re.sub(r"\b(the|a|an)\b", " ", t)
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()
