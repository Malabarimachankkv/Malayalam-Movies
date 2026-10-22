// Usage: node scripts/import-imdb-csv.js <list1.csv> [<list2.csv> ...]
// MERGES into movies.json: new titles are added, titles already present (same IMDb id) are skipped,
// and any ytId / url / edits you made by hand are never overwritten.
// Optional: YOUTUBE_API_KEY=xxxx -> also guesses a YouTube video for NEW titles that have no ytId/url.
//
// Get a CSV: open the IMDb list while signed in -> "Export" (top right) -> save the .csv.
// YouTube matches are GUESSES. Review movies.json afterwards and fix/remove wrong ones.
const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/import-imdb-csv.js <list1.csv> [<list2.csv> ...]');
  process.exit(1);
}
const key = process.env.YOUTUBE_API_KEY;
const outFile = path.join(__dirname, '..', 'movies.json');

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function findYouTube(title, year) {
  const q = encodeURIComponent(`${title} ${year || ''} malayalam full movie`);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=long&maxResults=1&q=${q}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const it = (data.items || [])[0];
  return it ? { ytId: it.id.videoId, ytTitle: it.snippet.title, ytChannel: it.snippet.channelTitle } : null;
}

(async () => {
  let movies = [];
  if (fs.existsSync(outFile)) {
    movies = JSON.parse(fs.readFileSync(outFile, 'utf8')).filter((m) => m.ytId !== 'REPLACE_WITH_YOUTUBE_VIDEO_ID');
  }
  const seen = new Set(movies.map((m) => m.imdbId || m.id));
  let added = 0, skipped = 0;

  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8').replace(/^﻿/, '');
    const [header, ...rows] = parseCSV(text);
    const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    const iConst = col('Const'), iTitle = col('Title'), iOrig = col('Original Title'), iYear = col('Year'),
          iGenres = col('Genres'), iDir = col('Directors'), iDesc = col('Description'), iType = col('Title Type');
    if (iTitle < 0) throw new Error(`${f}: no "Title" column. Is this an IMDb list export?`);

    let fa = 0, fs_ = 0;
    for (const r of rows) {
      const type = iType >= 0 ? r[iType] : 'movie';
      if (type && /tv|episode|video game/i.test(type) && !/movie/i.test(type)) continue;
      const imdbId = iConst >= 0 ? r[iConst] : undefined;
      const id = imdbId || (r[iTitle] || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (seen.has(id)) { fs_++; continue; }
      seen.add(id);
      const m = {
        id,
        imdbId,
        name: r[iTitle],
        originalTitle: iOrig >= 0 && r[iOrig] && r[iOrig] !== r[iTitle] ? r[iOrig] : undefined,
        year: iYear >= 0 ? parseInt(r[iYear], 10) || undefined : undefined,
        genres: iGenres >= 0 && r[iGenres] ? r[iGenres].split(',').map((s) => s.trim()) : undefined,
        director: iDir >= 0 && r[iDir] ? r[iDir].split(',').map((s) => s.trim()) : undefined,
        description: iDesc >= 0 && r[iDesc] ? r[iDesc] : undefined,
      };
      if (key) {
        try {
          const yt = await findYouTube(m.originalTitle || m.name, m.year);
          if (yt) Object.assign(m, yt);
          console.log(`${m.name} (${m.year}) -> ${yt ? `${yt.ytId} | ${yt.ytTitle} | ${yt.ytChannel}` : 'no match'}`);
        } catch (e) { console.error(e.message); }
      }
      movies.push(m);
      fa++;
    }
    console.log(`${path.basename(f)}: added ${fa}, already present ${fs_}`);
    added += fa; skipped += fs_;
  }

  fs.writeFileSync(outFile, JSON.stringify(movies, null, 2));
  console.log(`movies.json: ${movies.length} total (${added} new, ${skipped} duplicates skipped)`);
})().catch((e) => { console.error(e.message); process.exit(1); });
