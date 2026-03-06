import { lazy } from 'react';

// ─── Game Registry ───────────────────────────────────────────────────
// Central mapping of game IDs → lazy components + metadata
// tier: minimum holiday tier this game appears on
// xp: base XP awarded on completion
// duration: human-readable estimate shown before starting
// variant: optional variant key passed to component for themed reskins

export const GAMES = {
  // ══════════════════════════════════════════════════════════════════════
  // ── T1 Micro-Games (10-30 seconds) ──
  // ══════════════════════════════════════════════════════════════════════
  'emoji-slots':    { component: lazy(() => import('../games/EmojiSlots')),    tier: 1, name: 'Emoji Slots',    xp: 10,  duration: '15s' },
  'fortune-cookie': { component: lazy(() => import('../games/FortuneCookie')), tier: 1, name: 'Fortune Cookie',  xp: 10,  duration: '10s' },
  'whack-a-mole':   { component: lazy(() => import('../games/WhackAMole')),   tier: 1, name: 'Whack-a-Mole',   xp: 15,  duration: '20s' },
  'gacha-pull':     { component: lazy(() => import('../games/GachaPull')),     tier: 1, name: 'Gacha Pull',     xp: 10,  duration: '15s' },
  'scratch-card':   { component: lazy(() => import('../games/ScratchCard')),   tier: 1, name: 'Scratch Card',   xp: 10,  duration: '20s' },
  'coin-toss':      { component: lazy(() => import('../games/CoinToss')),      tier: 1, name: 'Coin Toss',      xp: 10,  duration: '15s' },
  'lucky-wheel':    { component: lazy(() => import('../games/LuckyWheel')),    tier: 1, name: 'Lucky Wheel',    xp: 10,  duration: '15s' },

  // ── T1 Variants ──
  'gacha-pokemon':    { component: lazy(() => import('../games/GachaPull')),     tier: 1, name: 'Poke Gacha',       xp: 15, duration: '15s', variant: 'pokemon' },
  'scratch-pirate':   { component: lazy(() => import('../games/ScratchCard')),   tier: 1, name: 'Pirate Scratch',   xp: 15, duration: '20s', variant: 'pirate' },
  'coin-newyear':     { component: lazy(() => import('../games/CoinToss')),      tier: 1, name: 'NYE Coin Flip',    xp: 15, duration: '15s', variant: 'newyear' },
  'wheel-christmas':  { component: lazy(() => import('../games/LuckyWheel')),    tier: 1, name: 'Santa\'s Wheel',   xp: 15, duration: '15s', variant: 'christmas' },
  'slots-vegas':      { component: lazy(() => import('../games/EmojiSlots')),    tier: 1, name: 'Vegas Slots',      xp: 15, duration: '15s', variant: 'vegas' },
  'fortune-valentine':{ component: lazy(() => import('../games/FortuneCookie')), tier: 1, name: 'Love Fortune',     xp: 15, duration: '10s', variant: 'valentine' },
  'whack-alien':      { component: lazy(() => import('../games/WhackAMole')),    tier: 1, name: 'Alien Whack',      xp: 15, duration: '20s', variant: 'alien' },

  // ══════════════════════════════════════════════════════════════════════
  // ── T2 Featured Games (1-3 minutes) ──
  // ══════════════════════════════════════════════════════════════════════
  'memory-match':   { component: lazy(() => import('../games/MemoryMatch')),   tier: 2, name: 'Memory Match',    xp: 25, duration: '1-2m' },
  'word-scramble':  { component: lazy(() => import('../games/WordScramble')),  tier: 2, name: 'Word Scramble',   xp: 25, duration: '1m' },
  'snake':          { component: lazy(() => import('../games/SnakeGame')),     tier: 2, name: 'Cosmic Snake',    xp: 25, duration: '2m' },
  'breakout':       { component: lazy(() => import('../games/Breakout')),      tier: 2, name: 'Block Breaker',   xp: 30, duration: '2m' },
  'typing-race':    { component: lazy(() => import('../games/TypingRace')),    tier: 2, name: 'Typing Race',     xp: 25, duration: '1m' },
  'bubble-pop':     { component: lazy(() => import('../games/BubblePop')),     tier: 2, name: 'Bubble Pop',      xp: 25, duration: '1m' },
  'tower-stack':    { component: lazy(() => import('../games/TowerStack')),    tier: 2, name: 'Tower Stack',     xp: 25, duration: '1-2m' },
  'reaction-test':  { component: lazy(() => import('../games/ReactionTest')),  tier: 2, name: 'Reaction Test',   xp: 25, duration: '1m' },
  'color-flood':    { component: lazy(() => import('../games/ColorFlood')),    tier: 2, name: 'Color Flood',     xp: 25, duration: '2m' },
  'catch-dodge':    { component: lazy(() => import('../games/CatchDodge')),    tier: 2, name: 'Catch & Dodge',   xp: 25, duration: '1m' },
  'pattern-recall': { component: lazy(() => import('../games/PatternRecall')), tier: 2, name: 'Pattern Recall',  xp: 30, duration: '2m' },

  // ── T2 Variants ──
  'memory-mothers':   { component: lazy(() => import('../games/MemoryMatch')),   tier: 2, name: 'Love Match',       xp: 30, duration: '1-2m', variant: 'mothers' },
  'words-pi':         { component: lazy(() => import('../games/WordScramble')),  tier: 2, name: 'Pi Scramble',      xp: 30, duration: '1m',   variant: 'pi' },
  'snake-halloween':  { component: lazy(() => import('../games/SnakeGame')),     tier: 2, name: 'Spooky Snake',     xp: 30, duration: '2m',   variant: 'halloween' },
  'breakout-space':   { component: lazy(() => import('../games/Breakout')),      tier: 2, name: 'Asteroid Breaker', xp: 35, duration: '2m',   variant: 'space' },
  'typing-music':     { component: lazy(() => import('../games/TypingRace')),    tier: 2, name: 'Music Typer',      xp: 30, duration: '1m',   variant: 'music' },
  'bubble-chocolate': { component: lazy(() => import('../games/BubblePop')),     tier: 2, name: 'Choco Pop',        xp: 30, duration: '1m',   variant: 'chocolate' },
  'tower-fireworks':  { component: lazy(() => import('../games/TowerStack')),    tier: 2, name: 'Firework Tower',   xp: 30, duration: '1-2m', variant: 'fireworks' },
  'reaction-ninja':   { component: lazy(() => import('../games/ReactionTest')),  tier: 2, name: 'Ninja Reflexes',   xp: 30, duration: '1m',   variant: 'ninja' },
  'flood-rainbow':    { component: lazy(() => import('../games/ColorFlood')),    tier: 2, name: 'Paint the Planet', xp: 30, duration: '2m',   variant: 'rainbow' },
  'catch-snow':       { component: lazy(() => import('../games/CatchDodge')),    tier: 2, name: 'Snowflake Catch',  xp: 30, duration: '1m',   variant: 'snow' },
  'pattern-alien':    { component: lazy(() => import('../games/PatternRecall')), tier: 2, name: 'Alien Signals',    xp: 35, duration: '2m',   variant: 'alien' },

  // ══════════════════════════════════════════════════════════════════════
  // ── T3 Celebration Games (3-5 minutes) ──
  // ══════════════════════════════════════════════════════════════════════
  'pizza-maker':     { component: lazy(() => import('../games/PizzaMaker')),     tier: 3, name: 'Pizza Shop',       xp: 50, duration: '3m' },
  'mini-golf':       { component: lazy(() => import('../games/MiniGolf')),       tier: 3, name: 'Mini Golf',        xp: 50, duration: '3-5m' },
  'space-invaders':  { component: lazy(() => import('../games/SpaceInvaders')),  tier: 3, name: 'Space Defense',    xp: 50, duration: '3m' },
  'dungeon-crawl':   { component: lazy(() => import('../games/DungeonCrawl')),   tier: 3, name: 'Dungeon Crawl',    xp: 75, duration: '5m' },
  'claw-machine':    { component: lazy(() => import('../games/ClawMachine')),    tier: 3, name: 'Claw Grab',        xp: 50, duration: '2m' },
  'slot-machine':    { component: lazy(() => import('../games/SlotMachine')),    tier: 3, name: 'Lucky Spins',      xp: 40, duration: '2m' },
  'rhythm-tap':      { component: lazy(() => import('../games/RhythmTap')),      tier: 3, name: 'Rhythm Tap',       xp: 50, duration: '2m' },
  'scavenger-hunt':  { component: lazy(() => import('../games/ScavengerHunt')),  tier: 3, name: 'Scavenger Hunt',   xp: 75, duration: '5m' },
  'platform-runner': { component: lazy(() => import('../games/PlatformRunner')), tier: 3, name: 'Platform Runner',  xp: 50, duration: '3m' },
  'card-battle':     { component: lazy(() => import('../games/CardBattle')),     tier: 3, name: 'Card Battle',      xp: 50, duration: '3-5m' },
  'treasure-dig':    { component: lazy(() => import('../games/TreasureDig')),    tier: 3, name: 'Treasure Dig',     xp: 50, duration: '3m' },
  'rune-match':      { component: lazy(() => import('../games/RuneMatch')),      tier: 3, name: 'Rune Match',       xp: 50, duration: '3m' },
  'conveyor-chef':   { component: lazy(() => import('../games/ConveyorChef')),   tier: 3, name: 'Conveyor Chef',    xp: 50, duration: '3m' },
  'asteroid-dodge':  { component: lazy(() => import('../games/AsteroidDodge')),  tier: 3, name: 'Asteroid Dodge',   xp: 50, duration: '3m' },

  // ── T3 Variants ──
  'runner-mario':      { component: lazy(() => import('../games/PlatformRunner')), tier: 3, name: 'Mario Run',        xp: 60, duration: '3m',   variant: 'mario' },
  'cards-jedi':        { component: lazy(() => import('../games/CardBattle')),     tier: 3, name: 'Jedi Duel',        xp: 60, duration: '3-5m', variant: 'jedi' },
  'treasure-tomb':     { component: lazy(() => import('../games/TreasureDig')),    tier: 3, name: 'Tomb Raider',      xp: 60, duration: '3m',   variant: 'tomb' },
  'rune-spell':        { component: lazy(() => import('../games/RuneMatch')),      tier: 3, name: 'Witch\'s Brew',    xp: 60, duration: '3m',   variant: 'spell' },
  'chef-taco':         { component: lazy(() => import('../games/ConveyorChef')),   tier: 3, name: 'Taco Stand',       xp: 60, duration: '3m',   variant: 'taco' },
  'asteroid-moon':     { component: lazy(() => import('../games/AsteroidDodge')),  tier: 3, name: 'Moon Landing',     xp: 60, duration: '3m',   variant: 'moon' },
  'pizza-birthday':    { component: lazy(() => import('../games/PizzaMaker')),     tier: 3, name: 'Pizza Perfection', xp: 60, duration: '3m',   variant: 'birthday' },
  'golf-stpatrick':    { component: lazy(() => import('../games/MiniGolf')),       tier: 3, name: 'Lucky Links',      xp: 60, duration: '3-5m', variant: 'stpatrick' },
  'invaders-startrek': { component: lazy(() => import('../games/SpaceInvaders')),  tier: 3, name: 'Trek Defense',     xp: 60, duration: '3m',   variant: 'startrek' },
  'dungeon-alien':     { component: lazy(() => import('../games/DungeonCrawl')),   tier: 3, name: 'Alien Ship',       xp: 80, duration: '5m',   variant: 'alien' },
  'claw-presents':     { component: lazy(() => import('../games/ClawMachine')),    tier: 3, name: 'Gift Grabber',     xp: 60, duration: '2m',   variant: 'presents' },
  'slots-casino':      { component: lazy(() => import('../games/SlotMachine')),    tier: 3, name: 'NYE Jackpot',      xp: 50, duration: '2m',   variant: 'casino' },
  'rhythm-summer':     { component: lazy(() => import('../games/RhythmTap')),      tier: 3, name: 'Beach Beats',      xp: 60, duration: '2m',   variant: 'summer' },
  'hunt-treasure':     { component: lazy(() => import('../games/ScavengerHunt')),  tier: 3, name: 'Treasure Hunt',    xp: 80, duration: '5m',   variant: 'treasure' },
};

export function getGame(gameId) {
  return GAMES[gameId] || null;
}
