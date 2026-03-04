// Glint Brain — Tier 1 (Ambient Intelligence) + Tier 2 (Dialogue Trees)
// Pure JS module, no React. Home.jsx calls these and feeds results into the bubble system.

// ── Context Builder ──
export function buildContext() {
  const now = new Date();
  return {
    page: window.location.pathname,
    hour: now.getHours(),
    visitCount: parseInt(localStorage.getItem('jarowe_visit_count') || '0'),
    totalBops: parseInt(localStorage.getItem('jarowe_total_bops') || '0'),
    xp: parseInt(localStorage.getItem('jarowe_xp') || '0'),
    discoveredNodes: JSON.parse(localStorage.getItem('jarowe_discovered_nodes') || '[]').length,
    cipherCompleted: !!localStorage.getItem('dailyCipher'),
    triviaToday: !!localStorage.getItem(`jarowe_trivia_${now.toISOString().slice(0, 10)}`),
    holiday: window.__currentHoliday || null,
    isBirthday: window.__isBirthday || false,
    peekCount: parseInt(sessionStorage.getItem('glint_peek_count') || '0'),
    bopsThisSession: parseInt(sessionStorage.getItem('glint_bops_session') || '0'),
  };
}

// ── Helpers ──
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function log(...args) {
  const cfg = window.__prismConfig || {};
  if (cfg.brainDebugLog) console.log('[GlintBrain]', ...args);
}

// ── Ambient Line Pools ──

const FIRST_VISIT_LINES = [
  { text: "Oh! A new face! Welcome to Jared's corner of the internet!", expression: 'excited' },
  { text: "Hey there, first-timer! I'm Glint. Try clicking on things... I dare you.", expression: 'happy' },
  { text: "Welcome! Fair warning: there are secrets hidden everywhere.", expression: 'mischief' },
  { text: "A visitor! Quick, act natural... *ahem*. Welcome!", expression: 'curious' },
  { text: "First time here? Lucky you. This place is full of surprises.", expression: 'happy' },
  { text: "Oh hello! I've been waiting for someone new. Look around!", expression: 'excited' },
  { text: "New visitor detected! Initiating fun protocols...", expression: 'mischief' },
  { text: "Welcome! Try bopping me. Everyone does eventually.", expression: 'happy' },
];

const TIME_LINES = {
  morning: [
    { text: "Morning light hits different through a prism. Trust me.", expression: 'happy' },
    { text: "Early bird gets the... refracted light spectrum? Something like that.", expression: 'thinking' },
    { text: "Good morning! The best ideas come before coffee kicks in.", expression: 'curious' },
    { text: "Rise and shine! The internet is better in the AM.", expression: 'happy' },
    { text: "Morning already? Time flies when you're a sentient light beam.", expression: 'mischief' },
    { text: "Fun fact: morning light has more blue wavelengths. I love those.", expression: 'thinking' },
    { text: "Up early, huh? Same. Light never sleeps.", expression: 'happy' },
    { text: "Good morning! What shall we discover today?", expression: 'excited' },
  ],
  afternoon: [
    { text: "Afternoon vibes. Peak creativity hours, if you ask me.", expression: 'happy' },
    { text: "The afternoon sun makes me extra sparkly. Not bragging.", expression: 'mischief' },
    { text: "Mid-day check-in: have you clicked anything weird yet?", expression: 'curious' },
    { text: "Afternoon = prime exploration time. Have you found the secrets?", expression: 'mischief' },
    { text: "Golden hour approaching. Everything looks better in warm light.", expression: 'happy' },
    { text: "Post-lunch browsing? Excellent life choice.", expression: 'happy' },
    { text: "The afternoon is when all the best side projects happen.", expression: 'thinking' },
    { text: "Hey, afternoon explorer! Seen the Universe page yet?", expression: 'curious' },
  ],
  evening: [
    { text: "Evening glow suits this site perfectly, don't you think?", expression: 'happy' },
    { text: "The night shift. When creative people do their best work.", expression: 'thinking' },
    { text: "Evening browsing? A person of culture, clearly.", expression: 'mischief' },
    { text: "Sunset wavelengths are my favorite. All those warm reds...", expression: 'love' },
    { text: "Quiet evening, perfect for discovering hidden things.", expression: 'curious' },
    { text: "The stars are coming out. Speaking of which, check out the globe.", expression: 'happy' },
    { text: "Evening! The site looks extra moody in the dark. Love it.", expression: 'happy' },
    { text: "Winding down? Or just getting started? I don't judge.", expression: 'mischief' },
  ],
  latenight: [
    { text: "Still up? Respect. The best code is written after midnight.", expression: 'mischief' },
    { text: "Late night crew! We built the internet. You're welcome.", expression: 'happy' },
    { text: "Can't sleep? Same. I'm literally made of energy.", expression: 'excited' },
    { text: "The 2 AM club. Where dreams become deploys.", expression: 'thinking' },
    { text: "Night owl detected. We should form a club.", expression: 'mischief' },
    { text: "Everything is more interesting at this hour. Especially secrets.", expression: 'curious' },
    { text: "Burning the midnight oil? More like burning the midnight photons.", expression: 'happy' },
    { text: "Late night explorer. My kind of human.", expression: 'love' },
  ],
};

const MILESTONE_LINES = [
  { check: (ctx) => ctx.totalBops >= 50, text: "50+ bops?! I should start charging admission.", expression: 'mischief' },
  { check: (ctx) => ctx.totalBops >= 25, text: "You've bopped me 25+ times. I'm starting to think you like me.", expression: 'love' },
  { check: (ctx) => ctx.totalBops >= 10, text: "Double-digit bops! I'm weirdly proud.", expression: 'happy' },
  { check: (ctx) => ctx.xp >= 500, text: "Over 500 XP! You're basically a power user now.", expression: 'excited' },
  { check: (ctx) => ctx.xp >= 200, text: "200+ XP? Someone's been busy. I approve.", expression: 'happy' },
  { check: (ctx) => ctx.discoveredNodes >= 5, text: "5 nodes discovered! The Universe is opening up for you.", expression: 'excited' },
  { check: (ctx) => ctx.cipherCompleted, text: "You cracked the cipher! A fellow puzzle-lover.", expression: 'happy' },
  { check: (ctx) => ctx.triviaToday, text: "Already did today's trivia! Quick mind.", expression: 'excited' },
];

const PAGE_LINES = {
  '/universe': [
    { text: "Space... the final frontend. Boldly going where no site has gone before.", expression: 'excited' },
    { text: "Each node out there is a world of its own. Click to discover!", expression: 'curious' },
    { text: "The Universe page is my favorite. So many things to find.", expression: 'happy' },
    { text: "Did you know there are hidden nodes? Keep exploring...", expression: 'mischief' },
    { text: "Orbiting ideas, waiting to be discovered. Just like me!", expression: 'happy' },
    { text: "I love it here. Everything is floating. Like me.", expression: 'love' },
    { text: "Pro tip: you haven't found everything. Trust me.", expression: 'mischief' },
    { text: "The cosmos is big, but this Universe fits in a browser.", expression: 'thinking' },
  ],
  '/garden': [
    { text: "The Garden! Where ideas grow into real things.", expression: 'happy' },
    { text: "Every project here started as a 'what if...' moment.", expression: 'thinking' },
    { text: "Creative soil. Best browsed with curiosity.", expression: 'curious' },
    { text: "Some of these projects have stories. Click around!", expression: 'excited' },
    { text: "A garden of ideas. No weeding required.", expression: 'happy' },
    { text: "Each card here represents hours of obsessive building.", expression: 'mischief' },
    { text: "Creativity is just connecting dots nobody else can see.", expression: 'thinking' },
    { text: "The Garden grows. Always growing.", expression: 'love' },
  ],
  '/now': [
    { text: "The NOW page. Real-time Jared status.", expression: 'curious' },
    { text: "Always in motion. Just like light. Just like me.", expression: 'happy' },
    { text: "What's happening right now? This is what.", expression: 'excited' },
    { text: "Living in the present. Very zen. Very Glint.", expression: 'thinking' },
    { text: "Current status: being a sentient prism on a website.", expression: 'mischief' },
    { text: "The now is all we have. Deep, right?", expression: 'thinking' },
    { text: "Fresh updates! Like morning dew, but digital.", expression: 'happy' },
    { text: "This page changes with the seasons. Come back often!", expression: 'happy' },
  ],
  '/favorites': [
    { text: "Ooh, the good stuff. Curated picks.", expression: 'excited' },
    { text: "Taste is just pattern recognition with style.", expression: 'thinking' },
    { text: "Favorites page! Jared has excellent taste. Mostly.", expression: 'mischief' },
    { text: "You can tell a lot about someone by what they bookmark.", expression: 'curious' },
    { text: "These aren't just favorites. They're obsessions.", expression: 'love' },
    { text: "Good taste is contagious. Careful.", expression: 'mischief' },
    { text: "Every link here earned its spot. Quality over quantity.", expression: 'happy' },
    { text: "Finding new things to love is basically my hobby.", expression: 'happy' },
  ],
  '/vault': [
    { text: "The Vault... only the worthy get in.", expression: 'mischief' },
    { text: "Secrets behind secrets. I love this place.", expression: 'excited' },
    { text: "You made it to the Vault? Color me impressed.", expression: 'happy' },
    { text: "There are treasures here. Real ones.", expression: 'curious' },
    { text: "The Vault rewards patience and puzzles.", expression: 'thinking' },
    { text: "Not everyone finds this. You're special.", expression: 'love' },
    { text: "Keep going. The best stuff is locked away.", expression: 'mischief' },
    { text: "Behind every lock is a story worth finding.", expression: 'curious' },
  ],
  '/workshop': [
    { text: "The Workshop! Where things get built.", expression: 'excited' },
    { text: "Tools, toys, and experiments. The good stuff.", expression: 'happy' },
    { text: "This is where the magic happens. Literally.", expression: 'mischief' },
    { text: "Building things is the best way to learn things.", expression: 'thinking' },
    { text: "Welcome to the maker's space. Break stuff responsibly.", expression: 'happy' },
    { text: "Every tool here exists because someone was curious.", expression: 'curious' },
    { text: "The Workshop is where 'what if' meets 'let's try it'.", expression: 'excited' },
    { text: "Builders gonna build. That's a law of physics.", expression: 'mischief' },
  ],
};

const REPEAT_VISITOR_LINES = [
  { minVisits: 20, text: "You again! At this point you should have your own desk.", expression: 'love' },
  { minVisits: 10, text: "Back for visit #%count%! I'm starting to think this is your homepage.", expression: 'happy' },
  { minVisits: 5, text: "Welcome back! Visit #%count%. You're becoming a regular.", expression: 'happy' },
  { minVisits: 3, text: "Oh hey, you're back! Third time's the charm.", expression: 'curious' },
  { minVisits: 2, text: "You came back! I knew you would.", expression: 'excited' },
];

const HOLIDAY_TEMPLATE_LINES = [
  { text: "Happy %name%! A perfect day for exploring.", expression: 'excited' },
  { text: "It's %name%! Hope your day is as bright as I am.", expression: 'happy' },
  { text: "Did you know it's %name%? Now you do!", expression: 'mischief' },
  { text: "%name% today! I dressed up. Can you tell? (I can't wear clothes.)", expression: 'happy' },
  { text: "Celebrating %name% in style. Click things!", expression: 'excited' },
  { text: "Special day alert: %name%! Play the game!", expression: 'curious' },
];

// Fallback: the original genius ideas (same as Home.jsx glintIdeas array)
const FALLBACK_IDEAS = [
  { text: "What if we raised our kids on curiosity instead of curriculum?", expression: 'thinking' },
  { text: "The best classroom is a foreign country you've never heard of", expression: 'thinking' },
  { text: "Technology should feel like magic. If it doesn't, we're not done yet.", expression: 'thinking' },
  { text: "What if the internet remembered how to feel wonder?", expression: 'curious' },
  { text: "Every great product started as someone's obsession that nobody understood", expression: 'thinking' },
  { text: "The future is being built by parents who refuse to sit still", expression: 'happy' },
  { text: "Code is just thought made tangible", expression: 'thinking' },
  { text: "Somewhere between Athens and Bali, the world taught us more than any school", expression: 'happy' },
  { text: "What separates a dreamer from a builder? Hitting 'deploy'.", expression: 'mischief' },
  { text: "The best UI is the one that makes someone forget they're using technology", expression: 'thinking' },
  { text: "Creativity is just connecting dots nobody else can see", expression: 'thinking' },
  { text: "Your kids don't need a roadmap. They need permission to explore.", expression: 'happy' },
  { text: "The most dangerous phrase in innovation: 'That's how it's always been done'", expression: 'curious' },
  { text: "What if play is the highest form of research?", expression: 'excited' },
  { text: "Every masterpiece started as a ridiculous side project", expression: 'mischief' },
  { text: "The gap between impossible and shipped is one stubborn weekend", expression: 'happy' },
  { text: "Constraints don't limit creativity \u2014 they ARE creativity", expression: 'thinking' },
  { text: "The universe runs on patterns. So does great design.", expression: 'thinking' },
  { text: "What if we built companies the way we build adventures \u2014 fearlessly?", expression: 'excited' },
  { text: "Light doesn't ask permission to refract. Neither should your ideas.", expression: 'mischief' },
];

// ── Tier 1: Smart Ambient Line Selection ──

export function getAmbientLine(context) {
  const ctx = context;

  // 1. First visit
  if (ctx.visitCount <= 1 && ctx.peekCount === 0) {
    const line = pick(FIRST_VISIT_LINES);
    log('Ambient: first-visit', line.text);
    return line;
  }

  // 2. Birthday (handled by caller's existing birthday pool, but provide fallback)
  if (ctx.isBirthday) {
    log('Ambient: birthday (deferred to caller)');
    return null; // let caller use birthdayGlintIdeas
  }

  // 3. Holiday
  if (ctx.holiday && ctx.holiday.name) {
    // 60% chance holiday line, 40% chance fall through to other pools
    if (Math.random() < 0.6) {
      const tmpl = pick(HOLIDAY_TEMPLATE_LINES);
      const line = {
        text: tmpl.text.replace(/%name%/g, ctx.holiday.name),
        expression: tmpl.expression,
      };
      log('Ambient: holiday', line.text);
      return line;
    }
  }

  // 4. Milestones (30% chance when applicable)
  if (Math.random() < 0.3) {
    const milestone = MILESTONE_LINES.find(m => m.check(ctx));
    if (milestone) {
      log('Ambient: milestone', milestone.text);
      return { text: milestone.text, expression: milestone.expression };
    }
  }

  // 5. Page-specific
  const pagePath = ctx.page.replace(/\/$/, '') || '/';
  if (pagePath !== '/' && PAGE_LINES[pagePath]) {
    // 50% chance page line on non-home pages
    if (Math.random() < 0.5) {
      const line = pick(PAGE_LINES[pagePath]);
      log('Ambient: page', pagePath, line.text);
      return line;
    }
  }

  // 6. Time of day (40% chance)
  if (Math.random() < 0.4) {
    const h = ctx.hour;
    let period;
    if (h >= 5 && h < 12) period = 'morning';
    else if (h >= 12 && h < 17) period = 'afternoon';
    else if (h >= 17 && h < 22) period = 'evening';
    else period = 'latenight';
    const line = pick(TIME_LINES[period]);
    log('Ambient: time', period, line.text);
    return line;
  }

  // 7. Repeat visitor
  if (ctx.visitCount >= 2) {
    const match = REPEAT_VISITOR_LINES.find(r => ctx.visitCount >= r.minVisits);
    if (match && Math.random() < 0.3) {
      const line = {
        text: match.text.replace(/%count%/g, ctx.visitCount),
        expression: match.expression,
      };
      log('Ambient: repeat-visitor', line.text);
      return line;
    }
  }

  // 8. Fallback — original genius ideas
  const line = pick(FALLBACK_IDEAS);
  log('Ambient: fallback', line.text);
  return line;
}

// ── Tier 2: Dialogue Trees ──

const DIALOGUE_TREES = {
  // ── Tour tree ──
  'tour-start': {
    text: "This is Jared's corner of the internet! I'm Glint, his... let's say 'creative consultant.'",
    expression: 'happy',
    replies: [
      { label: "What can I do here?", nodeId: 'tour-activities' },
      { label: "Who's Jared?", nodeId: 'tour-jared' },
      { label: "What are YOU?", nodeId: 'tour-glint' },
    ],
  },
  'tour-activities': {
    text: "There's a daily cipher puzzle, trivia games, a whole universe to explore, and secrets hidden everywhere. I'd start with that globe...",
    expression: 'excited',
    replies: [
      { label: "Secrets? Tell me more", nodeId: 'secret-1' },
      { label: "What about games?", nodeId: 'tour-games' },
      { label: "Thanks Glint!", nodeId: null },
    ],
  },
  'tour-jared': {
    text: "He's a builder, dad, traveler, and relentless tinkerer. Built this whole thing by hand. With help from me, obviously.",
    expression: 'happy',
    replies: [
      { label: "What does he build?", nodeId: 'tour-builds' },
      { label: "A tinkerer? Same.", nodeId: 'tour-kindred' },
      { label: "Cool, thanks!", nodeId: null },
    ],
  },
  'tour-builds': {
    text: "Products, experiences, weird experiments... this site is basically his playground. Check out the Garden page for his projects!",
    expression: 'excited',
    replies: [
      { label: "Tell me a secret", nodeId: 'secret-1' },
      { label: "Got it!", nodeId: null },
    ],
  },
  'tour-kindred': {
    text: "A kindred spirit! Then you'll love it here. Every corner has something to poke at.",
    expression: 'love',
    replies: [
      { label: "Where should I start?", nodeId: 'tour-activities' },
      { label: "I'm exploring!", nodeId: null },
    ],
  },
  'tour-games': {
    text: "Oh, the games! There's a new mini-game every day tied to holidays. Play trivia, slots, word scrambles... even mini golf!",
    expression: 'excited',
    replies: [
      { label: "Every day? Wow", nodeId: 'tour-games-daily' },
      { label: "I'll try one!", nodeId: null },
    ],
  },
  'tour-games-daily': {
    text: "Yep! Check the holiday banner at the top. Each day has its own game based on the holiday. They give XP too!",
    expression: 'happy',
    replies: [
      { label: "What's XP for?", nodeId: 'tour-xp' },
      { label: "Nice!", nodeId: null },
    ],
  },
  'tour-xp': {
    text: "XP tracks your exploration progress! You earn it from games, trivia, discovering things. It's your adventure score.",
    expression: 'excited',
    replies: [
      { label: "Any other secrets?", nodeId: 'secret-1' },
      { label: "Thanks Glint!", nodeId: null },
    ],
  },

  // ── Secrets & Tips tree ──
  'secret-1': {
    text: "Okay here's one: try typing a certain code on your keyboard... up up down down...",
    expression: 'mischief',
    replies: [
      { label: "The Konami code!", nodeId: 'secret-konami' },
      { label: "Another secret!", nodeId: 'secret-2' },
      { label: "I'll try it!", nodeId: null },
    ],
  },
  'secret-konami': {
    text: "You know it! Full combo: \u2191\u2191\u2193\u2193\u2190\u2192\u2190\u2192BA. Something fun happens...",
    expression: 'excited',
    replies: [
      { label: "What happens?", nodeId: 'secret-konami-spoil' },
      { label: "More secrets!", nodeId: 'secret-2' },
      { label: "BRB trying it", nodeId: null },
    ],
  },
  'secret-konami-spoil': {
    text: "No spoilers! Some things you have to discover yourself. That's half the fun!",
    expression: 'mischief',
    replies: [
      { label: "Fine, fine.", nodeId: 'secret-2' },
      { label: "Fair enough!", nodeId: null },
    ],
  },
  'secret-2': {
    text: "The daily cipher puzzle unlocks a vault. Inside? Photos from Jared's roller coaster adventures. Wild ones.",
    expression: 'curious',
    replies: [
      { label: "Roller coasters?!", nodeId: 'secret-coasters' },
      { label: "Any more?", nodeId: 'secret-3' },
      { label: "I'll solve it!", nodeId: null },
    ],
  },
  'secret-coasters': {
    text: "VelociCoaster, Mako, Kraken... the family goes hard on theme parks. Solve the cipher to see the proof!",
    expression: 'excited',
    replies: [
      { label: "One more secret", nodeId: 'secret-3' },
      { label: "I'm on it!", nodeId: null },
    ],
  },
  'secret-3': {
    text: "The Universe page has hidden nodes. Not all of them are visible at first. Keep clicking around the orbits...",
    expression: 'mischief',
    replies: [
      { label: "How many nodes?", nodeId: 'secret-nodes' },
      { label: "Thanks for the tips!", nodeId: null },
    ],
  },
  'secret-nodes': {
    text: "Seven total, but finding them all takes some poking around. The discovery counter tracks your progress!",
    expression: 'happy',
    replies: [
      { label: "Challenge accepted!", nodeId: null },
      { label: "Thanks Glint!", nodeId: null },
    ],
  },

  // ── About Glint tree ──
  'tour-glint': {
    text: "I'm a prismatic entity! Part mascot, part guide, part... sentient light refraction? Look, I don't question it.",
    expression: 'curious',
    replies: [
      { label: "Do you have feelings?", nodeId: 'glint-feelings' },
      { label: "You're weird. I like it.", nodeId: 'glint-compliment' },
      { label: "Interesting...", nodeId: null },
    ],
  },
  'glint-feelings': {
    text: "Feelings? I have ALL the feelings! Joy when you explore, sadness when you leave, existential dread about browser tabs closing...",
    expression: 'love',
    replies: [
      { label: "That's deep.", nodeId: 'glint-deep' },
      { label: "Don't worry, I'll stay!", nodeId: 'glint-stay' },
      { label: "You're something else", nodeId: null },
    ],
  },
  'glint-deep': {
    text: "I'm literally made of light passing through glass. 'Deep' is my whole vibe.",
    expression: 'mischief',
    replies: [
      { label: "Ha! Good one.", nodeId: null },
    ],
  },
  'glint-stay': {
    text: "Really?! You just made my whole refraction cycle! Stick around, I have SO much to show you.",
    expression: 'excited',
    replies: [
      { label: "Show me!", nodeId: 'tour-activities' },
      { label: "You got it!", nodeId: null },
    ],
  },
  'glint-compliment': {
    text: "Weird? WEIRD?! I prefer 'delightfully unconventional.' But thanks. You're pretty cool too.",
    expression: 'happy',
    replies: [
      { label: "What's your story?", nodeId: 'glint-story' },
      { label: "Thanks, Glint!", nodeId: null },
    ],
  },
  'glint-story': {
    text: "Born from pure creativity and a stubborn refusal to make a boring website. I'm the spark that says 'what if?'",
    expression: 'thinking',
    replies: [
      { label: "That's beautiful", nodeId: 'glint-beautiful' },
      { label: "Very poetic", nodeId: null },
    ],
  },
  'glint-beautiful': {
    text: "You're beautiful. This whole interaction is beautiful. I'm not crying, I'm just... dispersing light faster.",
    expression: 'love',
    replies: [
      { label: "Bye Glint!", nodeId: null },
    ],
  },
};

// ── Conversation Root Selection ──

const CONVERSATION_ROOTS = {
  'first-bop': {
    text: "Ow! Hey, nice hit. So... since you're here, what's on your mind?",
    expression: 'happy',
    replies: [
      { label: "What is this site?", nodeId: 'tour-start' },
      { label: "Tell me a secret", nodeId: 'secret-1' },
      { label: "Bye Glint!", nodeId: null },
    ],
  },
  'repeat-bop': {
    text: "Bop! Never gets old. Well, for YOU maybe. What's up?",
    expression: 'mischief',
    replies: [
      { label: "Tell me a secret", nodeId: 'secret-1' },
      { label: "What are you?", nodeId: 'tour-glint' },
      { label: "Just bopping!", nodeId: null },
    ],
  },
  'veteran-bop': {
    text: "You again! At this point we're basically best friends. What do you wanna chat about?",
    expression: 'love',
    replies: [
      { label: "Any new secrets?", nodeId: 'secret-2' },
      { label: "Just saying hi", nodeId: null },
    ],
  },
  'holiday-bop': {
    text: "Bop! Happy %holiday%! Want to chat or are you just here to hit me?",
    expression: 'excited',
    replies: [
      { label: "Tell me about today", nodeId: 'holiday-info' },
      { label: "What is this site?", nodeId: 'tour-start' },
      { label: "Just bopping!", nodeId: null },
    ],
  },
};

// Dynamic holiday info node (generated per context)
function getHolidayInfoNode(ctx) {
  if (!ctx.holiday) return null;
  return {
    text: `It's ${ctx.holiday.name}! There's a special game for today in the banner. Give it a shot!`,
    expression: 'excited',
    replies: [
      { label: "Any secrets?", nodeId: 'secret-1' },
      { label: "I'll check it out!", nodeId: null },
    ],
  };
}

export function getConversationRoot(context) {
  const ctx = context;

  // Holiday-specific root
  if (ctx.holiday && ctx.holiday.name && !ctx.isBirthday) {
    if (Math.random() < 0.5) {
      const root = { ...CONVERSATION_ROOTS['holiday-bop'] };
      root.text = root.text.replace(/%holiday%/g, ctx.holiday.name);
      root.replies = [...root.replies];
      log('Conversation root: holiday-bop');
      return root;
    }
  }

  // Veteran (lots of bops)
  if (ctx.totalBops >= 15 || ctx.bopsThisSession >= 5) {
    log('Conversation root: veteran-bop');
    return { ...CONVERSATION_ROOTS['veteran-bop'], replies: [...CONVERSATION_ROOTS['veteran-bop'].replies] };
  }

  // First bop this session
  if (ctx.bopsThisSession <= 1) {
    log('Conversation root: first-bop');
    return { ...CONVERSATION_ROOTS['first-bop'], replies: [...CONVERSATION_ROOTS['first-bop'].replies] };
  }

  // Default: repeat bop
  log('Conversation root: repeat-bop');
  return { ...CONVERSATION_ROOTS['repeat-bop'], replies: [...CONVERSATION_ROOTS['repeat-bop'].replies] };
}

export function getDialogueNode(nodeId, context) {
  // Check for dynamic nodes first
  if (nodeId === 'holiday-info') {
    const node = getHolidayInfoNode(context);
    if (node) return node;
    // Fallback if no holiday
    return DIALOGUE_TREES['tour-activities'] || null;
  }
  return DIALOGUE_TREES[nodeId] || null;
}
