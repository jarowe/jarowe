import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
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
   ECLIPSE SCENE V2 — Astronaut at the edge of a supermassive black hole
   ═══════════════════════════════════════════════════════════════════════ */
function EclipseScene() {
  return (
    <div className="eclipse-stage">
      {/* Layered CSS corona glows behind the SVG */}
      <div className="eclipse-corona c-warm" />
      <div className="eclipse-corona c-purple" />
      <div className="eclipse-corona c-cyan" />
      <svg width="280" height="160" viewBox="0 0 280 160" fill="none" className="eclipse-svg">
        <defs>
          <radialGradient id="ec-hole" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#000" />
            <stop offset="80%" stopColor="#020617" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
          {/* Photon ring — bright thin white-violet ring */}
          <radialGradient id="ec-photon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="72%" stopColor="transparent" />
            <stop offset="80%" stopColor="#a78bfa" stopOpacity="0.3" />
            <stop offset="85%" stopColor="#e0d4ff" stopOpacity="0.9" />
            <stop offset="87%" stopColor="#fff" stopOpacity="1" />
            <stop offset="89%" stopColor="#e0d4ff" stopOpacity="0.9" />
            <stop offset="93%" stopColor="#a78bfa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* Wider lensing halo */}
          <radialGradient id="ec-halo" cx="0.5" cy="0.5" r="0.5">
            <stop offset="50%" stopColor="transparent" />
            <stop offset="68%" stopColor="#7c3aed" stopOpacity="0.12" />
            <stop offset="80%" stopColor="#a78bfa" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* Hot accretion disc — warm center, cool edges */}
          <linearGradient id="ec-acc-hot" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
            <stop offset="15%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#f472b6" stopOpacity="0.6" />
            <stop offset="42%" stopColor="#fb923c" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="58%" stopColor="#fb923c" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#f472b6" stopOpacity="0.6" />
            <stop offset="85%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ec-acc-cool" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="25%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.5" />
            <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
          {/* Jet gradient — vertical */}
          <linearGradient id="ec-jet-up" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.5" />
            <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ec-jet-dn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <filter id="ec-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
          <filter id="ec-bloom" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" />
          </filter>
          <filter id="ec-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        {/* ── Nebula background wash ── */}
        <ellipse cx="140" cy="80" rx="130" ry="70" fill="rgba(124,58,237,0.03)" filter="url(#ec-soft)" className="ec-nebula n1" />
        <ellipse cx="100" cy="60" rx="80" ry="40" fill="rgba(6,182,212,0.025)" filter="url(#ec-soft)" className="ec-nebula n2" />
        <ellipse cx="180" cy="100" rx="60" ry="35" fill="rgba(244,114,182,0.02)" filter="url(#ec-soft)" className="ec-nebula n3" />

        {/* ── Stars — denser field ── */}
        <circle cx="15" cy="20" r="0.8" fill="#fff" opacity="0.7" className="ec-star s1" />
        <circle cx="40" cy="140" r="0.5" fill="#fff" opacity="0.4" className="ec-star s2" />
        <circle cx="60" cy="12" r="0.6" fill="#fbbf24" opacity="0.5" className="ec-star s3" />
        <circle cx="245" cy="30" r="0.7" fill="#67e8f9" opacity="0.6" className="ec-star s1" />
        <circle cx="260" cy="120" r="0.4" fill="#f472b6" opacity="0.5" className="ec-star s2" />
        <circle cx="220" cy="145" r="0.5" fill="#fff" opacity="0.35" className="ec-star s3" />
        <circle cx="25" cy="90" r="0.4" fill="#a78bfa" opacity="0.45" className="ec-star s1" />
        <circle cx="265" cy="70" r="0.6" fill="#fff" opacity="0.3" className="ec-star s2" />
        <circle cx="50" cy="55" r="0.3" fill="#67e8f9" opacity="0.4" className="ec-star s3" />
        <circle cx="230" cy="15" r="0.3" fill="#fbbf24" opacity="0.35" className="ec-star s1" />
        <circle cx="10" cy="130" r="0.4" fill="#fff" opacity="0.3" className="ec-star s2" />
        <circle cx="270" cy="50" r="0.35" fill="#c4b5fd" opacity="0.4" className="ec-star s3" />

        {/* ── Polar jets ── */}
        <path d="M136 42 L140 8 L144 42" fill="url(#ec-jet-up)" opacity="0.5" className="ec-jet jet-up" />
        <path d="M137 45 L140 18 L143 45" fill="rgba(255,255,255,0.15)" className="ec-jet jet-up" />
        <path d="M136 118 L140 152 L144 118" fill="url(#ec-jet-dn)" opacity="0.4" className="ec-jet jet-dn" />

        {/* ── Outer accretion disc — cool cyan, wide ── */}
        <ellipse cx="140" cy="80" rx="95" ry="9" fill="url(#ec-acc-cool)" opacity="0.35" className="ec-disc-outer" />

        {/* ── Hot accretion disc — warm colors, bright ── */}
        <ellipse cx="140" cy="80" rx="75" ry="7" fill="url(#ec-acc-hot)" opacity="0.7" className="ec-disc" />
        <ellipse cx="140" cy="80" rx="55" ry="4" fill="url(#ec-acc-hot)" opacity="0.9" className="ec-disc-inner" />

        {/* ── Gravitational lensing halo ── */}
        <circle cx="140" cy="80" r="52" fill="url(#ec-halo)" className="ec-halo" />

        {/* ── Photon ring — the bright razor ring ── */}
        <circle cx="140" cy="80" r="32" fill="url(#ec-photon)" className="ec-photon" />

        {/* ── The void — absolute black ── */}
        <circle cx="140" cy="80" r="26" fill="url(#ec-hole)" />
        <circle cx="140" cy="80" r="24" fill="#000" />

        {/* ── Event horizon — white-hot inner edge ── */}
        <circle cx="140" cy="80" r="25" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" filter="url(#ec-glow)" className="ec-horizon" />
        <circle cx="140" cy="80" r="26.5" fill="none" stroke="rgba(196,181,253,0.2)" strokeWidth="1.2" className="ec-horizon-glow" />

        {/* ── Corona wisps — light bending around ── */}
        <path d="M102 56 Q115 38 140 35 Q165 38 178 56" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" filter="url(#ec-glow)" className="ec-wisp w1" />
        <path d="M105 104 Q118 120 140 124 Q162 120 175 104" stroke="rgba(196,181,253,0.15)" strokeWidth="0.7" fill="none" className="ec-wisp w2" />
        <path d="M95 70 Q105 58 118 54" stroke="rgba(103,232,249,0.25)" strokeWidth="0.6" fill="none" className="ec-wisp w3" />
        <path d="M185 90 Q175 102 162 106" stroke="rgba(244,114,182,0.18)" strokeWidth="0.5" fill="none" className="ec-wisp w3" />
        {/* Extra bright rim highlight */}
        <path d="M112 58 Q125 48 140 46 Q155 48 168 58" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" filter="url(#ec-bloom)" className="ec-edge" />

        {/* ── Astronaut — bigger, more detailed ── */}
        <g className="ec-astronaut" filter="url(#ec-glow)">
          {/* Jetpack trail */}
          <path d="M78 82 Q72 84 65 90 Q60 96 58 105" stroke="rgba(103,232,249,0.15)" strokeWidth="1.2" fill="none" className="ec-trail" />
          <path d="M78 84 Q74 88 70 96 Q68 102 66 108" stroke="rgba(167,139,250,0.1)" strokeWidth="0.8" fill="none" className="ec-trail t2" />
          {/* Helmet */}
          <ellipse cx="75" cy="72" rx="5" ry="5.5" fill="#0f0a2a" stroke="rgba(196,181,253,0.6)" strokeWidth="0.8" />
          {/* Visor — reflective curve */}
          <ellipse cx="73.5" cy="71" rx="2.5" ry="3" fill="rgba(103,232,249,0.2)" />
          <ellipse cx="72.5" cy="70" rx="1.2" ry="1.5" fill="rgba(103,232,249,0.35)" className="ec-visor-glint" />
          <circle cx="72" cy="69.5" r="0.5" fill="rgba(255,255,255,0.8)" />
          {/* Body suit */}
          <path d="M72 77.5 L70 89 L72.5 90.5 L75 85 L77.5 90.5 L80 89 L78 77.5" fill="#0f0a2a" stroke="rgba(196,181,253,0.4)" strokeWidth="0.6" />
          {/* Left arm reaching toward the void */}
          <path d="M72 79 L66 76 L64 78" stroke="rgba(196,181,253,0.35)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          {/* Right arm */}
          <path d="M78 79 L82 82 L84 81" stroke="rgba(196,181,253,0.35)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          {/* Backpack */}
          <rect x="78" y="78" width="3" height="6.5" rx="0.8" fill="rgba(124,58,237,0.35)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.4" />
          {/* Backpack light */}
          <circle cx="79.5" cy="80" r="0.6" fill="#7c3aed" opacity="0.8" className="ec-pack-light" />
          {/* Tether line to void */}
          <path d="M80 82 Q95 78 114 80" stroke="rgba(196,181,253,0.12)" strokeWidth="0.5" fill="none" strokeDasharray="2.5 2" className="ec-tether" />
          {/* Helmet ambient glow */}
          <circle cx="75" cy="72" r="8" fill="none" stroke="rgba(167,139,250,0.1)" strokeWidth="0.5" />
        </g>

        {/* ── Particle streams — debris drawn inward ── */}
        <circle cx="215" cy="72" r="0.8" fill="#67e8f9" opacity="0.7" className="ec-particle p1" />
        <circle cx="225" cy="85" r="0.5" fill="#a78bfa" opacity="0.55" className="ec-particle p2" />
        <circle cx="205" cy="60" r="0.4" fill="#f472b6" opacity="0.5" className="ec-particle p3" />
        <circle cx="55" cy="95" r="0.6" fill="#fbbf24" opacity="0.45" className="ec-particle p4" />
        <circle cx="45" cy="72" r="0.4" fill="#67e8f9" opacity="0.35" className="ec-particle p5" />
        <circle cx="210" cy="95" r="0.35" fill="#fff" opacity="0.4" className="ec-particle p1" />
        <circle cx="60" cy="65" r="0.3" fill="#c4b5fd" opacity="0.3" className="ec-particle p2" />
        <circle cx="230" cy="75" r="0.45" fill="#fb923c" opacity="0.4" className="ec-particle p3" />
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

        {/* ── Hero: Eclipse Scene ── */}
        <div className="auth-hero">
          <EclipseScene />
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
