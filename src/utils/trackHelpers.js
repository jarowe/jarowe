/**
 * Track grouping helpers for the music player modal.
 * Pure functions — no React deps.
 */

/** Group Spotify tracks by album → [{ album, artwork, tracks: [{...}] }] */
export function getSpotifyAlbums(tracks) {
  const map = new Map();
  for (const t of tracks) {
    if (t.platform !== 'spotify') continue;
    const key = t.album || 'Singles';
    if (!map.has(key)) map.set(key, { album: key, artwork: t.artwork, tracks: [] });
    map.get(key).tracks.push(t);
  }
  return Array.from(map.values());
}

/** Return flat array of SoundCloud tracks */
export function getSoundCloudTracks(tracks) {
  return tracks.filter(t => t.platform === 'soundcloud');
}

/** Find the index in the master tracks array for a given track object */
export function findTrackIndex(tracks, track) {
  return tracks.findIndex(t => t.src === track.src);
}
