"""Tiny TMDB API client with on-disk response caching."""
from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

import requests

from common import CACHE_DIR

API_BASE = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p"
POSTER_SIZE = "w342"


class TMDB:
    def __init__(self, api_key: str | None = None, read_token: str | None = None, delay: float = 0.05):
        self.api_key = api_key or os.getenv("TMDB_API_KEY") or ""
        self.read_token = read_token or os.getenv("TMDB_READ_TOKEN") or ""
        if not self.api_key and not self.read_token:
            raise SystemExit(
                "No TMDB credentials found. Set TMDB_API_KEY or TMDB_READ_TOKEN in scraper/.env"
            )
        self.delay = delay
        self.session = requests.Session()
        if self.read_token:
            self.session.headers["Authorization"] = f"Bearer {self.read_token}"
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def _cache_path(self, path: str, params: dict) -> Path:
        raw = path + "?" + json.dumps(params, sort_keys=True)
        digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()
        return CACHE_DIR / f"{digest}.json"

    def get(self, path: str, params: dict | None = None, use_cache: bool = True):
        params = dict(params or {})
        if not self.read_token:
            params["api_key"] = self.api_key
        cache_key_params = {k: v for k, v in params.items() if k != "api_key"}
        cache_path = self._cache_path(path, cache_key_params)
        if use_cache and cache_path.exists():
            with cache_path.open("r", encoding="utf-8") as f:
                return json.load(f)

        for attempt in range(5):
            resp = self.session.get(f"{API_BASE}{path}", params=params, timeout=30)
            if resp.status_code == 429:
                wait = float(resp.headers.get("Retry-After", 2)) + 0.5
                time.sleep(wait)
                continue
            if resp.status_code == 404:
                data = None
                break
            resp.raise_for_status()
            data = resp.json()
            break
        else:
            data = None

        time.sleep(self.delay)
        with cache_path.open("w", encoding="utf-8") as f:
            json.dump(data, f)
        return data

    def search_movie(self, title: str, year: int | None):
        params = {"query": title, "include_adult": "false"}
        if year:
            params["year"] = year
        data = self.get("/search/movie", params)
        return (data or {}).get("results", [])

    def movie(self, tmdb_id: int):
        return self.get(
            f"/movie/{tmdb_id}",
            {"append_to_response": "credits,keywords"},
        )


def poster_url(poster_path: str | None) -> str | None:
    if not poster_path:
        return None
    return f"{IMAGE_BASE}/{POSTER_SIZE}{poster_path}"
