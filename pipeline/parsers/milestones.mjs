/**
 * Manual milestones parser.
 *
 * Reads hand-crafted life milestones from a JSON file for events not
 * captured in social media exports. These are spine-defining moments
 * that MUST appear on the helix regardless of automated scoring.
 *
 * Graceful: returns empty results when milestones file doesn't exist.
 */

import fs from 'fs/promises';
import path from 'path';
import { createCanonicalNode } from '../schemas/canonical.mjs';
import { assignEpoch } from '../config/epochs.mjs';
import { createLogger } from '../utils/logger.mjs';

const log = createLogger('milestones');

/**
 * Parse manual milestones JSON file into canonical constellation nodes.
 *
 * @param {string} milestonesDir - Path to milestones directory
 * @returns {Promise<{nodes: Object[], stats: Object}>}
 */
export async function parseMilestones(milestonesDir) {
  const stats = {
    total: 0,
    parsed: 0,
    skipped: 0,
  };

  const filePath = path.join(milestonesDir, 'milestones.json');

  // Graceful return when file doesn't exist
  try {
    await fs.access(filePath);
  } catch {
    log.info(`Milestones file not found: ${filePath} — skipping`);
    return { nodes: [], stats };
  }

  let data;
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    log.warn(`Failed to parse milestones: ${err.message}`);
    return { nodes: [], stats };
  }

  const milestones = data.milestones || [];
  stats.total = milestones.length;

  const nodes = [];

  for (const ms of milestones) {
    if (!ms.id || !ms.date) {
      log.warn(`Skipping milestone without id or date: ${JSON.stringify(ms).slice(0, 80)}`);
      stats.skipped++;
      continue;
    }

    const node = createCanonicalNode({
      id: ms.id,
      type: ms.type || 'milestone',
      title: ms.title || '',
      date: ms.date,
      epoch: assignEpoch(ms.date),
      description: ms.description || '',
      media: ms.media || [],
      source: 'manual',
      sourceId: ms.id,
      visibility: 'public', // Manual milestones are always public
      significance: ms.significance || 0.85,
      entities: {
        people: ms.people || [],
        places: ms.places || [],
        tags: ms.tags || [],
        clients: [],
        projects: [],
      },
      sourceMeta: {
        authorship: 'authored',
        isOwned: true,
        reshareReason: null,
      },
    });

    if (node) {
      // Pre-set tier to helix — manual milestones always go on spine
      node.tier = 'helix';
      nodes.push(node);
      stats.parsed++;
    } else {
      stats.skipped++;
    }
  }

  log.info(`Milestones: ${stats.parsed} parsed, ${stats.skipped} skipped`);

  return { nodes, stats };
}
