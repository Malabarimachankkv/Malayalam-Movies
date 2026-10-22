// Builds a fully static copy of the addon into ./dist, ready for GitHub Pages (or any static host).
// Usage: node scripts/build-static.js
// Needs no npm packages. Re-run (or just push to GitHub) after editing movies.json.
const fs = require('fs');
const path = require('path');
const { CATALOG_ID, PAGE_SIZE, metaId, buildManifest, toMeta, streamsFor, PREFIX } = require('../lib');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const movies = JSON.parse(fs.readFileSync(path.join(root, 'movies.json'), 'utf8'));
const includeExternal = process.env.INCLUDE_EXTERNAL === '1';

fs.rmSync(dist, { recursive: true, force: true });
const write = (rel, data) => {
  const file = path.join(dist, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
};

write('manifest.json', buildManifest({ static: true }));

// Catalog pages: first page has no "skip"; later pages are skip=100, 200, ...
for (let skip = 0; skip < Math.max(movies.length, 1); skip += PAGE_SIZE) {
  const metas = movies.slice(skip, skip + PAGE_SIZE).map(toMeta);
  write(skip === 0 ? `catalog/movie/${CATALOG_ID}.json` : `catalog/movie/${CATALOG_ID}/skip=${skip}.json`, { metas });
}

let withStreams = 0;
for (const m of movies) {
  const id = metaId(m);
  const streams = streamsFor(m, includeExternal);
  if (streams.length) withStreams++;
  write(`stream/movie/${id}.json`, { streams });
  if (id.startsWith(PREFIX)) write(`meta/movie/${id}.json`, { meta: toMeta(m) });
}

write('index.html', fs.readFileSync(path.join(__dirname, 'landing.html'), 'utf8'));
console.log(`Built ${movies.length} titles into dist/ (${withStreams} have a playable stream).`);
