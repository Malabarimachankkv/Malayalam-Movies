// Shared logic used by both the live server (index.js) and the static build (scripts/build-static.js).
// No dependencies on purpose, so the GitHub Pages / Vercel build needs no npm install.

const PREFIX = 'mlclassic:';
const PAGE_SIZE = 100;

// Entries with an IMDb id use it as their id, so the app fetches poster/plot/cast
// from its normal metadata source. Entries without one use our own prefix + meta.
const metaId = (m) => m.imdbId || PREFIX + m.id;

const ytThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

// One catalog (= one row in the app) per list in lists.json.
// Movies that belong to no list go into a "More" catalog, only if there are any.
function catalogsFor(movies, lists) {
  const cats = lists.map((l) => ({ id: `ml-${l.id}`, name: l.name, listId: l.id }));
  if (movies.some((m) => !(m.lists || []).length)) cats.push({ id: 'ml-more', name: 'Malayalam – More', listId: null });
  return cats;
}

function moviesInCatalog(movies, cat) {
  if (!cat.listId) return movies.filter((m) => !(m.lists || []).length);
  const pos = (m) => (m.pos && m.pos[cat.listId]) || 1e9;
  return movies.filter((m) => (m.lists || []).includes(cat.listId)).sort((a, b) => pos(a) - pos(b));
}

function buildManifest({ static: isStatic = false, catalogs = [] } = {}) {
  return {
    id: 'community.malayalam.classics',
    version: '1.3.0',
    name: 'Malayalam Old Classics',
    description: 'Browse curated lists of Malayalam classic films and play them inside the app.',
    resources: [
      'catalog',
      { name: 'meta', types: ['movie'], idPrefixes: [PREFIX] },
      { name: 'stream', types: ['movie'], idPrefixes: ['tt', PREFIX] },
    ],
    types: ['movie'],
    catalogs: catalogs.map((c) => ({
      type: 'movie',
      id: c.id,
      name: c.name,
      // Search and genre filtering need a live server; a static site can only page.
      extra: isStatic
        ? [{ name: 'skip', isRequired: false }]
        : [{ name: 'search', isRequired: false }, { name: 'genre', isRequired: false }, { name: 'skip', isRequired: false }],
    })),
  };
}

function toMeta(m) {
  const poster =
    m.poster ||
    (m.imdbId ? `https://images.metahub.space/poster/medium/${m.imdbId}/img` : m.ytId ? ytThumb(m.ytId) : undefined);
  return {
    id: metaId(m),
    type: 'movie',
    name: m.name,
    poster,
    posterShape: m.imdbId || m.poster ? 'poster' : 'landscape',
    background: m.background || (m.imdbId ? `https://images.metahub.space/background/medium/${m.imdbId}/img` : poster),
    releaseInfo: m.year ? String(m.year) : undefined,
    description: m.description || undefined,
    genres: m.genres,
    director: m.director,
  };
}

function streamsFor(m, includeExternal = false) {
  const streams = [];
  // Direct file (MP4 / MKV / HLS) – always plays in-app. Best option when available.
  if (m.url) streams.push({ name: 'Direct', title: `${m.name} (direct file)`, url: m.url });
  // YouTube id – plays in-app on clients that support ytId.
  if (m.ytId) streams.push({ name: 'YouTube', title: `${m.name} (YouTube)`, ytId: m.ytId });
  // Optional fallback that hands off to the YouTube app/browser.
  if (includeExternal && m.ytId) {
    streams.push({ name: 'YouTube app', title: 'Open in YouTube app', externalUrl: `https://www.youtube.com/watch?v=${m.ytId}` });
  }
  return streams;
}

module.exports = { PREFIX, PAGE_SIZE, metaId, catalogsFor, moviesInCatalog, buildManifest, toMeta, streamsFor };
