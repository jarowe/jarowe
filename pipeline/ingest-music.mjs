#!/usr/bin/env node

/**
 * Manual music ingest command.
 *
 * Fetches tracks from Suno and SoundCloud APIs and writes
 * a deterministic normalized snapshot to data-private/music/.
 *
 * Usage:
 *   npm run ingest:music
 *
 * Environment variables:
 *   SUNO_SESSION_TOKEN    - Suno __session cookie
 *   SUNO_API_BASE_URL     - Suno API base (default: https://studio-api.suno.ai)
 *   SOUNDCLOUD_CLIENT_ID  - SoundCloud OAuth client ID
 *   SOUNDCLOUD_USER_ID    - SoundCloud numeric user ID
 *   SOUNDCLOUD_AUTH_TOKEN  - Optional: SoundCloud OAuth token for private tracks
 *
 * Output:
 *   data-private/music/suno-snapshot.json
 *   data-private/music/soundcloud-snapshot.json
 *   data-private/music/ingest-manifest.json
 *
 * The pipeline build (npm run pipeline) reads these snapshots only.
 * No live API calls happen during the deterministic build.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchSunoTracks } from './connectors/suno.mjs';
import { fetchSoundCloudTracks } from './connectors/soundcloud.mjs';
import { createLogger } from './utils/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MUSIC_DIR = path.join(PROJECT_ROOT, 'data-private', 'music');

const log = createLogger('ingest-music');

async function main() {
  log.info('Music ingest starting...');

  // Ensure output directory
  await fs.mkdir(MUSIC_DIR, { recursive: true });

  const manifest = {
    ingestedAt: new Date().toISOString(),
    sources: {},
  };

  // ── Suno ──
  try {
    const sunoTracks = await fetchSunoTracks();

    // Sort for determinism
    sunoTracks.sort((a, b) => a.sourceId.localeCompare(b.sourceId));

    await fs.writeFile(
      path.join(MUSIC_DIR, 'suno-snapshot.json'),
      JSON.stringify(sunoTracks, null, 2) + '\n',
      'utf8'
    );

    manifest.sources.suno = {
      status: sunoTracks.length > 0 ? 'success' : 'empty',
      trackCount: sunoTracks.length,
    };

    log.info(`Suno: wrote ${sunoTracks.length} tracks to snapshot`);
  } catch (err) {
    log.error(`Suno ingest failed: ${err.message}`);
    manifest.sources.suno = { status: 'error', error: err.message };
  }

  // ── SoundCloud ──
  try {
    const scTracks = await fetchSoundCloudTracks();

    // Sort for determinism
    scTracks.sort((a, b) => a.sourceId.localeCompare(b.sourceId));

    await fs.writeFile(
      path.join(MUSIC_DIR, 'soundcloud-snapshot.json'),
      JSON.stringify(scTracks, null, 2) + '\n',
      'utf8'
    );

    manifest.sources.soundcloud = {
      status: scTracks.length > 0 ? 'success' : 'empty',
      trackCount: scTracks.length,
    };

    log.info(`SoundCloud: wrote ${scTracks.length} tracks to snapshot`);
  } catch (err) {
    log.error(`SoundCloud ingest failed: ${err.message}`);
    manifest.sources.soundcloud = { status: 'error', error: err.message };
  }

  // ── Write manifest ──
  await fs.writeFile(
    path.join(MUSIC_DIR, 'ingest-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );

  log.info('Music ingest complete');
  log.info(`Manifest: ${JSON.stringify(manifest.sources)}`);
}

main().catch(err => {
  log.error(`Ingest failed: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
