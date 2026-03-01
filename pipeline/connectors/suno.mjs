/**
 * Suno API connector.
 *
 * Fetches tracks from the Suno studio API using a session token.
 * The session token must be provided via SUNO_SESSION_TOKEN env var.
 *
 * This connector is called by the manual `ingest:music` command,
 * NOT during the deterministic pipeline build. It writes a normalized
 * snapshot to data-private/music/suno-snapshot.json.
 *
 * Token acquisition: Log into suno.com, open DevTools > Application >
 * Cookies, copy the `__session` cookie value.
 */

import { createLogger } from '../utils/logger.mjs';

const log = createLogger('suno-connector');

const DEFAULT_API_BASE = 'https://studio-api.suno.ai';

/**
 * Fetch all tracks for the authenticated Suno user.
 *
 * @param {Object} config
 * @param {string} config.sessionToken - Suno __session cookie value
 * @param {string} [config.apiBase] - API base URL override
 * @returns {Promise<Object[]>} Normalized track objects
 */
export async function fetchSunoTracks(config = {}) {
  const {
    sessionToken = process.env.SUNO_SESSION_TOKEN,
    apiBase = process.env.SUNO_API_BASE_URL || DEFAULT_API_BASE,
  } = config;

  if (!sessionToken) {
    log.warn('SUNO_SESSION_TOKEN not set — skipping Suno ingest');
    return [];
  }

  const headers = {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'jarowe-pipeline/1.0',
  };

  const tracks = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${apiBase}/api/feed/v2?page=${page}`;
      log.info(`Fetching Suno page ${page}...`);

      const res = await fetch(url, { headers });

      if (!res.ok) {
        if (res.status === 401) {
          log.error('Suno auth failed — session token may be expired');
        } else {
          log.error(`Suno API error: ${res.status} ${res.statusText}`);
        }
        break;
      }

      const data = await res.json();
      const clips = data.clips || data.data || [];

      if (clips.length === 0) {
        hasMore = false;
        break;
      }

      for (const clip of clips) {
        tracks.push(normalizeSunoTrack(clip));
      }

      // Safety limit — don't paginate forever
      if (page >= 50 || clips.length < 20) {
        hasMore = false;
      }
      page++;
    } catch (err) {
      log.error(`Suno fetch error on page ${page}: ${err.message}`);
      break;
    }
  }

  log.info(`Suno: fetched ${tracks.length} tracks`);
  return tracks;
}

/**
 * Normalize a Suno API track object to our canonical snapshot format.
 */
function normalizeSunoTrack(clip) {
  return {
    sourceId: String(clip.id || ''),
    source: 'suno',
    title: clip.title || clip.metadata?.prompt || 'Untitled',
    description: clip.metadata?.prompt || '',
    audioUrl: clip.audio_url || '',
    imageUrl: clip.image_url || clip.image_large_url || '',
    duration: clip.metadata?.duration || null,
    tags: Array.isArray(clip.metadata?.tags)
      ? clip.metadata.tags.map(t => String(t).toLowerCase())
      : [],
    genre: clip.metadata?.genre || '',
    createdAt: clip.created_at || null,
    isPublic: clip.is_public ?? true,
  };
}
