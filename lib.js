// Shared logic used by both the live server (index.js) and the static build (scripts/build-static.js).
// No dependencies on purpose, so the GitHub Pages build needs no npm install.

const PREFIX = 'mlclassic:';
const CATALOG_ID = 'malayalam-classics';
const PAGE_SIZE = 100;

// Entries with an IMDb id use it as their id, so the app fetches poster/plot/cast
// from its normal metadata source. Entries without one use our own prefix + meta.
const metaId = (m) => m.imdbId || PREFIX + m.id;

const ytThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

function buildManifest({ static: isStatic = false } = {}) {
  return {
    id: 'community.malayalam.classics',
    version: '1.2.0',
    name: 'Malayalam Old Classics',
    description: 'Browse a curated list of Malayalam classic films and play them inside the app.',
    resources: [
      'catalog',
      { name: 'meta', types: ['movie'], idPrefixes: [PREFIX] },
      { name: 'stream', types: ['movie'], idPrefixes: ['tt', PREFIX] },
    ],
    types: ['movie'],
    catalogs: [
      {
        type: 'movie',
        id: CATALOG_ID,
        name: 'Malayalam Old Classics',
        // Search and genre filtering need a live server; a static site can only page.
        extra: isStatic
          ? [{ name: 'skip', isRequired: false }]
          : [{ name: 'search', isRequired: false }, { name: 'genre', isRequired: false }, { name: 'skip', isRequired: false }],
      },
    ],
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

module.exports = { PREFIX, CATALOG_ID, PAGE_SIZE, metaId, buildManifest, toMeta, streamsFor };
