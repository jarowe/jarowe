/**
 * Motif extraction engine for the constellation pipeline.
 *
 * Extracts thematic motifs from node content (title, description, tags, entities)
 * to enable rich, story-driven connections between nodes.
 *
 * Each motif represents a life theme: family, travel, craft, love, etc.
 * Motifs power the "shared-motif" and "cross-source-motif" signals in
 * the edge generator, replacing generic temporal connections with
 * meaningful narrative threads.
 */

import { createLogger } from '../utils/logger.mjs';

const log = createLogger('motifs');

// ---------------------------------------------------------------------------
// Motif Taxonomy
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Rarity tiers — controls minimum score threshold for inclusion.
// 'common' motifs are broad themes that need stronger signal to avoid noise.
// 'specific' motifs are narrow enough that a lower threshold is fine.
// ---------------------------------------------------------------------------
export const RARITY = {
  common: 'common',   // score >= 3.0 to include
  specific: 'specific', // score >= 2.0 to include
};

export const RARITY_THRESHOLDS = {
  [RARITY.common]: 3.0,
  [RARITY.specific]: 2.0,
};

export const MOTIF_TAXONOMY = {
  // ---- Family sub-categories ----

  family: {
    label: 'Family',
    rarity: RARITY.common,
    keywords: [
      'family', 'nephew', 'niece', 'uncle', 'aunt',
      'grandma', 'grandpa', 'cousin', 'parents', 'siblings',
      'mother',
    ],
    phrases: [
      'family time', 'our children', 'changed my life',
      'mother of our children',
    ],
  },

  fatherhood: {
    label: 'Fatherhood',
    rarity: RARITY.specific,
    keywords: [
      'dad', 'father', 'fatherhood', 'son', 'sons', 'parenting',
      'teach', 'teaching', 'proud',
    ],
    phrases: [
      'my oldest', 'my son', 'our boys', 'my boys', 'the boys',
      'our boys', 'watching our boys',
      'to my oldest', 'i see you', 'your passion',
      'creative parenting', 'under his bed',
      'tracing the paths of our childhood',
      'mirror the adventures', 'watching grow',
    ],
  },

  brotherhood: {
    label: 'Brotherhood',
    rarity: RARITY.specific,
    keywords: [
      'brother', 'brothers', 'sibling',
    ],
    people: [
      'derek',
    ],
    phrases: [
      'my brothers', 'my brother',
    ],
  },

  marriage: {
    label: 'Marriage & Partnership',
    rarity: RARITY.specific,
    keywords: [
      'wife', 'wedding', 'anniversary', 'husband',
    ],
    people: [
      'maria',
    ],
    phrases: [
      'love of my life', 'my wife', 'high school sweethearts',
    ],
  },

  childhood: {
    label: 'Childhood & Raising Kids',
    rarity: RARITY.specific,
    keywords: [
      'kids', 'children', 'child', 'boys', 'boy', 'raising',
    ],
    phrases: [
      'my kids', 'our children', 'growing up', 'our childhood',
      'my boys', 'our boys',
    ],
  },

  // ---- Core motifs ----

  love: {
    label: 'Love & Devotion',
    rarity: RARITY.common,
    keywords: [
      'love', 'heart', 'romance', 'beautiful', 'soulmate',
      'anniversary', 'wedding', 'together', 'forever',
    ],
    phrases: [
      'lucky man', 'love of my life', 'made me smile',
      'my wife', 'from the very beginning', 'meaningful moments',
      'meaningful moment', 'most meaningful',
    ],
  },

  travel: {
    label: 'Travel & Discovery',
    rarity: RARITY.specific,
    keywords: [
      'travel', 'trip', 'vacation', 'adventure', 'flight',
      'airport', 'island', 'coast', 'abroad', 'explore',
      'exploring', 'yacht', 'sailing', 'cruise', 'passport',
    ],
    places: [
      'greece', 'spain', 'naxos', 'cyclades', 'syros', 'kini',
      'europe', 'winter park', 'orlando', 'florida',
    ],
    phrases: [
      'off the coast', 'new horizons', 'touched down',
      'on the road', 'road trip',
    ],
  },

  craft: {
    label: 'Creative Vision',
    rarity: RARITY.specific,
    keywords: [
      'design', 'animation', 'video', 'production', 'creative',
      'edit', 'render', '3d', 'motion', 'graphics', 'visual',
      'camera', 'shoot', 'direct', 'produce', 'art',
      'illustration', 'photography', 'brand', 'logo', 'web',
      'digital', 'interactive', 'ux', 'ui', 'storyteller',
      'storytelling', 'commercial', 'cinematic', 'vfx',
    ],
    phrases: [
      'video production', 'motion graphics', 'brand identity',
      'creative direction', 'visual effects', 'digital signage',
      'feature film', 'sizzle reel', 'demo reel',
      'i tell myself i\'m a storyteller',
    ],
  },

  nature: {
    label: 'Nature & Wonder',
    rarity: RARITY.specific,
    keywords: [
      'ocean', 'sunset', 'sunrise', 'beach', 'mountain',
      'park', 'outdoor', 'waves', 'sand', 'garden', 'lake',
      'river', 'forest', 'tree', 'sky', 'sea', 'cave',
      'glistening', 'mural', 'ancient',
    ],
    phrases: [
      'dance with the waves', 'lay in the sand',
      'water as clear', 'golden hour', 'ancient caves',
      'sun rise', 'cool breezes',
    ],
  },

  reflection: {
    label: 'Reflection & Meaning',
    rarity: RARITY.common,
    keywords: [
      'meaning', 'meaningful', 'reflect', 'reflection', 'inspire',
      'inspired', 'purpose', 'soul', 'truth', 'thought',
      'wisdom', 'philosophy', 'perspective', 'mindful',
    ],
    phrases: [
      'home isn\'t a place', 'it\'s a feeling',
      'in between the hustle', 'there\'s flow',
      'thoughts these times inspire', 'every challenge',
      'call to leap', 'expanding our horizons',
      'immortal gaze', 'growing on me',
    ],
  },

  nostalgia: {
    label: 'Nostalgia & Heritage',
    rarity: RARITY.common,
    keywords: [
      'childhood', 'remember', 'throwback', 'memory', 'memories',
      'reminisce', 'heritage', 'roots', 'tradition', 'retro',
    ],
    phrases: [
      'tracing the paths', 'our childhood', 'back when',
      'used to', 'mirror the adventures', 'once had',
      'takes me back', 'paths of our childhood',
    ],
  },

  celebration: {
    label: 'Celebration',
    rarity: RARITY.common,
    keywords: [
      'birthday', 'christmas', 'easter', 'holiday', 'party',
      'celebrate', 'toast', 'cheers', 'anniversary',
      'thanksgiving', 'halloween',
    ],
    phrases: [
      'happy birthday', 'perfect reflection',
      'raise a glass', 'in the room where it happens',
      'new year',
    ],
  },

  food: {
    label: 'Food & Culture',
    rarity: RARITY.specific,
    keywords: [
      'restaurant', 'dinner', 'meal', 'cooking', 'recipe',
      'brunch', 'coffee', 'food', 'cuisine', 'chef',
      'kitchen', 'cocktail', 'wine', 'gelato', 'waffles',
      'breakfast', 'lunch',
    ],
    phrases: [
      'pick and roll for breakfast', 'homemade waffles',
      'django gelato', 'indian cuisine', 'good eats',
      'cyclades spot',
    ],
  },

  friendship: {
    label: 'Friendship',
    rarity: RARITY.common,
    keywords: [
      'friend', 'friends', 'crew', 'team', 'squad',
      'buddy', 'gathering', 'reunion', 'community',
    ],
    phrases: [
      'favorite crew', 'beautiful people', 'rooftop vibes',
      'beautiful night', 'night out', 'good times',
    ],
  },

  career: {
    label: 'Professional Journey',
    rarity: RARITY.specific,
    keywords: [
      'client', 'portfolio', 'freelance', 'agency', 'studio',
      'conference', 'campaign', 'marketing', 'streaming',
      'broadcast', 'marketplace', 'leadership', 'panel',
      'streamer', 'livestream', 'creator', 'creators',
      'acquisition', 'acquired',
    ],
    clients: [
      'disney', 'hpe', 'hewlett packard', 'microsoft',
      'ea', 'electronic arts', 'nba', 'espn',
      'seaworld', 'universal', 'activision', 'sega',
    ],
    people: [
      'elgato', 'corsair', 'twitchcon',
    ],
    phrases: [
      'working with', 'my company', 'over 6 years',
      'brand awareness', 'feature films',
      'product innovation', 'on stage', 'public leadership',
    ],
  },

  adventure: {
    label: 'Adventure & Play',
    rarity: RARITY.specific,
    keywords: [
      'coaster', 'surfing', 'thrill',
      'ride', 'extreme', 'play', 'fun', 'game',
      'adrenaline',
    ],
    places: [
      'universal studios', 'seaworld', 'islands of adventure',
      'disney world',
    ],
    phrases: [
      'what a ride', 'adrenaline rush', 'theme park',
      'roller coaster',
    ],
  },

  growth: {
    label: 'Growth & Evolution',
    rarity: RARITY.common,
    keywords: [
      'learn', 'learning', 'new', 'first', 'start',
      'achieve', 'milestone', 'launch', 'build', 'grow',
      'evolve', 'opportunity', 'breakthrough', 'level',
      'boom', 'scale', 'accelerat', 'transition',
      'transformation', 'reinvention', 'intentional',
    ],
    phrases: [
      'first reel', 'new chapter', 'stepping up',
      'growing on me', 'check out my first',
      'grew to serve', 'moved online', 'at scale',
      'life design', 'changed everything',
    ],
  },

  home: {
    label: 'Home & Belonging',
    rarity: RARITY.common,
    keywords: [
      'home', 'house', 'backyard', 'porch', 'neighborhood',
      'settle', 'rooftop',
    ],
    phrases: [
      'home isn\'t a place', 'it\'s a feeling',
      'home sweet home', 'rooftop vibes',
    ],
  },

  faith: {
    label: 'Gratitude & Spirit',
    rarity: RARITY.specific,
    keywords: [
      'blessed', 'grateful', 'thankful', 'grace',
      'faith', 'believe', 'hope', 'spirit',
    ],
    phrases: [
      'so grateful', 'truly blessed',
      'lucky man', 'giving thanks',
    ],
  },

  greece: {
    label: 'Greek Chapter',
    rarity: RARITY.specific,
    keywords: [],
    places: [
      'greece', 'naxos', 'syros', 'cyclades', 'kini',
      'greek', 'καλημέρα',
    ],
    phrases: [
      'off the coast of syros', 'naxos', 'django gelato',
      'ancient caves', 'kini beach', 'rooftop vibes',
    ],
  },

  // ---- New motifs ----

  worldschooling: {
    label: 'Worldschooling',
    rarity: RARITY.specific,
    keywords: [
      'worldschool', 'homeschool', 'expat', 'nomad',
      'education', 'community',
    ],
    phrases: [
      'learning abroad', 'boundless life', 'worldschooling',
      'homeschooling abroad', 'experiential education',
      'global destinations', 'cohort-based',
      'the world as classroom',
    ],
  },

  filmmaking: {
    label: 'Filmmaking',
    rarity: RARITY.specific,
    keywords: [
      'film', 'cinema', 'camera', 'director', 'screenplay',
    ],
    places: [
      'valencia',
    ],
    phrases: [
      'short film', 'film school', 'feature film',
      'film festival', 'on set',
    ],
  },

  health: {
    label: 'Health & Transformation',
    rarity: RARITY.specific,
    keywords: [
      'health', 'fitness', 'transformation', 'pounds', 'gym',
      'workout', 'exercise', 'muscle', 'body', 'longevity',
      'weight', 'lbs', 'discipline', 'reinvention', 'healthier',
      'stronger',
    ],
    phrases: [
      'weight loss', 'lost weight', 'health journey',
      'health transformation', 'lost more than',
      'physical reinvention', 'life design',
    ],
  },

  technology: {
    label: 'Technology & Innovation',
    rarity: RARITY.specific,
    keywords: [
      'coding', 'software', 'app', 'tech', 'plugin',
      'plugins', 'platform', 'innovation',
    ],
    people: [
      'elgato',
    ],
    phrases: [
      'artificial intelligence', 'product innovation',
      'stream deck', 'creator tools', 'creator ecosystem',
    ],
    // 'AI' handled specially — matched as uppercase to avoid false positives
    caseKeywords: ['AI'],
  },

  entrepreneurship: {
    label: 'Entrepreneurship',
    rarity: RARITY.specific,
    keywords: [
      'business', 'startup', 'founder', 'entrepreneur',
      'co-founded', 'founding', 'company',
    ],
    people: [
      'doctrine', 'eezy', 'videezy', 'starseed', 'vbi',
    ],
    phrases: [
      'my company', 'co-own', 'started a company',
      'creative solutions', 'special projects',
      'internal ip', 'story worlds',
    ],
  },
};

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/**
 * Build a searchable text blob from all node content.
 *
 * @param {Object} node - Canonical node
 * @returns {string} Lowercased combined text
 */
function buildSearchText(node) {
  const parts = [
    node.title || '',
    node.description || '',
    ...(node.entities?.tags || []),
    ...(node.entities?.places || []),
    ...(node.entities?.clients || []),
    ...(node.entities?.people || []),
  ];
  return parts.join(' ').toLowerCase();
}

/**
 * Build a raw (case-preserved) text blob for case-sensitive matching.
 * Attached as a static method on buildSearchText for co-location.
 *
 * @param {Object} node - Canonical node
 * @returns {string} Combined text with original casing
 */
buildSearchText.raw = function (node) {
  const parts = [
    node.title || '',
    node.description || '',
    ...(node.entities?.tags || []),
    ...(node.entities?.places || []),
    ...(node.entities?.clients || []),
    ...(node.entities?.people || []),
  ];
  return parts.join(' ');
};

/**
 * Check if text contains a word (whole-word match where practical).
 * For single words, uses word-boundary regex.
 * For phrases, uses includes() since they're multi-word.
 */
function textContains(text, term) {
  if (term.includes(' ')) {
    return text.includes(term);
  }
  // Word boundary match for single words to avoid false positives
  // e.g. "art" shouldn't match "starting"
  const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return regex.test(text);
}

/**
 * Extract thematic motifs from a node's content.
 *
 * Scans title, description, tags, and entities against the motif taxonomy.
 * Returns scored motifs sorted by relevance.
 *
 * Rarity-aware: common motifs need score >= 3.0, specific motifs >= 2.0.
 *
 * @param {Object} node - Canonical node
 * @returns {Array<{id: string, label: string, score: number, rarity: string}>} Extracted motifs
 */
export function extractMotifs(node) {
  const text = buildSearchText(node);
  if (!text.trim()) return [];

  // Also build a raw (non-lowercased) version for case-sensitive keyword matching
  const rawText = buildSearchText.raw(node);

  const motifs = [];

  for (const [motifId, config] of Object.entries(MOTIF_TAXONOMY)) {
    let score = 0;
    const matchedTerms = [];

    // Check keywords (1 point each) — case-insensitive via lowercased text
    for (const kw of config.keywords || []) {
      if (textContains(text, kw)) {
        score += 1;
        matchedTerms.push(kw);
      }
    }

    // Check case-sensitive keywords (1 point each) — matched against raw text
    // Useful for acronyms like "AI" that would false-positive on lowercase
    for (const ckw of config.caseKeywords || []) {
      const regex = new RegExp(
        `\\b${ckw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
      );
      if (regex.test(rawText)) {
        score += 1;
        matchedTerms.push(ckw);
      }
    }

    // Check phrases (2 points each — more specific = more weight)
    for (const phrase of config.phrases || []) {
      if (text.includes(phrase.toLowerCase())) {
        score += 2;
        matchedTerms.push(phrase);
      }
    }

    // Check places (1.5 points each)
    for (const place of config.places || []) {
      if (text.includes(place.toLowerCase())) {
        score += 1.5;
        matchedTerms.push(place);
      }
    }

    // Check clients (1.5 points each)
    for (const client of config.clients || []) {
      if (text.includes(client.toLowerCase())) {
        score += 1.5;
        matchedTerms.push(client);
      }
    }

    // Check people (1.5 points each)
    for (const person of config.people || []) {
      if (text.includes(person.toLowerCase())) {
        score += 1.5;
        matchedTerms.push(person);
      }
    }

    // Apply rarity-based threshold
    const rarity = config.rarity || RARITY.specific;
    const threshold = RARITY_THRESHOLDS[rarity];

    if (score >= threshold) {
      motifs.push({
        id: motifId,
        label: config.label,
        score: Math.round(score * 10) / 10,
        rarity,
      });
    }
  }

  return motifs.sort((a, b) => b.score - a.score);
}

/**
 * Extract motifs for all nodes and log statistics.
 *
 * @param {Object[]} nodes - Array of canonical nodes
 * @returns {Object} Motif stats { nodesWithMotifs, motifDistribution }
 */
export function extractAllMotifs(nodes) {
  const motifCounts = {};
  let nodesWithMotifs = 0;

  for (const node of nodes) {
    const motifs = extractMotifs(node);
    node._motifs = motifs;

    if (motifs.length > 0) {
      nodesWithMotifs++;
      for (const m of motifs) {
        motifCounts[m.id] = (motifCounts[m.id] || 0) + 1;
      }
    }
  }

  // Sort by frequency
  const sorted = Object.entries(motifCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => `${id}: ${count}`);

  log.info(`Motifs extracted: ${nodesWithMotifs}/${nodes.length} nodes tagged`);
  if (sorted.length > 0) {
    log.info(`Distribution: ${sorted.join(', ')}`);
  }

  return { nodesWithMotifs, motifDistribution: motifCounts };
}
