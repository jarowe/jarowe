import { useEffect, useRef, useMemo } from 'react';
import { animate, stagger, createTimeline, createDrawable } from 'animejs';
import './AvatarGeometry.css';

/* ═══════════════════════════════════════════════════════════════════════
   AVATAR GEOMETRY — Family Pentagon (anime.js v4)

   A meaningful sacred geometry frame built around the number 5.
   Five family members, five vertices, five elements, five points of
   the golden-ratio pentagram. The pentagon — symbol of protection,
   harmony, and the divine proportion — frames Jared's avatar.

   Jared (purple)  — top vertex, the keystone
   Maria (teal)    — upper-right, the heart
   Jace  (blue)    — lower-right, the explorer
   Jax   (red)     — lower-left, the spark
   Jole  (emerald) — upper-left, the wonder
   ═══════════════════════════════════════════════════════════════════════ */

const CX = 100, CY = 100;
const PHI = (1 + Math.sqrt(5)) / 2;

const FAMILY = [
  { name: 'Jared', color: '#a855f7', glow: 'rgba(168,85,247,0.4)' },
  { name: 'Maria', color: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },
  { name: 'Jace',  color: '#3b82f6', glow: 'rgba(59,130,246,0.4)' },
  { name: 'Jax',   color: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
  { name: 'Jole',  color: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
];

const VERT_R = 58; // vertex radius — pulled in to avoid clipping

function vertexAt(i, r) {
  const a = (i * 72 - 90) * Math.PI / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function pentagonPath(r) {
  return Array.from({ length: 5 }, (_, i) => {
    const v = vertexAt(i, r);
    return `${v.x},${v.y}`;
  }).join(' ');
}

function pentagramPath(r) {
  return [0, 2, 4, 1, 3].map(i => {
    const v = vertexAt(i, r);
    return `${v.x},${v.y}`;
  }).join(' ');
}

function goldenSpiralPath(startR, endR, turns) {
  const steps = 120;
  const b = Math.log(endR / startR) / (turns * 2 * Math.PI);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * 2 * Math.PI;
    const r = startR * Math.exp(b * t);
    pts.push(`${i === 0 ? 'M' : 'L'}${CX + r * Math.cos(t - Math.PI / 2)} ${CY + r * Math.sin(t - Math.PI / 2)}`);
  }
  return pts.join(' ');
}

/* Light motes between vertices */
function moteData() {
  const motes = [];
  for (let i = 0; i < 5; i++) {
    const v1 = vertexAt(i, VERT_R);
    const v2 = vertexAt((i + 1) % 5, VERT_R);
    for (let j = 1; j <= 2; j++) {
      const t = j / 3;
      motes.push({
        cx: v1.x + (v2.x - v1.x) * t,
        cy: v1.y + (v2.y - v1.y) * t,
        color: FAMILY[i].color,
        r: 0.6,
      });
    }
  }
  return motes;
}
const MOTES = moteData();

/* Delicate whisker lines at each vertex — very thin, animate stroke in/out */
function whiskerData() {
  const whiskers = [];
  for (let i = 0; i < 5; i++) {
    const baseA = i * 72 - 90;
    const a = baseA * Math.PI / 180;
    const r1 = VERT_R + 8;
    const r2 = VERT_R + 16;
    whiskers.push({
      x1: CX + r1 * Math.cos(a), y1: CY + r1 * Math.sin(a),
      x2: CX + r2 * Math.cos(a), y2: CY + r2 * Math.sin(a),
      color: FAMILY[i].color,
    });
  }
  return whiskers;
}
const WHISKERS = whiskerData();

export default function AvatarGeometry({ children, effect }) {
  const geoRef = useRef(null);
  const animsRef = useRef([]);
  const hoveredRef = useRef(false);

  useEffect(() => {
    const el = geoRef.current;
    if (!el) return;
    const anims = animsRef.current;

    const tl = createTimeline({ defaults: { ease: 'outQuad' } });

    // 0.0s — Harmony ring draws
    const harmonyRing = el.querySelector('.fp-harmony-ring');
    if (harmonyRing) {
      const d = createDrawable(harmonyRing);
      tl.add(d, { draw: '0 1', duration: 1200, ease: 'inOutQuad' }, 0);
    }

    // 0.3s — Bond lines reach outward
    el.querySelectorAll('.fp-bond').forEach((line, i) => {
      const d = createDrawable(line);
      tl.add(d, { draw: '0 1', duration: 800, ease: 'outQuad' }, 300 + i * 120);
    });

    // 0.6s — Pentagon draws
    el.querySelectorAll('.fp-pentagon').forEach(p => {
      const d = createDrawable(p);
      tl.add(d, { draw: '0 1', duration: 1400, ease: 'inOutQuad' }, 600);
    });

    // 1.0s — Family circles bloom (tiny white pinpoints)
    tl.add(el.querySelectorAll('.fp-family-circle'), {
      r: [0, 1.2], opacity: [0, 1], duration: 600, ease: 'outBack(2)',
      delay: stagger(120),
    }, 1000);

    // 1.1s — Colored stroke rings draw on
    el.querySelectorAll('.fp-family-stroke').forEach((c, i) => {
      c.setAttribute('r', '4.5');
      c.style.opacity = '0.8';
      const d = createDrawable(c);
      tl.add(d, { draw: '0 1', duration: 700, ease: 'inOutQuad' }, 1100 + i * 120);
    });

    // 1.3s — Soft glows
    tl.add(el.querySelectorAll('.fp-family-glow'), {
      r: [0, 7], opacity: [0, 0.15], duration: 800, ease: 'outQuad',
      delay: stagger(120),
    }, 1300);

    // 1.5s — Pentagram draws
    el.querySelectorAll('.fp-pentagram').forEach(p => {
      const d = createDrawable(p);
      tl.add(d, { draw: '0 1', duration: 1600, ease: 'inOutSine' }, 1500);
    });

    // 2.0s — Golden spiral
    const spiral = el.querySelector('.fp-spiral');
    if (spiral) {
      const d = createDrawable(spiral);
      tl.add(d, { draw: '0 1', duration: 2000, ease: 'inOutQuad' }, 2000);
    }

    // 2.2s — Whisker lines stroke in
    el.querySelectorAll('.fp-whisker').forEach((line, i) => {
      const d = createDrawable(line);
      tl.add(d, { draw: '0 1', duration: 600 }, 2200 + i * 80);
    });

    // 2.5s — Light motes
    tl.add(el.querySelectorAll('.fp-mote'), {
      opacity: [0, 0.3], r: [0, 0.6],
      duration: 600, ease: 'outQuad', delay: stagger(30),
    }, 2500);

    // 2.8s — Phi dots
    tl.add(el.querySelectorAll('.fp-phi-dot'), {
      r: [0, 1.2], opacity: [0, 0.5], duration: 500, ease: 'outBack(2)',
      delay: stagger(100),
    }, 2800);

    /* ── Continuous loops ── */

    // Pentagon — 120s rotation
    anims.push(animate(el.querySelector('.fp-pent-group'), {
      rotate: [0, 360], duration: 120000, loop: true, ease: 'linear',
    }));

    // Pentagram — 180s counter-rotation
    anims.push(animate(el.querySelector('.fp-star-group'), {
      rotate: [0, -360], duration: 180000, loop: true, ease: 'linear',
    }));

    // Spiral — 90s rotation
    anims.push(animate(el.querySelector('.fp-spiral-group'), {
      rotate: [0, 360], duration: 90000, loop: true, ease: 'linear',
    }));

    // Family circles — subtle pulse (tiny pinpoints)
    el.querySelectorAll('.fp-family-circle').forEach((c, i) => {
      anims.push(animate(c, {
        r: [1.2, 1.6, 1.2], opacity: [0.85, 1, 0.85],
        duration: 3000 + i * 500, loop: true, ease: 'inOutSine',
      }));
    });

    // Family stroke rings — gentle opacity breathe
    el.querySelectorAll('.fp-family-stroke').forEach((c, i) => {
      anims.push(animate(c, {
        opacity: [0.5, 0.85, 0.5],
        duration: 3500 + i * 500, loop: true, ease: 'inOutSine',
      }));
    });

    // Family glows
    el.querySelectorAll('.fp-family-glow').forEach((c, i) => {
      anims.push(animate(c, {
        r: [7, 10, 7], opacity: [0.1, 0.25, 0.1],
        duration: 4000 + i * 700, loop: true, ease: 'inOutSine',
      }));
    });

    // Bond lines — heartbeat
    anims.push(animate(el.querySelectorAll('.fp-bond'), {
      opacity: [0.15, 0.4, 0.15], strokeWidth: [0.3, 0.7, 0.3],
      duration: 5000, loop: true, ease: 'inOutSine',
      delay: stagger(300),
    }));

    // Harmony ring — slow breath
    anims.push(animate(el.querySelector('.fp-harmony-ring'), {
      opacity: [0.2, 0.4, 0.2], strokeWidth: [0.5, 1, 0.5],
      duration: 6000, loop: true, ease: 'inOutSine',
    }));

    // Motes — flow between vertices
    el.querySelectorAll('.fp-mote').forEach((m, i) => {
      const edge = Math.floor(i / 2);
      const v1 = vertexAt(edge, VERT_R);
      const v2 = vertexAt((edge + 1) % 5, VERT_R);
      anims.push(animate(m, {
        cx: [v1.x, v2.x, v1.x], cy: [v1.y, v2.y, v1.y],
        opacity: [0.1, 0.4, 0.1],
        duration: 6000 + i * 400, loop: true, ease: 'inOutSine',
      }));
    });

    // Whisker lines — stroke in/out breathing
    el.querySelectorAll('.fp-whisker').forEach((line, i) => {
      const d = createDrawable(line);
      anims.push(animate(d, {
        draw: ['0 0.5', '0.5 1', '0 0.5'],
        duration: 5000 + i * 600, loop: true, ease: 'inOutSine',
      }));
      anims.push(animate(line, {
        opacity: [0.15, 0.45, 0.15],
        duration: 5000 + i * 600, loop: true, ease: 'inOutSine',
      }));
    });

    // Phi dots — pulse
    anims.push(animate(el.querySelectorAll('.fp-phi-dot'), {
      r: [1.2, 1.8, 1.2], opacity: [0.3, 0.65, 0.3],
      duration: 4500, loop: true, ease: 'inOutSine',
      delay: stagger(200),
    }));

    // Spiral opacity wave
    anims.push(animate(el.querySelector('.fp-spiral'), {
      opacity: [0.08, 0.25, 0.08], duration: 8000, loop: true, ease: 'inOutSine',
    }));

    return () => {
      tl.pause();
      anims.forEach(a => a.pause());
      anims.length = 0;
    };
  }, []);

  /* ── Hover: speed up + stroke ring trim-path animation ── */
  const hoverAnimsRef = useRef([]);

  useEffect(() => {
    const el = geoRef.current;
    if (!el) return;

    const onEnter = () => {
      hoveredRef.current = true;
      animsRef.current.forEach(a => { a.speed = 2; });

      // Trim-path animation on stroke rings: draw sweeps around nicely
      hoverAnimsRef.current.forEach(a => a.pause());
      hoverAnimsRef.current = [];
      el.querySelectorAll('.fp-family-stroke').forEach((c, i) => {
        const d = createDrawable(c);
        hoverAnimsRef.current.push(
          animate(d, {
            draw: ['0 1', '0.15 0.85', '0.35 0.65', '0.15 0.85', '0 1'],
            duration: 2000 + i * 300, loop: true, ease: 'inOutSine',
          })
        );
      });
    };

    const onLeave = () => {
      hoveredRef.current = false;
      animsRef.current.forEach(a => { a.speed = 1; });

      // Restore full stroke rings
      hoverAnimsRef.current.forEach(a => a.pause());
      hoverAnimsRef.current = [];
      el.querySelectorAll('.fp-family-stroke').forEach(c => {
        const d = createDrawable(c);
        animate(d, { draw: '0 1', duration: 400, ease: 'outQuad' });
      });
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      hoverAnimsRef.current.forEach(a => a.pause());
    };
  }, []);

  /* ── Click bursts ── */
  useEffect(() => {
    if (!effect || !geoRef.current) return;
    const el = geoRef.current;

    // Shockwave
    const ring = el.querySelector('.fp-burst');
    if (ring) {
      animate(ring, { r: [12, 85], opacity: [0.6, 0], strokeWidth: [1.5, 0.2], duration: 800, ease: 'outCubic' });
    }

    // Family circles flash to FULL COLOR
    el.querySelectorAll('.fp-family-circle').forEach((c, i) => {
      animate(c, { r: [1.2, 3.5, 1.2], fill: ['#fff', FAMILY[i]?.color || '#fff', '#fff'], duration: 800, ease: 'outQuad', delay: i * 50 });
    });
    animate(el.querySelectorAll('.fp-family-stroke'), {
      r: [4.5, 7, 4.5], strokeWidth: [0.7, 1.3, 0.7], opacity: [0.7, 1, 0.7],
      duration: 700, ease: 'outQuad', delay: stagger(40),
    });
    animate(el.querySelectorAll('.fp-family-glow'), {
      r: [7, 14, 7], opacity: [0.15, 0.45, 0.15],
      duration: 700, ease: 'outQuad', delay: stagger(40),
    });

    // Bond lines surge
    animate(el.querySelectorAll('.fp-bond'), {
      opacity: [0.2, 0.8, 0.2], strokeWidth: [0.3, 1.5, 0.3],
      duration: 600, delay: stagger(50),
    });

    // Per-effect accents
    if (effect === 'float') {
      animate(el.querySelector('.fp-spiral'), { opacity: [0.1, 0.5, 0.1], strokeWidth: [0.4, 1.5, 0.4], duration: 1000 });
    } else if (effect === 'glitch') {
      animate(el.querySelectorAll('.fp-pentagram'), { strokeWidth: [0.4, 2, 0.4], opacity: [0.15, 0.7, 0.15], duration: 500 });
    } else if (effect === 'spin') {
      animate(el.querySelectorAll('.fp-pentagon'), { strokeWidth: [0.5, 2, 0.5], opacity: [0.2, 0.8, 0.2], duration: 700 });
    } else if (effect === 'ripple') {
      animate(el.querySelectorAll('.fp-whisker'), { opacity: [0.2, 0.9, 0.2], duration: 500, delay: stagger(40) });
      animate(el.querySelectorAll('.fp-phi-dot'), { r: [1.2, 3, 1.2], opacity: [0.4, 1, 0.4], duration: 600, delay: stagger(60) });
    }

    // Speed surge
    animsRef.current.forEach(a => { a.speed = 4; });
    const t = setTimeout(() => { animsRef.current.forEach(a => { a.speed = hoveredRef.current ? 2 : 1; }); }, 800);
    return () => clearTimeout(t);
  }, [effect]);

  /* ── SVG elements ── */

  const familyCircles = useMemo(() => FAMILY.map((f, i) => {
    const v = vertexAt(i, VERT_R);
    return (
      <g key={i}>
        <circle cx={v.x} cy={v.y} r="7" className="fp-family-glow" fill={f.glow} opacity="0" />
        <circle cx={v.x} cy={v.y} r="0" className="fp-family-stroke"
          fill="none" stroke={f.color} strokeWidth="0.7" opacity="0" />
        <circle cx={v.x} cy={v.y} r="0" className="fp-family-circle" fill="#fff" opacity="0" />
      </g>
    );
  }), []);

  const bonds = useMemo(() => FAMILY.map((f, i) => {
    const v = vertexAt(i, VERT_R);
    return (
      <line key={i} x1={CX} y1={CY} x2={v.x} y2={v.y}
        className="fp-bond" stroke={f.color} strokeWidth="0.3"
        opacity="0.2" strokeLinecap="round" />
    );
  }), []);

  const motes = useMemo(() => MOTES.map((m, i) => (
    <circle key={i} cx={m.cx} cy={m.cy} r={m.r}
      className="fp-mote" fill={m.color} opacity="0" />
  )), []);

  const whiskers = useMemo(() => WHISKERS.map((w, i) => (
    <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
      className="fp-whisker" stroke={w.color}
      strokeWidth="0.4" opacity="0" strokeLinecap="round" />
  )), []);

  const phiDots = useMemo(() => {
    const order = [0, 2, 4, 1, 3];
    return Array.from({ length: 5 }, (_, i) => {
      const a = vertexAt(order[i], VERT_R);
      const b = vertexAt(order[(i + 1) % 5], VERT_R);
      const t = 1 / PHI;
      return (
        <circle key={i} cx={a.x + (b.x - a.x) * t} cy={a.y + (b.y - a.y) * t}
          r="0" className="fp-phi-dot" fill="rgba(251,191,36,0.7)" opacity="0" />
      );
    });
  }, []);

  return (
    <div className="avatar-geo-wrap" ref={geoRef}>
      <svg className="avatar-geo-svg" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="fp-center-mask" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="black" />
            <stop offset="28%" stopColor="black" />
            <stop offset="48%" stopColor="white" />
            <stop offset="100%" stopColor="white" />
          </radialGradient>
          <mask id="fp-feather-mask">
            <rect x="0" y="0" width="200" height="200" fill="url(#fp-center-mask)" />
          </mask>
          <radialGradient id="fp-ambient" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.06" />
            <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.03" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx={CX} cy={CY} r="95" fill="url(#fp-ambient)" opacity="0.5" />

        {/* Masked geometry */}
        <g mask="url(#fp-feather-mask)">
          <g className="fp-spiral-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <path d={goldenSpiralPath(18, 68, 2.5)} className="fp-spiral"
              fill="none" stroke="rgba(251,191,36,0.12)" strokeWidth="0.4"
              strokeLinecap="round" opacity="0" />
          </g>

          {bonds}

          <g className="fp-pent-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <polygon points={pentagonPath(VERT_R)} className="fp-pentagon"
              fill="none" stroke="rgba(168,85,247,0.25)" strokeWidth="0.5"
              strokeLinejoin="round" />
            <polygon points={pentagonPath(VERT_R + 6)} className="fp-pentagon"
              fill="none" stroke="rgba(168,85,247,0.08)" strokeWidth="0.3"
              strokeLinejoin="round" strokeDasharray="3 5" />
          </g>

          <g className="fp-star-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <polygon points={pentagramPath(VERT_R)} className="fp-pentagram"
              fill="none" stroke="rgba(251,191,36,0.14)" strokeWidth="0.4"
              strokeLinejoin="round" />
          </g>

          {phiDots}
          {motes}
          {whiskers}
        </g>

        {/* Family circles — outside mask */}
        {familyCircles}

        {/* Harmony ring */}
        <circle cx={CX} cy={CY} r="42" className="fp-harmony-ring"
          fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="0.5" opacity="0" />

        {/* Burst ring */}
        <circle cx={CX} cy={CY} r="12" className="fp-burst"
          fill="none" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" opacity="0" />
      </svg>

      {children}
    </div>
  );
}
