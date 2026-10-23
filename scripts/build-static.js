// Builds a fully static copy of the addon into ./dist, ready for GitHub Pages / Vercel / any static host.
// Usage: node scripts/build-static.js
// Needs no npm packages. Re-run (or just push to GitHub) after editing movies.json or lists.json.
const fs = require('fs');
const path = require('path');
const { PAGE_SIZE, PREFIX, metaId, catalogsFor, moviesInCatalog, buildManifest, toMeta, streamsFor } = require('../lib');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const movies = JSON.parse(fs.readFileSync(path.join(root, 'movies.json'), 'utf8'));
const lists = JSON.parse(fs.readFileSync(path.join(root, 'lists.json'), 'utf8'));
const includeExternal = process.env.INCLUDE_EXTERNAL === '1';

fs.rmSync(dist, { recursive: true, force: true });
const write = (rel, data) => {
  const file = path.join(dist, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
};

const catalogs = catalogsFor(movies, lists);
write('manifest.json', buildManifest({ static: true, catalogs }));

// One catalog per list. First page has no "skip"; later pages are skip=100, 200, ...
for (const cat of catalogs) {
  const items = moviesInCatalog(movies, cat);
  for (let skip = 0; skip < Math.max(items.length, 1); skip += PAGE_SIZE) {
    const metas = items.slice(skip, skip + PAGE_SIZE).map(toMeta);
    write(skip === 0 ? `catalog/movie/${cat.id}.json` : `catalog/movie/${cat.id}/skip=${skip}.json`, { metas });
  }
  console.log(`Catalog "${cat.name}": ${items.length} titles`);
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
