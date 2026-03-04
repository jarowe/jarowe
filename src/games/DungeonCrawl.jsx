import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

/* ─── Category Theming ─────────────────────────────────────────────── */
const THEMES = {
  spooky:  { enemy: ['🧟','👻','🦇'], boss: '💀', env: '🏚️', stairs: '🪦', floor: '🕸️', treasure: '🔮', wall: '🪨', player: '🧙' },
  scifi:   { enemy: ['🤖','👽','🦑'], boss: '🛸', env: '🚀', stairs: '🔷', floor: '⬡',  treasure: '💎', wall: '🧱', player: '🧑‍🚀' },
  space:   { enemy: ['☄️','🌑','🛰️'], boss: '🪐', env: '⭐', stairs: '🌀', floor: '✦',  treasure: '⭐', wall: '🪨', player: '🚀' },
  nature:  { enemy: ['🐍','🦎','🐗'], boss: '🐉', env: '🌿', stairs: '🍄', floor: '🌱', treasure: '🌺', wall: '🪵', player: '🧝' },
  tech:    { enemy: ['🔌','💻','🤖'], boss: '🖥️', env: '🔧', stairs: '⚡', floor: '·',  treasure: '💿', wall: '🔩', player: '🕹️' },
  food:    { enemy: ['🌶️','🔥','🧄'], boss: '🍖', env: '🍳', stairs: '🥄', floor: '·',  treasure: '🍰', wall: '🧱', player: '👨‍🍳' },
  default: { enemy: ['🐉','🐀','🦂'], boss: '👹', env: '🏰', stairs: '🪜', floor: '·',  treasure: '👑', wall: '🧱', player: '⚔️' },
};

const SIZE = 7;
const TOTAL_FLOORS = 3;

/* ─── Tile Types ───────────────────────────────────────────────────── */
const TILE = { FLOOR: 0, WALL: 1, ENEMY: 2, ITEM: 3, STAIRS: 4, TREASURE: 5, BOSS: 6 };
const ITEMS = [
  { emoji: '❤️', name: 'Health Potion', effect: 'heal', value: 25 },
  { emoji: '⚔️', name: 'Sword', effect: 'sword', value: 0 },
  { emoji: '🛡️', name: 'Shield', effect: 'shield', value: 0 },
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ─── Dungeon Generator ────────────────────────────────────────────── */
function generateFloor(floor, cat) {
  const t = THEMES[cat] || THEMES.default;
  // Start with all walls, then carve rooms
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(TILE.WALL));
  const enemies = [];
  const items = [];

  // Carve a connected dungeon using random walk from center
  const visited = new Set();
  const queue = [[3, 3]];
  visited.add('3,3');
  grid[3][3] = TILE.FLOOR;

  // Carve ~30-35 floor tiles via BFS with random expansion
  while (visited.size < 34 && queue.length > 0) {
    const idx = rand(0, Math.min(queue.length - 1, 2));
    const [r, c] = queue[idx];
    const dirs = shuffle([[0,1],[0,-1],[1,0],[-1,0]]);
    let expanded = false;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !visited.has(key)) {
        visited.add(key);
        grid[nr][nc] = TILE.FLOOR;
        queue.push([nr, nc]);
        expanded = true;
        break;
      }
    }
    if (!expanded) queue.splice(idx, 1);
  }

  // Collect all floor tiles (exclude center which is player start)
  const floorTiles = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === TILE.FLOOR && !(r === 3 && c === 3))
        floorTiles.push([r, c]);

  const shuffled = shuffle(floorTiles);
  let idx = 0;

  // Place stairs or treasure
  if (floor < TOTAL_FLOORS - 1) {
    // Stairs — place far from center
    const farTiles = shuffled.sort((a, b) => {
      const da = Math.abs(a[0] - 3) + Math.abs(a[1] - 3);
      const db = Math.abs(b[0] - 3) + Math.abs(b[1] - 3);
      return db - da;
    });
    const [sr, sc] = farTiles[0];
    grid[sr][sc] = TILE.STAIRS;
    idx = 1;
  } else {
    // Boss + treasure on final floor
    const farTiles = shuffled.sort((a, b) => {
      const da = Math.abs(a[0] - 3) + Math.abs(a[1] - 3);
      const db = Math.abs(b[0] - 3) + Math.abs(b[1] - 3);
      return db - da;
    });
    const [tr, tc] = farTiles[0];
    grid[tr][tc] = TILE.TREASURE;
    // Boss guards near treasure
    for (let i = 1; i < farTiles.length; i++) {
      const [br, bc] = farTiles[i];
      if (Math.abs(br - tr) + Math.abs(bc - tc) <= 2 && grid[br][bc] === TILE.FLOOR) {
        grid[br][bc] = TILE.BOSS;
        enemies.push({ r: br, c: bc, hp: 60 + floor * 20, maxHp: 60 + floor * 20, emoji: t.boss, isBoss: true, atk: 12 + floor * 4 });
        break;
      }
    }
    idx = 1;
  }

  // Place enemies (3-5)
  const enemyCount = rand(3, 5);
  const remaining = shuffled.filter(([r, c]) => grid[r][c] === TILE.FLOOR);
  for (let i = 0; i < enemyCount && i < remaining.length; i++) {
    const [er, ec] = remaining[i];
    grid[er][ec] = TILE.ENEMY;
    const eidx = rand(0, t.enemy.length - 1);
    enemies.push({ r: er, c: ec, hp: 20 + floor * 10, maxHp: 20 + floor * 10, emoji: t.enemy[eidx], isBoss: false, atk: 5 + floor * 3 });
  }

  // Place items (2-3)
  const itemSlots = remaining.filter(([r, c]) => grid[r][c] === TILE.FLOOR);
  const itemCount = rand(2, 3);
  for (let i = 0; i < itemCount && i < itemSlots.length; i++) {
    const [ir, ic] = itemSlots[itemSlots.length - 1 - i];
    if (grid[ir][ic] === TILE.FLOOR) {
      grid[ir][ic] = TILE.ITEM;
      items.push({ r: ir, c: ic, ...ITEMS[rand(0, ITEMS.length - 1)] });
    }
  }

  return { grid, enemies, items };
}

/* ─── Visibility ───────────────────────────────────────────────────── */
function calcVisible(pr, pc, revealed) {
  const vis = new Set(revealed);
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = pr + dr, nc = pc + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) vis.add(`${nr},${nc}`);
    }
  return vis;
}

function isAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

/* ─── Component ────────────────────────────────────────────────────── */
export default function DungeonCrawl({ onComplete, holiday, theme }) {
  const cat = holiday?.category || 'default';
  const t = THEMES[cat] || THEMES.default;
  const { best, submit } = useHighScore('dungeon-crawl');
  const containerRef = useRef(null);

  // Game state
  const [floor, setFloor] = useState(0);
  const [dungeon, setDungeon] = useState(() => generateFloor(0, cat));
  const [playerPos, setPlayerPos] = useState({ r: 3, c: 3 });
  const [hp, setHp] = useState(100);
  const [maxHp] = useState(100);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [hasSword, setHasSword] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  const [revealed, setRevealed] = useState(() => calcVisible(3, 3, new Set()));
  const [messages, setMessages] = useState([{ text: `Floor 1 — Find the ${floor < TOTAL_FLOORS - 1 ? 'stairs' : 'treasure'}!`, id: 0 }]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [deathAnims, setDeathAnims] = useState([]); // { r, c, emoji, id }
  const msgId = useRef(1);
  const gameOverRef = useRef(false);

  const addMsg = useCallback((text) => {
    const id = msgId.current++;
    setMessages(prev => [{ text, id }, ...prev].slice(0, 5));
  }, []);

  // Shake effect
  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 200);
  }, []);

  /* ─── Move Logic ───────────────────────────────────────────────── */
  const tryMove = useCallback((dr, dc) => {
    if (gameOverRef.current) return;

    setPlayerPos(prev => {
      const nr = prev.r + dr, nc = prev.c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) return prev;

      const tile = dungeon.grid[nr][nc];
      if (tile === TILE.WALL) return prev;

      // Enemy / Boss combat
      if (tile === TILE.ENEMY || tile === TILE.BOSS) {
        const enemy = dungeon.enemies.find(e => e.r === nr && e.c === nc && e.hp > 0);
        if (enemy) {
          const dmg = hasSword ? 25 : 12;
          enemy.hp -= dmg;
          playGameSound('pop');
          addMsg(`Hit ${enemy.emoji} for ${dmg} dmg! (${Math.max(0, enemy.hp)}HP left)`);

          if (enemy.hp <= 0) {
            // Kill
            playGameSound('correct');
            dungeon.grid[nr][nc] = TILE.FLOOR;
            const pts = enemy.isBoss ? 50 : 15;
            setScore(s => s + pts);
            setKills(k => k + 1);
            addMsg(`${enemy.emoji} defeated! +${pts} pts`);
            setDeathAnims(prev => [...prev, { r: nr, c: nc, emoji: enemy.emoji, id: msgId.current++ }]);
            // Move into cleared space
            const nextRevealed = calcVisible(nr, nc, revealed);
            setRevealed(nextRevealed);
            return { r: nr, c: nc };
          } else {
            // Enemy retaliates
            const eDmg = hasShield ? Math.ceil(enemy.atk / 2) : enemy.atk;
            setHp(h => {
              const next = Math.max(0, h - eDmg);
              if (next <= 0 && !gameOverRef.current) {
                gameOverRef.current = true;
                playGameSound('wrong');
                setGameOver(true);
              }
              return next;
            });
            triggerShake();
            addMsg(`${enemy.emoji} hits you for ${eDmg}!`);
            return prev; // don't move into enemy tile
          }
        }
      }

      // Item pickup
      if (tile === TILE.ITEM) {
        const item = dungeon.items.find(i => i.r === nr && i.c === nc);
        if (item) {
          dungeon.grid[nr][nc] = TILE.FLOOR;
          playGameSound('spin');
          if (item.effect === 'heal') {
            setHp(h => Math.min(maxHp, h + item.value));
            addMsg(`${item.emoji} Healed +${item.value} HP!`);
          } else if (item.effect === 'sword') {
            setHasSword(true);
            addMsg(`${item.emoji} Sword equipped! 2x damage`);
          } else if (item.effect === 'shield') {
            setHasShield(true);
            addMsg(`${item.emoji} Shield equipped! Half damage taken`);
          }
          setScore(s => s + 10);
        }
      }

      // Stairs
      if (tile === TILE.STAIRS) {
        playGameSound('win');
        const nextFloor = floor + 1;
        const bonus = 100;
        setScore(s => s + bonus);
        addMsg(`Descending to Floor ${nextFloor + 1}... +${bonus} pts`);
        setFloor(nextFloor);
        const newDungeon = generateFloor(nextFloor, cat);
        setDungeon(newDungeon);
        const newRevealed = calcVisible(3, 3, new Set());
        setRevealed(newRevealed);
        return { r: 3, c: 3 };
      }

      // Treasure — WIN
      if (tile === TILE.TREASURE) {
        if (!gameOverRef.current) {
          gameOverRef.current = true;
          playGameSound('win');
          const hpBonus = Math.round(hp);
          const finalScore = score + 200 + hpBonus;
          setScore(finalScore);
          addMsg(`${t.treasure} TREASURE FOUND! +200 + ${hpBonus} HP bonus`);
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          setWon(true);
          setGameOver(true);
          dungeon.grid[nr][nc] = TILE.FLOOR;
        }
      }

      playGameSound('tick');
      const nextRevealed = calcVisible(nr, nc, revealed);
      setRevealed(nextRevealed);
      return { r: nr, c: nc };
    });
  }, [dungeon, floor, cat, hp, score, hasSword, hasShield, maxHp, revealed, addMsg, triggerShake, t.treasure]);

  /* ─── Keyboard Controls ────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      const map = {
        ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1],
        w: [-1,0], s: [1,0], a: [0,-1], d: [0,1],
        W: [-1,0], S: [1,0], A: [0,-1], D: [0,1],
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); tryMove(dir[0], dir[1]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tryMove]);

  /* ─── Click/Tap movement ───────────────────────────────────────── */
  const handleCellClick = useCallback((r, c) => {
    if (gameOverRef.current) return;
    if (isAdjacent(playerPos.r, playerPos.c, r, c)) {
      tryMove(r - playerPos.r, c - playerPos.c);
    }
  }, [playerPos, tryMove]);

  /* ─── Game Over Handler ────────────────────────────────────────── */
  useEffect(() => {
    if (gameOver) {
      const finalScore = won ? score : score;
      submit(finalScore);
      const timer = setTimeout(() => onComplete(finalScore), won ? 2800 : 2000);
      return () => clearTimeout(timer);
    }
  }, [gameOver, won, score, submit, onComplete]);

  /* ─── Clean up death animations ────────────────────────────────── */
  useEffect(() => {
    if (deathAnims.length > 0) {
      const timer = setTimeout(() => setDeathAnims([]), 600);
      return () => clearTimeout(timer);
    }
  }, [deathAnims]);

  /* ─── Compute visible set for current render ───────────────────── */
  const currentVisible = useMemo(
    () => calcVisible(playerPos.r, playerPos.c, revealed),
    [playerPos, revealed]
  );

  /* ─── Render Grid Cell ─────────────────────────────────────────── */
  const renderCell = (r, c) => {
    const key = `${r},${c}`;
    const isPlayer = r === playerPos.r && c === playerPos.c;
    const isVis = currentVisible.has(key);
    const isNear = Math.abs(r - playerPos.r) <= 1 && Math.abs(c - playerPos.c) <= 1;
    const tile = dungeon.grid[r][c];

    let bg = 'rgba(10,10,20,0.95)';
    let content = '';
    let cursor = 'default';

    if (isVis) {
      if (tile === TILE.WALL) {
        bg = 'rgba(40,35,50,0.9)';
        content = t.wall;
      } else {
        bg = isNear ? 'rgba(30,28,45,0.7)' : 'rgba(20,18,35,0.85)';
        if (tile === TILE.ENEMY || tile === TILE.BOSS) {
          const enemy = dungeon.enemies.find(e => e.r === r && e.c === c && e.hp > 0);
          content = enemy ? enemy.emoji : '';
        } else if (tile === TILE.ITEM) {
          const item = dungeon.items.find(i => i.r === r && i.c === c);
          content = item ? item.emoji : '';
        } else if (tile === TILE.STAIRS) content = t.stairs;
        else if (tile === TILE.TREASURE) content = t.treasure;
      }
      if (isAdjacent(playerPos.r, playerPos.c, r, c) && tile !== TILE.WALL) cursor = 'pointer';
    }

    if (isPlayer) {
      content = t.player;
      bg = `${theme?.primary || '#7c3aed'}33`;
    }

    const deathHere = deathAnims.find(d => d.r === r && d.c === c);

    return (
      <div
        key={key}
        onClick={() => handleCellClick(r, c)}
        style={{
          width: '2.25rem', height: '2.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: bg,
          border: isVis && tile !== TILE.WALL ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.02)',
          borderRadius: 3,
          fontSize: isPlayer ? '1.15rem' : '0.95rem',
          cursor,
          position: 'relative',
          transition: 'background 0.2s',
          userSelect: 'none',
        }}
      >
        {isPlayer ? (
          <motion.span
            key={`p-${playerPos.r}-${playerPos.c}`}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            {content}
          </motion.span>
        ) : (
          isVis && content && <span>{content}</span>
        )}
        <AnimatePresence>
          {deathHere && (
            <motion.span
              key={deathHere.id}
              initial={{ opacity: 1, scale: 1, y: 0 }}
              animate={{ opacity: 0, scale: 2, y: -20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ position: 'absolute', fontSize: '1.2rem', pointerEvents: 'none' }}
            >
              {deathHere.emoji}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  };

  /* ─── HP Bar Color ─────────────────────────────────────────────── */
  const hpPct = hp / maxHp;
  const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';

  /* ─── JSX ──────────────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', outline: 'none', padding: '0.25rem 0' }}
      tabIndex={0}
    >
      {/* Stats Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: 340, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: '#fff' }}>
          <span>❤️</span>
          <div style={{
            width: 80, height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden',
            position: 'relative',
          }}>
            <motion.div
              animate={{ width: `${hpPct * 100}%` }}
              transition={{ duration: 0.3 }}
              style={{ height: '100%', background: hpColor, borderRadius: 5 }}
            />
          </div>
          <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{hp}</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>F{floor + 1}/{TOTAL_FLOORS}</span>
        <span style={{ fontSize: '0.75rem', color: theme?.primary || '#a78bfa' }}>⚡{score}</span>
        {hasSword && <span style={{ fontSize: '0.8rem' }} title="Sword equipped">⚔️</span>}
        {hasShield && <span style={{ fontSize: '0.8rem' }} title="Shield equipped">🛡️</span>}
        {best > 0 && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</span>}
      </div>

      {/* Grid */}
      <motion.div
        animate={shaking ? { x: [0, -3, 3, -2, 2, 0], y: [0, 2, -2, 1, -1, 0] } : {}}
        transition={{ duration: 0.2 }}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SIZE}, 2.25rem)`,
          gridTemplateRows: `repeat(${SIZE}, 2.25rem)`,
          gap: 2,
          background: 'rgba(0,0,0,0.3)',
          padding: 4,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {Array.from({ length: SIZE }, (_, r) =>
          Array.from({ length: SIZE }, (_, c) => renderCell(r, c))
        )}
      </motion.div>

      {/* D-Pad for mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 2.2rem)', gridTemplateRows: 'repeat(3, 2.2rem)', gap: 2, marginTop: 2 }}>
        <div />
        <button onClick={() => tryMove(-1, 0)} style={dpadStyle}>▲</button>
        <div />
        <button onClick={() => tryMove(0, -1)} style={dpadStyle}>◀</button>
        <div style={{ ...dpadStyle, background: 'rgba(255,255,255,0.03)', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)' }}>
          {kills}💀
        </div>
        <button onClick={() => tryMove(0, 1)} style={dpadStyle}>▶</button>
        <div />
        <button onClick={() => tryMove(1, 0)} style={dpadStyle}>▼</button>
        <div />
      </div>

      {/* Message Log */}
      <div style={{ maxWidth: 340, width: '100%', minHeight: 36 }}>
        <AnimatePresence mode="popLayout">
          {messages.slice(0, 3).map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.55)',
                padding: '1px 0',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.75)', borderRadius: 12, zIndex: 10,
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>
                {won ? t.treasure : '💀'}
              </div>
              <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
                {won ? 'Treasure Found!' : 'You Perished...'}
              </div>
              <div style={{ color: theme?.primary || '#a78bfa', fontSize: '1.4rem', fontWeight: 800 }}>
                {score} pts
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 4 }}>
                Floor {floor + 1} · {kills} enemies slain
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const dpadStyle = {
  width: '2.2rem', height: '2.2rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  color: 'rgba(255,255,255,0.5)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  outline: 'none',
  padding: 0,
};
