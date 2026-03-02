/**
 * Signal weight constants and calculation functions for evidence-based edges.
 *
 * V2 MEANING ENGINE — generates rich, story-driven connections.
 *
 * Signal categories:
 *   - Temporal: same-day, temporal-proximity, seasonal-echo
 *   - Semantic: shared-project, shared-entity, shared-tags, shared-client
 *   - Spatial: shared-place
 *   - Thematic: shared-motif (powered by motif extraction engine)
 *   - Narrative: cross-source-echo, narrative-arc, life-chapter
 *
 * Descriptions are narrative ("The thread of family...") not mechanical ("23 days apart").
 */

import { differenceInDays, format as formatDate } from 'date-fns';

// ---------------------------------------------------------------------------
// Signal Weight Table
// ---------------------------------------------------------------------------

export const SIGNAL_WEIGHTS = Object.freeze({
  // Core signals (original, LOCKED)
  'same-day':            0.8,
  'shared-project':      0.7,
  'shared-entity':       0.6,
  'shared-tags':         0.4,
  'temporal-proximity':  0.3,
  'shared-place':        0.25,
  'shared-client':       0.35,

  // Thematic signals (V2 meaning engine)
  'shared-motif':        0.5,    // Two nodes share thematic motifs
  'cross-source-echo':   0.6,    // Same motif bridges Instagram ↔ Carbonmade
  'narrative-arc':       0.55,   // Temporal + thematic = story evolution
  'life-chapter':        0.2,    // Same epoch (same phase of life)
  'seasonal-echo':       0.15,   // Same month, different year
});

/** Minimum total signal weight to create an edge. */
export const EDGE_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// Narrative Description Templates
// ---------------------------------------------------------------------------

const MOTIF_NARRATIVES = {
  family: [
    'The thread of family weaves through both',
    'United by the heartbeat of family',
    'Family ties binding these moments',
  ],
  love: [
    'Both shine with love and devotion',
    'The warmth of love connects these moments',
    'Hearts intertwined across time',
  ],
  travel: [
    'Fellow chapters in the story of exploration',
    'The spirit of discovery connects these moments',
    'Wanderlust woven through both',
  ],
  craft: [
    'Both expressions of creative vision',
    'The creative fire burns in both',
    'Craft and vision linking these works',
  ],
  fatherhood: [
    'The journey of fatherhood runs through both',
    'A father\'s love connecting these moments',
    'Fatherhood: the constant thread',
  ],
  nature: [
    'Nature\'s beauty captured in both',
    'Connected by the awe of the natural world',
    'The earth and sky unite these moments',
  ],
  reflection: [
    'Both born from deep reflection',
    'Meaning and purpose thread through each',
    'Moments of clarity, connected',
  ],
  nostalgia: [
    'Memory bridges these moments across time',
    'The past echoing into the present',
    'Heritage and memory intertwining',
  ],
  celebration: [
    'Both mark moments worth celebrating',
    'Joy and celebration connect these',
    'Life\'s milestones, linked',
  ],
  food: [
    'The joy of food and culture unite these',
    'Shared love of flavor and gathering',
    'Nourishment of body and soul in both',
  ],
  friendship: [
    'The bonds of friendship shine in both',
    'Connected by the people who matter',
    'Community and connection link these',
  ],
  career: [
    'Chapters in the same professional journey',
    'The arc of a career connecting these',
    'Professional growth threading through both',
  ],
  adventure: [
    'Both sparked by the thrill of adventure',
    'The rush of living fully connects these',
    'Adventure binds these moments',
  ],
  growth: [
    'Both milestones on the path of growth',
    'Evolution and progress linking these moments',
    'The journey of becoming connects these',
  ],
  home: [
    'Both rooted in the feeling of home',
    'Home and belonging unite these',
    'The warmth of home in both',
  ],
  faith: [
    'Gratitude and spirit connect these moments',
    'Both touched by grace',
    'Faith and thankfulness thread through each',
  ],
  greece: [
    'Both chapters of the Greek odyssey',
    'The Aegean connects these moments',
    'Greece: the backdrop to both stories',
  ],
  music: [
    'Music threads through both moments',
    'Connected by rhythm and sound',
    'The soundtrack of life linking these',
  ],
};

const CROSS_SOURCE_NARRATIVES = {
  family: 'Where professional craft meets family heart',
  love: 'Love: the force behind the work and the life',
  travel: 'The journey from portfolio to passport',
  craft: 'Creative vision flowing between work and life',
  fatherhood: 'A father\'s perspective shaping both art and life',
  nature: 'Nature inspiring both the art and the artist',
  reflection: 'Deep thought bridging the professional and personal',
  career: 'The professional thread connecting portfolio to life',
  growth: 'Growth visible across both life and career',
  adventure: 'The thrill of adventure in work and play',
  greece: 'The Greek chapter echoing across life and work',
  celebration: 'Celebration bridging the personal and creative',
  food: 'Culinary adventures connecting life and work',
  friendship: 'The people who span both worlds',
  nostalgia: 'Memory and heritage informing both past and present',
  home: 'The sense of belonging woven through everything',
  faith: 'Gratitude connecting the maker and the man',
  music: 'Music bridging the creative and the personal',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Case-insensitive array intersection.
 */
function intersect(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
    return [];
  }
  const setB = new Set(b.map(s => String(s).toLowerCase()));
  const result = [];
  const seen = new Set();
  for (const item of a) {
    const lower = String(item).toLowerCase();
    if (setB.has(lower) && !seen.has(lower)) {
      seen.add(lower);
      result.push(item);
    }
  }
  return result;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

/** Deterministic pick from array using a seed string. */
function seededPick(arr, seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return arr[Math.abs(hash) % arr.length];
}

/** Format a date string into a readable form. */
function readableDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return formatDate(d, 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

/** Get month name from a date string. */
function getMonth(dateStr) {
  try {
    return formatDate(new Date(dateStr), 'MMMM');
  } catch {
    return null;
  }
}

/** Get season from a month number (0-indexed). */
function getSeason(month) {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

// ---------------------------------------------------------------------------
// Signal Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate all applicable signals between two nodes.
 *
 * V2: Includes thematic motif signals, cross-source narrative arcs,
 * seasonal echoes, and rich narrative descriptions.
 *
 * Requires nodes to have `_motifs` array (populated by motif extraction step).
 *
 * @param {Object} nodeA - First canonical node (with _motifs)
 * @param {Object} nodeB - Second canonical node (with _motifs)
 * @returns {Array<{type: string, signal: string, description: string, weight: number}>}
 */
export function calculateSignals(nodeA, nodeB) {
  const signals = [];
  const entA = nodeA.entities || {};
  const entB = nodeB.entities || {};
  const seed = `${nodeA.id}:${nodeB.id}`; // deterministic seed for narrative picks

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPORAL SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════

  // ---- same-day ----
  if (nodeA.date && nodeB.date && nodeA.date === nodeB.date) {
    const readable = readableDate(nodeA.date);
    signals.push({
      type: 'temporal',
      signal: 'same-day',
      description: `Twin stars from the same day: ${readable}`,
      weight: SIGNAL_WEIGHTS['same-day'],
    });
  }

  // ---- temporal-proximity (within 30 days) ----
  const dateA = parseDate(nodeA.date);
  const dateB = parseDate(nodeB.date);
  if (dateA && dateB) {
    const daysBetween = Math.abs(differenceInDays(dateA, dateB));

    if (daysBetween > 0 && daysBetween <= 30) {
      const desc = daysBetween <= 7
        ? `Captured within the same week of life`
        : daysBetween <= 14
          ? `Both from the same fortnight`
          : `Kindred moments, ${daysBetween} days apart`;
      signals.push({
        type: 'temporal',
        signal: 'temporal-proximity',
        description: desc,
        weight: SIGNAL_WEIGHTS['temporal-proximity'],
      });
    }

    // ---- seasonal-echo (same month, different year) ----
    if (dateA.getMonth() === dateB.getMonth() &&
        dateA.getFullYear() !== dateB.getFullYear() &&
        daysBetween > 60) {
      const monthName = getMonth(nodeA.date);
      const yearA = dateA.getFullYear();
      const yearB = dateB.getFullYear();
      signals.push({
        type: 'temporal',
        signal: 'seasonal-echo',
        description: `An echo across time: both captured in ${monthName} (${Math.min(yearA, yearB)} & ${Math.max(yearA, yearB)})`,
        weight: SIGNAL_WEIGHTS['seasonal-echo'],
      });
    }
  }

  // ---- life-chapter (same epoch) ----
  if (nodeA.epoch && nodeB.epoch && nodeA.epoch === nodeB.epoch &&
      nodeA.date !== nodeB.date) {
    signals.push({
      type: 'temporal',
      signal: 'life-chapter',
      description: `Both woven into the ${nodeA.epoch} chapter`,
      weight: SIGNAL_WEIGHTS['life-chapter'],
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC SIGNALS (original)
  // ═══════════════════════════════════════════════════════════════════════════

  // ---- shared-project ----
  const sharedProjects = intersect(entA.projects || [], entB.projects || []);
  if (sharedProjects.length > 0) {
    signals.push({
      type: 'semantic',
      signal: 'shared-project',
      description: `Both part of the ${sharedProjects.join(' & ')} story`,
      weight: SIGNAL_WEIGHTS['shared-project'],
    });
  }

  // ---- shared-entity (people) ----
  const sharedPeople = intersect(entA.people || [], entB.people || []);
  // Filter out generic "Friend" label from shared people
  const meaningfulPeople = sharedPeople.filter(p => p !== 'Friend');
  if (meaningfulPeople.length > 0) {
    signals.push({
      type: 'semantic',
      signal: 'shared-entity',
      description: `United by ${meaningfulPeople.join(' & ')} in both stories`,
      weight: SIGNAL_WEIGHTS['shared-entity'],
    });
  }

  // ---- shared-tags ----
  const sharedTags = intersect(entA.tags || [], entB.tags || []);
  if (sharedTags.length > 0) {
    signals.push({
      type: 'semantic',
      signal: 'shared-tags',
      description: `Both carry the spirit of #${sharedTags.join(' #')}`,
      weight: SIGNAL_WEIGHTS['shared-tags'],
    });
  }

  // ---- shared-client ----
  const sharedClients = intersect(entA.clients || [], entB.clients || []);
  if (sharedClients.length > 0) {
    signals.push({
      type: 'semantic',
      signal: 'shared-client',
      description: `Both forged in partnership with ${sharedClients.join(' & ')}`,
      weight: SIGNAL_WEIGHTS['shared-client'],
    });
  }

  // ---- shared-place ----
  const sharedPlaces = intersect(entA.places || [], entB.places || []);
  if (sharedPlaces.length > 0) {
    signals.push({
      type: 'spatial',
      signal: 'shared-place',
      description: `Both rooted in ${sharedPlaces.join(' & ')}`,
      weight: SIGNAL_WEIGHTS['shared-place'],
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THEMATIC SIGNALS (V2 meaning engine)
  // ═══════════════════════════════════════════════════════════════════════════

  const motifsA = nodeA._motifs || [];
  const motifsB = nodeB._motifs || [];
  const motifIdsA = new Set(motifsA.map(m => m.id));
  const motifIdsB = new Set(motifsB.map(m => m.id));
  const sharedMotifIds = [...motifIdsA].filter(id => motifIdsB.has(id));

  if (sharedMotifIds.length > 0) {
    // Pick the strongest shared motif (highest combined score)
    const bestMotif = sharedMotifIds
      .map(id => ({
        id,
        combinedScore: (motifsA.find(m => m.id === id)?.score || 0) +
                        (motifsB.find(m => m.id === id)?.score || 0),
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)[0];

    // ---- shared-motif ----
    const narratives = MOTIF_NARRATIVES[bestMotif.id] || [`Both share the spirit of ${bestMotif.id}`];
    const desc = seededPick(narratives, seed);

    // Weight scales with number of shared motifs (0.5 base + 0.08 per extra, max 0.8)
    const motifWeight = Math.min(
      SIGNAL_WEIGHTS['shared-motif'] + (sharedMotifIds.length - 1) * 0.08,
      0.8
    );

    signals.push({
      type: 'thematic',
      signal: 'shared-motif',
      description: desc,
      weight: Number(motifWeight.toFixed(2)),
    });

    // ---- cross-source-echo (different sources share motif) ----
    if (nodeA.source !== nodeB.source) {
      const crossNarrative = CROSS_SOURCE_NARRATIVES[bestMotif.id] ||
        `The same theme echoing across ${nodeA.source} and ${nodeB.source}`;

      signals.push({
        type: 'narrative',
        signal: 'cross-source-echo',
        description: crossNarrative,
        weight: SIGNAL_WEIGHTS['cross-source-echo'],
      });
    }

    // ---- narrative-arc (temporal distance + shared motif = story evolution) ----
    if (dateA && dateB) {
      const daysBetweenArc = Math.abs(differenceInDays(dateA, dateB));
      if (daysBetweenArc > 90) {
        const earlierDate = dateA < dateB ? nodeA.date : nodeB.date;
        const laterDate = dateA < dateB ? nodeB.date : nodeA.date;
        const yearSpan = Math.abs(dateA.getFullYear() - dateB.getFullYear());
        const motifLabel = (MOTIF_NARRATIVES[bestMotif.id] || [])[0]
          ? bestMotif.id
          : 'this theme';

        let arcDesc;
        if (yearSpan >= 2) {
          arcDesc = `A ${motifLabel} story arc spanning ${yearSpan} years`;
        } else {
          arcDesc = `The evolution of ${motifLabel}: from ${readableDate(earlierDate)} to ${readableDate(laterDate)}`;
        }

        signals.push({
          type: 'narrative',
          signal: 'narrative-arc',
          description: arcDesc,
          weight: SIGNAL_WEIGHTS['narrative-arc'],
        });
      }
    }
  }

  return signals;
}
