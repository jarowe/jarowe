import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import './AuthModal.css';

const PERKS = [
  { id: 'cloud', title: 'CLOUD SYNC', color: '#06b6d4', confettiColors: ['#06b6d4', '#67e8f9', '#0e7490'] },
  { id: 'trophy', title: 'LEADERBOARDS', color: '#fbbf24', confettiColors: ['#fbbf24', '#fde68a', '#f59e0b'] },
  { id: 'badge', title: '15 BADGES', color: '#f472b6', confettiColors: ['#f472b6', '#f9a8d4', '#ec4899'] },
  { id: 'rocket', title: 'PROFILE', color: '#a855f7', confettiColors: ['#a855f7', '#c4b5fd', '#7c3aed'] },
];

/* ═══════════════════════════════════════════════════════════════════
   FACETED CRYSTAL ASTRONAUT — Museum-grade SVG art
   Diamond-cut geometry, internal starfield, prismatic caustics
   ═══════════════════════════════════════════════════════════════════ */
function CrystalAstronaut() {
  return (
    <div className="astro-wrap">
      <svg width="120" height="140" viewBox="0 0 120 140" fill="none" className="astro-svg">
        <defs>
          {/* Gold metallic gradient */}
          <linearGradient id="au" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a"/><stop offset="25%" stopColor="#fbbf24"/>
            <stop offset="50%" stopColor="#92400e"/><stop offset="75%" stopColor="#fbbf24"/>
            <stop offset="100%" stopColor="#fde68a"/>
          </linearGradient>
          {/* Deep space visor */}
          <radialGradient id="vz" cx="0.35" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="#020617"/><stop offset="35%" stopColor="#0f172a" stopOpacity="0.95"/>
            <stop offset="70%" stopColor="#1e1b4b" stopOpacity="0.6"/><stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3"/>
          </radialGradient>
          {/* Crystal face gradients — 3D light from upper-left */}
          <linearGradient id="f1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity="0.18"/><stop offset="100%" stopColor="#7c3aed" stopOpacity="0.06"/></linearGradient>
          <linearGradient id="f2" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity="0.1"/><stop offset="100%" stopColor="#06b6d4" stopOpacity="0.04"/></linearGradient>
          <linearGradient id="f3" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor="#fff" stopOpacity="0.06"/><stop offset="100%" stopColor="#000" stopOpacity="0.08"/></linearGradient>
          <linearGradient id="f4" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#f472b6" stopOpacity="0.06"/><stop offset="100%" stopColor="#fff" stopOpacity="0.12"/></linearGradient>
          {/* Rainbow prismatic */}
          <linearGradient id="rb" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444"/><stop offset="16%" stopColor="#f97316"/>
            <stop offset="33%" stopColor="#fbbf24"/><stop offset="50%" stopColor="#22c55e"/>
            <stop offset="66%" stopColor="#3b82f6"/><stop offset="83%" stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
          {/* Orb radial glow */}
          <radialGradient id="ob" cx="0.4" cy="0.3" r="0.65">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9"/><stop offset="30%" stopColor="#fde68a" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
          </radialGradient>
          {/* Glow filters */}
          <filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
          <filter id="gl2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.5"/></filter>
          <filter id="glow3" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/>
          </filter>
        </defs>

        {/* ═══ JETPACK FLAMES ═══ */}
        <g className="a-flames">
          <polygon points="42,125 46,140 38,140" fill="#fbbf24" opacity="0.7" className="a-fl"/>
          <polygon points="42,127 44,137 40,137" fill="#fde68a" opacity="0.5"/>
          <polygon points="78,125 82,140 74,140" fill="#fbbf24" opacity="0.7" className="a-fr"/>
          <polygon points="78,127 80,137 76,137" fill="#fde68a" opacity="0.5"/>
        </g>

        {/* ═══ JETPACK — faceted tanks ═══ */}
        <polygon points="33,76 39,74 42,78 42,115 39,118 33,116" fill="url(#f2)" stroke="url(#au)" strokeWidth="0.7"/>
        <polygon points="78,78 81,74 87,76 87,116 81,118 78,115" fill="url(#f3)" stroke="url(#au)" strokeWidth="0.7"/>
        <rect x="35" y="80" width="5" height="2" rx="0.5" fill="url(#au)" opacity="0.5"/>
        <circle cx="37.5" cy="88" r="1.5" fill="#06b6d4" opacity="0.4" className="a-led"/>
        <rect x="80" y="80" width="5" height="2" rx="0.5" fill="url(#au)" opacity="0.5"/>

        {/* ═══ LEGS — faceted crystal ═══ */}
        {/* Left leg */}
        <polygon points="48,102 44,120 40,122 50,122 52,105" fill="url(#f1)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
        <polygon points="44,120 40,122 36,124 36,128 52,128 52,124 50,122" fill="url(#f3)" stroke="url(#au)" strokeWidth="0.7"/>
        {/* Right leg */}
        <polygon points="72,102 76,120 80,122 70,122 68,105" fill="url(#f2)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
        <polygon points="76,120 80,122 84,124 84,128 68,128 68,124 70,122" fill="url(#f3)" stroke="url(#au)" strokeWidth="0.7"/>
        {/* Boot glow strips */}
        <rect x="38" y="125.5" width="12" height="1.5" rx="0.75" fill="#fbbf24" opacity="0.2"/>
        <rect x="70" y="125.5" width="12" height="1.5" rx="0.75" fill="#fbbf24" opacity="0.2"/>

        {/* ═══ TORSO — multi-faceted crystal body ═══ */}
        {/* Main body shape */}
        <polygon points="45,56 55,52 65,52 75,56 78,102 72,106 48,106 42,102" fill="url(#f1)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6"/>
        {/* Left face — darker */}
        <polygon points="45,56 55,52 52,80 42,102" fill="url(#f3)" opacity="0.6"/>
        {/* Right face — lighter */}
        <polygon points="65,52 75,56 78,102 68,80" fill="url(#f4)" opacity="0.5"/>
        {/* Center diamond facet */}
        <polygon points="55,52 65,52 68,80 60,106 52,80" fill="url(#f2)" opacity="0.3"/>

        {/* Internal crystal structure — visible through glass */}
        <line x1="52" y1="58" x2="48" y2="96" stroke="url(#rb)" strokeWidth="0.4" opacity="0.2" className="a-facet"/>
        <line x1="60" y1="54" x2="60" y2="100" stroke="url(#rb)" strokeWidth="0.3" opacity="0.15"/>
        <line x1="68" y1="58" x2="72" y2="96" stroke="url(#rb)" strokeWidth="0.4" opacity="0.2" className="a-facet"/>
        <line x1="45" y1="72" x2="75" y2="72" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
        <line x1="46" y1="88" x2="74" y2="88" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>

        {/* Stars visible inside torso glass */}
        <circle cx="55" cy="68" r="0.5" fill="#fff" opacity="0.3" className="a-is is1"/>
        <circle cx="65" cy="74" r="0.4" fill="#67e8f9" opacity="0.25" className="a-is is2"/>
        <circle cx="58" cy="90" r="0.35" fill="#fbbf24" opacity="0.2" className="a-is is3"/>

        {/* Chest core — glowing diamond */}
        <polygon points="60,66 64,72 60,78 56,72" fill="rgba(251,191,36,0.15)" stroke="url(#au)" strokeWidth="0.6" className="a-core"/>
        <polygon points="60,68 62,72 60,76 58,72" fill="rgba(251,191,36,0.3)" className="a-core-inner"/>

        {/* Gold belt */}
        <path d="M44,96 Q60,100 76,96" stroke="url(#au)" strokeWidth="2" fill="none"/>
        <polygon points="57,95 63,95 64,100 56,100" fill="url(#au)" opacity="0.7"/>

        {/* ═══ LEFT ARM — faceted ═══ */}
        <polygon points="45,58 40,62 32,76 28,82 34,84 38,78 44,68" fill="url(#f3)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
        {/* Glove */}
        <polygon points="28,82 24,86 26,90 32,88 34,84" fill="url(#f1)" stroke="url(#au)" strokeWidth="0.6"/>
        {/* Wrist band */}
        <path d="M32,78 L38,76" stroke="url(#au)" strokeWidth="1.5"/>

        {/* ═══ RIGHT ARM — reaching for orb ═══ */}
        <polygon points="75,58 80,62 88,72 92,66 86,62 82,56" fill="url(#f2)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" className="a-arm-r"/>
        {/* Glove */}
        <polygon points="88,72 92,68 96,70 94,76 90,76" fill="url(#f4)" stroke="url(#au)" strokeWidth="0.6"/>
        {/* Wrist band */}
        <path d="M86,66 L82,60" stroke="url(#au)" strokeWidth="1.5"/>

        {/* ═══ GLOWING ORB ═══ */}
        <g className="a-orb-g" filter="url(#glow3)">
          <circle cx="100" cy="60" r="9" fill="url(#ob)" opacity="0.7" className="a-orb"/>
          <circle cx="100" cy="60" r="5" fill="rgba(253,230,138,0.5)"/>
          <circle cx="100" cy="60" r="2.5" fill="rgba(255,255,255,0.7)"/>
          {/* Rays */}
          {[0,45,90,135,180,225,270,315].map(a => (
            <line key={a} x1="100" y1="60"
              x2={100 + Math.cos(a*Math.PI/180)*14} y2={60 + Math.sin(a*Math.PI/180)*14}
              stroke="#fbbf24" strokeWidth="0.5" opacity="0.25" className="a-ray"/>
          ))}
        </g>

        {/* ═══ HELMET — faceted crystal dome ═══ */}
        {/* Outer shell — hexagonal feel */}
        <path d="M36,30 L42,12 L52,5 L68,5 L78,12 L84,30 L82,44 L76,50 L44,50 L38,44 Z"
          fill="rgba(255,255,255,0.04)" stroke="url(#au)" strokeWidth="1.2" className="a-helm"/>
        {/* Inner shell */}
        <path d="M40,28 L44,16 L54,10 L66,10 L76,16 L80,28 L78,40 L74,46 L46,46 L42,40 Z"
          fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
        {/* Helmet facet lines — diamond cut */}
        <line x1="60" y1="5" x2="60" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
        <line x1="42" y1="12" x2="78" y2="12" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
        <line x1="36" y1="30" x2="84" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>

        {/* Gold ear nodes */}
        <circle cx="36" cy="32" r="3.5" fill="rgba(255,255,255,0.03)" stroke="url(#au)" strokeWidth="0.8"/>
        <circle cx="36" cy="32" r="1.2" fill="url(#au)" opacity="0.5"/>
        <circle cx="84" cy="32" r="3.5" fill="rgba(255,255,255,0.03)" stroke="url(#au)" strokeWidth="0.8"/>
        <circle cx="84" cy="32" r="1.2" fill="url(#au)" opacity="0.5"/>

        {/* Chin collar */}
        <path d="M42,46 Q60,52 78,46" stroke="url(#au)" strokeWidth="1.8" fill="none"/>

        {/* ═══ VISOR — deep space window ═══ */}
        <path d="M44,18 L54,12 L66,12 L76,18 L78,34 L74,42 L46,42 L42,34 Z"
          fill="url(#vz)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" className="a-visor"/>

        {/* Stars inside visor */}
        <circle cx="50" cy="22" r="0.7" fill="#fff" opacity="0.8" className="a-vs vs1"/>
        <circle cx="68" cy="18" r="0.5" fill="#fff" opacity="0.6" className="a-vs vs2"/>
        <circle cx="56" cy="36" r="0.6" fill="#67e8f9" opacity="0.7" className="a-vs vs3"/>
        <circle cx="70" cy="34" r="0.4" fill="#f472b6" opacity="0.5" className="a-vs vs4"/>
        <circle cx="60" cy="26" r="0.5" fill="#fbbf24" opacity="0.5" className="a-vs vs5"/>
        <circle cx="48" cy="32" r="0.35" fill="#a78bfa" opacity="0.6" className="a-vs vs6"/>
        <circle cx="64" cy="20" r="0.3" fill="#34d399" opacity="0.4" className="a-vs vs7"/>
        <circle cx="54" cy="28" r="0.45" fill="#fff" opacity="0.3" className="a-vs vs8"/>

        {/* Nebula clouds inside visor */}
        <ellipse cx="55" cy="28" rx="7" ry="4" fill="rgba(124,58,237,0.12)" filter="url(#gl2)" className="a-neb"/>
        <ellipse cx="66" cy="24" rx="4" ry="5" fill="rgba(6,182,212,0.08)" filter="url(#gl2)"/>

        {/* Visor reflections — the key to realism */}
        <path d="M48,20 Q54,17 62,20" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="none"
          strokeLinecap="round" className="a-ref1"/>
        <ellipse cx="50" cy="22" rx="5" ry="2" fill="rgba(255,255,255,0.12)" transform="rotate(-18 50 22)" className="a-ref2"/>
        {/* Rainbow caustic across visor */}
        <path d="M46,38 Q56,33 66,37 Q72,39 76,36" stroke="url(#rb)" strokeWidth="0.8" fill="none"
          opacity="0.3" className="a-caus"/>
        <path d="M48,22 Q56,26 66,22" stroke="url(#rb)" strokeWidth="0.5" fill="none"
          opacity="0.2" className="a-caus2"/>

        {/* ═══ ANTENNA ═══ */}
        <line x1="60" y1="0" x2="60" y2="6" stroke="url(#au)" strokeWidth="1"/>
        <circle cx="60" cy="0" r="2.5" className="a-beacon" filter="url(#glow3)"/>

        {/* ═══ Body caustics — prismatic light streaks ═══ */}
        <path d="M46,62 Q60,58 74,62" stroke="url(#rb)" strokeWidth="0.4" fill="none" opacity="0.15" className="a-bc1"/>
        <path d="M44,82 Q60,78 76,82" stroke="url(#rb)" strokeWidth="0.3" fill="none" opacity="0.1" className="a-bc2"/>
      </svg>
    </div>
  );
}

export default function AuthModal() {
  const { showAuthModal, closeAuthModal, signInWithGoogle, signInWithGitHub, signInWithEmail, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const perksRef = useRef(null);

  /* ── Confetti burst on perk hover — RIDICULOUS and DELIGHTFUL ── */
  const handlePerkHover = useCallback((perk, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 30,
      spread: 50,
      startVelocity: 20,
      gravity: 0.8,
      ticks: 60,
      origin: { x, y },
      colors: perk.confettiColors,
      shapes: ['circle'],
      scalar: 0.6,
      drift: 0,
      disableForReducedMotion: true,
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fn = mode === 'signup' ? signUp : signInWithEmail;
    const { error: err } = await fn(email, password);
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      // Success celebration
      confetti({ particleCount: 80, spread: 70, origin: { x: 0.5, y: 0.5 }, colors: ['#7c3aed','#06b6d4','#fbbf24','#f472b6'] });
      setEmail(''); setPassword(''); setShowForm(false);
      closeAuthModal();
    }
  };

  const handleClose = () => { setShowForm(false); setError(''); closeAuthModal(); };

  return (
    <AnimatePresence>
      {showAuthModal && (
        <motion.div className="auth-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>

          <motion.div className="auth-modal"
            initial={{ scale: 0.5, opacity: 0, y: -60, rotateX: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}>

            {/* Film grain overlay — museum texture */}
            <div className="auth-grain" />
            {/* Ambient glow orbs */}
            <div className="auth-glow g1" />
            <div className="auth-glow g2" />
            <div className="auth-glow g3" />
            {/* Top specular edge */}
            <div className="auth-specular" />

            <button className="auth-close" onClick={handleClose} aria-label="Close">&times;</button>

            {/* ── Hero: Crystal Astronaut ── */}
            <div className="auth-hero">
              <CrystalAstronaut />
              <h2 className="auth-title">
                <span className="auth-title-sm">JOIN THE</span>
                <span className="auth-title-lg">ADVENTURE</span>
              </h2>
              <p className="auth-sub">Your journey through JAROWE awaits</p>
            </div>

            {/* ── Perks — hover triggers confetti ── */}
            <div className="auth-perks" ref={perksRef}>
              {PERKS.map((perk, i) => (
                <motion.button key={perk.id} className="auth-perk" type="button"
                  style={{ '--pc': perk.color }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  whileHover={{ y: -8, scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onHoverStart={(e) => handlePerkHover(perk, e)}>
                  <span className="auth-perk-dot" />
                  <span className="auth-perk-label">{perk.title}</span>
                </motion.button>
              ))}
            </div>

            {/* ── Auth Actions ── */}
            <div className="auth-actions">
              {!showForm ? (
                <>
                  <motion.button className="auth-btn auth-google" onClick={signInWithGoogle}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </motion.button>
                  <motion.button className="auth-btn auth-github" onClick={signInWithGitHub}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    GitHub
                  </motion.button>
                  <button className="auth-alt" onClick={() => setShowForm(true)}>or use email</button>
                </>
              ) : (
                <motion.form className="auth-form" onSubmit={handleSubmit}
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}>
                  <input type="email" placeholder="EMAIL" value={email}
                    onChange={(e) => setEmail(e.target.value)} required
                    className="auth-input" autoComplete="email" autoFocus />
                  <input type="password" placeholder="PASSWORD" value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={6}
                    className="auth-input" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                  {error && <p className="auth-error">{error}</p>}
                  <motion.button type="submit" className="auth-submit" disabled={loading}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                    {loading ? '...' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
                  </motion.button>
                  <p className="auth-toggle">
                    {mode === 'signin' ? 'New here? ' : 'Already in? '}
                    <button type="button" className="auth-toggle-btn"
                      onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
                      {mode === 'signin' ? 'Create account' : 'Sign in'}
                    </button>
                  </p>
                  <button type="button" className="auth-back" onClick={() => { setShowForm(false); setError(''); }}>
                    back
                  </button>
                </motion.form>
              )}
            </div>

            <p className="auth-footer">Free forever. No spam. Just fun.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
