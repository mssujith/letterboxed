# Updating the app

A quick local checklist for refreshing data, editing lists, building, and shipping.
Run Python commands from `scraper/` and Node commands from `web/`.

> First-time setup only (TMDB key + deps): see [README.md](README.md).

---

## 1. Update your Letterboxd export

1. On Letterboxd: **Settings → Import & Export → Export your data**.
2. Drop the downloaded `letterboxd-<username>-<date>-utc.zip` into `scraper/exports/`
   (the newest ZIP there is picked automatically — you don't need to delete the old one).
3. Re-run the pipeline:

```bash
cd scraper
python3 import_csv.py     # parse the export  -> out/raw.json
python3 enrich.py         # match + enrich via TMDB -> web/public/data/{films,diary,meta,watchlist}.json
```

`enrich.py` caches TMDB responses in `scraper/cache/`, so re-runs only fetch films it
hasn't seen before (usually a few seconds).

---

## 2. Update / add lists

List sources live in `scraper/lists_source/`. Each `*.json` is one of:

- **Curated films** — a `"films": [{ "title": "...", "year": 1999 }, ...]` array.
- **A public TMDB list** — set `"tmdbListId": 12345` (best for big/volatile lists).
- **A CSV** — set `"csv": "my_list.csv"` and drop a `Title,Year` file next to it
  (optional `tmdbId` column). The **Letterboxd Top 250** uses
  `lists_source/letterboxd_top250.csv` — refresh those rows to update it.

To **add a new list**, create `lists_source/<id>.json` (copy an existing one). Then:

```bash
cd scraper
python3 build_lists.py    # resolves everything to TMDB -> web/public/data/lists/*.json
```

Run this after `enrich.py` so TMDB lookups are already cached.

---

## 3. Build

```bash
cd web
export PATH="$HOME/.local/node/bin:$PATH"   # if node/npm aren't already on PATH
npm run build                                # type-check + production build into web/dist
# or, to preview locally instead:
npm run dev                                  # http://localhost:5173
```

---

## 4. Commit & deploy

Pushing to `main` triggers the GitHub Action that rebuilds and publishes to GitHub Pages.

```bash
cd ..                     # repo root
git add -A
git commit -m "refresh data"   # or describe the change
git push
```

The live site updates automatically a minute or two after the Action finishes.

---

### TL;DR (full refresh)

```bash
cd scraper && python3 import_csv.py && python3 enrich.py && python3 build_lists.py
cd ../web && export PATH="$HOME/.local/node/bin:$PATH" && npm run build
cd .. && git add -A && git commit -m "refresh data" && git push
```
