# Personal Letterboxd Stats App

A self-hosted, Letterboxd-style movie analytics web app. It turns your official
Letterboxd data export into a rich, filterable dashboard of stats, charts, and
progress trackers against canonical film lists (IMDb Top 250, Oscar Best Picture,
Cannes Palme d'Or, AFI 100, TSPDT 1000, Letterboxd Official Top 250, and more).

Two decoupled halves live in this repo:

1. **`scraper/`** &mdash; a local Python pipeline you run on your machine. It parses
   your Letterboxd CSV export, enriches every film with metadata from
   [TMDB](https://www.themoviedb.org/), matches your films against canonical lists,
   and writes normalized JSON into `web/public/data/`.
2. **`web/`** &mdash; a static React + Vite + TypeScript single-page app that reads
   that JSON, computes stats in the browser, and renders the UI. It deploys to
   GitHub Pages for free.

Your TMDB API key lives only in a local `.env` and never reaches the browser: the
site ships only pre-computed JSON.

---

## Quick start

### 1. Get your data out of Letterboxd

On Letterboxd: **Settings -> Import & Export -> Export your data**. You'll get a
ZIP such as `letterboxd-<username>-<date>-utc.zip`. Drop it (or its extracted
folder) into `scraper/exports/`.

### 2. Set up the Python pipeline

```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# then edit .env and paste your TMDB API key (v3 auth) / read token
```

Get a free TMDB key at <https://www.themoviedb.org/settings/api>.

### 3. Run the pipeline

```bash
# from scraper/ with the venv active
python import_csv.py     # parse the Letterboxd export -> out/raw.json
python enrich.py         # match + enrich via TMDB -> web/public/data/{films,diary}.json
python build_lists.py    # build canonical list files -> web/public/data/lists/*.json
```

`enrich.py` caches TMDB responses in `scraper/cache/`, so re-runs only fetch new
films.

### 4. Preview the web app locally

```bash
cd web
npm install
npm run dev
```

Open the printed URL (usually <http://localhost:5173>).

### 5. Publish to GitHub Pages

Commit and push. The included GitHub Action
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) builds `web/` and
publishes it to Pages on every push to `main`. In your repo settings, set
**Settings -> Pages -> Build and deployment -> Source = GitHub Actions**.

---

## Refreshing your data

Whenever you want to update your stats:

1. Export fresh data from Letterboxd and replace the ZIP in `scraper/exports/`.
2. Re-run the three pipeline scripts (step 3 above).
3. `git commit -am "refresh data" && git push`.

The site rebuilds and redeploys automatically.

---

## Notes and limitations

- Letterboxd has no open public API, and its "nanogenres" are a Patron-only,
  non-exportable feature. This app approximates nano-genres using **TMDB
  keywords**, which are richer and more granular than plain genres.
- The Letterboxd CSV export does not include TMDB IDs, so `enrich.py` matches
  films by **title + year**. A handful of ambiguous titles may need a manual
  override &mdash; add them to `scraper/overrides.json` (see that file for the format).
- Canonical lists (IMDb Top 250, etc.) are curated snapshots stored under
  `scraper/lists_source/`. They can drift over time; re-run `build_lists.py`
  after editing a source list.
