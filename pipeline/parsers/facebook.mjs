/**
 * Facebook HTML export parser (scaffold).
 *
 * Parses Meta "Download Your Information" HTML export files into
 * canonical constellation nodes. Handles timeline posts, photos/videos,
 * and life events from the Facebook export ZIP structure.
 *
 * Currently a scaffold — returns empty results gracefully when
 * the facebook export directory doesn't exist. Actual HTML parsing
 * will be implemented when export data is available.
 *
 * Won't parse: messages, comments, marketplace items.
 */

import fs from 'fs/promises';
import path from 'path';
import { createCanonicalNode } from '../schemas/canonical.mjs';
import { createLogger } from '../utils/logger.mjs';

const log = createLogger('facebook');

/**
 * Parse Facebook HTML export directory into canonical constellation nodes.
 *
 * @param {string} exportDir - Path to Facebook export root directory
 * @param {Object} options - Parser options
 * @returns {Promise<{nodes: Object[], stats: Object}>} Parsed nodes and stats
 */
export async function parseFacebook(exportDir, options = {}) {
  const stats = {
    total: 0,
    parsed: 0,
    skipped: 0,
    files: 0,
    warnings: [],
  };

  // Graceful return when export directory doesn't exist
  try {
    await fs.access(exportDir);
  } catch {
    log.info(`Facebook export directory not found: ${exportDir} — skipping`);
    return { nodes: [], stats };
  }

  // TODO: Implement Facebook HTML export parsing when data is available
  // Expected structure:
  //   posts/your_posts_*.html  — Timeline posts
  //   photos_and_videos/       — Photos and videos
  //   profile_information/     — Life events
  //
  // Node IDs: fb-001, fb-002, ... (zero-padded 3 digits)
  // Source: 'facebook'
  //
  // Will NOT parse:
  //   messages/    — Private conversations
  //   comments/    — Comments on others' posts
  //   marketplace/ — Marketplace listings

  log.info('Facebook parser scaffold — no parsing implemented yet');

  return { nodes: [], stats };
}
