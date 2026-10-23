// Live server version (Render, Railway, Fly.io, your own PC...).
// Supports search and genre filtering. For free hosting on GitHub Pages / Vercel, see scripts/build-static.js.
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const movies = require('./movies.json');
const lists = require('./lists.json');
const { PAGE_SIZE, metaId, catalogsFor, moviesInCatalog, buildManifest, toMeta, streamsFor } = require('./lib');

const PORT = process.env.PORT || 7000;
// Set INCLUDE_EXTERNAL=1 to also offer an "open in YouTube app" fallback stream.
const INCLUDE_EXTERNAL = process.env.INCLUDE_EXTERNAL === '1';

const catalogs = catalogsFor(movies, lists);
const byId = (id) => movies.find((m) => metaId(m) === id);
const builder = new addonBuilder(buildManifest({ catalogs }));

builder.defineCatalogHandler(({ type, id, extra }) => {
  const cat = catalogs.find((c) => c.id === id);
  if (type !== 'movie' || !cat) return Promise.resolve({ metas: [] });

  let list = moviesInCatalog(movies, cat);
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
