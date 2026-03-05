import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Linkedin, Wrench, Instagram, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { getMuted, setMuted, playClickSound } from '../utils/sounds';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';
import './Navbar.css';

/* ── Crystal Astronaut — Mini (navbar) ── */
function GuestAvatar({ onClick }) {
    return (
        <button className="guest-avatar" onClick={onClick} aria-label="Sign in">
            <span className="guest-avatar-ring" />
            <span className="guest-avatar-inner">
                <svg width="22" height="22" viewBox="0 0 40 40" fill="none" className="astronaut-svg">
                    <defs>
                        {/* Crystal visor gradient — deep space with prismatic edges */}
                        <linearGradient id="navVisor" x1="12" y1="6" x2="28" y2="22" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9"/>
                            <stop offset="30%" stopColor="#7c3aed" stopOpacity="0.75"/>
                            <stop offset="60%" stopColor="#0f172a" stopOpacity="0.85"/>
                            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.7"/>
                        </linearGradient>
                        {/* Gold metallic trim */}
                        <linearGradient id="navGold" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#fbbf24"/>
                            <stop offset="40%" stopColor="#f59e0b"/>
                            <stop offset="70%" stopColor="#d97706"/>
                            <stop offset="100%" stopColor="#fbbf24"/>
                        </linearGradient>
                        {/* Glass body gradient */}
                        <linearGradient id="navGlass" x1="14" y1="22" x2="26" y2="38" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.18)"/>
                            <stop offset="50%" stopColor="rgba(124,58,237,0.08)"/>
                            <stop offset="100%" stopColor="rgba(6,182,212,0.12)"/>
                        </linearGradient>
                        {/* Prismatic caustic */}
                        <linearGradient id="navCaustic" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6"/>
                            <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.5"/>
                            <stop offset="50%" stopColor="#22c55e" stopOpacity="0.5"/>
                            <stop offset="75%" stopColor="#3b82f6" stopOpacity="0.5"/>
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.6"/>
                        </linearGradient>
                        {/* Glow filter */}
                        <filter id="navGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="1.5" result="blur"/>
                            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                        </filter>
                    </defs>

                    {/* === Helmet — large crystal dome === */}
                    {/* Outer glass shell */}
                    <ellipse cx="20" cy="14" rx="11" ry="11.5"
                        fill="rgba(255,255,255,0.06)"
                        stroke="url(#navGold)" strokeWidth="1.2"
                        className="nav-astro-helmet"/>
                    {/* Inner glass refraction layer */}
                    <ellipse cx="20" cy="14" rx="9.5" ry="10"
                        fill="rgba(255,255,255,0.04)"
                        stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"/>

                    {/* === Visor — deep space with stars === */}
                    <ellipse cx="20" cy="14.5" rx="7.5" ry="7"
                        fill="url(#navVisor)"
                        stroke="rgba(255,255,255,0.25)" strokeWidth="0.5"
                        className="nav-astro-visor"/>
                    {/* Stars inside visor */}
                    <circle cx="16" cy="12" r="0.4" fill="#fff" opacity="0.7" className="nav-vstar v1"/>
                    <circle cx="22" cy="10" r="0.3" fill="#fff" opacity="0.5" className="nav-vstar v2"/>
                    <circle cx="18" cy="16" r="0.35" fill="#67e8f9" opacity="0.6" className="nav-vstar v3"/>
                    <circle cx="24" cy="15" r="0.25" fill="#f472b6" opacity="0.5" className="nav-vstar v4"/>
                    <circle cx="20" cy="11" r="0.3" fill="#fbbf24" opacity="0.4" className="nav-vstar v5"/>
                    {/* Visor reflection — prismatic streak */}
                    <ellipse cx="17" cy="11.5" rx="3.5" ry="1.2"
                        fill="rgba(255,255,255,0.25)"
                        transform="rotate(-15 17 11.5)"
                        className="nav-astro-reflect"/>
                    {/* Secondary rainbow reflection */}
                    <path d="M15 17 Q20 15.5 25 17" stroke="url(#navCaustic)" strokeWidth="0.8" fill="none" opacity="0.5" className="nav-astro-caustic"/>

                    {/* === Gold trim band === */}
                    <ellipse cx="20" cy="14" rx="8" ry="7.5"
                        fill="none" stroke="url(#navGold)" strokeWidth="0.6" opacity="0.4"
                        strokeDasharray="2 4"/>

                    {/* === Body — crystal glass torso === */}
                    <path d="M14 25 C14 22 16 21 20 21 C24 21 26 22 26 25 L27 32 L13 32 Z"
                        fill="url(#navGlass)"
                        stroke="url(#navGold)" strokeWidth="0.8" opacity="0.9"/>
                    {/* Body prismatic refraction */}
                    <path d="M16 24 L18 28 L20 25 L22 29 L24 24"
                        stroke="url(#navCaustic)" strokeWidth="0.4" fill="none" opacity="0.4"/>

                    {/* === Antenna with beacon === */}
                    <line x1="20" y1="2.5" x2="20" y2="5" stroke="url(#navGold)" strokeWidth="0.8"/>
                    <circle cx="20" cy="2" r="1.3" className="nav-astro-beacon" filter="url(#navGlow)"/>

                    {/* === Glowing orb in hand === */}
                    <circle cx="28" cy="28" r="2.5"
                        fill="rgba(251,191,36,0.15)"
                        stroke="rgba(251,191,36,0.5)" strokeWidth="0.6"
                        className="nav-astro-orb" filter="url(#navGlow)"/>
                    <circle cx="28" cy="28" r="1.2" fill="rgba(251,191,36,0.4)" className="nav-astro-orb-core"/>
                </svg>
            </span>
            <span className="guest-avatar-tooltip">Join the adventure</span>
        </button>
    );
}

export default function Navbar() {
    const location = useLocation();

    const links = [
        { name: 'Home', path: '/' },
        { name: 'Workshop', path: '/workshop' },
        { name: 'Garden', path: '/garden' },
        { name: 'Now', path: '/now' }
    ];

    const auth = useAuth();
    const [isMuted, setIsMuted] = useState(getMuted());

    const toggleMute = () => {
        const newState = !isMuted;
        setMuted(newState);
        setIsMuted(newState);
        if (!newState) {
            setTimeout(playClickSound, 50);
        }
    };

    const isBirthdayMode = typeof window !== 'undefined' && window.__birthdayMode;
    const holidayMode = typeof window !== 'undefined' && window.__holidayMode;
    const showHolidayDot = !isBirthdayMode && holidayMode && holidayMode.tier >= 2;

    return (
        <nav className="navbar glass-panel">
            <div className="nav-container">
                <Link to="/" className="nav-brand">
                    <span className={`font-display${isBirthdayMode ? ' birthday-brand' : ''}`}>JAROWE</span>
                    <span
                      className={`brand-dot${isBirthdayMode ? ' birthday-dot' : ''}${showHolidayDot ? ' holiday-dot' : ''}`}
                      style={showHolidayDot ? { '--holiday-dot-color': holidayMode.accentPrimary } : undefined}
                    >.</span>
                </Link>

                <div className="nav-links">
                    {links.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                        >
                            {link.name}
                            {location.pathname === link.path && (
                                <motion.div
                                    layoutId="nav-pill"
                                    className="nav-active-bg"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                        </Link>
                    ))}
                </div>

                <div className="nav-socials">
                    <a href="https://x.com/jaredalanrowe" target="_blank" rel="noreferrer" className="social-icon" title="X (Twitter)">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                    </a>
                    <a href="https://linkedin.com/in/jaredalanrowe" target="_blank" rel="noreferrer" className="social-icon" title="LinkedIn">
                        <Linkedin size={18} />
                    </a>
                    <a href="https://www.instagram.com/jaredrowe/" target="_blank" rel="noreferrer" className="social-icon">
                        <Instagram size={18} />
                    </a>
                    <a href="https://starseed.llc/" target="_blank" rel="noreferrer" className="social-icon" title="Starseed Labs">
                        <Wrench size={18} />
                    </a>

                    <button
                        onClick={toggleMute}
                        className="social-icon"
                        title={isMuted ? "Unmute UI Sounds" : "Mute UI Sounds"}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', marginLeft: '8px' }}
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>

                    {auth?.user ? (
                        <UserMenu />
                    ) : auth ? (
                        <GuestAvatar onClick={auth.openAuthModal} />
                    ) : null}
                </div>
            </div>

            {auth && createPortal(<AuthModal />, document.body)}
        </nav>
    );
}
