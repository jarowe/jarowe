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
  'shared-entity':       0.8,    // Shared people = strongest real signal
  'shared-tags':         0.4,
  'temporal-proximity':  0.15,   // V2: reduced — proximity alone is weak evidence
  'shared-place':        0.45,   // V2: increased — meaningful place overlap matters
  'shared-client':       0.35,

  // Thematic signals (V2 meaning engine)
  'shared-motif':        0.5,    // Two nodes share thematic motifs (generic motifs reduced at emit time)
  'cross-source-echo':   0.6,    // Same motif bridges Instagram ↔ Carbonmade (generic reduced at emit time)
  'narrative-arc':       0.55,   // Temporal + thematic = story evolution
  'life-chapter':        0.05,   // V2: near-zero — same epoch alone is not a real connection
  'seasonal-echo':       0.05,   // V2: near-zero — same month different year is very weak

  // Identity signals (V3 identity engine)
  'shared-identity':     0.95,   // V2: gold standard — resolved canonical person in both nodes
});

/** Minimum total signal weight to create an edge. */
export const EDGE_THRESHOLD = 0.55;

// ---------------------------------------------------------------------------
// Narrative Description Templates
// ---------------------------------------------------------------------------

const MOTIF_NARRATIVES = {
  family: [
    'The thread of family weaves through both',
    'United by the heartbeat of family',
    'Family ties binding these moments',
    'The Rowe family story continues in both',
  ],
  love: [
    'Both shine with love and devotion',
    'The warmth of love connects these moments',
    'Hearts intertwined across time',
    'A love story told in two chapters',
  ],
  travel: [
    'Fellow chapters in the story of exploration',
    'The spirit of discovery connects these moments',
    'Wanderlust woven through both',
    'Two stops on the same journey around the world',
  ],
  craft: [
    'Both expressions of creative vision',
    'The creative fire burns in both',
    'Craft and vision linking these works',
    'The same creative DNA runs through both',
    'Two facets of the same artistic pursuit',
  ],
  fatherhood: [
    'The journey of fatherhood runs through both',
    'A father\'s love connecting these moments',
    'Watching his boys grow — the thread that connects',
    'The pride of a dad, captured twice',
    'Fatherhood shaped both of these moments',
  ],
  brotherhood: [
    'The bond between brothers connects these',
    'A brotherhood forged across decades',
    'Brothers in life and in creation',
    'Derek and Jared — the partnership echoes here',
  ],
  marriage: [
    'Maria — the constant through every chapter',
    'High school sweethearts, still writing the story',
    'The partnership that built everything connects these',
    'Two moments in a love story that keeps unfolding',
  ],
  childhood: [
    'Through the eyes of his boys, both moments shine',
    'Raising the next generation connects these',
    'The magic of childhood captured in both',
    'Kids being kids — the joy threading through',
  ],
  nature: [
    'Nature\'s beauty captured in both',
    'Connected by the awe of the natural world',
    'The earth and sky unite these moments',
    'Nature stopped them both in their tracks',
  ],
  reflection: [
    'Both born from deep reflection',
    'Meaning and purpose thread through each',
    'Moments of clarity, connected',
    'The same search for meaning echoes in both',
  ],
  nostalgia: [
    'Memory bridges these moments across time',
    'The past echoing into the present',
    'Heritage and memory intertwining',
    'Looking back to see the path forward',
  ],
  celebration: [
    'Both mark moments worth celebrating',
    'Joy and celebration connect these',
    'Life\'s milestones, linked',
  ],
  food: [
    'The joy of food and culture unite these',
    'Shared love of flavor and gathering',
    'Breaking bread connects these moments',
  ],
  friendship: [
    'The bonds of friendship shine in both',
    'Connected by the people who matter',
    'Community and connection link these',
    'The crew that shows up in both stories',
  ],
  career: [
    'Chapters in the same professional journey',
    'The arc of a career connecting these',
    'Professional growth threading through both',
    'The hustle that built the next chapter',
    'From one creative role to the next',
  ],
  adventure: [
    'Both sparked by the thrill of adventure',
    'The rush of living fully connects these',
    'Adventure binds these moments',
    'Say yes first, figure it out later',
  ],
  growth: [
    'Both milestones on the path of growth',
    'Evolution and progress linking these moments',
    'The journey of becoming connects these',
    'Each one pushed the boundary a little further',
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
    'Syros, Naxos, the islands — the backdrop to both',
    'The Greek chapter where everything changed',
    'Salt air and sunlight threading through both',
  ],
  music: [
    'Music threads through both moments',
    'Connected by rhythm and sound',
    'The soundtrack of life linking these',
  ],
  worldschooling: [
    'The world as classroom — both moments prove it',
    'Learning by living, captured twice',
    'Worldschooling shaped both of these experiences',
    'Education without walls connects these',
  ],
  filmmaking: [
    'The filmmaker\'s eye captured both',
    'From film school to now — the lens never stops',
    'Storytelling on screen connects these',
    'The camera was rolling for both moments',
  ],
  health: [
    'The transformation journey connects these',
    'Health and renewal threading through both',
    'The discipline that changed everything echoes here',
  ],
  technology: [
    'Innovation and technology bridge these moments',
    'The builder\'s mindset connects both',
    'Tech and creation linking these chapters',
    'Building what should exist — in both cases',
  ],
  entrepreneurship: [
    'The entrepreneur\'s spirit runs through both',
    'Building something from nothing, twice',
    'The same drive that built Doctrine echoes here',
    'Business and vision connecting these chapters',
  ],
};

const CROSS_SOURCE_NARRATIVES = {
  family: 'Where professional craft meets family heart',
  love: 'Love: the force behind the work and the life',
  travel: 'The journey from portfolio to passport',
  craft: 'Creative vision flowing between work and life',
  fatherhood: 'A father\'s perspective shaping both art and life',
  brotherhood: 'The Rowe brothers — partners in both work and life',
  marriage: 'Maria\'s influence bridging the personal and professional',
  childhood: 'The kids inspiring both the work and the living',
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
  worldschooling: 'The world classroom shaping both creativity and family',
  filmmaking: 'The filmmaker\'s eye — always on, in work and life',
  health: 'The transformation fueling both personal and professional growth',
  technology: 'Innovation driving the work forward and the life forward',
  entrepreneurship: 'The builder\'s instinct — same DNA in business and in life',
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
 * @param {Object} [identityMap] - Optional identity registry for enriched descriptions
 * @returns {Array<{type: string, signal: string, description: string, weight: number}>}
 */
export function calculateSignals(nodeA, nodeB, identityMap) {
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

  // ---- temporal-proximity (within 14 days) ----
  const dateA = parseDate(nodeA.date);
  const dateB = parseDate(nodeB.date);
  if (dateA && dateB) {
    const daysBetween = Math.abs(differenceInDays(dateA, dateB));

    if (daysBetween > 0 && daysBetween <= 14) {
      const desc = daysBetween <= 7
        ? `Captured within the same week of life`
        : `Both from the same fortnight`;
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

  // ---- shared-identity (resolved canonical people) ----
  if (meaningfulPeople.length > 0) {
    // Weight: 0.95 base + 0.15 per additional shared identity, capped at 1.5
    const identityWeight = Math.min(
      SIGNAL_WEIGHTS['shared-identity'] + (meaningfulPeople.length - 1) * 0.15,
      1.5
    );

    // Build description, enriched with relationship if identity map available
    let identityDesc;
    if (identityMap?.aliasIndex && meaningfulPeople.length === 1) {
      const resolved = identityMap.aliasIndex.get(meaningfulPeople[0].toLowerCase());
      if (resolved?.relationship && resolved.relationship !== 'self') {
        identityDesc = `${meaningfulPeople[0]} — ${resolved.relationship} — threads through both memories`;
      } else {
        identityDesc = `${meaningfulPeople[0]} present in both moments`;
      }
    } else {
      identityDesc = `${meaningfulPeople.join(' & ')} connect${meaningfulPeople.length === 1 ? 's' : ''} these memories`;
    }

    signals.push({
      type: 'identity',
      signal: 'shared-identity',
      description: identityDesc,
      weight: Number(identityWeight.toFixed(2)),
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
  // Filter out overly generic places (countries alone are too broad to be meaningful)
  const GENERIC_PLACES = new Set([
    'united states', 'usa', 'us', 'america',
    'spain', 'greece', 'italy', 'germany', 'austria', 'france', 'uk', 'england',
  ]);
  const meaningfulPlaces = sharedPlaces.filter(
    p => !GENERIC_PLACES.has(String(p).toLowerCase())
  );
  if (meaningfulPlaces.length > 0) {
    // Filter out raw GPS coordinates (purely numeric with optional dots/commas/minus)
    const namedPlaces = meaningfulPlaces.filter(
      p => !/^[-\d.,\s]+$/.test(String(p).trim())
    );
    const placeLabel = namedPlaces.length > 0
      ? namedPlaces.join(' & ')
      : 'the same place';

    signals.push({
      type: 'spatial',
      signal: 'shared-place',
      description: `Both rooted in ${placeLabel}`,
      weight: SIGNAL_WEIGHTS['shared-place'],
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THEMATIC SIGNALS (V2 meaning engine)
  // ═══════════════════════════════════════════════════════════════════════════

  // Generic motifs that are too broad to form strong connections alone
  const GENERIC_MOTIFS = new Set(['family', 'love', 'celebration', 'reflection', 'growth', 'friendship', 'nostalgia', 'home']);

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

    // Generic motifs (family, love, celebration, reflection) get halved weight
    const isGenericMotif = GENERIC_MOTIFS.has(bestMotif.id);
    const baseMotifWeight = isGenericMotif ? 0.25 : SIGNAL_WEIGHTS['shared-motif'];

    // Weight scales with number of shared motifs (base + 0.08 per extra, max 0.8)
    const motifWeight = Math.min(
      baseMotifWeight + (sharedMotifIds.length - 1) * 0.08,
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

      // Generic motifs get halved cross-source weight
      const crossWeight = isGenericMotif ? 0.3 : SIGNAL_WEIGHTS['cross-source-echo'];

      signals.push({
        type: 'narrative',
        signal: 'cross-source-echo',
        description: crossNarrative,
        weight: crossWeight,
      });
    }

    // ---- narrative-arc (temporal distance + shared motif = story evolution) ----
    if (dateA && dateB) {
      const daysBetweenArc = Math.abs(differenceInDays(dateA, dateB));
      if (daysBetweenArc > 90) {
        const earlierDate = dateA < dateB ? nodeA.date : nodeB.date;
        const laterDate = dateA < dateB ? nodeB.date : nodeA.date;
        const yearSpan = Math.abs(dateA.getFullYear() - dateB.getFullYear());
        const motifLabel = bestMotif.id || 'this theme';

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
