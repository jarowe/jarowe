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

function GuestAvatar({ onClick }) {
    return (
        <button className="guest-avatar" onClick={onClick} aria-label="Sign in">
            <span className="guest-avatar-ring" />
            <span className="guest-avatar-inner">
                {/* Astronaut SVG — helmet + visor + body */}
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="astronaut-svg">
                    {/* Helmet */}
                    <ellipse cx="16" cy="12" rx="9" ry="9.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" className="astro-helmet"/>
                    {/* Visor */}
                    <ellipse cx="16" cy="12.5" rx="6" ry="5.5" fill="url(#visorGrad)" className="astro-visor"/>
                    {/* Visor shine */}
                    <ellipse cx="13" cy="10.5" rx="2" ry="1.2" fill="rgba(255,255,255,0.35)" className="astro-shine"/>
                    {/* Body hint */}
                    <path d="M10 21 C10 18 12 17 16 17 C20 17 22 18 22 21 L22 24 L10 24 Z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" className="astro-body"/>
                    {/* Antenna */}
                    <line x1="16" y1="2.5" x2="16" y2="5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" className="astro-antenna"/>
                    <circle cx="16" cy="2" r="1.2" fill="#7c3aed" className="astro-antenna-tip"/>
                    <defs>
                        <linearGradient id="visorGrad" x1="10" y1="7" x2="22" y2="18">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8"/>
                            <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.6"/>
                            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.7"/>
                        </linearGradient>
                    </defs>
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

            {/* Portal to body so modal escapes nav overflow/positioning */}
            {auth && createPortal(<AuthModal />, document.body)}
        </nav>
    );
}
