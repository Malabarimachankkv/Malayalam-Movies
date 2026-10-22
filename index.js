// Live server version (Render, Railway, Fly.io, your own PC...).
// Supports search and genre filtering. For free hosting on GitHub Pages, see scripts/build-static.js.
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const movies = require('./movies.json');
const { CATALOG_ID, PAGE_SIZE, metaId, buildManifest, toMeta, streamsFor } = require('./lib');

const PORT = process.env.PORT || 7000;
// Set INCLUDE_EXTERNAL=1 to also offer an "open in YouTube app" fallback stream.
const INCLUDE_EXTERNAL = process.env.INCLUDE_EXTERNAL === '1';

const byId = (id) => movies.find((m) => metaId(m) === id);
const builder = new addonBuilder(buildManifest());

builder.defineCatalogHandler(({ type, id, extra }) => {
  if (type !== 'movie' || id !== CATALOG_ID) return Promise.resolve({ metas: [] });

  let list = movies.slice();
  if (extra && extra.search) {
    const q = extra.search.toLowerCase();
    list = list.filter((m) => `${m.name} ${m.originalTitle || ''}`.toLowerCase().includes(q));
  }
  if (extra && extra.genre) {
    const g = extra.genre.toLowerCase();
    list = list.filter((m) => (m.genres || []).some((x) => x.toLowerCase() === g));
  }
  const skip = parseInt((extra && extra.skip) || 0, 10) || 0;
  list = list.slice(skip, skip + PAGE_SIZE);
  return Promise.resolve({ metas: list.map(toMeta) });
});

builder.defineMetaHandler(({ type, id }) => {
  const m = type === 'movie' ? byId(id) : null;
  return Promise.resolve({ meta: m ? toMeta(m) : null });
});

builder.defineStreamHandler(({ type, id }) => {
  const m = type === 'movie' ? byId(id) : null;
  return Promise.resolve({ streams: m ? streamsFor(m, INCLUDE_EXTERNAL) : [] });
});

serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Addon running: http://localhost:${PORT}/manifest.json`);
