import { useEffect, useRef, useMemo } from 'react';
import { animate, stagger, createTimeline, createDrawable } from 'animejs';
import './AvatarGeometry.css';

/* ═══════════════════════════════════════════════════════════════════════
   AVATAR GEOMETRY — Family Pentagon (anime.js v4)

   A meaningful sacred geometry frame built around the number 5.
   Five family members, five vertices, five elements, five points of
   the golden-ratio pentagram. The pentagon — symbol of protection,
   harmony, and the divine proportion — frames Jared's avatar.

   The pentagram's diagonals divide each other in the golden ratio
   (phi = 1.618...), making every intersection a mathematical expression
   of beauty. Each vertex holds a family member's light.

   Jared (purple)  — top vertex, the keystone
   Maria (teal)    — upper-right, the heart
   Jace  (blue)    — lower-right, the explorer
   Jax   (red)     — lower-left, the spark
   Jole  (emerald) — upper-left, the wonder
   ═══════════════════════════════════════════════════════════════════════ */

const CX = 110, CY = 110;
const PHI = (1 + Math.sqrt(5)) / 2; // 1.618...

const FAMILY = [
  { name: 'Jared', color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
  { name: 'Maria', color: '#06b6d4', glow: 'rgba(6,182,212,0.5)' },
  { name: 'Jace',  color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
  { name: 'Jax',   color: '#ef4444', glow: 'rgba(239,68,68,0.5)' },
  { name: 'Jole',  color: '#22c55e', glow: 'rgba(34,197,94,0.5)' },
];

/* Vertex positions: top=Jared, then CW */
function vertexAt(i, r) {
  const a = (i * 72 - 90) * Math.PI / 180; // 72 = 360/5, start at top
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

/* Pentagon path (connect adjacent vertices) */
function pentagonPath(r) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const v = vertexAt(i, r);
    pts.push(`${v.x},${v.y}`);
  }
  return pts.join(' ');
}

/* Pentagram path (connect every-other vertex: 0→2→4→1→3→0) */
function pentagramPath(r) {
  const order = [0, 2, 4, 1, 3];
  const pts = order.map(i => {
    const v = vertexAt(i, r);
    return `${v.x},${v.y}`;
  });
  return pts.join(' ');
}

/* Golden spiral approximation — logarithmic spiral from center outward */
function goldenSpiralPath(startR, endR, turns) {
  const steps = 120;
  const b = Math.log(endR / startR) / (turns * 2 * Math.PI);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * 2 * Math.PI;
    const r = startR * Math.exp(b * t);
    const x = CX + r * Math.cos(t - Math.PI / 2);
    const y = CY + r * Math.sin(t - Math.PI / 2);
    pts.push(i === 0 ? `M${x} ${y}` : `L${x} ${y}`);
  }
  return pts.join(' ');
}

/* Bond lines from center to each family vertex */
function bondLine(i, r) {
  const v = vertexAt(i, r);
  return { x1: CX, y1: CY, x2: v.x, y2: v.y };
}

/* Light motes — tiny particles between family vertices */
function moteData() {
  const motes = [];
  for (let i = 0; i < 5; i++) {
    const v1 = vertexAt(i, 68);
    const v2 = vertexAt((i + 1) % 5, 68);
    // 3 motes per edge, evenly spaced
    for (let j = 1; j <= 3; j++) {
      const t = j / 4;
      motes.push({
        cx: v1.x + (v2.x - v1.x) * t,
        cy: v1.y + (v2.y - v1.y) * t,
        color: FAMILY[i].color,
        nextColor: FAMILY[(i + 1) % 5].color,
        r: 1.0 + (j % 2) * 0.5,
      });
    }
  }
  return motes;
}
const MOTES = moteData();

/* Outer ticks — 5 groups of 3, colored per family member */
function outerTicks() {
  const ticks = [];
  for (let i = 0; i < 5; i++) {
    const baseA = i * 72 - 90;
    for (let j = -1; j <= 1; j++) {
      const a = (baseA + j * 8) * Math.PI / 180;
      const r1 = j === 0 ? 82 : 84;
      const r2 = j === 0 ? 92 : 90;
      ticks.push({
        x1: CX + r1 * Math.cos(a), y1: CY + r1 * Math.sin(a),
        x2: CX + r2 * Math.cos(a), y2: CY + r2 * Math.sin(a),
        color: FAMILY[i].color,
        major: j === 0,
      });
    }
  }
  return ticks;
}
const TICKS = outerTicks();

export default function AvatarGeometry({ children, effect }) {
  const geoRef = useRef(null);
  const animsRef = useRef([]);
  const hoveredRef = useRef(false);

  /* ── Mount: entrance timeline + continuous loops ── */
  useEffect(() => {
    const el = geoRef.current;
    if (!el) return;
    const anims = animsRef.current;

    const tl = createTimeline({ defaults: { ease: 'outQuad' } });

    // 0.0s — Center harmony ring draws
    const harmonyRing = el.querySelector('.fp-harmony-ring');
    if (harmonyRing) {
      const d = createDrawable(harmonyRing);
      tl.add(d, { draw: '0 1', duration: 1200, ease: 'inOutQuad' }, 0);
    }

    // 0.3s — Bond lines from center reach outward (family connection)
    el.querySelectorAll('.fp-bond').forEach((line, i) => {
      const d = createDrawable(line);
      tl.add(d, { draw: '0 1', duration: 800, ease: 'outQuad' }, 300 + i * 120);
    });

    // 0.6s — Pentagon draws (the 5-sided home)
    el.querySelectorAll('.fp-pentagon').forEach(p => {
      const d = createDrawable(p);
      tl.add(d, { draw: '0 1', duration: 1400, ease: 'inOutQuad' }, 600);
    });

    // 1.0s — Family circles bloom at each vertex (white fill, colored stroke)
    tl.add(el.querySelectorAll('.fp-family-circle'), {
      r: [0, 3.5], opacity: [0, 1], duration: 700, ease: 'outBack(2)',
      delay: stagger(150),
    }, 1000);

    // 1.1s — Family stroke rings appear
    tl.add(el.querySelectorAll('.fp-family-stroke'), {
      r: [0, 6], opacity: [0, 0.9], duration: 700, ease: 'outBack(2)',
      delay: stagger(150),
    }, 1100);

    // 1.2s — Family glows appear
    tl.add(el.querySelectorAll('.fp-family-glow'), {
      r: [0, 9], opacity: [0, 0.2], duration: 800, ease: 'outQuad',
      delay: stagger(150),
    }, 1200);

    // 1.5s — Pentagram star draws (golden ratio geometry)
    el.querySelectorAll('.fp-pentagram').forEach(p => {
      const d = createDrawable(p);
      tl.add(d, { draw: '0 1', duration: 1600, ease: 'inOutSine' }, 1500);
    });

    // 2.0s — Golden spiral traces from center outward
    const spiral = el.querySelector('.fp-spiral');
    if (spiral) {
      const d = createDrawable(spiral);
      tl.add(d, { draw: '0 1', duration: 2000, ease: 'inOutQuad' }, 2000);
    }

    // 2.2s — Outer ticks fade in
    tl.add(el.querySelectorAll('.fp-tick'), {
      opacity: [0, (_, i) => TICKS[i]?.major ? 0.7 : 0.35],
      duration: 500, delay: stagger(40),
    }, 2200);

    // 2.5s — Light motes appear
    tl.add(el.querySelectorAll('.fp-mote'), {
      opacity: [0, 0.4], r: [0, (_, i) => MOTES[i]?.r || 1],
      duration: 600, ease: 'outQuad', delay: stagger(30),
    }, 2500);

    // 2.8s — Phi ratio markers
    tl.add(el.querySelectorAll('.fp-phi-dot'), {
      r: [0, 1.5], opacity: [0, 0.6], duration: 500, ease: 'outBack(2)',
      delay: stagger(100),
    }, 2800);

    /* ── Continuous loops (slow, contemplative) ── */

    // Pentagon group breathes — very slow rotation (120s full revolution)
    anims.push(animate(el.querySelector('.fp-pent-group'), {
      rotate: [0, 360], duration: 120000, loop: true, ease: 'linear',
    }));

    // Pentagram counter-rotates (180s — even slower, meditative)
    anims.push(animate(el.querySelector('.fp-star-group'), {
      rotate: [0, -360], duration: 180000, loop: true, ease: 'linear',
    }));

    // Golden spiral gentle rotation (90s)
    anims.push(animate(el.querySelector('.fp-spiral-group'), {
      rotate: [0, 360], duration: 90000, loop: true, ease: 'linear',
    }));

    // Family circles — subtle pulse (white dots)
    el.querySelectorAll('.fp-family-circle').forEach((c, i) => {
      anims.push(animate(c, {
        r: [3.5, 4.2, 3.5], opacity: [0.9, 1, 0.9],
        duration: 3000 + i * 500, loop: true, ease: 'inOutSine',
      }));
    });

    // Family stroke rings — gentle breathe
    el.querySelectorAll('.fp-family-stroke').forEach((c, i) => {
      anims.push(animate(c, {
        r: [6, 7, 6], opacity: [0.7, 1, 0.7],
        duration: 3500 + i * 500, loop: true, ease: 'inOutSine',
      }));
    });

    // Family glows — slower pulse, out of phase with circles
    el.querySelectorAll('.fp-family-glow').forEach((c, i) => {
      anims.push(animate(c, {
        r: [9, 12, 9], opacity: [0.15, 0.3, 0.15],
        duration: 4000 + i * 700, loop: true, ease: 'inOutSine',
      }));
    });

    // Bond lines — subtle heartbeat opacity (family connection breathing)
    anims.push(animate(el.querySelectorAll('.fp-bond'), {
      opacity: [0.2, 0.5, 0.2], strokeWidth: [0.5, 1, 0.5],
      duration: 5000, loop: true, ease: 'inOutSine',
      delay: stagger(300),
    }));

    // Harmony ring — slow breath
    anims.push(animate(el.querySelector('.fp-harmony-ring'), {
      opacity: [0.25, 0.5, 0.25], strokeWidth: [0.8, 1.5, 0.8],
      duration: 6000, loop: true, ease: 'inOutSine',
    }));

    // Light motes — traveling between family vertices (connection flow)
    el.querySelectorAll('.fp-mote').forEach((m, i) => {
      const edge = Math.floor(i / 3);
      const v1 = vertexAt(edge, 68);
      const v2 = vertexAt((edge + 1) % 5, 68);
      anims.push(animate(m, {
        cx: [v1.x, v2.x, v1.x],
        cy: [v1.y, v2.y, v1.y],
        opacity: [0.15, 0.55, 0.15],
        duration: 6000 + i * 400, loop: true, ease: 'inOutSine',
      }));
    });

    // Tick marks — gentle breathe
    anims.push(animate(el.querySelectorAll('.fp-tick'), {
      opacity: [0.2, 0.6, 0.2], duration: 7000, loop: true, ease: 'inOutSine',
      delay: stagger(100),
    }));

    // Phi dots — subtle scale pulse
    anims.push(animate(el.querySelectorAll('.fp-phi-dot'), {
      r: [1.5, 2.2, 1.5], opacity: [0.4, 0.8, 0.4],
      duration: 4500, loop: true, ease: 'inOutSine',
      delay: stagger(200),
    }));

    // Golden spiral opacity wave
    anims.push(animate(el.querySelector('.fp-spiral'), {
      opacity: [0.1, 0.3, 0.1], duration: 8000, loop: true, ease: 'inOutSine',
    }));

    return () => {
      tl.pause();
      anims.forEach(a => a.pause());
      anims.length = 0;
    };
  }, []);

  /* ── Hover: gently intensify (2x, not 3x — more contemplative) ── */
  useEffect(() => {
    const onEnter = () => {
      hoveredRef.current = true;
      animsRef.current.forEach(a => { a.speed = 2; });
    };
    const onLeave = () => {
      hoveredRef.current = false;
      animsRef.current.forEach(a => { a.speed = 1; });
    };
    const el = geoRef.current;
    if (!el) return;
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  /* ── Click effect bursts ── */
  useEffect(() => {
    if (!effect || !geoRef.current) return;
    const el = geoRef.current;

    // Shockwave pentagonal ring
    const ring = el.querySelector('.fp-burst');
    if (ring) {
      animate(ring, {
        r: [15, 95], opacity: [0.7, 0], strokeWidth: [2.5, 0.3],
        duration: 800, ease: 'outCubic',
      });
    }

    // Family circles flash to FULL COLOR on click (unity moment)
    el.querySelectorAll('.fp-family-circle').forEach((c, i) => {
      const col = FAMILY[i]?.color || '#fff';
      animate(c, {
        r: [3.5, 7, 3.5], fill: ['#fff', col, '#fff'],
        duration: 800, ease: 'outQuad',
        delay: i * 60,
      });
    });
    animate(el.querySelectorAll('.fp-family-stroke'), {
      r: [6, 10, 6], strokeWidth: [1.2, 2.5, 1.2],
      opacity: [0.8, 1, 0.8],
      duration: 700, ease: 'outQuad', delay: stagger(50),
    });
    animate(el.querySelectorAll('.fp-family-glow'), {
      r: [9, 20, 9], opacity: [0.2, 0.6, 0.2],
      duration: 700, ease: 'outQuad', delay: stagger(50),
    });

    // Bond lines surge bright
    animate(el.querySelectorAll('.fp-bond'), {
      opacity: [0.3, 1, 0.3], strokeWidth: [0.5, 2, 0.5],
      duration: 600, delay: stagger(60),
    });

    // Per-effect unique accent
    if (effect === 'float') {
      // Family circles lift — spiral expands
      animate(el.querySelector('.fp-spiral'), {
        opacity: [0.15, 0.6, 0.15], strokeWidth: [0.6, 2, 0.6],
        duration: 1000,
      });
    } else if (effect === 'glitch') {
      // Pentagram flashes bright (star energy)
      animate(el.querySelectorAll('.fp-pentagram'), {
        strokeWidth: [0.6, 3, 0.6], opacity: [0.2, 0.8, 0.2],
        duration: 500,
      });
    } else if (effect === 'spin') {
      // Pentagon lines surge
      animate(el.querySelectorAll('.fp-pentagon'), {
        strokeWidth: [0.8, 3, 0.8], opacity: [0.3, 0.9, 0.3],
        duration: 700,
      });
    } else if (effect === 'ripple') {
      // All ticks blaze outward
      animate(el.querySelectorAll('.fp-tick'), {
        opacity: [0.3, 1, 0.3], duration: 500, delay: stagger(25),
      });
      // Phi dots burst
      animate(el.querySelectorAll('.fp-phi-dot'), {
        r: [1.5, 4, 1.5], opacity: [0.5, 1, 0.5],
        duration: 600, delay: stagger(80),
      });
    }

    // Speed surge then ease back
    animsRef.current.forEach(a => { a.speed = 4; });
    const t = setTimeout(() => {
      animsRef.current.forEach(a => { a.speed = hoveredRef.current ? 2 : 1; });
    }, 800);
    return () => clearTimeout(t);
  }, [effect]);

  /* ── Pre-compute SVG elements ── */

  // Pentagon vertices for family circles (white core + colored stroke ring)
  const familyCircles = useMemo(() => FAMILY.map((f, i) => {
    const v = vertexAt(i, 68);
    return (
      <g key={i}>
        {/* Soft glow behind */}
        <circle cx={v.x} cy={v.y} r="9" className="fp-family-glow"
          fill={f.glow} opacity="0" />
        {/* Colored stroke ring */}
        <circle cx={v.x} cy={v.y} r="0" className="fp-family-stroke"
          fill="none" stroke={f.color} strokeWidth="1.2" opacity="0" />
        {/* White core dot */}
        <circle cx={v.x} cy={v.y} r="0" className="fp-family-circle"
          fill="#fff" opacity="0" />
      </g>
    );
  }), []);

  // Bond lines from center to each family vertex
  const bonds = useMemo(() => FAMILY.map((f, i) => {
    const b = bondLine(i, 68);
    return (
      <line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
        className="fp-bond" stroke={f.color} strokeWidth="0.5"
        opacity="0.3" strokeLinecap="round" />
    );
  }), []);

  // Light motes traveling between vertices
  const motes = useMemo(() => MOTES.map((m, i) => (
    <circle key={i} cx={m.cx} cy={m.cy} r={m.r}
      className="fp-mote" fill={m.color} opacity="0" />
  )), []);

  // Outer colored ticks (5 groups of 3)
  const ticks = useMemo(() => TICKS.map((t, i) => (
    <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
      className="fp-tick" stroke={t.color}
      strokeWidth={t.major ? '1.2' : '0.6'} opacity="0"
      strokeLinecap="round" />
  )), []);

  // Golden ratio intersection dots on pentagram
  const phiDots = useMemo(() => {
    const dots = [];
    const order = [0, 2, 4, 1, 3];
    for (let i = 0; i < 5; i++) {
      const a = vertexAt(order[i], 68);
      const b = vertexAt(order[(i + 1) % 5], 68);
      // Golden ratio division point: 1/phi along each pentagram segment
      const t = 1 / PHI;
      dots.push({
        cx: a.x + (b.x - a.x) * t,
        cy: a.y + (b.y - a.y) * t,
      });
    }
    return dots.map((d, i) => (
      <circle key={i} cx={d.cx} cy={d.cy} r="0" className="fp-phi-dot"
        fill="rgba(251,191,36,0.8)" opacity="0" />
    ));
  }, []);

  return (
    <div className="avatar-geo-wrap" ref={geoRef}>
      <svg className="avatar-geo-svg" viewBox="0 0 220 220">
        <defs>
          {/* Feathered center mask — keeps avatar photo clear */}
          <radialGradient id="fp-center-mask" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="black" />
            <stop offset="30%" stopColor="black" />
            <stop offset="52%" stopColor="white" />
            <stop offset="100%" stopColor="white" />
          </radialGradient>
          <mask id="fp-feather-mask">
            <rect x="0" y="0" width="220" height="220" fill="url(#fp-center-mask)" />
          </mask>

          {/* Ambient glow gradient */}
          <radialGradient id="fp-ambient" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.08" />
            <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.04" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Per-family glow filters */}
          {FAMILY.map((f, i) => (
            <filter key={i} id={`fp-glow-${i}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>

        {/* Ambient background glow */}
        <circle cx={CX} cy={CY} r="105" fill="url(#fp-ambient)" opacity="0.6" />

        {/* === All geometry masked to feather away from center === */}
        <g mask="url(#fp-feather-mask)">

          {/* Golden spiral — the family journey outward */}
          <g className="fp-spiral-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <path d={goldenSpiralPath(22, 80, 2.5)} className="fp-spiral"
              fill="none" stroke="rgba(251,191,36,0.15)" strokeWidth="0.6"
              strokeLinecap="round" opacity="0" />
          </g>

          {/* Bond lines — family connections from center */}
          {bonds}

          {/* Pentagon — the 5-sided home */}
          <g className="fp-pent-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <polygon points={pentagonPath(68)} className="fp-pentagon"
              fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="0.8"
              strokeLinejoin="round" />
            {/* Second pentagon slightly larger for depth */}
            <polygon points={pentagonPath(76)} className="fp-pentagon"
              fill="none" stroke="rgba(168,85,247,0.12)" strokeWidth="0.5"
              strokeLinejoin="round" strokeDasharray="4 6" />
          </g>

          {/* Pentagram — the golden-ratio star */}
          <g className="fp-star-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <polygon points={pentagramPath(68)} className="fp-pentagram"
              fill="none" stroke="rgba(251,191,36,0.18)" strokeWidth="0.6"
              strokeLinejoin="round" />
          </g>

          {/* Golden ratio phi dots at pentagram intersections */}
          {phiDots}

          {/* Light motes flowing between vertices */}
          {motes}

          {/* Outer ticks — colored per family member */}
          {ticks}

        </g>
        {/* === End feathered mask === */}

        {/* Family circles at pentagon vertices (OUTSIDE mask so they're fully visible) */}
        {familyCircles}

        {/* Central harmony ring — the family bond */}
        <circle cx={CX} cy={CY} r="50" className="fp-harmony-ring"
          fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="0.8"
          opacity="0" />

        {/* Burst ring (animated on click) */}
        <circle cx={CX} cy={CY} r="15" className="fp-burst"
          fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="2.5" opacity="0" />
      </svg>

      {children}
    </div>
  );
}
