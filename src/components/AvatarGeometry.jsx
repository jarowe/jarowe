import { useState, useEffect, useRef, useMemo } from 'react';
import { animate, stagger, createTimeline, createDrawable } from 'animejs';
import './AvatarGeometry.css';

/* ═══════════════════════════════════════════════════════════════════════
   AVATAR GEOMETRY — Sacred Geometry Frame (anime.js v4)
   Wraps the hero avatar with an elaborate animated mandala frame.
   ═══════════════════════════════════════════════════════════════════════ */

const CX = 100, CY = 100;

/* Pre-compute geometry */
function petalPath(i) {
  const r = 72;
  const a = (i * 30 - 90) * Math.PI / 180;
  const px = CX + r * Math.cos(a), py = CY + r * Math.sin(a);
  const dx = 9 * Math.cos(a), dy = 9 * Math.sin(a);
  const nx = 3 * Math.cos(a + Math.PI / 2), ny = 3 * Math.sin(a + Math.PI / 2);
  return `M${CX + nx} ${CY + ny} L${px + dx} ${py + dy} L${CX - nx} ${CY - ny} L${px - dx} ${py - dy} Z`;
}

function flowerCircles() {
  const r = 18, out = [{ cx: CX, cy: CY, r }];
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 - 90) * Math.PI / 180;
    out.push({ cx: CX + r * Math.cos(a), cy: CY + r * Math.sin(a), r });
  }
  return out;
}
const FLOWERS = flowerCircles();

function triPoints(r, offset = 0) {
  const pts = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * 120 + offset - 90) * Math.PI / 180;
    pts.push(`${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`);
  }
  return pts.join(' ');
}

function particleData() {
  const colors = ['#fff', '#67e8f9', '#f472b6', '#c4b5fd', '#fbbf24'];
  const out = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + (i * 0.7);
    const dist = 50 + (i % 7) * 6.5;
    out.push({
      cx: CX + dist * Math.cos(a),
      cy: CY + dist * Math.sin(a),
      r: 0.5 + (i % 4) * 0.35,
      fill: colors[i % colors.length],
      spiral: i < 8,
    });
  }
  return out;
}
const PARTICLES = particleData();

function arcPath(start, sweep, r) {
  const s = start * Math.PI / 180, e = (start + sweep) * Math.PI / 180;
  const x1 = CX + r * Math.cos(s), y1 = CY + r * Math.sin(s);
  const x2 = CX + r * Math.cos(e), y2 = CY + r * Math.sin(e);
  return `M${x1} ${y1} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

export default function AvatarGeometry({ children, effect }) {
  const geoRef = useRef(null);
  const animsRef = useRef([]);
  const hoveredRef = useRef(false);
  const [hovered, setHovered] = useState(false);

  /* ── Mount: entrance timeline + continuous loops ── */
  useEffect(() => {
    const el = geoRef.current;
    if (!el) return;
    const anims = animsRef.current;

    const tl = createTimeline({ defaults: { ease: 'outQuad' } });

    // 0.0s — Inner glow ring draws
    const innerRing = el.querySelector('.ag-inner-ring');
    if (innerRing) {
      const d = createDrawable(innerRing);
      tl.add(d, { draw: '0 1', duration: 800, ease: 'inOutQuad' }, 0);
    }

    // 0.2s — Hexagram triangles draw
    el.querySelectorAll('.ag-hex-line').forEach(p => {
      const d = createDrawable(p);
      tl.add(d, { draw: '0 1', duration: 700, ease: 'inOutQuad' }, 200);
    });

    // 0.5s — Flower circles draw
    el.querySelectorAll('.ag-flower').forEach((c, i) => {
      const d = createDrawable(c);
      tl.add(d, { draw: '0 1', duration: 600 }, 500 + i * 70);
    });

    // 0.8s — Star petals scale in
    tl.add(el.querySelectorAll('.ag-petal'), {
      scale: [0, 1], opacity: [0, 0.7], duration: 500, ease: 'outBack(1.4)',
      delay: stagger(35),
    }, 800);

    // 1.1s — Tick marks fade in
    tl.add(el.querySelectorAll('.ag-tick'), {
      opacity: [0, 0.4], duration: 400,
      delay: stagger(20),
    }, 1100);

    // 1.3s — Orbiting dots appear
    tl.add(el.querySelectorAll('.ag-orbit'), {
      scale: [0, 1], opacity: [0, 0.8], duration: 500, ease: 'outBack(2)',
      delay: stagger(80),
    }, 1300);

    // 1.5s — Particles twinkle in
    tl.add(el.querySelectorAll('.ag-particle'), {
      opacity: [0, (_, i) => 0.15 + (i % 5) * 0.1], duration: 600,
      delay: stagger(25),
    }, 1500);

    // 1.7s — Rays fade in
    tl.add(el.querySelectorAll('.ag-ray'), {
      opacity: [0, 0.25], duration: 400,
      delay: stagger(50),
    }, 1700);

    // 1.9s — Energy arcs
    el.querySelectorAll('.ag-arc').forEach((p, i) => {
      const d = createDrawable(p);
      tl.add(d, { draw: '0 1', duration: 800 }, 1900 + i * 100);
    });

    /* ── Continuous loops ── */

    // Hexagram CW
    anims.push(animate(el.querySelector('.ag-hex-group'), {
      rotate: [0, 360], duration: 20000, loop: true, ease: 'linear',
    }));

    // Flower CCW
    anims.push(animate(el.querySelector('.ag-flower-group'), {
      rotate: [0, -360], duration: 35000, loop: true, ease: 'linear',
    }));

    // Star ring CW (slow)
    anims.push(animate(el.querySelector('.ag-star-group'), {
      rotate: [0, 360], duration: 40000, loop: true, ease: 'linear',
    }));

    // Inner ring glow pulse
    anims.push(animate(el.querySelector('.ag-inner-ring'), {
      opacity: [0.3, 0.7, 0.3], strokeWidth: [1, 1.8, 1],
      duration: 4000, loop: true, ease: 'inOutSine',
    }));

    // Orbiting dots
    el.querySelectorAll('.ag-orbit').forEach((dot, i) => {
      const dur = 5000 + i * 900;
      const r = 62;
      const startA = i * 45;
      anims.push(animate(dot, {
        cx: [
          CX + r * Math.cos((startA) * Math.PI / 180),
          CX + r * Math.cos((startA + 120) * Math.PI / 180),
          CX + r * Math.cos((startA + 240) * Math.PI / 180),
          CX + r * Math.cos((startA + 360) * Math.PI / 180),
        ],
        cy: [
          CY + r * Math.sin((startA) * Math.PI / 180),
          CY + r * Math.sin((startA + 120) * Math.PI / 180),
          CY + r * Math.sin((startA + 240) * Math.PI / 180),
          CY + r * Math.sin((startA + 360) * Math.PI / 180),
        ],
        duration: dur, loop: true, ease: 'linear',
      }));
      anims.push(animate(dot, {
        r: [2, 2.8, 2], duration: 2500 + i * 400, loop: true, ease: 'inOutSine',
      }));
    });

    // Ray opacity pulse
    anims.push(animate(el.querySelectorAll('.ag-ray'), {
      opacity: [0.12, 0.45, 0.12], duration: 5000, loop: true, ease: 'inOutSine',
      delay: stagger(200),
    }));

    // Particle twinkle + spiral for first 8
    el.querySelectorAll('.ag-particle').forEach((p, i) => {
      anims.push(animate(p, {
        opacity: [() => 0.08 + Math.random() * 0.2, () => 0.35 + Math.random() * 0.45, () => 0.08 + Math.random() * 0.2],
        duration: 2000 + (i % 7) * 500, loop: true, ease: 'inOutSine',
      }));
      if (i < 8) {
        const origCx = parseFloat(p.getAttribute('cx'));
        const origCy = parseFloat(p.getAttribute('cy'));
        anims.push(animate(p, {
          cx: [origCx, CX + (origCx - CX) * 0.35, origCx],
          cy: [origCy, CY + (origCy - CY) * 0.35, origCy],
          duration: 7000 + i * 900, loop: true, ease: 'inOutSine',
        }));
      }
    });

    // Energy arc flowing dash
    el.querySelectorAll('.ag-arc').forEach((p, i) => {
      const len = p.getTotalLength?.() || 100;
      anims.push(animate(p, {
        strokeDashoffset: [0, -len * 2], duration: 3500 + i * 600, loop: true, ease: 'linear',
      }));
    });

    // Tick mark breathing
    anims.push(animate(el.querySelectorAll('.ag-tick'), {
      opacity: [0.2, 0.55, 0.2], duration: 5000, loop: true, ease: 'inOutSine',
      delay: stagger(80),
    }));

    return () => {
      tl.pause();
      anims.forEach(a => a.pause());
      anims.length = 0;
    };
  }, []);

  /* ── Hover speed control ── */
  useEffect(() => {
    hoveredRef.current = hovered;
    animsRef.current.forEach(a => { a.speed = hovered ? 3 : 1; });
  }, [hovered]);

  /* ── Click burst animation ── */
  useEffect(() => {
    if (!effect || !geoRef.current) return;
    const el = geoRef.current;

    // Shockwave rings
    const ring = el.querySelector('.ag-burst');
    if (ring) {
      animate(ring, { r: [10, 98], opacity: [0.8, 0], strokeWidth: [3, 0.3], duration: 700, ease: 'outCubic' });
    }
    const ring2 = el.querySelector('.ag-burst-2');
    if (ring2) {
      setTimeout(() => animate(ring2, { r: [15, 85], opacity: [0.5, 0], strokeWidth: [2, 0.2], duration: 600, ease: 'outCubic' }), 120);
    }

    // Inner ring flash
    animate(el.querySelector('.ag-inner-ring'), {
      strokeWidth: [1, 4, 1], opacity: [0.5, 1, 0.5], duration: 600,
    });

    // Per-effect unique accent
    if (effect === 'float') {
      // Flower circles bloom outward
      animate(el.querySelectorAll('.ag-flower'), {
        strokeWidth: [0.6, 2.5, 0.6], duration: 800,
      });
    } else if (effect === 'glitch') {
      // Star petals flash bright
      animate(el.querySelectorAll('.ag-petal'), {
        opacity: [0.7, 1, 0.7], strokeWidth: [0.8, 2.5, 0.8],
        duration: 400, delay: stagger(20),
      });
    } else if (effect === 'spin') {
      // Hexagram lines surge
      animate(el.querySelectorAll('.ag-hex-line'), {
        strokeWidth: [1, 4, 1], duration: 800,
      });
    } else if (effect === 'ripple') {
      // Rays blaze + arcs surge
      animate(el.querySelectorAll('.ag-ray'), {
        opacity: [0.15, 1, 0.15], duration: 500, delay: stagger(35),
      });
      animate(el.querySelectorAll('.ag-arc'), {
        strokeWidth: [1, 3.5, 1], opacity: [0.2, 0.9, 0.2], duration: 600,
      });
    }

    // Speed surge then ease back
    animsRef.current.forEach(a => { a.speed = 5; });
    const t = setTimeout(() => {
      animsRef.current.forEach(a => { a.speed = hoveredRef.current ? 3 : 1; });
    }, 700);
    return () => clearTimeout(t);
  }, [effect]);

  /* ── Pre-compute SVG elements ── */
  const petals = useMemo(() => Array.from({ length: 12 }, (_, i) => (
    <path key={i} d={petalPath(i)} className="ag-petal"
      fill="none" stroke="rgba(167,139,250,0.35)" strokeWidth="0.8"
      style={{ transformOrigin: `${CX}px ${CY}px` }} />
  )), []);

  const flowers = useMemo(() => FLOWERS.map((f, i) => (
    <circle key={i} cx={f.cx} cy={f.cy} r={f.r} className="ag-flower"
      fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
  )), []);

  const ticks = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 - 90) * Math.PI / 180;
    const r1 = i % 2 === 0 ? 78 : 80;
    const r2 = i % 2 === 0 ? 83 : 84;
    return <line key={i}
      x1={CX + r1 * Math.cos(a)} y1={CY + r1 * Math.sin(a)}
      x2={CX + r2 * Math.cos(a)} y2={CY + r2 * Math.sin(a)}
      stroke="rgba(167,139,250,0.3)" strokeWidth={i % 6 === 0 ? '1' : '0.5'}
      className="ag-tick" opacity="0" />;
  }), []);

  const orbits = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 - 90) * Math.PI / 180;
    const r = 62;
    return <circle key={i} cx={CX + r * Math.cos(a)} cy={CY + r * Math.sin(a)}
      r="2" className="ag-orbit"
      fill={['#67e8f9', '#c4b5fd', '#f472b6', '#fbbf24'][i % 4]} opacity="0" />;
  }), []);

  const rays = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45) * Math.PI / 180;
    return <line key={i}
      x1={CX + 48 * Math.cos(a)} y1={CY + 48 * Math.sin(a)}
      x2={CX + 90 * Math.cos(a)} y2={CY + 90 * Math.sin(a)}
      className="ag-ray" stroke="rgba(196,181,253,0.2)" strokeWidth="0.5" opacity="0" />;
  }), []);

  const particles = useMemo(() => PARTICLES.map((p, i) => (
    <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.fill}
      className="ag-particle" opacity="0" />
  )), []);

  const arcs = useMemo(() => [
    { start: -40, sweep: 110, r: 86, color: 'rgba(103,232,249,0.2)' },
    { start: 90, sweep: 100, r: 82, color: 'rgba(196,181,253,0.18)' },
    { start: 200, sweep: 120, r: 88, color: 'rgba(244,114,182,0.15)' },
  ].map((a, i) => (
    <path key={i} d={arcPath(a.start, a.sweep, a.r)} className="ag-arc"
      fill="none" stroke={a.color} strokeWidth="1"
      strokeDasharray="7 5" strokeLinecap="round" />
  )), []);

  return (
    <div className="avatar-geo-wrap"
      ref={geoRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg className="avatar-geo-svg" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="ag-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="ag-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Ambient glow behind everything */}
        <circle cx={CX} cy={CY} r="90" fill="url(#ag-glow)" className="ag-ambient" opacity="0.5" />

        {/* Layer 8 — Energy arcs */}
        {arcs}

        {/* Layer 6 — Emanating rays */}
        {rays}

        {/* Layer 5 — Tick marks */}
        {ticks}

        {/* Layer 1 — Star petals ring */}
        <g className="ag-star-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {petals}
        </g>

        {/* Layer 4 — Orbiting dots */}
        {orbits}

        {/* Layer 7 — Particles */}
        {particles}

        {/* Layer 2 — Flower of life */}
        <g className="ag-flower-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {flowers}
        </g>

        {/* Layer 3 — Hexagram */}
        <g className="ag-hex-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          <polygon points={triPoints(55, 0)} className="ag-hex-line"
            fill="none" stroke="rgba(103,232,249,0.35)" strokeWidth="1"
            strokeLinejoin="round" />
          <polygon points={triPoints(55, 60)} className="ag-hex-line"
            fill="none" stroke="rgba(196,181,253,0.35)" strokeWidth="1"
            strokeLinejoin="round" />
        </g>

        {/* Inner glow ring — closest to avatar */}
        <circle cx={CX} cy={CY} r="48" className="ag-inner-ring"
          fill="none" stroke="rgba(167,139,250,0.35)" strokeWidth="1" />

        {/* Burst rings (animated on click) */}
        <circle cx={CX} cy={CY} r="10" className="ag-burst"
          fill="none" stroke="#c4b5fd" strokeWidth="3" opacity="0" />
        <circle cx={CX} cy={CY} r="15" className="ag-burst-2"
          fill="none" stroke="#c4b5fd" strokeWidth="2" opacity="0" />
      </svg>

      {children}
    </div>
  );
}
