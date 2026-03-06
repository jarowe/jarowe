import { useEffect, useRef, useMemo } from 'react';
import { animate, stagger, createTimeline, createDrawable } from 'animejs';
import './AvatarGeometry.css';

/* ═══════════════════════════════════════════════════════════════════════
   AVATAR GEOMETRY — Family Pentagon (anime.js v4)

   Default: a single elegant thin ring around the avatar. Clean & minimal.
   Hover: the sacred geometry cascades outward — harmony ring → bonds →
   pentagon → family dots → pentagram → spiral → whiskers → motes.
   ═══════════════════════════════════════════════════════════════════════ */

const CX = 100, CY = 100;
const PHI = (1 + Math.sqrt(5)) / 2;

const FAMILY = [
  { name: 'Jared', color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
  { name: 'Maria', color: '#06b6d4', glow: 'rgba(6,182,212,0.5)' },
  { name: 'Jace',  color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
  { name: 'Jax',   color: '#ef4444', glow: 'rgba(239,68,68,0.5)' },
  { name: 'Jole',  color: '#22c55e', glow: 'rgba(34,197,94,0.5)' },
];

const VERT_R = 58;

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
      });
    }
  }
  return motes;
}
const MOTES = moteData();

function whiskerData() {
  const whiskers = [];
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * Math.PI / 180;
    const r1 = VERT_R + 8;
    const r2 = VERT_R + 18;
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
  const loopsRef = useRef([]);
  const hoveredRef = useRef(false);
  const hoverAnimsRef = useRef([]);
  const revealedRef = useRef(false);

  /* ── Mount: only draw the thin resting ring + start rotation loops ── */
  useEffect(() => {
    const el = geoRef.current;
    if (!el) return;

    // Draw the resting ring on mount
    const restRing = el.querySelector('.fp-rest-ring');
    if (restRing) {
      const d = createDrawable(restRing);
      animate(d, { draw: '0 1', duration: 1200, ease: 'inOutQuad' });
    }

    // Start rotation loops (they run always, geometry just hidden)
    const loops = loopsRef.current;
    loops.push(animate(el.querySelector('.fp-pent-group'), {
      rotate: [0, 360], duration: 120000, loop: true, ease: 'linear',
    }));
    loops.push(animate(el.querySelector('.fp-star-group'), {
      rotate: [0, -360], duration: 180000, loop: true, ease: 'linear',
    }));
    loops.push(animate(el.querySelector('.fp-spiral-group'), {
      rotate: [0, 360], duration: 90000, loop: true, ease: 'linear',
    }));

    return () => {
      loops.forEach(a => a.pause());
      loops.length = 0;
    };
  }, []);

  /* ── Hover: cascade reveal / retract ── */
  useEffect(() => {
    const el = geoRef.current;
    if (!el) return;

    const onEnter = () => {
      hoveredRef.current = true;
      revealedRef.current = true;

      // Stop any ongoing retract anims
      hoverAnimsRef.current.forEach(a => a.pause());
      hoverAnimsRef.current = [];

      // Fade out resting ring
      hoverAnimsRef.current.push(
        animate(el.querySelector('.fp-rest-ring'), {
          opacity: [0.35, 0], duration: 300, ease: 'outQuad',
        })
      );

      // === CASCADING REVEAL ===

      // 0ms — Harmony ring draws
      const harmonyRing = el.querySelector('.fp-harmony-ring');
      if (harmonyRing) {
        const d = createDrawable(harmonyRing);
        hoverAnimsRef.current.push(animate(d, { draw: '0 1', duration: 500, ease: 'inOutQuad' }));
        hoverAnimsRef.current.push(animate(harmonyRing, { opacity: [0, 0.6], duration: 500, ease: 'outQuad' }));
      }

      // 100ms — Bond lines reach outward
      el.querySelectorAll('.fp-bond').forEach((line, i) => {
        const d = createDrawable(line);
        hoverAnimsRef.current.push(animate(d, { draw: '0 1', duration: 400, ease: 'outQuad', delay: 100 + i * 60 }));
        hoverAnimsRef.current.push(animate(line, { opacity: [0, 0.65], duration: 400, delay: 100 + i * 60 }));
      });

      // 200ms — Pentagon draws
      el.querySelectorAll('.fp-pentagon').forEach((p, i) => {
        const d = createDrawable(p);
        hoverAnimsRef.current.push(animate(d, { draw: '0 1', duration: 600, ease: 'inOutQuad', delay: 200 }));
        hoverAnimsRef.current.push(animate(p, { opacity: [0, i === 0 ? 0.7 : 0.15], duration: 600, delay: 200 }));
      });

      // 350ms — Family dots + stroke rings bloom
      el.querySelectorAll('.fp-family-circle').forEach((c, i) => {
        hoverAnimsRef.current.push(animate(c, {
          r: [0, 1.3], opacity: [0, 1], duration: 400, ease: 'outBack(2)', delay: 350 + i * 70,
        }));
      });
      el.querySelectorAll('.fp-family-stroke').forEach((c, i) => {
        c.setAttribute('r', '5');
        const d = createDrawable(c);
        hoverAnimsRef.current.push(animate(d, { draw: '0 1', duration: 500, ease: 'inOutQuad', delay: 380 + i * 70 }));
        hoverAnimsRef.current.push(animate(c, { opacity: [0, 0.9], duration: 500, delay: 380 + i * 70 }));
      });
      el.querySelectorAll('.fp-family-glow').forEach((c, i) => {
        hoverAnimsRef.current.push(animate(c, {
          r: [0, 7], opacity: [0, 0.2], duration: 500, ease: 'outQuad', delay: 400 + i * 70,
        }));
      });

      // 550ms — Pentagram traces
      el.querySelectorAll('.fp-pentagram').forEach(p => {
        const d = createDrawable(p);
        hoverAnimsRef.current.push(animate(d, { draw: '0 1', duration: 700, ease: 'inOutSine', delay: 550 }));
        hoverAnimsRef.current.push(animate(p, { opacity: [0, 0.55], duration: 700, delay: 550 }));
      });

      // 700ms — Spiral traces
      const spiral = el.querySelector('.fp-spiral');
      if (spiral) {
        const d = createDrawable(spiral);
        hoverAnimsRef.current.push(animate(d, { draw: '0 1', duration: 800, ease: 'inOutQuad', delay: 700 }));
        hoverAnimsRef.current.push(animate(spiral, { opacity: [0, 0.35], duration: 800, delay: 700 }));
      }

      // 800ms — Whiskers stroke in
      el.querySelectorAll('.fp-whisker').forEach((line, i) => {
        const d = createDrawable(line);
        hoverAnimsRef.current.push(animate(d, { draw: '0 1', duration: 400, delay: 800 + i * 50 }));
        hoverAnimsRef.current.push(animate(line, { opacity: [0, 0.55], duration: 400, delay: 800 + i * 50 }));
      });

      // 900ms — Motes + phi dots fade in
      hoverAnimsRef.current.push(
        animate(el.querySelectorAll('.fp-mote'), {
          opacity: [0, 0.5], r: [0, 1.2], duration: 400, ease: 'outQuad',
          delay: stagger(25, { start: 900 }),
        })
      );
      hoverAnimsRef.current.push(
        animate(el.querySelectorAll('.fp-phi-dot'), {
          r: [0, 1.5], opacity: [0, 0.7], duration: 400, ease: 'outBack(2)',
          delay: stagger(50, { start: 950 }),
        })
      );

      // === CONTINUOUS HOVER LOOPS (start after cascade) ===
      const loopDelay = 1100;

      // Bond heartbeat
      hoverAnimsRef.current.push(animate(el.querySelectorAll('.fp-bond'), {
        opacity: [0.5, 0.8, 0.5], strokeWidth: [0.5, 1, 0.5],
        duration: 4000, loop: true, ease: 'inOutSine', delay: stagger(200, { start: loopDelay }),
      }));

      // Harmony ring breathe
      hoverAnimsRef.current.push(animate(el.querySelector('.fp-harmony-ring'), {
        opacity: [0.4, 0.7, 0.4], strokeWidth: [0.6, 1.2, 0.6],
        duration: 5000, loop: true, ease: 'inOutSine', delay: loopDelay,
      }));

      // Family dot pulse
      el.querySelectorAll('.fp-family-circle').forEach((c, i) => {
        hoverAnimsRef.current.push(animate(c, {
          r: [1.3, 1.6, 1.3], opacity: [0.85, 1, 0.85],
          duration: 2500 + i * 400, loop: true, ease: 'inOutSine', delay: loopDelay,
        }));
      });

      // Stroke ring trim-path sweep
      el.querySelectorAll('.fp-family-stroke').forEach((c, i) => {
        const d = createDrawable(c);
        hoverAnimsRef.current.push(animate(d, {
          draw: ['0 1', '0.1 0.9', '0.3 0.7', '0.1 0.9', '0 1'],
          duration: 1800 + i * 200, loop: true, ease: 'inOutSine', delay: loopDelay,
        }));
      });

      // Glow soft pulse
      el.querySelectorAll('.fp-family-glow').forEach((c, i) => {
        hoverAnimsRef.current.push(animate(c, {
          r: [7, 10, 7], opacity: [0.12, 0.25, 0.12],
          duration: 3000 + i * 400, loop: true, ease: 'inOutSine', delay: loopDelay,
        }));
      });

      // Mote flow
      el.querySelectorAll('.fp-mote').forEach((m, i) => {
        const edge = Math.floor(i / 2);
        const v1 = vertexAt(edge, VERT_R);
        const v2 = vertexAt((edge + 1) % 5, VERT_R);
        hoverAnimsRef.current.push(animate(m, {
          cx: [v1.x, v2.x, v1.x], cy: [v1.y, v2.y, v1.y],
          opacity: [0.25, 0.6, 0.25],
          duration: 5000 + i * 400, loop: true, ease: 'inOutSine', delay: loopDelay,
        }));
      });

      // Whisker stroke breathe
      el.querySelectorAll('.fp-whisker').forEach((line, i) => {
        const d = createDrawable(line);
        hoverAnimsRef.current.push(animate(d, {
          draw: ['0 0.5', '0.5 1', '0 0.5'],
          duration: 4000 + i * 500, loop: true, ease: 'inOutSine', delay: loopDelay,
        }));
        hoverAnimsRef.current.push(animate(line, {
          opacity: [0.3, 0.6, 0.3],
          duration: 4000 + i * 500, loop: true, ease: 'inOutSine', delay: loopDelay,
        }));
      });

      // Phi dot pulse
      hoverAnimsRef.current.push(animate(el.querySelectorAll('.fp-phi-dot'), {
        r: [1.5, 2.2, 1.5], opacity: [0.4, 0.8, 0.4],
        duration: 3500, loop: true, ease: 'inOutSine', delay: stagger(150, { start: loopDelay }),
      }));

      // Spiral breathe
      hoverAnimsRef.current.push(animate(el.querySelector('.fp-spiral'), {
        opacity: [0.2, 0.45, 0.2], duration: 6000, loop: true, ease: 'inOutSine', delay: loopDelay,
      }));
    };

    const onLeave = () => {
      hoveredRef.current = false;

      // Stop all hover anims
      hoverAnimsRef.current.forEach(a => a.pause());
      hoverAnimsRef.current = [];

      // === RETRACT: fade everything back to hidden ===
      const dur = 500;
      const ease = 'inOutQuad';

      // Fade geometry out
      animate(el.querySelectorAll('.fp-bond'), { opacity: 0, duration: dur, ease });
      animate(el.querySelectorAll('.fp-pentagon'), { opacity: 0, duration: dur, ease });
      animate(el.querySelectorAll('.fp-pentagram'), { opacity: 0, duration: dur, ease });
      animate(el.querySelectorAll('.fp-family-circle'), { r: 0, opacity: 0, duration: dur, ease });
      animate(el.querySelectorAll('.fp-family-stroke'), { opacity: 0, duration: dur, ease });
      animate(el.querySelectorAll('.fp-family-glow'), { r: 0, opacity: 0, duration: dur, ease });
      animate(el.querySelectorAll('.fp-mote'), { r: 0, opacity: 0, duration: dur, ease });
      animate(el.querySelectorAll('.fp-phi-dot'), { r: 0, opacity: 0, duration: dur, ease });
      animate(el.querySelectorAll('.fp-whisker'), { opacity: 0, duration: dur, ease });
      animate(el.querySelector('.fp-spiral'), { opacity: 0, duration: dur, ease });
      animate(el.querySelector('.fp-harmony-ring'), { opacity: 0, duration: dur, ease });

      // Bring back the resting ring
      animate(el.querySelector('.fp-rest-ring'), {
        opacity: [0, 0.35], duration: 600, ease: 'outQuad', delay: 200,
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

  /* ── Click bursts (work whether hovered or not) ── */
  useEffect(() => {
    if (!effect || !geoRef.current) return;
    const el = geoRef.current;

    const ring = el.querySelector('.fp-burst');
    if (ring) {
      animate(ring, { r: [12, 85], opacity: [0.7, 0], strokeWidth: [2, 0.2], duration: 800, ease: 'outCubic' });
    }

    // Flash family circles to full color
    el.querySelectorAll('.fp-family-circle').forEach((c, i) => {
      const isVis = hoveredRef.current;
      animate(c, {
        r: [isVis ? 1.3 : 0, 4, isVis ? 1.3 : 0],
        fill: ['#fff', FAMILY[i]?.color || '#fff', '#fff'],
        opacity: [isVis ? 1 : 0, 1, isVis ? 1 : 0],
        duration: 800, ease: 'outQuad', delay: i * 50,
      });
    });
    animate(el.querySelectorAll('.fp-family-stroke'), {
      r: [5, 8, 5], opacity: [0.8, 1, hoveredRef.current ? 0.8 : 0],
      duration: 700, ease: 'outQuad', delay: stagger(40),
    });
    animate(el.querySelectorAll('.fp-family-glow'), {
      r: [5, 14, 5], opacity: [0.1, 0.4, hoveredRef.current ? 0.1 : 0],
      duration: 700, ease: 'outQuad', delay: stagger(40),
    });

    // Bond lines flash
    animate(el.querySelectorAll('.fp-bond'), {
      opacity: [0.3, 1, hoveredRef.current ? 0.6 : 0],
      strokeWidth: [0.5, 2, 0.5], duration: 600, delay: stagger(50),
    });

    // Pentagon flash
    animate(el.querySelectorAll('.fp-pentagon'), {
      opacity: [0.3, 0.9, hoveredRef.current ? 0.7 : 0],
      strokeWidth: [0.8, 2, 0.8], duration: 600,
    });

    if (effect === 'float') {
      animate(el.querySelector('.fp-spiral'), { opacity: [0.1, 0.7, hoveredRef.current ? 0.3 : 0], strokeWidth: [0.5, 2, 0.5], duration: 1000 });
    } else if (effect === 'glitch') {
      animate(el.querySelectorAll('.fp-pentagram'), { strokeWidth: [0.7, 2.5, 0.7], opacity: [0.2, 0.9, hoveredRef.current ? 0.5 : 0], duration: 500 });
    } else if (effect === 'spin') {
      animate(el.querySelector('.fp-harmony-ring'), { opacity: [0.2, 0.9, hoveredRef.current ? 0.5 : 0], strokeWidth: [0.6, 2, 0.6], duration: 700 });
    } else if (effect === 'ripple') {
      animate(el.querySelectorAll('.fp-whisker'), { opacity: [0.2, 1, hoveredRef.current ? 0.5 : 0], strokeWidth: [0.5, 1.5, 0.5], duration: 500, delay: stagger(40) });
      animate(el.querySelectorAll('.fp-phi-dot'), { r: [0.5, 3.5, hoveredRef.current ? 1.5 : 0], opacity: [0.3, 1, hoveredRef.current ? 0.6 : 0], duration: 600, delay: stagger(60) });
    }
  }, [effect]);

  /* ── SVG elements ── */

  const familyCircles = useMemo(() => FAMILY.map((f, i) => {
    const v = vertexAt(i, VERT_R);
    return (
      <g key={i}>
        <circle cx={v.x} cy={v.y} r="0" className="fp-family-glow" fill={f.glow} opacity="0" />
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
        className="fp-bond" stroke={f.color} strokeWidth="0.5"
        opacity="0" strokeLinecap="round" />
    );
  }), []);

  const motes = useMemo(() => MOTES.map((m, i) => (
    <circle key={i} cx={m.cx} cy={m.cy} r="0"
      className="fp-mote" fill={m.color} opacity="0" />
  )), []);

  const whiskers = useMemo(() => WHISKERS.map((w, i) => (
    <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
      className="fp-whisker" stroke={w.color}
      strokeWidth="0.5" opacity="0" strokeLinecap="round" />
  )), []);

  const phiDots = useMemo(() => {
    const order = [0, 2, 4, 1, 3];
    return Array.from({ length: 5 }, (_, i) => {
      const a = vertexAt(order[i], VERT_R);
      const b = vertexAt(order[(i + 1) % 5], VERT_R);
      const t = 1 / PHI;
      return (
        <circle key={i} cx={a.x + (b.x - a.x) * t} cy={a.y + (b.y - a.y) * t}
          r="0" className="fp-phi-dot" fill="rgba(251,191,36,0.8)" opacity="0" />
      );
    });
  }, []);

  return (
    <div className="avatar-geo-wrap" ref={geoRef}>
      <svg className="avatar-geo-svg" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="fp-center-mask" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="black" />
            <stop offset="22%" stopColor="black" />
            <stop offset="38%" stopColor="white" />
            <stop offset="100%" stopColor="white" />
          </radialGradient>
          <mask id="fp-feather-mask">
            <rect x="0" y="0" width="200" height="200" fill="url(#fp-center-mask)" />
          </mask>
          <radialGradient id="fp-ambient" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.08" />
            <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.04" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx={CX} cy={CY} r="95" fill="url(#fp-ambient)" opacity="0.5" />

        {/* === DEFAULT: elegant thin ring === */}
        <circle cx={CX} cy={CY} r="46" className="fp-rest-ring"
          fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="0.6" />

        {/* === HOVER GEOMETRY (all starts hidden, opacity 0) === */}
        <g mask="url(#fp-feather-mask)">
          <g className="fp-spiral-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <path d={goldenSpiralPath(18, 70, 2.5)} className="fp-spiral"
              fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="0.5"
              strokeLinecap="round" opacity="0" />
          </g>

          {bonds}

          <g className="fp-pent-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <polygon points={pentagonPath(VERT_R)} className="fp-pentagon"
              fill="none" stroke="rgba(168,85,247,0.5)" strokeWidth="0.8"
              strokeLinejoin="round" opacity="0" />
            <polygon points={pentagonPath(VERT_R + 6)} className="fp-pentagon"
              fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="0.4"
              strokeLinejoin="round" strokeDasharray="3 5" opacity="0" />
          </g>

          <g className="fp-star-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            <polygon points={pentagramPath(VERT_R)} className="fp-pentagram"
              fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth="0.7"
              strokeLinejoin="round" opacity="0" />
          </g>

          {phiDots}
          {motes}
          {whiskers}
        </g>

        {/* Family circles — outside mask, starts hidden */}
        {familyCircles}

        {/* Harmony ring — hidden until hover */}
        <circle cx={CX} cy={CY} r="42" className="fp-harmony-ring"
          fill="none" stroke="rgba(168,85,247,0.4)" strokeWidth="0.6" opacity="0" />

        {/* Burst ring */}
        <circle cx={CX} cy={CY} r="12" className="fp-burst"
          fill="none" stroke="rgba(168,85,247,0.6)" strokeWidth="2" opacity="0" />
      </svg>

      {children}
    </div>
  );
}
