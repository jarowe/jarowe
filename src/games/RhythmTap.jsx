import { useState, useRef, useCallback, useEffect } from 'react';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const W = 300;
const H = 450;
const LANE_W = W / 3;
const HIT_Y = H - 60;
const NOTE_R = 16;
const GAME_DURATION = 45;
const BPM = 120;
const BEAT_MS = 60000 / BPM;
const FALL_SPEED = 2.8;
const PERFECT_ZONE = 15;
const GREAT_ZONE = 30;
const GOOD_ZONE = 50;

const LANE_THEMES = {
  music:   ['#ef4444', '#3b82f6', '#22c55e'],
  tech:    ['#06b6d4', '#a855f7', '#10b981'],
  space:   ['#7c3aed', '#3b82f6', '#06b6d4'],
  nature:  ['#22c55e', '#f59e0b', '#10b981'],
  food:    ['#f59e0b', '#ef4444', '#ec4899'],
  spooky:  ['#f97316', '#22c55e', '#a855f7'],
  winter:  ['#38bdf8', '#e0f2fe', '#93c5fd'],
  family:  ['#ec4899', '#f43f5e', '#f472b6'],
};

function getLaneColors(category, theme) {
  if (LANE_THEMES[category]) return LANE_THEMES[category];
  return [theme?.primary || '#7c3aed', theme?.secondary || '#06b6d4', '#fbbf24'];
}

// Pre-generate a note chart (spawn times + lanes)
function generateChart(durationMs) {
  const notes = [];
  let id = 0;
  const beats = Math.floor(durationMs / BEAT_MS);
  // Travel time: note needs to fall from y=0 to HIT_Y at FALL_SPEED px/frame (~60fps)
  // frames = HIT_Y / FALL_SPEED, time = frames * 16.67ms
  const travelMs = (HIT_Y / FALL_SPEED) * (1000 / 60);

  for (let i = 0; i < beats; i++) {
    const beatTime = i * BEAT_MS;
    // Spawn time is when the note should appear (beat time minus travel time)
    const spawnTime = beatTime - travelMs;

    // Skip the first couple beats to let player get ready
    if (beatTime < 1500) continue;

    const rand = Math.random();

    if (rand < 0.55) {
      // Single note
      const lane = Math.floor(Math.random() * 3);
      notes.push({ id: id++, lane, spawnTime, beatTime });
    } else if (rand < 0.80) {
      // Double note (two lanes at once)
      const lanes = [0, 1, 2];
      const skip = Math.floor(Math.random() * 3);
      lanes.splice(skip, 1);
      for (const lane of lanes) {
        notes.push({ id: id++, lane, spawnTime, beatTime });
      }
    } else if (rand < 0.92) {
      // Quick sequence: 3 notes across half-beats
      for (let j = 0; j < 3; j++) {
        const lane = j;
        const offset = j * (BEAT_MS / 3);
        notes.push({
          id: id++,
          lane,
          spawnTime: spawnTime + offset,
          beatTime: beatTime + offset,
        });
      }
    }
    // ~8% chance of rest (no note on this beat) - breathing room
  }

  return notes;
}

const RT_VARIANTS = {
  summer: {
    laneColors: ['#f59e0b', '#06b6d4', '#22c55e'],
    noteEmoji: '🏄',
    bgGradient: 'linear-gradient(180deg, #0a2e4a 0%, #1a4a6a 100%)',
  },
};

export default function RhythmTap({ onComplete, holiday, theme, variant }) {
  const rtCfg = variant ? RT_VARIANTS[variant] : null;
  const canvasRef = useRef(null);
  const loopRef = useRef(null);
  const stateRef = useRef(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const { best, submit } = useHighScore('rhythmtap');

  const category = holiday?.category || 'default';
  const laneColors = getLaneColors(category, theme);

  // Initialize state
  if (!stateRef.current) {
    stateRef.current = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      hits: 0,
      misses: 0,
      perfects: 0,
      greats: 0,
      goods: 0,
      notes: [],         // active falling notes
      chart: [],          // pre-generated chart
      chartIdx: 0,
      flashes: [],        // { lane, grade, y, alpha, dy, text }
      startTime: 0,
      elapsed: 0,
      running: false,
      hitLinePulse: 0,
      comboScale: 1,
    };
  }

  // Handle lane tap
  const tapLane = useCallback((lane) => {
    const s = stateRef.current;
    if (!s.running) return;

    // Find the closest unhit note in this lane near the hit line
    let closest = null;
    let closestDist = Infinity;
    for (const note of s.notes) {
      if (note.hit || note.missed || note.lane !== lane) continue;
      const dist = Math.abs(note.y - HIT_Y);
      if (dist < GOOD_ZONE && dist < closestDist) {
        closest = note;
        closestDist = dist;
      }
    }

    if (!closest) {
      // Tapped with nothing nearby — small penalty flash
      s.flashes.push({
        lane, grade: 'miss', y: HIT_Y, alpha: 1, dy: -1.5,
        text: '', color: '#ef4444',
      });
      return;
    }

    closest.hit = true;
    const dist = closestDist;
    let grade, pts, color;

    if (dist <= PERFECT_ZONE) {
      grade = 'perfect'; pts = 100; color = '#fbbf24';
      s.perfects++;
      playGameSound('correct');
    } else if (dist <= GREAT_ZONE) {
      grade = 'great'; pts = 50; color = '#22c55e';
      s.greats++;
      playGameSound('pop');
    } else {
      grade = 'good'; pts = 25; color = '#3b82f6';
      s.goods++;
      playGameSound('tick');
    }

    s.combo++;
    if (s.combo > s.maxCombo) s.maxCombo = s.combo;
    const multiplier = Math.min(8, 1 + Math.floor(s.combo / 5));
    const earned = pts * multiplier;
    s.score += earned;
    s.hits++;
    s.hitLinePulse = 1;

    // Combo milestone scale
    if (s.combo > 0 && s.combo % 5 === 0) {
      s.comboScale = 1.6;
    }

    // Float-up text
    s.flashes.push({
      lane: closest.lane,
      grade,
      y: HIT_Y - 10,
      alpha: 1,
      dy: -2,
      text: `+${earned}`,
      color,
    });

    setScore(s.score);
    setCombo(s.combo);
  }, []);

  // Keyboard input
  useEffect(() => {
    const handler = (e) => {
      if (!stateRef.current?.running) return;
      const key = e.key.toLowerCase();
      if (key === 'd' || key === '1') tapLane(0);
      else if (key === 'f' || key === '2') tapLane(1);
      else if (key === 'j' || key === '3') tapLane(2);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tapLane]);

  // Canvas click/tap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e) => {
      if (!started) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = (clientX - rect.left) * scaleX;
      const lane = Math.min(2, Math.floor(x / LANE_W));
      tapLane(lane);
    };
    canvas.addEventListener('pointerdown', handler);
    return () => canvas.removeEventListener('pointerdown', handler);
  }, [started, tapLane]);

  // Start game
  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.score = 0;
    s.combo = 0;
    s.maxCombo = 0;
    s.hits = 0;
    s.misses = 0;
    s.perfects = 0;
    s.greats = 0;
    s.goods = 0;
    s.notes = [];
    s.chart = generateChart(GAME_DURATION * 1000);
    s.chartIdx = 0;
    s.flashes = [];
    s.startTime = performance.now();
    s.elapsed = 0;
    s.running = true;
    s.hitLinePulse = 0;
    s.comboScale = 1;
    setScore(0);
    setCombo(0);
    setStarted(true);
    setDone(false);
  }, []);

  // Game loop
  useEffect(() => {
    if (!started || done) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    function tick() {
      if (!s.running) return;
      const now = performance.now();
      s.elapsed = now - s.startTime;

      // Time's up?
      if (s.elapsed >= GAME_DURATION * 1000) {
        s.running = false;
        setDone(true);
        const isGood = s.score > 2000;
        playGameSound(isGood ? 'win' : 'pop');
        if (isGood) {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.4 },
            colors: [laneColors[0], laneColors[1], laneColors[2], '#fbbf24'],
          });
        }
        submit(s.score);
        onComplete(s.score);
        return;
      }

      // Spawn notes from chart
      while (s.chartIdx < s.chart.length && s.chart[s.chartIdx].spawnTime <= s.elapsed) {
        const entry = s.chart[s.chartIdx];
        s.notes.push({
          id: entry.id,
          lane: entry.lane,
          y: -NOTE_R,
          hit: false,
          missed: false,
          alpha: 1,
        });
        s.chartIdx++;
      }

      // Update notes
      for (const note of s.notes) {
        if (note.hit) {
          // Fade out hit notes quickly
          note.alpha -= 0.12;
          continue;
        }
        note.y += FALL_SPEED;

        // Missed: passed the hit zone
        if (!note.missed && note.y > HIT_Y + GOOD_ZONE) {
          note.missed = true;
          s.misses++;
          s.combo = 0;
          setCombo(0);
          s.flashes.push({
            lane: note.lane,
            grade: 'miss',
            y: HIT_Y,
            alpha: 1,
            dy: -1,
            text: 'MISS',
            color: '#ef4444',
          });
        }

        // Remove notes that have gone off screen
        if (note.missed && note.y > H + 30) {
          note.alpha = 0;
        }
      }

      // Prune dead notes
      s.notes = s.notes.filter(n => n.alpha > 0);

      // Update flashes
      for (const f of s.flashes) {
        f.y += f.dy;
        f.alpha -= 0.025;
      }
      s.flashes = s.flashes.filter(f => f.alpha > 0);

      // Decay pulse and combo scale
      s.hitLinePulse *= 0.9;
      s.comboScale += (1 - s.comboScale) * 0.1;

      // === DRAW ===
      // Background gradient (dark top to darker bottom)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0a0a1e');
      bgGrad.addColorStop(1, '#050510');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Lane separators + subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        const x = i * LANE_W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      // Horizontal grid lines
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Lane glow at bottom (target zone glow per lane)
      for (let i = 0; i < 3; i++) {
        const cx = i * LANE_W + LANE_W / 2;
        const grad = ctx.createRadialGradient(cx, HIT_Y, 0, cx, HIT_Y, 50);
        grad.addColorStop(0, laneColors[i] + '18');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(i * LANE_W, HIT_Y - 50, LANE_W, 100);
      }

      // Hit line
      const pulseW = 2 + s.hitLinePulse * 3;
      const pulseAlpha = 0.5 + s.hitLinePulse * 0.5;
      ctx.strokeStyle = `rgba(255,255,255,${pulseAlpha})`;
      ctx.lineWidth = pulseW;
      ctx.beginPath();
      ctx.moveTo(0, HIT_Y);
      ctx.lineTo(W, HIT_Y);
      ctx.stroke();

      // Hit line glow
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8 + s.hitLinePulse * 15;
      ctx.strokeStyle = `rgba(255,255,255,${0.2 + s.hitLinePulse * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, HIT_Y);
      ctx.lineTo(W, HIT_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Lane target circles
      for (let i = 0; i < 3; i++) {
        const cx = i * LANE_W + LANE_W / 2;
        ctx.strokeStyle = laneColors[i] + '40';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, HIT_Y, NOTE_R + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Falling notes
      for (const note of s.notes) {
        if (note.alpha <= 0) continue;
        const cx = note.lane * LANE_W + LANE_W / 2;
        const color = laneColors[note.lane];
        const a = Math.min(1, note.alpha);

        // Trail effect (streak behind the note)
        if (!note.hit && !note.missed) {
          const trailGrad = ctx.createLinearGradient(cx, note.y, cx, note.y - 40);
          trailGrad.addColorStop(0, color + '60');
          trailGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = trailGrad;
          ctx.beginPath();
          ctx.roundRect(cx - 6, note.y - 40, 12, 40, 6);
          ctx.fill();
        }

        // Note body (rounded rect)
        ctx.globalAlpha = a;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(cx - NOTE_R, note.y - NOTE_R / 1.6, NOTE_R * 2, NOTE_R * 1.2, 8);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner highlight
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.roundRect(cx - NOTE_R + 3, note.y - NOTE_R / 1.6 + 2, NOTE_R * 2 - 6, NOTE_R * 0.5, 4);
        ctx.fill();

        ctx.globalAlpha = 1;
      }

      // Float-up flashes (score text)
      for (const f of s.flashes) {
        const cx = f.lane * LANE_W + LANE_W / 2;
        ctx.globalAlpha = Math.max(0, f.alpha);
        ctx.fillStyle = f.color;
        ctx.font = f.grade === 'perfect' ? 'bold 16px sans-serif' : 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (f.text) {
          ctx.fillText(f.text, cx, f.y);
        }
        // Grade word above the score
        if (f.grade === 'perfect' || f.grade === 'great' || f.grade === 'good') {
          ctx.font = '10px sans-serif';
          ctx.fillStyle = f.color + 'cc';
          ctx.fillText(f.grade.toUpperCase(), cx, f.y - 14);
        }
        if (f.grade === 'miss' && f.text === 'MISS') {
          ctx.font = 'bold 14px sans-serif';
          ctx.fillStyle = '#ef4444';
          ctx.fillText('MISS', cx, f.y);
        }
        ctx.globalAlpha = 1;
      }

      // Progress bar at top
      const progress = s.elapsed / (GAME_DURATION * 1000);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, 0, W, 4);
      const progGrad = ctx.createLinearGradient(0, 0, W * progress, 0);
      progGrad.addColorStop(0, laneColors[0]);
      progGrad.addColorStop(0.5, laneColors[1]);
      progGrad.addColorStop(1, laneColors[2]);
      ctx.fillStyle = progGrad;
      ctx.fillRect(0, 0, W * progress, 4);

      // Lane labels at bottom
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      const labels = ['D / 1', 'F / 2', 'J / 3'];
      for (let i = 0; i < 3; i++) {
        ctx.fillText(labels[i], i * LANE_W + LANE_W / 2, H - 10);
      }

      loopRef.current = requestAnimationFrame(tick);
    }

    loopRef.current = requestAnimationFrame(tick);
    return () => {
      s.running = false;
      cancelAnimationFrame(loopRef.current);
    };
  }, [started, done, laneColors, submit, onComplete]);

  // Results screen
  if (done) {
    const s = stateRef.current;
    const total = s.hits + s.misses;
    const accuracy = total > 0 ? Math.round((s.hits / total) * 100) : 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
        <h3 style={{ color: '#fff', margin: '0.5rem 0 0', fontSize: '1.2rem' }}>
          {s.score > 2000 ? 'Amazing Performance!' : s.score > 800 ? 'Nice Rhythm!' : 'Keep Practicing!'}
        </h3>
        <div style={{
          fontSize: '2rem', fontWeight: 700, color: laneColors[0],
          textShadow: `0 0 20px ${laneColors[0]}60`,
        }}>
          {s.score.toLocaleString()} pts
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem',
          fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)',
        }}>
          <span>Accuracy</span><span style={{ color: '#fff', textAlign: 'right' }}>{accuracy}%</span>
          <span>Max Combo</span><span style={{ color: '#fbbf24', textAlign: 'right' }}>{s.maxCombo}x</span>
          <span style={{ color: '#fbbf24' }}>Perfect</span><span style={{ textAlign: 'right' }}>{s.perfects}</span>
          <span style={{ color: '#22c55e' }}>Great</span><span style={{ textAlign: 'right' }}>{s.greats}</span>
          <span style={{ color: '#3b82f6' }}>Good</span><span style={{ textAlign: 'right' }}>{s.goods}</span>
          <span style={{ color: '#ef4444' }}>Miss</span><span style={{ textAlign: 'right' }}>{s.misses}</span>
        </div>
        {best > 0 && (
          <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            Best: {best.toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
      {/* Score + combo header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: W, maxWidth: '100%', fontSize: '0.8rem',
      }}>
        <span style={{ color: laneColors[0], fontWeight: 600 }}>{score} pts</span>
        {combo > 0 && (
          <span style={{
            color: '#fbbf24',
            fontWeight: 700,
            fontSize: `${Math.min(1.2, 0.8 * (stateRef.current?.comboScale || 1))}rem`,
            transition: 'font-size 0.1s',
          }}>
            {combo}x COMBO
          </span>
        )}
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          {started ? `${Math.max(0, GAME_DURATION - Math.floor((stateRef.current?.elapsed || 0) / 1000))}s` : `${GAME_DURATION}s`}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={() => { if (!started) startGame(); }}
        style={{
          borderRadius: '0.5rem',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '100%',
          touchAction: 'none',
          cursor: started ? 'default' : 'pointer',
        }}
      />

      {!started && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: '0.3rem 0' }}>
            Click to start
          </p>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            Keys: D / F / J &nbsp;&bull;&nbsp; Tap left / center / right
          </p>
        </div>
      )}
      {best > 0 && !started && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          Best: {best.toLocaleString()}
        </p>
      )}
    </div>
  );
}
