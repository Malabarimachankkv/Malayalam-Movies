// Usage: node scripts/make-links-template.js
// Writes links-template.csv listing only the titles that still have NO video link,
// with empty youtube_url / direct_url columns for you to fill in (no search links).
// Then run: node scripts/apply-links.js links-template.csv
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const movies = JSON.parse(fs.readFileSync(path.join(root, 'movies.json'), 'utf8'));
const lists = JSON.parse(fs.readFileSync(path.join(root, 'lists.json'), 'utf8'));
const listName = (id) => (lists.find((l) => l.id === id) || {}).name || id;
const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

const missing = movies.filter((m) => !m.ytId && !m.url);
const lines = ['imdbId,title,year,lists,youtube_url,direct_url'];
for (const m of missing) {
  lines.push([m.imdbId || m.id, q(m.name), m.year || '', q((m.lists || []).map(listName).join('; ')), '', ''].join(','));
}
fs.writeFileSync(path.join(root, 'links-template.csv'), lines.join('\n') + '\n');
console.log(`Wrote links-template.csv: ${missing.length} titles still need a link (${movies.length - missing.length} already have one).`);
