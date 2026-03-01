/**
 * Music snapshot parser.
 *
 * Reads normalized snapshots from data-private/music/ (produced by
 * the ingest:music command) and emits canonical constellation nodes
 * of type 'track'.
 *
 * This parser runs in the deterministic pipeline build. It only reads
 * local snapshot files — no live API calls.
 */

import fs from 'fs/promises';
import path from 'path';
import { createCanonicalNode } from '../schemas/canonical.mjs';
import { assignEpoch } from '../config/epochs.mjs';
import { createLogger } from '../utils/logger.mjs';

const log = createLogger('music');

/**
 * Parse a date string from music APIs to YYYY-MM-DD.
 * Handles ISO timestamps and various date formats.
 *
 * @param {string} dateStr - Raw date from API
 * @returns {string|null} ISO date "YYYY-MM-DD" or null
 */
function parseTrackDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    if (year < 2000 || year > 2030) return null;
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${m}-${day}`;
  } catch {
    return null;
  }
}

/**
 * Read and parse a snapshot JSON file. Returns empty array if missing.
 *
 * @param {string} filePath - Absolute path to snapshot JSON
 * @returns {Promise<Object[]>} Parsed track array
 */
async function readSnapshot(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Parse music snapshots from data-private/music/ into canonical nodes.
 *
 * @param {string} musicDir - Path to data-private/music/ directory
 * @returns {Promise<{nodes: Object[], stats: Object}>}
 */
export async function parseMusic(musicDir) {
  const stats = {
    suno: 0,
    soundcloud: 0,
    total: 0,
    skipped: 0,
    warnings: [],
  };

  // Check if directory exists
  try {
    await fs.access(musicDir);
  } catch {
    log.warn(`Music directory not found: ${musicDir}`);
    stats.warnings.push('Music directory not found');
    return { nodes: [], stats };
  }

  const nodes = [];
  const seenSourceIds = new Set();
  let globalIndex = 0;

  // ── Read snapshots ──
  const sunoTracks = await readSnapshot(path.join(musicDir, 'suno-snapshot.json'));
  const scTracks = await readSnapshot(path.join(musicDir, 'soundcloud-snapshot.json'));

  log.info(`Found snapshots: Suno=${sunoTracks.length}, SoundCloud=${scTracks.length}`);

  // ── Process all tracks ──
  const allTracks = [
    ...sunoTracks.map(t => ({ ...t, _source: 'suno' })),
    ...scTracks.map(t => ({ ...t, _source: 'soundcloud' })),
  ];

  // Sort by date for deterministic ordering
  allTracks.sort((a, b) => {
    const da = a.createdAt || '';
    const db = b.createdAt || '';
    return da.localeCompare(db);
  });

  for (const track of allTracks) {
    const date = parseTrackDate(track.createdAt);
    if (!date) {
      log.warn(`Track "${track.title}" has no parseable date, skipping`);
      stats.skipped++;
      continue;
    }

    // Deduplication by source+sourceId
    const dedupKey = `${track.source}-${track.sourceId}`;
    if (seenSourceIds.has(dedupKey)) {
      stats.skipped++;
      continue;
    }
    seenSourceIds.add(dedupKey);

    globalIndex++;
    const paddedIndex = String(globalIndex).padStart(3, '0');
    const prefix = track._source === 'suno' ? 'sn' : 'sc';
    const id = `${prefix}-${paddedIndex}`;

    const node = createCanonicalNode({
      id,
      type: 'track',
      title: track.title || 'Untitled Track',
      date,
      epoch: assignEpoch(date),
      description: track.description || '',
      media: track.imageUrl ? [track.imageUrl] : [],
      size: 1.0,
      isHub: false,
      source: track._source,
      sourceId: track.sourceId,
      visibility: 'public',
      factuality: 'factual',
      status: 'published',
      confidence: 1.0,
      sourceMeta: {
        source: track._source,
        sourceItemId: track.sourceId,
        sourceUrl: track.audioUrl || '',
        connectorVersion: '1.0',
      },
      entities: {
        tags: track.tags || [],
        ...(track.genre ? { tags: [...(track.tags || []), track.genre.toLowerCase()] } : {}),
      },
    });

    if (node) {
      nodes.push(node);
      if (track._source === 'suno') stats.suno++;
      else stats.soundcloud++;
    } else {
      stats.skipped++;
    }
  }

  stats.total = stats.suno + stats.soundcloud;

  log.info(
    `Parse complete: ${stats.total} tracks (Suno: ${stats.suno}, SoundCloud: ${stats.soundcloud}), ${stats.skipped} skipped`
  );

  return { nodes, stats };
}
