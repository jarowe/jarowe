/**
 * SoundCloud API connector.
 *
 * Fetches tracks from a SoundCloud user profile using the v2 API.
 * Requires SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_USER_ID env vars.
 *
 * Optional: SOUNDCLOUD_AUTH_TOKEN for private tracks.
 *
 * This connector is called by the manual `ingest:music` command,
 * NOT during the deterministic pipeline build.
 */

import { createLogger } from '../utils/logger.mjs';

const log = createLogger('soundcloud-connector');

const API_BASE = 'https://api-v2.soundcloud.com';

/**
 * Fetch all tracks for a SoundCloud user.
 *
 * @param {Object} config
 * @param {string} config.clientId - SoundCloud client_id (OAuth app)
 * @param {string} config.userId - SoundCloud numeric user ID
 * @param {string} [config.authToken] - Optional OAuth token for private tracks
 * @returns {Promise<Object[]>} Normalized track objects
 */
export async function fetchSoundCloudTracks(config = {}) {
  const {
    clientId = process.env.SOUNDCLOUD_CLIENT_ID,
    userId = process.env.SOUNDCLOUD_USER_ID,
    authToken = process.env.SOUNDCLOUD_AUTH_TOKEN,
  } = config;

  if (!clientId || !userId) {
    log.warn('SOUNDCLOUD_CLIENT_ID or SOUNDCLOUD_USER_ID not set — skipping SoundCloud ingest');
    return [];
  }

  const headers = {
    'User-Agent': 'jarowe-pipeline/1.0',
  };
  if (authToken) {
    headers['Authorization'] = `OAuth ${authToken}`;
  }

  const tracks = [];
  let offset = 0;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${API_BASE}/users/${userId}/tracks?client_id=${clientId}&limit=${limit}&offset=${offset}&linked_partitioning=1`;
      log.info(`Fetching SoundCloud tracks offset=${offset}...`);

      const res = await fetch(url, { headers });

      if (!res.ok) {
        if (res.status === 401) {
          log.error('SoundCloud auth failed — check client_id / auth_token');
        } else {
          log.error(`SoundCloud API error: ${res.status} ${res.statusText}`);
        }
        break;
      }

      const data = await res.json();
      const collection = data.collection || [];

      if (collection.length === 0) {
        hasMore = false;
        break;
      }

      for (const track of collection) {
        tracks.push(normalizeSoundCloudTrack(track));
      }

      // Use SoundCloud's linked_partitioning for pagination
      if (data.next_href) {
        offset += limit;
      } else {
        hasMore = false;
      }

      // Safety limit
      if (offset >= 2000) {
        hasMore = false;
      }
    } catch (err) {
      log.error(`SoundCloud fetch error at offset ${offset}: ${err.message}`);
      break;
    }
  }

  log.info(`SoundCloud: fetched ${tracks.length} tracks`);
  return tracks;
}

/**
 * Normalize a SoundCloud API track object to our canonical snapshot format.
 */
function normalizeSoundCloudTrack(track) {
  // Extract tags from tag_list string ("tag1 tag2 \"multi word\"")
  const tags = [];
  if (track.tag_list) {
    const matches = track.tag_list.match(/"([^"]+)"|\S+/g);
    if (matches) {
      for (const m of matches) {
        tags.push(m.replace(/"/g, '').toLowerCase());
      }
    }
  }

  return {
    sourceId: String(track.id || ''),
    source: 'soundcloud',
    title: track.title || 'Untitled',
    description: track.description || '',
    audioUrl: track.permalink_url || '',
    imageUrl: track.artwork_url
      ? track.artwork_url.replace('-large', '-t500x500')
      : '',
    duration: track.duration ? Math.round(track.duration / 1000) : null,
    tags,
    genre: track.genre || '',
    createdAt: track.created_at || null,
    isPublic: track.sharing === 'public',
  };
}
