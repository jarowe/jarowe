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

const MOTIF_TAXONOMY = {
  family: {
    label: 'Family',
    keywords: [
      'family', 'son', 'sons', 'boys', 'boy', 'brother', 'brothers',
      'dad', 'father', 'fatherhood', 'kids', 'children', 'child',
      'wife', 'mother', 'parents', 'siblings', 'nephew', 'niece',
      'uncle', 'aunt', 'grandma', 'grandpa', 'cousin',
    ],
    phrases: [
      'my boys', 'the boys', 'our boys', 'my son', 'our son',
      'my kids', 'our children', 'family time', 'our childhood',
      'my brothers', 'my oldest', 'mother of our children',
      'changed my life', 'watching our boys',
    ],
  },

  love: {
    label: 'Love & Devotion',
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
    keywords: [
      'design', 'animation', 'video', 'production', 'creative',
      'edit', 'render', '3d', 'motion', 'graphics', 'visual',
      'film', 'camera', 'shoot', 'direct', 'produce', 'art',
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

  fatherhood: {
    label: 'Fatherhood',
    keywords: [
      'dad', 'father', 'son', 'sons', 'parenting',
      'teach', 'teaching', 'watching grow', 'proud',
    ],
    phrases: [
      'my oldest', 'my son', 'our boys', 'my boys',
      'to my oldest', 'i see you', 'your passion',
      'creative parenting', 'under his bed',
      'tracing the paths of our childhood',
      'mirror the adventures',
    ],
  },

  nature: {
    label: 'Nature & Wonder',
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
    keywords: [
      'birthday', 'christmas', 'easter', 'holiday', 'party',
      'celebrate', 'toast', 'cheers', 'anniversary',
      'new year', 'thanksgiving', 'halloween',
    ],
    phrases: [
      'happy birthday', 'perfect reflection',
      'raise a glass', 'in the room where it happens',
    ],
  },

  food: {
    label: 'Food & Culture',
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
    keywords: [
      'friend', 'friends', 'crew', 'team', 'squad',
      'buddy', 'gathering', 'reunion', 'community',
      'people', 'beautiful people',
    ],
    phrases: [
      'favorite crew', 'beautiful people', 'rooftop vibes',
      'beautiful night', 'night out', 'good times',
    ],
  },

  career: {
    label: 'Professional Journey',
    keywords: [
      'client', 'company', 'business', 'portfolio',
      'freelance', 'agency', 'studio', 'entrepreneur',
      'startup', 'conference', 'campaign', 'marketing',
    ],
    clients: [
      'disney', 'hpe', 'hewlett packard', 'microsoft',
      'ea', 'electronic arts', 'nba', 'espn',
      'seaworld', 'universal', 'activision', 'sega',
    ],
    phrases: [
      'working with', 'my company', 'over 6 years',
      'brand awareness', 'feature films',
    ],
  },

  adventure: {
    label: 'Adventure & Play',
    keywords: [
      'coaster', 'theme park', 'surfing', 'thrill',
      'ride', 'extreme', 'play', 'fun', 'game',
      'roller coaster', 'adrenaline',
    ],
    places: [
      'universal studios', 'seaworld', 'islands of adventure',
      'disney world', 'theme park',
    ],
    phrases: [
      'what a ride', 'adrenaline rush',
    ],
  },

  growth: {
    label: 'Growth & Evolution',
    keywords: [
      'learn', 'learning', 'new', 'first', 'start',
      'achieve', 'milestone', 'launch', 'build', 'grow',
      'evolve', 'opportunity', 'breakthrough', 'level',
    ],
    phrases: [
      'first reel', 'new chapter', 'stepping up',
      'growing on me', 'check out my first',
    ],
  },

  home: {
    label: 'Home & Belonging',
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
 * @param {Object} node - Canonical node
 * @returns {Array<{id: string, label: string, score: number}>} Extracted motifs
 */
export function extractMotifs(node) {
  const text = buildSearchText(node);
  if (!text.trim()) return [];

  const motifs = [];

  for (const [motifId, config] of Object.entries(MOTIF_TAXONOMY)) {
    let score = 0;
    const matchedTerms = [];

    // Check keywords (1 point each)
    for (const kw of config.keywords || []) {
      if (textContains(text, kw)) {
        score += 1;
        matchedTerms.push(kw);
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

    // Only include motifs with meaningful signal (2+ to avoid noise)
    if (score >= 2) {
      motifs.push({
        id: motifId,
        label: config.label,
        score: Math.round(score * 10) / 10,
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
