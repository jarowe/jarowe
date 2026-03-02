/**
 * Multi-dimensional significance scoring engine.
 *
 * Computes a 0-1 significance score for each node based on content richness,
 * social signals, type weight, motif density, hub status, media presence,
 * and temporal salience. The score drives visual encoding (sphere size and
 * brightness) in the constellation frontend.
 */

import { createLogger } from '../utils/logger.mjs';

const log = createLogger('significance');

// ─── Dimension weights (must sum to 1.0) ────────────────────────────────
const WEIGHTS = {
  contentRichness: 0.25,
  socialSignal:    0.15,
  typeWeight:      0.15,
  motifDensity:    0.20,
  hubStatus:       0.10,
  mediaPresence:   0.10,
  temporalSalience: 0.05,
};

// ─── Type weight lookup ─────────────────────────────────────────────────
const TYPE_WEIGHTS = {
  milestone: 1.0,
  project:   0.7,
  idea:      0.4,
  moment:    0.3,
  person:    0.5,
  place:     0.4,
  track:     0.5,
};

/**
 * Clamp a value between min and max.
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Normalize a value to 0-1 range given min/max bounds.
 */
function normalize(val, min, max) {
  if (max <= min) return 0;
  return clamp((val - min) / (max - min), 0, 1);
}

/**
 * Score a single node across all dimensions.
 *
 * @param {Object} node - Canonical node
 * @param {Object} context - Scoring context (dateRange, etc.)
 * @returns {Object} Individual dimension scores (each 0-1)
 */
export function scoreNode(node, context = {}) {
  const scores = {};

  // ── Content richness (word count, media count, hashtag count) ──
  const wordCount = (node.description || '').split(/\s+/).filter(Boolean).length;
  const mediaCount = (node.media || []).length;
  const tagCount = (node.entities?.tags || []).length;
  const wordScore = normalize(wordCount, 0, 200);
  const mediaScore = normalize(mediaCount, 0, 5);
  const tagScore = normalize(tagCount, 0, 10);
  scores.contentRichness = wordScore * 0.5 + mediaScore * 0.3 + tagScore * 0.2;

  // ── Social signal (tagged people count) ──
  const peopleCount = (node.entities?.people || []).length;
  const meaningfulPeople = (node.entities?.people || []).filter(p => p !== 'Friend').length;
  scores.socialSignal = normalize(peopleCount, 0, 5) * 0.6 + normalize(meaningfulPeople, 0, 3) * 0.4;

  // ── Type weight ──
  scores.typeWeight = TYPE_WEIGHTS[node.type] || 0.3;

  // ── Motif density ──
  const motifCount = (node._motifs || []).length;
  scores.motifDensity = normalize(motifCount, 0, 5);

  // ── Hub status ──
  scores.hubStatus = node.isHub ? 1.0 : 0.0;

  // ── Media presence ──
  if (mediaCount === 0) {
    scores.mediaPresence = 0.0;
  } else {
    let mediaScore2 = 0.5; // base for having any media
    // Video bonus
    const hasVideo = (node.media || []).some(m =>
      /\.(mp4|webm|mov|m4v|avi)$/i.test(m)
    );
    if (hasVideo) mediaScore2 += 0.3;
    // 3+ images = max
    if (mediaCount >= 3) mediaScore2 = 1.0;
    scores.mediaPresence = clamp(mediaScore2, 0, 1);
  }

  // ── Temporal salience (linear decay: newest=1.0, oldest=0.0) ──
  if (context.minDate && context.maxDate && node.date) {
    const nodeTime = new Date(node.date).getTime();
    const minTime = context.minDate.getTime();
    const maxTime = context.maxDate.getTime();
    if (maxTime > minTime) {
      scores.temporalSalience = (nodeTime - minTime) / (maxTime - minTime);
    } else {
      scores.temporalSalience = 0.5;
    }
  } else {
    scores.temporalSalience = 0.5;
  }

  return scores;
}

/**
 * Compute weighted significance from dimension scores.
 *
 * @param {Object} node - Canonical node
 * @param {Object} context - Scoring context
 * @returns {number} Significance score 0-1, rounded to 2dp
 */
export function computeSignificance(node, context = {}) {
  const scores = scoreNode(node, context);

  let total = 0;
  for (const [dim, weight] of Object.entries(WEIGHTS)) {
    total += (scores[dim] || 0) * weight;
  }

  // Authorship penalties
  const authorship = node.sourceMeta?.authorship;
  if (authorship === 'reshared' || node.sourceMeta?.isOwned === false) {
    total = Math.min(total, 0.15);
  } else if (authorship === 'tagged_external') {
    total = Math.min(total, 0.25);
  }

  return Number(clamp(total, 0, 1).toFixed(2));
}

/**
 * Compute node display size from significance score.
 * Single source of truth — used by all size assignment points.
 * @param {number} sig - Significance score 0-1
 * @returns {number} Size value rounded to 2dp
 */
export function sizeFromSignificance(sig) {
  return Number(((0.4 + sig * 1.4) * 1.35).toFixed(2));
}

/**
 * Batch compute significance for all nodes.
 * Sets `node.significance` and `node.size` on each node.
 *
 * @param {Object[]} nodes - Array of canonical nodes
 * @returns {Object} Stats about the distribution
 */
export function computeAllSignificance(nodes) {
  if (nodes.length === 0) {
    log.info('No nodes to score');
    return { mean: 0, median: 0, min: 0, max: 0, q1: 0, q3: 0 };
  }

  // Build context: date range for temporal salience
  const dates = nodes
    .map(n => n.date ? new Date(n.date) : null)
    .filter(d => d && !isNaN(d.getTime()));

  const context = {};
  if (dates.length >= 2) {
    dates.sort((a, b) => a.getTime() - b.getTime());
    context.minDate = dates[0];
    context.maxDate = dates[dates.length - 1];
  }

  // Score all nodes
  for (const node of nodes) {
    node.significance = computeSignificance(node, context);
    node.size = sizeFromSignificance(node.significance);
  }

  // Compute distribution stats
  const sigs = nodes.map(n => n.significance).sort((a, b) => a - b);
  const mean = sigs.reduce((a, b) => a + b, 0) / sigs.length;
  const median = sigs[Math.floor(sigs.length / 2)];
  const q1 = sigs[Math.floor(sigs.length * 0.25)];
  const q3 = sigs[Math.floor(sigs.length * 0.75)];
  const min = sigs[0];
  const max = sigs[sigs.length - 1];

  log.info(
    `Significance scored ${nodes.length} nodes: ` +
    `mean=${mean.toFixed(2)}, median=${median.toFixed(2)}, ` +
    `range=[${min.toFixed(2)}, ${max.toFixed(2)}], ` +
    `Q1=${q1.toFixed(2)}, Q3=${q3.toFixed(2)}`
  );

  return { mean, median, min, max, q1, q3 };
}
