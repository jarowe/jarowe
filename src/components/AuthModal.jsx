import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

const PERKS = [
  { icon: 'cloud', title: 'Cloud Save', desc: 'XP syncs everywhere', color: '#06b6d4' },
  { icon: 'trophy', title: 'Leaderboards', desc: 'Compete globally', color: '#fbbf24' },
  { icon: 'badge', title: '15 Badges', desc: 'Unlock them all', color: '#f472b6' },
  { icon: 'rocket', title: 'Profile', desc: 'Your mission HQ', color: '#7c3aed' },
];

/* Mini SVG icons for perks — more artistic than emoji */
function PerkIcon({ type, color }) {
  const s = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'cloud': return <svg {...s}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M13 14l-2 2 2 2" stroke={color} strokeWidth="1.5" opacity="0.5"/></svg>;
    case 'trophy': return <svg {...s}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 22V14.6A8 8 0 0 1 6 8V2h12v6a8 8 0 0 1-4 6.6V22"/></svg>;
    case 'badge': return <svg {...s}><path d="M12 15l-3.5 2 1-4L6 10l4-.5L12 6l2 3.5 4 .5-3.5 3 1 4z"/><path d="M8 21l1-5"/><path d="M16 21l-1-5"/></svg>;
    case 'rocket': return <svg {...s}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;
    default: return null;
  }
}

/* Astronaut SVG hero — floats and looks around */
function AstronautHero() {
  return (
    <div className="auth-astronaut-wrap">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="auth-astronaut-svg">
        {/* Stars behind */}
        <circle cx="8" cy="12" r="1" fill="#fff" opacity="0.3" className="astro-star s1"/>
        <circle cx="56" cy="8" r="0.8" fill="#fff" opacity="0.4" className="astro-star s2"/>
        <circle cx="52" cy="52" r="1" fill="#fff" opacity="0.2" className="astro-star s3"/>
        <circle cx="10" cy="50" r="0.7" fill="#fff" opacity="0.35" className="astro-star s4"/>

        {/* Jetpack flame */}
        <g className="astro-flame">
          <ellipse cx="25" cy="56" rx="2.5" ry="5" fill="url(#flameGrad)" opacity="0.8"/>
          <ellipse cx="39" cy="56" rx="2.5" ry="5" fill="url(#flameGrad)" opacity="0.8"/>
        </g>

        {/* Backpack / jetpack */}
        <rect x="22" y="34" width="6" height="14" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <rect x="36" y="34" width="6" height="14" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>

        {/* Body */}
        <path d="M24 32 C24 27 27 25 32 25 C37 25 40 27 40 32 L40 44 C40 46 38 48 36 48 L28 48 C26 48 24 46 24 44 Z"
          fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2"/>

        {/* Arms */}
        <path d="M24 34 L18 38 L16 42" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" className="astro-arm-l"/>
        <path d="M40 34 L46 38 L48 36" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" className="astro-arm-r"/>
        {/* Gloves */}
        <circle cx="16" cy="42.5" r="2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
        <circle cx="48" cy="36" r="2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>

        {/* Helmet */}
        <ellipse cx="32" cy="18" rx="12" ry="13" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.3" className="astro-hero-helmet"/>

        {/* Visor */}
        <ellipse cx="32" cy="19" rx="8.5" ry="8" fill="url(#heroVisorGrad)" className="astro-hero-visor"/>

        {/* Visor reflections */}
        <ellipse cx="28" cy="16" rx="3" ry="1.8" fill="rgba(255,255,255,0.3)" className="astro-hero-shine"/>
        <ellipse cx="37" cy="22" rx="2" ry="1" fill="rgba(255,255,255,0.15)"/>

        {/* Antenna */}
        <line x1="32" y1="5" x2="32" y2="8" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2"/>
        <circle cx="32" cy="4" r="2" className="astro-hero-beacon"/>

        {/* Flag on arm */}
        <rect x="46" y="32" width="6" height="4" rx="0.5" fill="url(#flagGrad)" className="astro-flag" opacity="0.8"/>

        <defs>
          <linearGradient id="heroVisorGrad" x1="23" y1="11" x2="41" y2="27">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9"/>
            <stop offset="40%" stopColor="#7c3aed" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.8"/>
          </linearGradient>
          <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24"/>
            <stop offset="60%" stopColor="#f97316"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="flagGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed"/>
            <stop offset="50%" stopColor="#06b6d4"/>
            <stop offset="100%" stopColor="#f472b6"/>
          </linearGradient>
        </defs>
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
            {/* Animated background glow */}
            <div className="auth-bg-glow" />
            <div className="auth-bg-glow auth-bg-glow-2" />

            <button className="auth-close" onClick={handleClose} aria-label="Close">&times;</button>

            {/* Astronaut Hero */}
            <div className="auth-hero">
              <AstronautHero />
              <h2 className="auth-hero-title">Join the <span className="auth-title-accent">Adventure</span></h2>
              <p className="auth-hero-sub">Your journey through JAROWE just got better</p>
            </div>

            {/* Perks — interactive hover fun */}
            <div className="auth-perks">
              {PERKS.map((perk, i) => (
                <motion.div
                  key={perk.title}
                  className="auth-perk"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                  whileHover={{ scale: 1.12, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ '--perk-color': perk.color }}
                >
                  <span className="auth-perk-icon">
                    <PerkIcon type={perk.icon} color={perk.color} />
                  </span>
                  <span className="auth-perk-title">{perk.title}</span>
                  <span className="auth-perk-glow" />
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
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="auth-input"
                    autoComplete="email"
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="auth-input"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />

                  {error && <p className="auth-error">{error}</p>}

                  <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? 'Working...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                  </button>

                  <p className="auth-toggle">
                    {mode === 'signin' ? "New here? " : 'Already in? '}
                    <button
                      type="button"
                      className="auth-toggle-btn"
                      onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
                    >
                      {mode === 'signin' ? 'Create account' : 'Sign in'}
                    </button>
                  </p>

                  <button type="button" className="auth-back-btn" onClick={() => { setShowForm(false); setError(''); }}>
                    Back to quick sign-in
                  </button>
                </motion.form>
              )}
            </div>

            <p className="auth-footer">
              Free forever. No spam. Just fun.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
