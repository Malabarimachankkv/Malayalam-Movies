// Usage: YOUTUBE_API_KEY=xxxx node scripts/import-playlist.js <playlistId> [<playlistId> ...]
// Appends videos from YouTube playlists into movies.json (skips ones already present).
const fs = require('fs');
const path = require('path');

const key = process.env.YOUTUBE_API_KEY;
const playlists = process.argv.slice(2);
if (!key || !playlists.length) {
  console.error('Usage: YOUTUBE_API_KEY=xxxx node scripts/import-playlist.js <playlistId> [...]');
  process.exit(1);
}

const file = path.join(__dirname, '..', 'movies.json');
const movies = JSON.parse(fs.readFileSync(file, 'utf8')).filter((m) => m.ytId !== 'REPLACE_WITH_YOUTUBE_VIDEO_ID');
const seen = new Set(movies.map((m) => m.ytId));

async function fetchPlaylist(pid) {
  let token = '';
  let added = 0;
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${pid}&key=${key}${token ? `&pageToken=${token}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    for (const it of data.items || []) {
      const s = it.snippet;
      const ytId = s.resourceId && s.resourceId.videoId;
      if (!ytId || seen.has(ytId) || s.title === 'Private video' || s.title === 'Deleted video') continue;
      seen.add(ytId);
      movies.push({
        id: ytId,
        name: s.title,
        ytId,
        description: (s.description || '').split('\n')[0].slice(0, 300),
        genres: ['Classic'],
      });
      added++;
    }
    token = data.nextPageToken || '';
  } while (token);
  return added;
}

(async () => {
  for (const pid of playlists) {
    const n = await fetchPlaylist(pid);
    console.log(`Playlist ${pid}: added ${n}`);
  }
  fs.writeFileSync(file, JSON.stringify(movies, null, 2));
  console.log(`movies.json now has ${movies.length} entries. Edit names/years as needed.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
