// ─── Achievement Definitions ─────────────────────────────────────────
// Each achievement has: id, name, desc, icon, category, check(stats) → boolean

export const ACHIEVEMENTS = [
  // Exploration
  { id: 'explorer-1',     name: 'First Steps',       desc: 'Visit 3 pages',                  icon: '\u{1F9ED}', category: 'exploration', check: s => s.pagesVisited >= 3 },
  { id: 'explorer-5',     name: 'Pathfinder',        desc: 'Visit 5 pages',                  icon: '\u{1F30D}', category: 'exploration', check: s => s.pagesVisited >= 5 },
  { id: 'explorer-all',   name: 'Cartographer',      desc: 'Visit every page',               icon: '\u{1F5FA}\uFE0F', category: 'exploration', check: s => s.pagesVisited >= 8 },

  // Leveling
  { id: 'level-5',        name: 'Rising Star',       desc: 'Reach level 5',                  icon: '\u2B50',    category: 'leveling',    check: s => s.level >= 5 },
  { id: 'level-10',       name: 'Power Player',      desc: 'Reach level 10',                 icon: '\u{1F31F}', category: 'leveling',    check: s => s.level >= 10 },
  { id: 'level-25',       name: 'Legendary',         desc: 'Reach level 25',                 icon: '\u{1F451}', category: 'leveling',    check: s => s.level >= 25 },
  { id: 'xp-1000',        name: 'XP Hoarder',        desc: 'Earn 1,000 XP',                  icon: '\u{1F4B0}', category: 'leveling',    check: s => s.xp >= 1000 },

  // Gaming
  { id: 'games-1',        name: 'Player One',        desc: 'Complete your first game',        icon: '\u{1F3AE}', category: 'gaming',      check: s => s.gamesPlayed >= 1 },
  { id: 'games-5',        name: 'Game Fan',           desc: 'Complete 5 games',               icon: '\u{1F579}\uFE0F', category: 'gaming',  check: s => s.gamesPlayed >= 5 },
  { id: 'games-16',       name: 'Completionist',     desc: 'Play all 16 games',              icon: '\u{1F3C6}', category: 'gaming',      check: s => s.gamesPlayed >= 16 },
  { id: 'high-score',     name: 'Score Chaser',      desc: 'Set a high score of 100+',       icon: '\u{1F4AF}', category: 'gaming',      check: s => s.maxScore >= 100 },

  // Easter Eggs
  { id: 'konami',         name: 'Cheat Code',        desc: 'Enter the Konami Code',          icon: '\u{1F3AE}', category: 'easter-egg',  check: s => s.konamiUsed },
  { id: 'glint-met',      name: 'Met Glint',         desc: 'Discover the hidden character',  icon: '\u{1F48E}', category: 'easter-egg',  check: s => s.glintMet },
  { id: 'vault-opened',   name: 'Vault Cracker',     desc: 'Open the Daily Cipher vault',    icon: '\u{1F512}', category: 'easter-egg',  check: s => s.vaultOpened },
  { id: 'cipher-streak-3',name: 'Cipher Streak',     desc: 'Solve the cipher 3 days in a row', icon: '\u{1F525}', category: 'easter-egg', check: s => s.cipherStreak >= 3 },
];

// ─── Gather Stats from localStorage ──────────────────────────────────
export function gatherStats(currentXp) {
  const xp = currentXp ?? parseInt(localStorage.getItem('jarowe_xp') || '0', 10);
  const level = Math.floor(xp / 100) + 1;
  const visitedPaths = JSON.parse(localStorage.getItem('jarowe_visited_paths') || '[]');

  // Count games with high scores
  let gamesPlayed = 0;
  let maxScore = 0;
  const gameIds = [
    'emoji-slots', 'fortune-cookie', 'whack-a-mole',
    'memory-match', 'word-scramble', 'snake', 'breakout', 'typing-race',
    'pizza-maker', 'mini-golf', 'space-invaders', 'dungeon-crawl',
    'claw-machine', 'slot-machine', 'rhythm-tap', 'scavenger-hunt',
  ];
  for (const gid of gameIds) {
    const hs = parseInt(localStorage.getItem(`jarowe_highscore_${gid}`) || '0', 10);
    if (hs > 0) gamesPlayed++;
    if (hs > maxScore) maxScore = hs;
  }

  // Easter egg flags
  const konamiUsed = !!localStorage.getItem('jarowe_konami_used');
  const glintMet = !!localStorage.getItem('jarowe_glint_met');
  const vaultOpened = !!localStorage.getItem('jarowe_vault_opened');

  // Cipher streak
  const cipherStreak = parseInt(localStorage.getItem('jarowe_cipher_streak') || '0', 10);

  return {
    xp,
    level,
    pagesVisited: visitedPaths.length,
    gamesPlayed,
    maxScore,
    konamiUsed,
    glintMet,
    vaultOpened,
    cipherStreak,
  };
}

// ─── Check Achievements ──────────────────────────────────────────────
// Returns array of newly unlocked achievement IDs
export function checkAchievements(stats, alreadyUnlocked = []) {
  const unlocked = new Set(alreadyUnlocked);
  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlocked.has(ach.id)) continue;
    try {
      if (ach.check(stats)) {
        newlyUnlocked.push(ach.id);
      }
    } catch (e) { /* skip */ }
  }

  return newlyUnlocked;
}
