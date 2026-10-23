// Usage: node scripts/apply-links.js <filled-links.csv>
// Reads a CSV with columns:  imdbId, youtube_url, direct_url   (other columns are ignored)
//   youtube_url : any YouTube link (watch?v=..., youtu.be/..., embed/..., shorts/...) or a bare 11-char video id
//   direct_url  : optional direct .mp4 / .mkv / .m3u8 link (always plays in-app)
// Writes ytId / url into movies.json. Blank cells are skipped; existing values are only replaced when you give a new one.
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apply-links.js <filled-links.csv>');
  process.exit(1);
}
const moviesFile = path.join(__dirname, '..', 'movies.json');

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

function videoId(s) {
  s = (s || '').trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

const movies = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));
const byId = new Map(movies.map((m) => [m.imdbId || m.id, m]));
const [header, ...rows] = parseCSV(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
const col = (n) => header.findIndex((h) => h.trim().toLowerCase() === n);
const iId = col('imdbid'), iYt = col('youtube_url'), iDirect = col('direct_url');
if (iId < 0 || (iYt < 0 && iDirect < 0)) throw new Error('CSV needs an "imdbId" column and a "youtube_url" and/or "direct_url" column.');

let yt = 0, direct = 0;
const problems = [];
for (const r of rows) {
  const m = byId.get((r[iId] || '').trim());
  if (!m) { if (r[iId]) problems.push(`Unknown imdbId: ${r[iId]}`); continue; }
  if (iYt >= 0 && (r[iYt] || '').trim()) {
    const id = videoId(r[iYt]);
    if (id) { m.ytId = id; yt++; } else problems.push(`${m.name}: could not read a video id from "${r[iYt]}"`);
  }
  if (iDirect >= 0 && (r[iDirect] || '').trim()) {
    if (/^https?:\/\//i.test(r[iDirect].trim())) { m.url = r[iDirect].trim(); direct++; }
    else problems.push(`${m.name}: direct_url must start with http(s)://`);
  }
}
fs.writeFileSync(moviesFile, JSON.stringify(movies, null, 2));
const total = movies.filter((m) => m.ytId || m.url).length;
console.log(`Applied ${yt} YouTube links and ${direct} direct links. ${total} of ${movies.length} titles now have a stream.`);
if (problems.length) console.log('Problems:\n  ' + problems.join('\n  '));
