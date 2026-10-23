// Usage: node scripts/import-imdb-csv.js <listId>=<file.csv> [<listId>=<file2.csv> ...]
//   e.g. node scripts/import-imdb-csv.js comedies=comedies.csv thrillers=thrillers.csv
//
// Each CSV becomes one catalog row in the app (named in lists.json - edit the names there).
// MERGES into movies.json: new titles are added; a title already present is NOT duplicated,
// it just also joins the new list. Your hand-added ytId / url values are never overwritten.
// Optional: YOUTUBE_API_KEY=xxxx -> also guesses a YouTube video for NEW titles.
//
// Get a CSV: open the IMDb list while signed in -> "Export" (top right) -> save the .csv.
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node scripts/import-imdb-csv.js <listId>=<file.csv> [...]');
  process.exit(1);
}
const key = process.env.YOUTUBE_API_KEY;
const moviesFile = path.join(__dirname, '..', 'movies.json');
const listsFile = path.join(__dirname, '..', 'lists.json');

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

const prettify = (id) => id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

(async () => {
  const movies = fs.existsSync(moviesFile) ? JSON.parse(fs.readFileSync(moviesFile, 'utf8')) : [];
  const lists = fs.existsSync(listsFile) ? JSON.parse(fs.readFileSync(listsFile, 'utf8')) : [];
  const byId = new Map(movies.map((m) => [m.imdbId || m.id, m]));
  let added = 0, joined = 0;

  for (const arg of args) {
    const eq = arg.indexOf('=');
    const file = eq > 0 ? arg.slice(eq + 1) : arg;
    const listId = eq > 0 ? arg.slice(0, eq) : path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!lists.find((l) => l.id === listId)) lists.push({ id: listId, name: prettify(listId) });

    const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
    const [header, ...rows] = parseCSV(text);
    const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    const iPos = col('Position'), iConst = col('Const'), iTitle = col('Title'), iOrig = col('Original Title'),
          iYear = col('Year'), iGenres = col('Genres'), iDir = col('Directors'), iDesc = col('Description'), iType = col('Title Type');
    if (iTitle < 0) throw new Error(`${file}: no "Title" column. Is this an IMDb list export?`);

    let fa = 0, fj = 0;
    for (let n = 0; n < rows.length; n++) {
      const r = rows[n];
      const type = iType >= 0 ? r[iType] : 'movie';
      if (type && /tv|episode|video game/i.test(type) && !/movie/i.test(type)) continue;
      const imdbId = iConst >= 0 ? r[iConst] : undefined;
      const id = imdbId || (r[iTitle] || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const position = (iPos >= 0 && parseInt(r[iPos], 10)) || n + 1;

      let m = byId.get(id);
      if (m) {
        m.lists = m.lists || [];
        m.pos = m.pos || {};
        if (!m.lists.includes(listId)) { m.lists.push(listId); fj++; }
        m.pos[listId] = position;
        continue;
      }
      m = {
        id,
        imdbId,
        name: r[iTitle],
        originalTitle: iOrig >= 0 && r[iOrig] && r[iOrig] !== r[iTitle] ? r[iOrig] : undefined,
        year: iYear >= 0 ? parseInt(r[iYear], 10) || undefined : undefined,
        genres: iGenres >= 0 && r[iGenres] ? r[iGenres].split(',').map((s) => s.trim()) : undefined,
        director: iDir >= 0 && r[iDir] ? r[iDir].split(',').map((s) => s.trim()) : undefined,
        description: iDesc >= 0 && r[iDesc] ? r[iDesc] : undefined,
        lists: [listId],
        pos: { [listId]: position },
      };
      if (key) {
        try {
          const yt = await findYouTube(m.originalTitle || m.name, m.year);
          if (yt) Object.assign(m, yt);
          console.log(`${m.name} (${m.year}) -> ${yt ? `${yt.ytId} | ${yt.ytTitle} | ${yt.ytChannel}` : 'no match'}`);
        } catch (e) { console.error(e.message); }
      }
      movies.push(m);
      byId.set(id, m);
      fa++;
    }
    console.log(`${path.basename(file)} -> list "${listId}": ${fa} new titles, ${fj} existing titles added to this list`);
    added += fa; joined += fj;
  }

  fs.writeFileSync(moviesFile, JSON.stringify(movies, null, 2));
  fs.writeFileSync(listsFile, JSON.stringify(lists, null, 2) + '\n');
  console.log(`movies.json: ${movies.length} total. lists.json: ${lists.map((l) => l.id).join(', ')} (edit names there)`);
})().catch((e) => { console.error(e.message); process.exit(1); });
