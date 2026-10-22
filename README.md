# Malayalam Old Classics – Stremio / Nuvio addon

Lists Malayalam classic films and returns playable streams. Titles use IMDb ids, so the apps fill in posters and details themselves.

## Put it live on GitHub (free, no server)

1. Create a new GitHub repository and upload everything in this folder (keep the `.github` folder).
2. In the repo go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Open the **Actions** tab. The "Deploy addon to GitHub Pages" run starts on its own (or run it manually). Wait for the green tick.
4. Your addon is now at `https://YOUR-USERNAME.github.io/YOUR-REPO/`. Open that page for an install button, or add this manifest URL in the app:

   `https://YOUR-USERNAME.github.io/YOUR-REPO/manifest.json`

Every time you edit `movies.json` and commit, the site rebuilds automatically (about a minute). In Stremio you may need to remove and re-add the addon, or restart the app, to see catalog changes.

Limits of the static version: no in-app search box filtering or genre filter (the catalog is paged by 100). If you want those, use the live server below.

## Live server version (optional)

Needs Node 18+.

```bash
npm install
npm start
# http://localhost:7000/manifest.json
```

Deploy `index.js` on Render, Railway, Fly.io etc. (`render.yaml` is included for Render). The server version supports search and genre filtering.

## Stream types (set per movie in `movies.json`)

| Field   | What happens |
|---------|--------------|
| `url`   | Direct MP4/MKV/HLS link. **Always plays inside the app.** Most reliable. |
| `ytId`  | YouTube video ID. Plays in-app only if your client supports `ytId` (test in Nuvio and Stremio). |

Titles with neither field show in the catalog but have no streams. Set `INCLUDE_EXTERNAL=1` (server, or when building) to also show an "Open in YouTube app" fallback.

Example entry:

```json
{ "id": "tt0282778", "imdbId": "tt0282778", "name": "Nadodikkattu", "year": 1987, "ytId": "VIDEO_ID" }
```

## Adding more titles

IMDb list → **Export** (top right of the list page) → CSV, then:

```bash
node scripts/import-imdb-csv.js list1.csv list2.csv
```

This merges: new titles are added, duplicates are skipped, and your hand-added `ytId` / `url` values are kept.

Optional: with a free YouTube Data API key, `YOUTUBE_API_KEY=xxxx node scripts/import-imdb-csv.js list.csv` also guesses a YouTube video per new title. These are guesses, so review them. To import a YouTube playlist: `YOUTUBE_API_KEY=xxxx npm run import -- PLAYLIST_ID`.

Prefer videos from official or licensed channels.
