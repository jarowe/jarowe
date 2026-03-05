import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

const PERKS = [
  { icon: 'cloud', title: 'Cloud Save', color: '#06b6d4' },
  { icon: 'trophy', title: 'Leaderboards', color: '#fbbf24' },
  { icon: 'badge', title: '15 Badges', color: '#f472b6' },
  { icon: 'rocket', title: 'Profile', color: '#7c3aed' },
];

/* ── Crystal Perk Icons — each one a mini glass sculpture ── */
function PerkIcon({ type, color }) {
  const id = `perk-${type}`;
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className="perk-crystal-icon">
      <defs>
        <linearGradient id={`${id}-fill`} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.05"/>
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.8"/>
          <stop offset="50%" stopColor="#fff" stopOpacity="0.4"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.6"/>
        </linearGradient>
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" result="g"/>
          <feComposite in="SourceGraphic" in2="g" operator="over"/>
        </filter>
      </defs>
      {type === 'cloud' && <>
        <path d="M24 18h-1.5A7.5 7.5 0 1 0 10 24h14a4.5 4.5 0 0 0 0-9z"
          fill={`url(#${id}-fill)`} stroke={`url(#${id}-stroke)`} strokeWidth="1.2"/>
        <path d="M14 20l3-3 3 3" stroke="#fff" strokeWidth="0.8" opacity="0.4" strokeLinecap="round"/>
        <line x1="17" y1="17" x2="17" y2="23" stroke="#fff" strokeWidth="0.8" opacity="0.3" strokeLinecap="round"/>
        {/* Internal light refraction */}
        <path d="M12 21 Q16 18 22 21" stroke={color} strokeWidth="0.5" opacity="0.4" fill="none"/>
      </>}
      {type === 'trophy' && <>
        <path d="M11 6h10v7a5 5 0 0 1-10 0V6z" fill={`url(#${id}-fill)`} stroke={`url(#${id}-stroke)`} strokeWidth="1.2"/>
        <path d="M11 9H8a3 3 0 0 1 0-6h3" stroke={`url(#${id}-stroke)`} strokeWidth="1" fill="none"/>
        <path d="M21 9h3a3 3 0 0 0 0-6h-3" stroke={`url(#${id}-stroke)`} strokeWidth="1" fill="none"/>
        <line x1="16" y1="18" x2="16" y2="24" stroke={`url(#${id}-stroke)`} strokeWidth="1.2"/>
        <path d="M12 24h8" stroke={`url(#${id}-stroke)`} strokeWidth="1.2" strokeLinecap="round"/>
        {/* Inner prismatic facet */}
        <path d="M13 8 L16 14 L19 8" stroke="#fff" strokeWidth="0.5" opacity="0.3" fill="none"/>
        <circle cx="16" cy="10" r="1" fill={color} opacity="0.3" filter={`url(#${id}-glow)`}/>
      </>}
      {type === 'badge' && <>
        <polygon points="16,4 19,12 28,12 21,17 23,26 16,21 9,26 11,17 4,12 13,12"
          fill={`url(#${id}-fill)`} stroke={`url(#${id}-stroke)`} strokeWidth="1.2" strokeLinejoin="round"/>
        {/* Crystal facets inside star */}
        <line x1="16" y1="4" x2="16" y2="21" stroke="#fff" strokeWidth="0.4" opacity="0.2"/>
        <line x1="9" y1="14" x2="23" y2="14" stroke="#fff" strokeWidth="0.4" opacity="0.2"/>
        <circle cx="16" cy="13" r="2" fill={color} opacity="0.25" filter={`url(#${id}-glow)`}/>
      </>}
      {type === 'rocket' && <>
        <path d="M16 4 C16 4 8 12 8 20 L12 22 L16 28 L20 22 L24 20 C24 12 16 4 16 4z"
          fill={`url(#${id}-fill)`} stroke={`url(#${id}-stroke)`} strokeWidth="1.2" strokeLinejoin="round"/>
        <circle cx="16" cy="16" r="2.5" fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="0.8"/>
        <circle cx="16" cy="16" r="1" fill={color} opacity="0.4" filter={`url(#${id}-glow)`}/>
        {/* Exhaust */}
        <path d="M14 28 Q16 32 18 28" stroke={color} strokeWidth="0.8" opacity="0.5" fill="none"/>
        {/* Fins */}
        <path d="M8 20 L5 24 L8 22" fill={`url(#${id}-fill)`} stroke={`url(#${id}-stroke)`} strokeWidth="0.8"/>
        <path d="M24 20 L27 24 L24 22" fill={`url(#${id}-fill)`} stroke={`url(#${id}-stroke)`} strokeWidth="0.8"/>
      </>}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CRYSTAL GLASS ASTRONAUT — Full Hero SVG
   Inspired by prismatic glass figurine art
   ═══════════════════════════════════════════════════════════════════ */
function CrystalAstronaut() {
  return (
    <div className="auth-astronaut-wrap">
      {/* Ambient particles */}
      <div className="astro-particles">
        {[...Array(8)].map((_, i) => (
          <span key={i} className={`astro-particle p${i}`} />
        ))}
      </div>

      <svg width="100" height="110" viewBox="0 0 100 110" fill="none" className="auth-astronaut-svg">
        <defs>
          {/* === GRADIENTS === */}
          {/* Deep space visor */}
          <radialGradient id="heroVisor" cx="0.4" cy="0.35" r="0.65">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95"/>
            <stop offset="40%" stopColor="#1e1b4b" stopOpacity="0.85"/>
            <stop offset="70%" stopColor="#7c3aed" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.5"/>
          </radialGradient>
          {/* Gold metallic */}
          <linearGradient id="heroGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a"/>
            <stop offset="30%" stopColor="#fbbf24"/>
            <stop offset="60%" stopColor="#b45309"/>
            <stop offset="80%" stopColor="#fbbf24"/>
            <stop offset="100%" stopColor="#fde68a"/>
          </linearGradient>
          {/* Crystal glass body */}
          <linearGradient id="heroGlass" x1="30" y1="46" x2="70" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)"/>
            <stop offset="30%" stopColor="rgba(124,58,237,0.08)"/>
            <stop offset="60%" stopColor="rgba(6,182,212,0.1)"/>
            <stop offset="100%" stopColor="rgba(244,114,182,0.08)"/>
          </linearGradient>
          {/* Full rainbow prismatic */}
          <linearGradient id="heroPrism" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444"/>
            <stop offset="17%" stopColor="#f97316"/>
            <stop offset="33%" stopColor="#fbbf24"/>
            <stop offset="50%" stopColor="#22c55e"/>
            <stop offset="67%" stopColor="#3b82f6"/>
            <stop offset="83%" stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
          {/* Orb glow */}
          <radialGradient id="heroOrb" cx="0.4" cy="0.35" r="0.6">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9"/>
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.1"/>
          </radialGradient>
          {/* Flame */}
          <linearGradient id="heroFlame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9"/>
            <stop offset="40%" stopColor="#f97316" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
          </linearGradient>

          {/* === FILTERS === */}
          <filter id="heroGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="g"/>
            <feComposite in="SourceGraphic" in2="g" operator="over"/>
          </filter>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.5"/>
          </filter>
          <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="ig"/>
            <feComposite in="SourceGraphic" in2="ig" operator="over"/>
          </filter>
        </defs>

        {/* ======= JETPACK FLAMES ======= */}
        <g className="hero-flames">
          <ellipse cx="38" cy="102" rx="4" ry="8" fill="url(#heroFlame)" className="hero-flame-l"/>
          <ellipse cx="62" cy="102" rx="4" ry="8" fill="url(#heroFlame)" className="hero-flame-r"/>
          {/* Inner bright cores */}
          <ellipse cx="38" cy="100" rx="1.5" ry="4" fill="#fde68a" opacity="0.6"/>
          <ellipse cx="62" cy="100" rx="1.5" ry="4" fill="#fde68a" opacity="0.6"/>
        </g>

        {/* ======= JETPACK TANKS ======= */}
        <rect x="30" y="60" width="9" height="25" rx="4"
          fill="url(#heroGlass)" stroke="url(#heroGold)" strokeWidth="1" opacity="0.8"/>
        <rect x="61" y="60" width="9" height="25" rx="4"
          fill="url(#heroGlass)" stroke="url(#heroGold)" strokeWidth="1" opacity="0.8"/>
        {/* Tank details */}
        <rect x="32" y="65" width="5" height="2" rx="1" fill="url(#heroGold)" opacity="0.4"/>
        <rect x="63" y="65" width="5" height="2" rx="1" fill="url(#heroGold)" opacity="0.4"/>
        <circle cx="34.5" cy="72" r="1.5" fill="rgba(6,182,212,0.3)" className="tank-indicator"/>

        {/* ======= LEGS ======= */}
        <path d="M40 82 L38 95 L34 97 L42 97 L42 85"
          fill="url(#heroGlass)" stroke="url(#heroGold)" strokeWidth="0.8"/>
        <path d="M60 82 L62 95 L66 97 L58 97 L58 85"
          fill="url(#heroGlass)" stroke="url(#heroGold)" strokeWidth="0.8"/>
        {/* Boot treads */}
        <rect x="33" y="95.5" width="10" height="3" rx="1.5"
          fill="rgba(255,255,255,0.06)" stroke="url(#heroGold)" strokeWidth="0.8"/>
        <rect x="57" y="95.5" width="10" height="3" rx="1.5"
          fill="rgba(255,255,255,0.06)" stroke="url(#heroGold)" strokeWidth="0.8"/>
        {/* Boot glow strip */}
        <rect x="35" y="96.5" width="6" height="1" rx="0.5" fill="#fbbf24" opacity="0.3"/>
        <rect x="59" y="96.5" width="6" height="1" rx="0.5" fill="#fbbf24" opacity="0.3"/>

        {/* ======= BODY — Crystal glass torso ======= */}
        <path d="M38 48 C38 44 42 42 50 42 C58 42 62 44 62 48 L63 82 C63 85 60 87 57 87 L43 87 C40 87 37 85 37 82 Z"
          fill="url(#heroGlass)" stroke="url(#heroGold)" strokeWidth="1.2"/>
        {/* Internal crystal facets — prismatic light refractions */}
        <path d="M42 50 L48 65 L50 52 L52 68 L58 50"
          stroke="url(#heroPrism)" strokeWidth="0.6" fill="none" opacity="0.35" className="hero-facets"/>
        <path d="M40 60 L45 72 L50 58 L55 74 L60 60"
          stroke="url(#heroPrism)" strokeWidth="0.5" fill="none" opacity="0.25"/>
        {/* Chest light */}
        <circle cx="50" cy="58" r="4" fill="rgba(251,191,36,0.08)" stroke="url(#heroGold)" strokeWidth="0.8"/>
        <circle cx="50" cy="58" r="2" fill="rgba(251,191,36,0.2)" className="hero-chest-light" filter="url(#heroGlow)"/>
        {/* Gold belt band */}
        <path d="M38 76 Q50 79 62 76" stroke="url(#heroGold)" strokeWidth="1.5" fill="none"/>
        <rect x="47" y="74.5" width="6" height="4" rx="1" fill="url(#heroGold)" opacity="0.6"/>

        {/* ======= ARMS ======= */}
        {/* Left arm — hanging */}
        <path d="M38 52 L28 60 L24 70"
          stroke="url(#heroGold)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M38 52 C35 54 30 58 28 60 C26 63 25 67 24 70"
          fill="url(#heroGlass)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"
          className="hero-arm-l"/>
        {/* Left glove */}
        <circle cx="24" cy="71" r="3.5"
          fill="url(#heroGlass)" stroke="url(#heroGold)" strokeWidth="0.8"/>
        <path d="M22 69 L21 72 L23 73" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" fill="none"/>

        {/* Right arm — holding orb */}
        <path d="M62 52 L72 58 L76 54"
          stroke="url(#heroGold)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M62 52 C65 54 70 56 72 58 C74 56 75 55 76 54"
          fill="url(#heroGlass)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"
          className="hero-arm-r"/>
        {/* Right glove */}
        <circle cx="77" cy="53" r="3.5"
          fill="url(#heroGlass)" stroke="url(#heroGold)" strokeWidth="0.8"/>

        {/* ======= GLOWING ORB ======= */}
        <g className="hero-orb-group" filter="url(#heroGlow)">
          <circle cx="82" cy="46" r="7" fill="url(#heroOrb)" className="hero-orb"/>
          <circle cx="82" cy="46" r="4" fill="rgba(253,230,138,0.5)"/>
          <circle cx="82" cy="46" r="2" fill="rgba(255,255,255,0.6)"/>
          {/* Orb light rays */}
          <line x1="82" y1="37" x2="82" y2="35" stroke="#fbbf24" strokeWidth="0.8" opacity="0.4" className="orb-ray r1"/>
          <line x1="89" y1="43" x2="91" y2="42" stroke="#fbbf24" strokeWidth="0.8" opacity="0.3" className="orb-ray r2"/>
          <line x1="89" y1="49" x2="91" y2="51" stroke="#fbbf24" strokeWidth="0.8" opacity="0.3" className="orb-ray r3"/>
          <line x1="82" y1="55" x2="82" y2="57" stroke="#fbbf24" strokeWidth="0.8" opacity="0.4" className="orb-ray r4"/>
        </g>

        {/* ======= HELMET — Crystal dome ======= */}
        {/* Outer glass shell with gold rim */}
        <ellipse cx="50" cy="26" rx="18" ry="19"
          fill="rgba(255,255,255,0.05)"
          stroke="url(#heroGold)" strokeWidth="1.5"
          className="hero-helmet-outer"/>
        {/* Second glass layer */}
        <ellipse cx="50" cy="26" rx="15.5" ry="16.5"
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.12)" strokeWidth="0.6"/>
        {/* Gold ear-pieces */}
        <circle cx="32" cy="28" r="3" fill="url(#heroGlass)" stroke="url(#heroGold)" strokeWidth="1"/>
        <circle cx="32" cy="28" r="1" fill="url(#heroGold)" opacity="0.5"/>
        <circle cx="68" cy="28" r="3" fill="url(#heroGlass)" stroke="url(#heroGold)" strokeWidth="1"/>
        <circle cx="68" cy="28" r="1" fill="url(#heroGold)" opacity="0.5"/>
        {/* Chin ring */}
        <path d="M38 40 Q50 44 62 40" stroke="url(#heroGold)" strokeWidth="1.5" fill="none"/>

        {/* ======= VISOR — Deep space window ======= */}
        <ellipse cx="50" cy="27" rx="12" ry="11.5"
          fill="url(#heroVisor)"
          stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"
          className="hero-visor"/>

        {/* Stars inside visor */}
        <circle cx="43" cy="22" r="0.6" fill="#fff" opacity="0.8" className="vstar vs1"/>
        <circle cx="55" cy="19" r="0.4" fill="#fff" opacity="0.6" className="vstar vs2"/>
        <circle cx="48" cy="32" r="0.5" fill="#67e8f9" opacity="0.7" className="vstar vs3"/>
        <circle cx="57" cy="30" r="0.35" fill="#f472b6" opacity="0.5" className="vstar vs4"/>
        <circle cx="50" cy="24" r="0.45" fill="#fbbf24" opacity="0.5" className="vstar vs5"/>
        <circle cx="44" cy="28" r="0.3" fill="#a78bfa" opacity="0.6" className="vstar vs6"/>
        <circle cx="53" cy="34" r="0.4" fill="#34d399" opacity="0.4" className="vstar vs7"/>
        {/* Nebula inside visor */}
        <ellipse cx="47" cy="27" rx="5" ry="3" fill="rgba(124,58,237,0.15)" filter="url(#softGlow)" className="hero-nebula"/>
        <ellipse cx="54" cy="25" rx="3" ry="4" fill="rgba(6,182,212,0.1)" filter="url(#softGlow)"/>

        {/* Visor reflections — prismatic light streaks */}
        <ellipse cx="44" cy="22" rx="5" ry="2"
          fill="rgba(255,255,255,0.2)"
          transform="rotate(-20 44 22)"
          className="hero-reflect-1"/>
        <ellipse cx="54" cy="33" rx="3.5" ry="1"
          fill="rgba(255,255,255,0.1)"
          transform="rotate(10 54 33)"/>
        {/* Rainbow caustic across visor */}
        <path d="M40 34 Q46 30 52 33 Q56 35 60 32"
          stroke="url(#heroPrism)" strokeWidth="1" fill="none" opacity="0.35"
          className="hero-caustic"/>
        {/* Second caustic — shifted */}
        <path d="M42 20 Q48 23 54 20"
          stroke="url(#heroPrism)" strokeWidth="0.7" fill="none" opacity="0.25"
          className="hero-caustic-2"/>

        {/* Gold decorative trim on helmet */}
        <ellipse cx="50" cy="26" rx="13.5" ry="13"
          fill="none" stroke="url(#heroGold)" strokeWidth="0.5" opacity="0.3"
          strokeDasharray="3 5"/>

        {/* ======= ANTENNA ======= */}
        <line x1="50" y1="7" x2="50" y2="12" stroke="url(#heroGold)" strokeWidth="1.2"/>
        <circle cx="50" cy="5.5" r="2.5" className="hero-beacon" filter="url(#heroGlow)"/>

        {/* ======= PRISMATIC LIGHT STREAKS on body ======= */}
        <path d="M40 55 Q50 50 60 55" stroke="url(#heroPrism)" strokeWidth="0.5" fill="none" opacity="0.2"/>
        <path d="M39 70 Q50 65 61 70" stroke="url(#heroPrism)" strokeWidth="0.4" fill="none" opacity="0.15"/>
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
      setEmail('');
      setPassword('');
      setShowForm(false);
      closeAuthModal();
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setError('');
    closeAuthModal();
  };

  return (
    <AnimatePresence>
      {showAuthModal && (
        <motion.div
          className="auth-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            className="auth-modal"
            initial={{ scale: 0.6, opacity: 0, y: -40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}
          >
            <div className="auth-bg-glow" />
            <div className="auth-bg-glow auth-bg-glow-2" />

            <button className="auth-close" onClick={handleClose} aria-label="Close">&times;</button>

            {/* Crystal Astronaut Hero */}
            <div className="auth-hero">
              <CrystalAstronaut />
              <h2 className="auth-hero-title">Join the <span className="auth-title-accent">Adventure</span></h2>
              <p className="auth-hero-sub">Your journey through JAROWE just got better</p>
            </div>

            {/* Perks — crystal hover magic */}
            <div className="auth-perks">
              {PERKS.map((perk, i) => (
                <motion.div
                  key={perk.title}
                  className="auth-perk"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                  whileHover={{ scale: 1.15, y: -6 }}
                  whileTap={{ scale: 0.92, rotate: -3 }}
                  style={{ '--perk-color': perk.color }}
                >
                  <span className="auth-perk-icon">
                    <PerkIcon type={perk.icon} color={perk.color} />
                  </span>
                  <span className="auth-perk-title">{perk.title}</span>
                  <span className="auth-perk-glow" />
                  <span className="auth-perk-sparkle" />
                </motion.div>
              ))}
            </div>

            {/* Auth Actions */}
            <div className="auth-actions">
              {!showForm ? (
                <>
                  <button className="auth-oauth-btn auth-google" onClick={signInWithGoogle}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>
                  <button className="auth-oauth-btn auth-github" onClick={signInWithGitHub}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    Continue with GitHub
                  </button>
                  <button className="auth-email-toggle" onClick={() => setShowForm(true)}>
                    or use email
                  </button>
                </>
              ) : (
                <motion.form
                  className="auth-form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                >
                  <input type="email" placeholder="Email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required
                    className="auth-input" autoComplete="email" autoFocus />
                  <input type="password" placeholder="Password" value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={6}
                    className="auth-input" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                  {error && <p className="auth-error">{error}</p>}
                  <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? 'Working...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                  </button>
                  <p className="auth-toggle">
                    {mode === 'signin' ? "New here? " : 'Already in? '}
                    <button type="button" className="auth-toggle-btn"
                      onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
                      {mode === 'signin' ? 'Create account' : 'Sign in'}
                    </button>
                  </p>
                  <button type="button" className="auth-back-btn" onClick={() => { setShowForm(false); setError(''); }}>
                    Back to quick sign-in
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
