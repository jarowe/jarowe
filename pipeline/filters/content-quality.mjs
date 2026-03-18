/**
 * Content quality filter — removes low-quality/junk nodes from the constellation.
 *
 * Detection rules (each returns { drop, reason }):
 *   birthday-spam  — birthday wall posts with tiny captions and few media
 *   thin-node      — no media AND description < 15 chars
 *   profile-update — "updated a photo" / "changed cover" with no real text
 *   wall-post      — others posting on your wall (isOwned === false)
 *   empty-share    — "shared a link/photo/post" with no real text
 *
 * Protected from dropping:
 *   - Nodes in curation.json significance_overrides
 *   - Nodes with type 'milestone' or 'project'
 *   - Nodes from 'manual' source
 */

import { createLogger } from '../utils/logger.mjs';

const log = createLogger('content-quality');

// ─── Detection rules ──────────────────────────────────────────────────

function checkBirthdaySpam(node) {
  const text = `${node.title || ''} ${node.description || ''}`.toLowerCase();
  if (!/birthday|bday|belated|hbd/i.test(text)) return { drop: false };
  const captionLen = (node.description || '').length;
  const mediaCount = (node.media || []).length;
  if (captionLen < 50 && mediaCount < 2) {
    return { drop: true, reason: 'birthday-spam' };
  }
  return { drop: false };
}

function checkThinNode(node) {
  const mediaCount = (node.media || []).length;
  const descLen = (node.description || '').length;
  if (mediaCount === 0 && descLen < 15) {
    return { drop: true, reason: 'thin-node' };
  }
  return { drop: false };
}

function checkProfileUpdate(node) {
  const title = node.title || '';
  if (/^(updated|changed|added|uploaded|shared)\s+(a\s+|an\s+|\d+\s+)?photo(s)?$/i.test(title)) {
    const descLen = (node.description || '').length;
    if (descLen < 15) {
      return { drop: true, reason: 'profile-update' };
    }
  }
  return { drop: false };
}

function checkWallPost(node) {
  if (node.sourceMeta?.isOwned === false) {
    return { drop: true, reason: 'wall-post' };
  }
  return { drop: false };
}

function checkEmptyShare(node) {
  const title = node.title || '';
  if (/^shared (a link|a photo|a post)$/i.test(title)) {
    const descLen = (node.description || '').length;
    if (descLen < 15) {
      return { drop: true, reason: 'empty-share' };
    }
  }
  return { drop: false };
}

function checkGenericTitle(node) {
  const title = (node.title || '').trim();
  const descLen = (node.description || '').length;
  if (/^(Mobile uploads?|Click for video:?|Photos?)$/i.test(title) && descLen < 20) {
    return { drop: true, reason: 'generic-title' };
  }
  return { drop: false };
}

function checkTitleIsDescription(node) {
  const title = (node.title || '').trim();
  const desc = (node.description || '').trim();
  if (
    title && desc &&
    title === desc &&
    title.length < 30 &&
    (node.media || []).length === 0
  ) {
    return { drop: true, reason: 'title-is-description' };
  }
  return { drop: false };
}

function checkSensitiveContent(node) {
  const text = `${node.title || ''} ${node.description || ''}`;
  // Patterns that indicate prank/hijacked posts or inappropriate content
  if (/\bTHANKFUL FOR DRUGS\b/i.test(text)) {
    return { drop: true, reason: 'sensitive-content' };
  }
  if (/\bteabag\b/i.test(text) && (node.description || '').length < 30) {
    return { drop: true, reason: 'sensitive-content' };
  }
  // Gibberish: 5+ consecutive uppercase chars with no real words
  if (/[A-Z]{5,}.*[A-Z]{5,}/.test(text) && !/\b[a-z]{3,}\b/.test(text)) {
    return { drop: true, reason: 'gibberish' };
  }
  // Repeated parser artifacts
  if (/^(Photos){2,}$/i.test((node.title || '').trim())) {
    return { drop: true, reason: 'parser-artifact' };
  }
  return { drop: false };
}

function checkDuplicate(node, seenTitles) {
  const title = (node.title || '').trim();
  const key = `${node.date}|${title}`;
  if (title.length > 5 && seenTitles.has(key)) {
    return { drop: true, reason: 'duplicate' };
  }
  seenTitles.add(key);
  return { drop: false };
}

const RULES = [
  checkBirthdaySpam,
  checkThinNode,
  checkProfileUpdate,
  checkWallPost,
  checkEmptyShare,
  checkGenericTitle,
  checkTitleIsDescription,
  checkSensitiveContent,
];

/**
 * Filter low-quality nodes from the constellation.
 *
 * @param {Object[]} nodes - Array of canonical nodes
 * @param {Set<string>} protectedIds - Node IDs that must never be dropped
 * @returns {{ kept: Object[], dropped: Object[], stats: Object }}
 */
export function filterLowQualityNodes(nodes, protectedIds = new Set()) {
  const kept = [];
  const dropped = [];
  const stats = {
    total: nodes.length,
    kept: 0,
    dropped: 0,
    byReason: {},
  };

  const seenTitles = new Set();

  for (const node of nodes) {
    // Never drop protected nodes
    if (protectedIds.has(node.id)) {
      kept.push(node);
      stats.kept++;
      continue;
    }

    // Never drop milestones, projects, or manual-source nodes
    if (node.type === 'milestone' || node.type === 'project' || node.source === 'manual') {
      kept.push(node);
      stats.kept++;
      continue;
    }

    // Check duplicate (uses shared state, runs before standard rules)
    const dupResult = checkDuplicate(node, seenTitles);
    if (dupResult.drop) {
      dropped.push(node);
      stats.dropped++;
      stats.byReason[dupResult.reason] = (stats.byReason[dupResult.reason] || 0) + 1;
      continue;
    }

    // Run rules — first match wins
    let isDrop = false;
    for (const rule of RULES) {
      const result = rule(node);
      if (result.drop) {
        dropped.push(node);
        stats.dropped++;
        stats.byReason[result.reason] = (stats.byReason[result.reason] || 0) + 1;
        isDrop = true;
        break;
      }
    }

    if (!isDrop) {
      kept.push(node);
      stats.kept++;
    }
  }

  log.info(
    `Content quality filter: ${stats.dropped} dropped, ${stats.kept} kept ` +
    `(${Object.entries(stats.byReason).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'})`
  );

  return { kept, dropped, stats };
}
