"""Match raw films to TMDB and write enriched films.json / diary.json / meta.json.

Run after import_csv.py:
    python enrich.py
"""
from __future__ import annotations

import datetime as dt
from collections import Counter

from dotenv import load_dotenv

from common import (
    DIARY_FILE,
    FILMS_FILE,
    META_FILE,
    OVERRIDES_FILE,
    RAW_FILE,
    WATCHLIST_FILE,
    ensure_dirs,
    film_key,
    load_json,
    norm_title,
    write_json,
)
from tmdb import TMDB, poster_url

load_dotenv()


def pick_match(results: list[dict], title: str, year: int | None) -> dict | None:
    if not results:
        return None
    target = norm_title(title)

    def score(r: dict) -> tuple:
        r_title = norm_title(r.get("title", ""))
        r_orig = norm_title(r.get("original_title", ""))
        exact = r_title == target or r_orig == target
        r_year = None
        if r.get("release_date"):
            try:
                r_year = int(r["release_date"][:4])
            except ValueError:
                r_year = None
        year_close = year is not None and r_year is not None and abs(r_year - year) <= 1
        year_exact = year is not None and r_year == year
        return (
            exact,
            year_exact,
            year_close,
            r.get("popularity", 0),
        )

    return sorted(results, key=score, reverse=True)[0]


# ISO 639-1 fallback names for the film's original language when it is not
# among the spoken_languages list (e.g. Cantonese "cn").
ISO639 = {
    "en": "English", "fr": "French", "es": "Spanish", "de": "German",
    "it": "Italian", "ja": "Japanese", "ko": "Korean", "zh": "Chinese",
    "cn": "Cantonese", "ru": "Russian", "hi": "Hindi", "pt": "Portuguese",
    "sv": "Swedish", "da": "Danish", "no": "Norwegian", "fi": "Finnish",
    "nl": "Dutch", "pl": "Polish", "cs": "Czech", "hu": "Hungarian",
    "tr": "Turkish", "ar": "Arabic", "fa": "Persian", "he": "Hebrew",
    "th": "Thai", "vi": "Vietnamese", "id": "Indonesian", "el": "Greek",
    "ro": "Romanian", "uk": "Ukrainian", "ta": "Tamil", "te": "Telugu",
    "ml": "Malayalam", "bn": "Bengali", "is": "Icelandic", "et": "Estonian",
}


def extract(details: dict) -> dict:
    credits = details.get("credits", {}) or {}
    crew = credits.get("crew", []) or []
    cast = credits.get("cast", []) or []
    directors = [c["name"] for c in crew if c.get("job") == "Director"]
    writers = [c["name"] for c in crew if c.get("department") == "Writing"][:5]
    top_cast = [c["name"] for c in cast[:8]]
    keywords = [k["name"] for k in (details.get("keywords", {}) or {}).get("keywords", [])]
    genres = [g["name"] for g in details.get("genres", [])]
    spoken = details.get("spoken_languages", []) or []
    languages = [l["english_name"] for l in spoken]
    prod_countries = details.get("production_countries", []) or []
    countries = [c["name"] for c in prod_countries]
    studios = [c["name"] for c in details.get("production_companies", [])][:6]
    release_date = details.get("release_date") or None

    # Primary (main) language: derive from the film's original_language code,
    # so a film with one spoken line of another language isn't miscategorized.
    orig_code = details.get("original_language")
    lang_by_code = {l.get("iso_639_1"): (l.get("english_name") or l.get("name")) for l in spoken}
    primary_language = (
        lang_by_code.get(orig_code)
        or ISO639.get(orig_code)
        or (orig_code.upper() if orig_code else None)
    )

    # Primary (main) country: prefer origin_country, else first production country.
    country_by_code = {c.get("iso_3166_1"): c.get("name") for c in prod_countries}
    origin = details.get("origin_country") or []
    if origin:
        primary_country = country_by_code.get(origin[0]) or origin[0]
    elif prod_countries:
        primary_country = prod_countries[0].get("name")
    else:
        primary_country = None

    return {
        "tmdbId": details.get("id"),
        "posterUrl": poster_url(details.get("poster_path")),
        "runtime": details.get("runtime") or None,
        "releaseDate": release_date,
        "tmdbRating": details.get("vote_average") or None,
        "tmdbVotes": details.get("vote_count") or None,
        "budget": details.get("budget") or None,
        "revenue": details.get("revenue") or None,
        "genres": genres,
        "languages": languages,
        "originalLanguage": orig_code,
        "primaryLanguage": primary_language,
        "countries": countries,
        "primaryCountry": primary_country,
        "studios": studios,
        "directors": directors,
        "writers": writers,
        "cast": top_cast,
        "keywords": keywords,
    }


def main() -> None:
    ensure_dirs()
    raw = load_json(RAW_FILE)
    if not raw:
        raise SystemExit(f"No raw data at {RAW_FILE}. Run import_csv.py first.")

    overrides = {k: v for k, v in (load_json(OVERRIDES_FILE, {}) or {}).items() if not k.startswith("_")}
    client = TMDB()

    films_out: list[dict] = []
    unmatched: list[str] = []
    key_to_tmdb: dict[str, int] = {}

    total = len(raw["films"])
    for i, film in enumerate(raw["films"], 1):
        title = film.get("title") or ""
        year = film.get("year")
        fk = film_key(title, year)

        tmdb_id = overrides.get(fk)
        if tmdb_id is None:
            results = client.search_movie(title, year)
            match = pick_match(results, title, year)
            tmdb_id = match["id"] if match else None

        enriched = {
            "id": film["key"],
            "title": title,
            "year": year,
            "uri": film.get("uri"),
            "rating": film.get("rating"),
            "liked": film.get("liked", False),
            "watchedDates": sorted([w["date"] for w in film.get("watches", []) if w.get("date")]),
            "watchCount": len(film.get("watches", [])),
            "rewatched": any(w.get("rewatch") for w in film.get("watches", [])),
            "reviewCount": len(film.get("reviews", [])),
        }

        if tmdb_id:
            details = client.movie(int(tmdb_id))
            if details:
                enriched.update(extract(details))
                key_to_tmdb[film["key"]] = int(details.get("id") or tmdb_id)
            else:
                unmatched.append(fk)
        else:
            unmatched.append(fk)

        films_out.append(enriched)
        if i % 25 == 0 or i == total:
            print(f"  enriched {i}/{total} films ({len(unmatched)} unmatched so far)")

    # Diary entries enriched with poster + tmdb id from their film.
    poster_by_key = {f["id"]: f.get("posterUrl") for f in films_out}
    tmdb_by_key = {f["id"]: f.get("tmdbId") for f in films_out}
    diary_out = []
    for e in raw.get("diary", []):
        diary_out.append({
            "date": e.get("date"),
            "title": e.get("title"),
            "year": e.get("year"),
            "rating": e.get("rating"),
            "rewatch": e.get("rewatch", False),
            "posterUrl": poster_by_key.get(e.get("key")),
            "tmdbId": tmdb_by_key.get(e.get("key")),
        })

    # Watchlist: match each item to TMDB for a poster (search results are cached).
    watchlist_out = []
    for item in raw.get("watchlist", []):
        title = item.get("title") or ""
        year = item.get("year")
        results = client.search_movie(title, year)
        match = pick_match(results, title, year)
        watchlist_out.append({
            "tmdbId": match["id"] if match else None,
            "title": title,
            "year": year,
            "posterUrl": poster_url(match.get("poster_path")) if match else None,
            "tmdbRating": (match.get("vote_average") if match else None) or None,
            "releaseDate": (match.get("release_date") if match else None) or None,
        })
    write_json(WATCHLIST_FILE, watchlist_out)

    # Meta: filter dimensions + summary counts.
    genre_counter: Counter = Counter()
    lang_counter: Counter = Counter()
    watched_years: set[int] = set()
    for f in films_out:
        genre_counter.update(f.get("genres", []))
        lang_counter.update(f.get("languages", []))
        for d in f.get("watchedDates", []):
            try:
                watched_years.add(int(d[:4]))
            except (ValueError, TypeError):
                pass

    meta = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "counts": {
            "films": len(films_out),
            "matched": len(films_out) - len(unmatched),
            "unmatched": len(unmatched),
            "diaryEntries": len(diary_out),
            "watchlist": raw.get("counts", {}).get("watchlist", 0),
        },
        "watchedYears": sorted(watched_years),
        "genres": [g for g, _ in genre_counter.most_common()],
        "languages": [l for l, _ in lang_counter.most_common()],
    }

    write_json(FILMS_FILE, films_out)
    write_json(DIARY_FILE, diary_out)
    write_json(META_FILE, meta)

    print(f"\nWrote {len(films_out)} films -> {FILMS_FILE}")
    print(f"Wrote {len(diary_out)} diary entries -> {DIARY_FILE}")
    print(f"Matched {meta['counts']['matched']}/{meta['counts']['films']} to TMDB.")
    if unmatched:
        print(f"\n{len(unmatched)} unmatched (add to overrides.json if needed):")
        for fk in unmatched[:40]:
            print(f"  - {fk}")
        if len(unmatched) > 40:
            print(f"  ...and {len(unmatched) - 40} more")


if __name__ == "__main__":
    main()
