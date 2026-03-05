import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { animate, stagger, createTimeline, createDrawable } from 'animejs';
import './AuthModal.css';

/* ── Perk definitions with SVG icon paths ── */
const PERKS = [
  {
    id: 'cloud', label: 'CLOUD SYNC', color: '#06b6d4',
    burst: ['#06b6d4', '#67e8f9', '#0e7490'],
    icon: <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    desc: 'Progress saved everywhere',
  },
  {
    id: 'trophy', label: 'LEADERBOARDS', color: '#fbbf24',
    burst: ['#fbbf24', '#fde68a', '#f59e0b'],
    icon: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M4 22h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" stroke="currentColor" strokeWidth="2" fill="none"/></>,
    desc: 'Compete globally',
  },
  {
    id: 'badge', label: '15 BADGES', color: '#f472b6',
    burst: ['#f472b6', '#f9a8d4', '#ec4899'],
    icon: <><circle cx="12" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none"/><path d="m15.477 12.89 1.414 8.485L12 18.5l-4.89 2.875 1.413-8.485" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>,
    desc: 'Unlock achievements',
  },
  {
    id: 'rocket', label: 'PROFILE', color: '#a855f7',
    burst: ['#a855f7', '#c4b5fd', '#7c3aed'],
    icon: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" stroke="currentColor" strokeWidth="2" fill="none"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke="currentColor" strokeWidth="2" fill="none"/></>,
    desc: 'Your adventure hub',
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   COSMIC PORTAL — Sacred Geometry Wormhole (anime.js v4)
   ═══════════════════════════════════════════════════════════════════════ */

/* Pre-compute geometry */
const CX = 160, CY = 100;

function petalPath(i, r = 85) {
  const a = (i * 30 - 90) * Math.PI / 180;
  const px = CX + r * Math.cos(a), py = CY + r * Math.sin(a);
  const dx = 8 * Math.cos(a), dy = 8 * Math.sin(a);
  const nx = 3 * Math.cos(a + Math.PI / 2), ny = 3 * Math.sin(a + Math.PI / 2);
  return `M${CX + nx} ${CY + ny} L${px + dx} ${py + dy} L${CX - nx} ${CY - ny} L${px - dx} ${py - dy} Z`;
}

function flowerCircles() {
  const r = 22, out = [{ cx: CX, cy: CY, r }];
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

function orbitPos(i, r = 30) {
  const a = (i * 60 - 90) * Math.PI / 180;
  return { cx: CX + r * Math.cos(a), cy: CY + r * Math.sin(a) };
}

function particleData() {
  const colors = ['#fff', '#67e8f9', '#f472b6', '#c4b5fd', '#fbbf24'];
  const out = [];
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 75;
    out.push({
      cx: CX + dist * Math.cos(a), cy: CY + dist * Math.sin(a),
      r: 0.5 + Math.random() * 1.2,
      fill: colors[i % colors.length],
      spiral: i < 8,
    });
  }
  return out;
}

const PARTICLES = particleData();

function arcPath(startAngle, sweep, r) {
  const s = startAngle * Math.PI / 180, e = (startAngle + sweep) * Math.PI / 180;
  const x1 = CX + r * Math.cos(s), y1 = CY + r * Math.sin(s);
  const x2 = CX + r * Math.cos(e), y2 = CY + r * Math.sin(e);
  const large = sweep > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function CosmicPortal() {
  const portalRef = useRef(null);
  const animsRef = useRef([]);

  useEffect(() => {
    const el = portalRef.current;
    if (!el) return;

    const anims = animsRef.current;

    /* ── Entrance timeline ── */
    const tl = createTimeline({ defaults: { ease: 'outQuad' } });

    // 0.0s — ambient glow
    tl.add(el.querySelector('.portal-glow'), { opacity: [0, 1], duration: 600 }, 0);

    // 0.2s — central core
    tl.add(el.querySelector('.portal-core'), {
      scale: [0, 1], opacity: [0, 1], duration: 900, ease: 'outElastic(1, 0.6)',
    }, 200);

    // 0.4s — hexagram triangles draw
    el.querySelectorAll('.hex-line').forEach(p => {
      const d = createDrawable(p);
      tl.add(d, { draw: '0 1', duration: 700, ease: 'inOutQuad' }, 400);
    });

    // 0.6s — flower of life circles draw
    el.querySelectorAll('.flower-circle').forEach((c, i) => {
      const d = createDrawable(c);
      tl.add(d, { draw: '0 1', duration: 600 }, 600 + i * 80);
    });

    // 0.9s — outer star petals scale in
    tl.add(el.querySelectorAll('.star-petal'), {
      scale: [0, 1], opacity: [0, 0.7], duration: 500, ease: 'outBack(1.4)',
      delay: stagger(40),
    }, 900);

    // 1.2s — rays fade in
    tl.add(el.querySelectorAll('.portal-ray'), {
      opacity: [0, 0.3], duration: 400,
      delay: stagger(60),
    }, 1200);

    // 1.4s — orbiting dots
    tl.add(el.querySelectorAll('.orbit-dot'), {
      scale: [0, 1], opacity: [0, 0.8], duration: 500, ease: 'outBack(2)',
      delay: stagger(100),
    }, 1400);

    // 1.6s — particles
    tl.add(el.querySelectorAll('.portal-particle'), {
      opacity: [0, (_, i) => 0.2 + (i % 5) * 0.12], duration: 600,
      delay: stagger(30),
    }, 1600);

    // 1.8s — energy arcs
    el.querySelectorAll('.energy-arc').forEach((p, i) => {
      const d = createDrawable(p);
      tl.add(d, { draw: '0 1', duration: 800 }, 1800 + i * 100);
    });

    /* ── Continuous loops ── */

    // Core breath
    anims.push(animate(el.querySelector('.portal-core'), {
      scale: [1, 1.1, 1], duration: 3000, loop: true, ease: 'inOutSine',
    }));

    // Hexagram rotation CW
    anims.push(animate(el.querySelector('.hex-group'), {
      rotate: [0, 360], duration: 15000, loop: true, ease: 'linear',
    }));

    // Flower rotation CCW
    anims.push(animate(el.querySelector('.flower-group'), {
      rotate: [0, -360], duration: 45000, loop: true, ease: 'linear',
    }));

    // Star ring rotation CW
    anims.push(animate(el.querySelector('.star-group'), {
      rotate: [0, 360], duration: 30000, loop: true, ease: 'linear',
    }));

    // Orbiting dots — individual orbits
    el.querySelectorAll('.orbit-dot').forEach((dot, i) => {
      const dur = 4000 + i * 800;
      const r = 30;
      const startA = i * 60;
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
        r: [2, 2.6, 2], duration: 2000 + i * 300, loop: true, ease: 'inOutSine',
      }));
    });

    // Ray opacity pulse
    anims.push(animate(el.querySelectorAll('.portal-ray'), {
      opacity: [0.15, 0.5, 0.15], duration: 4000, loop: true, ease: 'inOutSine',
      delay: stagger(200),
    }));

    // Particle twinkle + spiral inward for first 8
    el.querySelectorAll('.portal-particle').forEach((p, i) => {
      const dur = 2000 + (i % 7) * 500;
      anims.push(animate(p, {
        opacity: [() => 0.1 + Math.random() * 0.3, () => 0.4 + Math.random() * 0.5, () => 0.1 + Math.random() * 0.3],
        duration: dur, loop: true, ease: 'inOutSine',
      }));
      if (i < 8) {
        // Spiral inward
        const origCx = parseFloat(p.getAttribute('cx'));
        const origCy = parseFloat(p.getAttribute('cy'));
        anims.push(animate(p, {
          cx: [origCx, CX + (origCx - CX) * 0.3, origCx],
          cy: [origCy, CY + (origCy - CY) * 0.3, origCy],
          duration: 6000 + i * 800, loop: true, ease: 'inOutSine',
        }));
      }
    });

    // Energy arc flowing dash
    el.querySelectorAll('.energy-arc').forEach((p, i) => {
      const len = p.getTotalLength?.() || 100;
      anims.push(animate(p, {
        strokeDashoffset: [0, -len * 2], duration: 3000 + i * 500, loop: true, ease: 'linear',
      }));
    });

    // Inner iris counter-rotate
    anims.push(animate(el.querySelector('.portal-iris'), {
      rotate: [0, -360], duration: 20000, loop: true, ease: 'linear',
    }));

    // Color cycle — core opacity breathing
    anims.push(animate(el.querySelector('.core-glow'), {
      opacity: [0.6, 1, 0.6], duration: 4000, loop: true, ease: 'inOutSine',
    }));

    return () => {
      tl.pause();
      anims.forEach(a => a.pause());
      anims.length = 0;
    };
  }, []);

  /* Build SVG once */
  const petals = useMemo(() => Array.from({ length: 12 }, (_, i) => (
    <path key={i} d={petalPath(i)} className="star-petal"
      fill="none" stroke="rgba(167,139,250,0.4)" strokeWidth="0.8"
      style={{ transformOrigin: `${CX}px ${CY}px` }} />
  )), []);

  const flowers = useMemo(() => FLOWERS.map((f, i) => (
    <circle key={i} cx={f.cx} cy={f.cy} r={f.r} className="flower-circle"
      fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
  )), []);

  const orbits = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const p = orbitPos(i);
    return <circle key={i} cx={p.cx} cy={p.cy} r="2" className="orbit-dot"
      fill={i % 2 === 0 ? '#67e8f9' : '#c4b5fd'} opacity="0" />;
  }), []);

  const rays = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45) * Math.PI / 180;
    const x2 = CX + 95 * Math.cos(a), y2 = CY + 95 * Math.sin(a);
    return <line key={i} x1={CX} y1={CY} x2={x2} y2={y2} className="portal-ray"
      stroke="rgba(196,181,253,0.25)" strokeWidth="0.4" opacity="0" />;
  }), []);

  const particles = useMemo(() => PARTICLES.map((p, i) => (
    <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={p.fill}
      className="portal-particle" opacity="0" />
  )), []);

  const arcs = useMemo(() => [
    { start: -30, sweep: 120, r: 80, color: 'rgba(103,232,249,0.25)' },
    { start: 100, sweep: 100, r: 75, color: 'rgba(196,181,253,0.2)' },
    { start: 210, sweep: 90, r: 82, color: 'rgba(244,114,182,0.18)' },
  ].map((a, i) => (
    <path key={i} d={arcPath(a.start, a.sweep, a.r)} className="energy-arc"
      fill="none" stroke={a.color} strokeWidth="1"
      strokeDasharray="6 4" strokeLinecap="round" />
  )), []);

  return (
    <div className="portal-stage" ref={portalRef}>
      <div className="portal-glow" style={{ opacity: 0 }} />
      <svg viewBox="0 0 320 200" className="portal-svg">
        <defs>
          <radialGradient id="pt-core" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#1e0845" />
            <stop offset="40%" stopColor="#7c3aed" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="pt-iris" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="pt-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Layer 8 — Energy arcs */}
        {arcs}

        {/* Layer 6 — Emanating rays */}
        {rays}

        {/* Layer 1 — Outer star ring */}
        <g className="star-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {petals}
        </g>

        {/* Layer 2 — Flower of life */}
        <g className="flower-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {flowers}
        </g>

        {/* Layer 3 — Hexagram (two triangles) */}
        <g className="hex-group" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          <polygon points={triPoints(45, 0)} className="hex-line"
            fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="1"
            strokeLinejoin="round" />
          <polygon points={triPoints(45, 60)} className="hex-line"
            fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="1"
            strokeLinejoin="round" />
        </g>

        {/* Layer 4 — Orbiting dots */}
        {orbits}

        {/* Layer 7 — Particles */}
        {particles}

        {/* Layer 5 — Central core */}
        <g className="portal-core" style={{ transformOrigin: `${CX}px ${CY}px`, opacity: 0 }}>
          <circle cx={CX} cy={CY} r="18" fill="url(#pt-core)" filter="url(#pt-blur)" className="core-glow" />
          <circle cx={CX} cy={CY} r="10" fill="url(#pt-iris)" className="portal-iris"
            style={{ transformOrigin: `${CX}px ${CY}px` }} />
          <circle cx={CX} cy={CY} r="4" fill="rgba(255,255,255,0.15)" />
        </g>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */

export default function AuthModal() {
  const { showAuthModal, closeAuthModal, signInWithGoogle, signInWithGitHub, signInWithEmail, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  /* ── Confetti burst on perk hover ── */
  const handlePerkHover = useCallback((perk, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    confetti({
      particleCount: 40, spread: 60, startVelocity: 25, gravity: 0.6, ticks: 80,
      origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
      colors: perk.burst, shapes: ['circle', 'square'], scalar: 0.8,
      disableForReducedMotion: true,
    });
  }, []);

  /* ── Email submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await (mode === 'signup' ? signUp : signInWithEmail)(email, password);
      setLoading(false);
      if (err) {
        setError(err.message);
      } else {
        confetti({ particleCount: 120, spread: 90, origin: { x: 0.5, y: 0.4 }, colors: ['#7c3aed','#06b6d4','#fbbf24','#f472b6','#22c55e'] });
        setEmail(''); setPassword(''); setShowForm(false);
        closeAuthModal();
      }
    } catch (ex) {
      setLoading(false);
      setError(ex.message || 'Something went wrong');
    }
  };

  /* ── Close handler ── */
  const handleClose = useCallback(() => {
    setShowForm(false);
    setError('');
    closeAuthModal();
  }, [closeAuthModal]);

  /* ── Ref for click-outside detection ── */
  const modalRef = useRef(null);

  /* ── Escape key to close ── */
  useEffect(() => {
    if (!showAuthModal) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAuthModal, handleClose]);

  if (!showAuthModal) return null;

  return (
    <div className="auth-overlay"
      onClick={(e) => {
        // Close only when clicking the dark backdrop, not anything inside the modal
        if (modalRef.current && !modalRef.current.contains(e.target)) {
          handleClose();
        }
      }}>

      <div className="auth-modal" ref={modalRef}>

        <div className="auth-grain" />
        <div className="auth-glow g1" />
        <div className="auth-glow g2" />
        <div className="auth-glow g3" />
        <div className="auth-specular" />

        {/* ── Close X ── */}
        <button className="auth-close" onClick={handleClose} aria-label="Close" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* ── Hero: Cosmic Portal ── */}
        <div className="auth-hero">
          <CosmicPortal />
          <h2 className="auth-title">
            <span className="auth-title-sm">WHERE IDEAS</span>
            <span className="auth-title-lg">COME ALIVE</span>
          </h2>
          <p className="auth-sub">Create, explore, and bring your vision to life</p>
        </div>

        {/* ── Perks — glass cards with icons + confetti ── */}
        <div className="auth-perks">
          {PERKS.map((perk, i) => (
            <div key={perk.id} className="auth-perk"
              style={{ '--pc': perk.color, animationDelay: `${0.12 + i * 0.07}s` }}
              onMouseEnter={(e) => handlePerkHover(perk, e)}>
              <div className="auth-perk-ring">
                <svg width="24" height="24" viewBox="0 0 24 24" className="auth-perk-icon">{perk.icon}</svg>
              </div>
              <span className="auth-perk-label">{perk.label}</span>
              <span className="auth-perk-desc">{perk.desc}</span>
            </div>
          ))}
        </div>

        {/* ── Auth Actions ── */}
        <div className="auth-actions">
          {!showForm ? (
            <div className="auth-oauth-group">
              <button className="auth-oauth auth-google" type="button"
                onClick={() => signInWithGoogle()}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <button className="auth-oauth auth-github" type="button"
                onClick={() => signInWithGitHub()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <span>Continue with GitHub</span>
              </button>

              <div className="auth-divider">
                <span className="auth-divider-line" />
                <button className="auth-divider-text" type="button" onClick={() => setShowForm(true)}>or use email</button>
                <span className="auth-divider-line" />
              </div>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <input type="email" placeholder="EMAIL" value={email}
                onChange={(e) => setEmail(e.target.value)} required
                className="auth-input" autoComplete="email" autoFocus />
              <input type="password" placeholder="PASSWORD" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="auth-input" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? '...' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
              </button>
              <p className="auth-toggle">
                {mode === 'signin' ? 'New here? ' : 'Already in? '}
                <button type="button" className="auth-toggle-btn"
                  onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
                  {mode === 'signin' ? 'Create account' : 'Sign in'}
                </button>
              </p>
              <button type="button" className="auth-back" onClick={() => { setShowForm(false); setError(''); }}>
                &larr; back to social login
              </button>
            </form>
          )}
        </div>

        <p className="auth-footer">Free forever. No spam. Just fun.</p>
      </div>
    </div>
  );
}
