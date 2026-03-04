import { lazy } from 'react';

// ─── Game Registry ───────────────────────────────────────────────────
// Central mapping of game IDs → lazy components + metadata
// tier: minimum holiday tier this game appears on
// xp: base XP awarded on completion
// duration: human-readable estimate shown before starting

export const GAMES = {
  // ── T1 Micro-Games (10-30 seconds) ──
  'emoji-slots':    { component: lazy(() => import('../games/EmojiSlots')),    tier: 1, name: 'Emoji Slots',    xp: 10,  duration: '15s' },
  'fortune-cookie': { component: lazy(() => import('../games/FortuneCookie')), tier: 1, name: 'Fortune Cookie',  xp: 10,  duration: '10s' },
  'whack-a-mole':   { component: lazy(() => import('../games/WhackAMole')),   tier: 1, name: 'Whack-a-Mole',   xp: 15,  duration: '20s' },

  // ── T2 Featured Games (1-3 minutes) ──
  'memory-match':   { component: lazy(() => import('../games/MemoryMatch')),   tier: 2, name: 'Memory Match',   xp: 25,  duration: '1-2m' },
  'word-scramble':  { component: lazy(() => import('../games/WordScramble')),  tier: 2, name: 'Word Scramble',  xp: 25,  duration: '1m' },
  'snake':          { component: lazy(() => import('../games/SnakeGame')),     tier: 2, name: 'Cosmic Snake',   xp: 25,  duration: '2m' },
  'breakout':       { component: lazy(() => import('../games/Breakout')),      tier: 2, name: 'Block Breaker',  xp: 30,  duration: '2m' },
  'typing-race':    { component: lazy(() => import('../games/TypingRace')),    tier: 2, name: 'Typing Race',    xp: 25,  duration: '1m' },

  // ── T3 Celebration Games (3-5 minutes) ──
  'pizza-maker':    { component: lazy(() => import('../games/PizzaMaker')),    tier: 3, name: 'Pizza Shop',     xp: 50,  duration: '3m' },
  'mini-golf':      { component: lazy(() => import('../games/MiniGolf')),      tier: 3, name: 'Mini Golf',      xp: 50,  duration: '3-5m' },
  'space-invaders': { component: lazy(() => import('../games/SpaceInvaders')), tier: 3, name: 'Space Defense',  xp: 50,  duration: '3m' },
  'dungeon-crawl':  { component: lazy(() => import('../games/DungeonCrawl')), tier: 3, name: 'Dungeon Crawl',  xp: 75,  duration: '5m' },
  'claw-machine':   { component: lazy(() => import('../games/ClawMachine')),   tier: 3, name: 'Claw Grab',     xp: 50,  duration: '2m' },
  'slot-machine':   { component: lazy(() => import('../games/SlotMachine')),   tier: 3, name: 'Lucky Spins',   xp: 40,  duration: '2m' },
  'rhythm-tap':     { component: lazy(() => import('../games/RhythmTap')),     tier: 3, name: 'Rhythm Tap',    xp: 50,  duration: '2m' },
  'scavenger-hunt': { component: lazy(() => import('../games/ScavengerHunt')), tier: 3, name: 'Scavenger Hunt', xp: 75,  duration: '5m' },
};

export function getGame(gameId) {
  return GAMES[gameId] || null;
}
