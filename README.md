# Malayalam Old Classics – Stremio / Nuvio addon

Shows each of your IMDb lists as its own row (catalog) and returns playable streams. Titles use IMDb ids, so the apps fill in posters and details themselves.

## Put it live

**GitHub Pages (free):** upload everything to a GitHub repo (keep the `.github` folder), then Settings → Pages → Source: **GitHub Actions**. Your manifest is `https://YOUR-USERNAME.github.io/YOUR-REPO/manifest.json`.

**Vercel (free):** import the repo at vercel.com (Framework: Other). `vercel.json` sets the build command and output folder. Your manifest is `https://YOUR-PROJECT.vercel.app/manifest.json`.

Either way, editing `movies.json` / `lists.json` and committing redeploys automatically in about a minute. In the app, remove and re-add the addon if rows or titles don't refresh.

## Rows (one per IMDb list)

`lists.json` names each row:

```json
[ { "id": "comedies", "name": "Malayalam Comedies" }, ... ]
```

Edit the `name` values to rename a row. Each title in `movies.json` has `"lists": ["comedies", ...]`; a title can be in several rows.

## Making titles playable

A title only plays if it has a video source in `movies.json`:

| Field   | What happens |
|---------|--------------|
| `ytId`  | YouTube video ID. Plays in-app only if your client supports it (test in Nuvio and Stremio). |
| `url`   | Direct MP4/MKV/HLS link. **Always plays inside the app.** Most reliable. |

Titles with neither show in the rows but have no streams.

**Easy way to add many links:**

1. Run `node scripts/make-links-template.js`. It writes `links-template.csv` listing only the titles that still have no video. Open it in Excel or Google Sheets, find the film on YouTube, and paste the video's address into `youtube_url`. (Optionally paste a direct video file link into `direct_url`.)
2. Save the file, then run: `node scripts/apply-links.js links-template.csv` (or send the filled file to Claude).
3. Commit the updated `movies.json`.

Or edit `movies.json` by hand:

```json
{ "id": "tt0282778", "imdbId": "tt0282778", "name": "Nadodikkattu", "year": 1987, "ytId": "VIDEO_ID" }
```

Set `INCLUDE_EXTERNAL=1` (server, or when building) to also show an "Open in YouTube app" fallback stream.

## Adding more IMDb lists

IMDb list → **Export** (top right of the list page) → CSV, then:

```bash
node scripts/import-imdb-csv.js mylist=mylist.csv other=other.csv
```

The name before `=` is the list id; add a nicer display name in `lists.json`. Titles already present are not duplicated (they just join the new list), and your `ytId` / `url` values are kept. Run `node scripts/make-links-template.js` afterwards for a fresh links sheet.

Optional: with a free YouTube Data API key, `YOUTUBE_API_KEY=xxxx node scripts/import-imdb-csv.js ...` guesses a YouTube video per new title and prints the channel name so you can review it. Guesses can be wrong.

## Live server version (optional, has search + genre filter)

Needs Node 18+: `npm install` then `npm start` → `http://localhost:7000/manifest.json`. `render.yaml` is included for Render.
