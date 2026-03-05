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
   CRYSTAL ASTRONAUT — Museum-grade SVG
   ═══════════════════════════════════════════════════════════════════════ */
function CrystalAstronaut() {
  return (
    <div className="astro-stage">
      <div className="astro-halo" />
      <svg width="160" height="180" viewBox="0 0 160 180" fill="none" className="astro-svg">
        <defs>
          <linearGradient id="m-au" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a"/>
            <stop offset="30%" stopColor="#fbbf24"/>
            <stop offset="60%" stopColor="#b45309"/>
            <stop offset="100%" stopColor="#fde68a"/>
          </linearGradient>
          <linearGradient id="m-body" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55"/>
            <stop offset="40%" stopColor="#6d28d9" stopOpacity="0.35"/>
            <stop offset="70%" stopColor="#1e1b4b" stopOpacity="0.45"/>
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3"/>
          </linearGradient>
          <linearGradient id="m-lit" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.15"/>
          </linearGradient>
          <linearGradient id="m-shd" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.4"/>
          </linearGradient>
          <linearGradient id="m-cyan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2"/>
          </linearGradient>
          <radialGradient id="m-vz" cx="0.35" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="#020617"/>
            <stop offset="40%" stopColor="#0f172a"/>
            <stop offset="75%" stopColor="#312e81" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4"/>
          </radialGradient>
          <linearGradient id="m-rb" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444"/><stop offset="17%" stopColor="#f97316"/>
            <stop offset="33%" stopColor="#fbbf24"/><stop offset="50%" stopColor="#22c55e"/>
            <stop offset="67%" stopColor="#3b82f6"/><stop offset="83%" stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
          <radialGradient id="m-orb" cx="0.4" cy="0.3" r="0.6">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.95"/>
            <stop offset="25%" stopColor="#fde68a" stopOpacity="0.8"/>
            <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
          </radialGradient>
          <filter id="m-gl" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/>
          </filter>
          <filter id="m-gl2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/>
          </filter>
        </defs>

        {/* Flames */}
        <g className="a-flames">
          <polygon points="54,162 60,180 48,180" fill="#fbbf24" opacity="0.8" className="a-fl"/>
          <polygon points="54,164 58,176 50,176" fill="#fff" opacity="0.4"/>
          <polygon points="106,162 112,180 100,180" fill="#fbbf24" opacity="0.8" className="a-fr"/>
          <polygon points="106,164 110,176 102,176" fill="#fff" opacity="0.4"/>
        </g>

        {/* Jetpack tanks */}
        <polygon points="40,98 48,96 52,100 52,150 48,154 40,152" fill="url(#m-cyan)" stroke="url(#m-au)" strokeWidth="1.2"/>
        <polygon points="108,100 112,96 120,98 120,152 112,154 108,150" fill="url(#m-cyan)" stroke="url(#m-au)" strokeWidth="1.2"/>
        <rect x="42" y="106" width="7" height="3" rx="1" fill="url(#m-au)" opacity="0.6"/>
        <circle cx="46" cy="118" r="2.5" fill="#06b6d4" opacity="0.6" className="a-led"/>
        <rect x="111" y="106" width="7" height="3" rx="1" fill="url(#m-au)" opacity="0.6"/>
        <circle cx="115" cy="118" r="2.5" fill="#06b6d4" opacity="0.6" className="a-led"/>

        {/* Legs */}
        <polygon points="63,134 58,156 53,158 67,158 69,138" fill="url(#m-body)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.8"/>
        <polygon points="58,156 53,158 48,162 48,168 69,168 69,162 67,158" fill="url(#m-shd)" stroke="url(#m-au)" strokeWidth="1.2"/>
        <polygon points="97,134 102,156 107,158 93,158 91,138" fill="url(#m-lit)" stroke="rgba(196,181,253,0.3)" strokeWidth="0.8"/>
        <polygon points="102,156 107,158 112,162 112,168 91,168 91,162 93,158" fill="url(#m-shd)" stroke="url(#m-au)" strokeWidth="1.2"/>
        <rect x="50" y="165" width="17" height="2" rx="1" fill="#fbbf24" opacity="0.3"/>
        <rect x="93" y="165" width="17" height="2" rx="1" fill="#fbbf24" opacity="0.3"/>

        {/* Torso */}
        <polygon points="58,72 72,68 88,68 102,72 106,134 98,140 62,140 54,134" fill="url(#m-body)" stroke="rgba(196,181,253,0.25)" strokeWidth="1"/>
        <polygon points="58,72 72,68 68,104 54,134" fill="url(#m-lit)" opacity="0.7"/>
        <polygon points="88,68 102,72 106,134 92,104" fill="url(#m-shd)" opacity="0.6"/>
        <polygon points="72,68 88,68 92,104 80,140 68,104" fill="rgba(124,58,237,0.15)"/>

        {/* Internal rainbow lines */}
        <line x1="68" y1="76" x2="62" y2="126" stroke="url(#m-rb)" strokeWidth="0.8" opacity="0.35" className="a-facet"/>
        <line x1="80" y1="70" x2="80" y2="132" stroke="url(#m-rb)" strokeWidth="0.6" opacity="0.25"/>
        <line x1="92" y1="76" x2="98" y2="126" stroke="url(#m-rb)" strokeWidth="0.8" opacity="0.35" className="a-facet"/>
        <line x1="58" y1="96" x2="102" y2="96" stroke="rgba(196,181,253,0.15)" strokeWidth="0.6"/>
        <line x1="56" y1="116" x2="104" y2="116" stroke="rgba(196,181,253,0.1)" strokeWidth="0.6"/>

        {/* Stars inside body */}
        <circle cx="72" cy="90" r="1" fill="#fff" opacity="0.5" className="a-is is1"/>
        <circle cx="88" cy="98" r="0.8" fill="#67e8f9" opacity="0.4" className="a-is is2"/>
        <circle cx="76" cy="120" r="0.7" fill="#fbbf24" opacity="0.35" className="a-is is3"/>
        <circle cx="84" cy="82" r="0.6" fill="#f472b6" opacity="0.3" className="a-is is1"/>

        {/* Chest core diamond */}
        <polygon points="80,86 86,96 80,106 74,96" fill="rgba(251,191,36,0.25)" stroke="url(#m-au)" strokeWidth="1" className="a-core" filter="url(#m-gl)"/>
        <polygon points="80,90 84,96 80,102 76,96" fill="rgba(251,191,36,0.5)" className="a-core-inner"/>

        {/* Gold belt */}
        <path d="M56,126 Q80,132 104,126" stroke="url(#m-au)" strokeWidth="3" fill="none"/>
        <polygon points="75,124 85,124 87,132 73,132" fill="url(#m-au)" opacity="0.7"/>

        {/* Left arm */}
        <polygon points="58,76 50,82 40,100 34,108 42,112 48,104 56,90" fill="url(#m-body)" stroke="rgba(196,181,253,0.2)" strokeWidth="0.8"/>
        <polygon points="34,108 28,114 32,120 40,116 42,112" fill="url(#m-lit)" stroke="url(#m-au)" strokeWidth="1"/>
        <path d="M40,102 L48,100" stroke="url(#m-au)" strokeWidth="2.5"/>

        {/* Right arm */}
        <polygon points="102,76 110,82 120,94 126,86 118,80 112,72" fill="url(#m-lit)" stroke="rgba(196,181,253,0.2)" strokeWidth="0.8" className="a-arm-r"/>
        <polygon points="120,94 126,88 132,92 128,100 122,100" fill="url(#m-cyan)" stroke="url(#m-au)" strokeWidth="1"/>
        <path d="M118,88 L112,80" stroke="url(#m-au)" strokeWidth="2.5"/>

        {/* Glowing orb */}
        <g className="a-orb-g" filter="url(#m-gl2)">
          <circle cx="136" cy="78" r="12" fill="url(#m-orb)" opacity="0.8" className="a-orb"/>
          <circle cx="136" cy="78" r="7" fill="rgba(253,230,138,0.6)"/>
          <circle cx="136" cy="78" r="3.5" fill="rgba(255,255,255,0.8)"/>
          {[0,45,90,135,180,225,270,315].map(a => (
            <line key={a} x1="136" y1="78"
              x2={136 + Math.cos(a*Math.PI/180)*18} y2={78 + Math.sin(a*Math.PI/180)*18}
              stroke="#fbbf24" strokeWidth="0.7" opacity="0.3" className="a-ray"/>
          ))}
        </g>

        {/* Helmet */}
        <path d="M44,40 L54,16 L68,6 L92,6 L106,16 L116,40 L112,58 L104,66 L56,66 L48,58 Z" fill="url(#m-body)" stroke="url(#m-au)" strokeWidth="1.8" className="a-helm"/>
        <path d="M50,38 L58,20 L70,12 L90,12 L102,20 L110,38 L108,54 L102,60 L58,60 L52,54 Z" fill="rgba(124,58,237,0.08)" stroke="rgba(196,181,253,0.15)" strokeWidth="0.6"/>
        <line x1="80" y1="6" x2="80" y2="66" stroke="rgba(196,181,253,0.08)" strokeWidth="0.6"/>
        <line x1="54" y1="16" x2="106" y2="16" stroke="rgba(196,181,253,0.06)" strokeWidth="0.6"/>
        <line x1="44" y1="40" x2="116" y2="40" stroke="rgba(196,181,253,0.06)" strokeWidth="0.6"/>

        {/* Ear nodes */}
        <circle cx="44" cy="42" r="5" fill="rgba(124,58,237,0.15)" stroke="url(#m-au)" strokeWidth="1.5"/>
        <circle cx="44" cy="42" r="2" fill="url(#m-au)" opacity="0.7"/>
        <circle cx="116" cy="42" r="5" fill="rgba(124,58,237,0.15)" stroke="url(#m-au)" strokeWidth="1.5"/>
        <circle cx="116" cy="42" r="2" fill="url(#m-au)" opacity="0.7"/>

        {/* Chin collar */}
        <path d="M54,60 Q80,68 106,60" stroke="url(#m-au)" strokeWidth="2.5" fill="none"/>

        {/* Visor */}
        <path d="M56,24 L70,16 L90,16 L104,24 L108,44 L102,56 L58,56 L52,44 Z" fill="url(#m-vz)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" className="a-visor"/>
        <circle cx="66" cy="30" r="1.2" fill="#fff" opacity="0.9" className="a-vs vs1"/>
        <circle cx="92" cy="24" r="0.9" fill="#fff" opacity="0.7" className="a-vs vs2"/>
        <circle cx="74" cy="48" r="1" fill="#67e8f9" opacity="0.8" className="a-vs vs3"/>
        <circle cx="96" cy="44" r="0.7" fill="#f472b6" opacity="0.6" className="a-vs vs4"/>
        <circle cx="80" cy="34" r="0.8" fill="#fbbf24" opacity="0.7" className="a-vs vs5"/>
        <circle cx="62" cy="44" r="0.6" fill="#a78bfa" opacity="0.7" className="a-vs vs6"/>
        <circle cx="88" cy="28" r="0.5" fill="#34d399" opacity="0.6" className="a-vs vs7"/>
        <circle cx="70" cy="38" r="0.7" fill="#fff" opacity="0.5" className="a-vs vs8"/>

        {/* Nebula */}
        <ellipse cx="72" cy="36" rx="10" ry="6" fill="rgba(124,58,237,0.2)" filter="url(#m-gl)" className="a-neb"/>
        <ellipse cx="90" cy="32" rx="6" ry="7" fill="rgba(6,182,212,0.12)" filter="url(#m-gl)"/>

        {/* Visor reflections + caustics */}
        <path d="M62,28 Q72,23 84,28" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none" strokeLinecap="round" className="a-ref1"/>
        <ellipse cx="66" cy="30" rx="6" ry="2.5" fill="rgba(255,255,255,0.15)" transform="rotate(-18 66 30)" className="a-ref2"/>
        <path d="M58,50 Q74,44 90,48 Q98,52 104,48" stroke="url(#m-rb)" strokeWidth="1.2" fill="none" opacity="0.4" className="a-caus"/>
        <path d="M62,28 Q74,34 90,28" stroke="url(#m-rb)" strokeWidth="0.7" fill="none" opacity="0.3" className="a-caus2"/>

        {/* Antenna */}
        <line x1="80" y1="0" x2="80" y2="8" stroke="url(#m-au)" strokeWidth="1.5"/>
        <circle cx="80" cy="0" r="3.5" className="a-beacon" filter="url(#m-gl2)"/>

        {/* Body caustics */}
        <path d="M60,82 Q80,76 100,82" stroke="url(#m-rb)" strokeWidth="0.7" fill="none" opacity="0.25" className="a-bc1"/>
        <path d="M58,108 Q80,102 102,108" stroke="url(#m-rb)" strokeWidth="0.5" fill="none" opacity="0.2" className="a-bc2"/>
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

        {/* ── Hero: Crystal Astronaut ── */}
        <div className="auth-hero">
          <CrystalAstronaut />
          <h2 className="auth-title">
            <span className="auth-title-sm">JOIN THE</span>
            <span className="auth-title-lg">ADVENTURE</span>
          </h2>
          <p className="auth-sub">Your journey through JAROWE awaits</p>
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
