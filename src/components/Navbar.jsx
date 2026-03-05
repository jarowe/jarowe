import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Linkedin, Wrench, Instagram, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { getMuted, setMuted, playClickSound } from '../utils/sounds';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';
import './Navbar.css';

/* ── Sacred Geometry Mandala — Mini (navbar) ── */
function GuestAvatar({ onClick }) {
    return (
        <button className="guest-avatar" onClick={onClick} aria-label="Sign in">
            <span className="guest-avatar-ring" />
            <span className="guest-avatar-inner">
                <svg width="22" height="22" viewBox="0 0 40 40" fill="none" className="ga-mandala">
                    <defs>
                        <radialGradient id="gaCore" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.8"/>
                            <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.35"/>
                            <stop offset="100%" stopColor="transparent"/>
                        </radialGradient>
                        <radialGradient id="gaIris" cx="40%" cy="40%" r="50%">
                            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.6"/>
                            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.15"/>
                        </radialGradient>
                        <filter id="gaGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="1.2" result="b"/>
                            <feComposite in="SourceGraphic" in2="b" operator="over"/>
                        </filter>
                    </defs>

                    {/* Tick marks — 12 compass notches */}
                    {Array.from({ length: 12 }, (_, i) => {
                        const a = (i * 30 - 90) * Math.PI / 180;
                        return <line key={i}
                            x1={20 + 15 * Math.cos(a)} y1={20 + 15 * Math.sin(a)}
                            x2={20 + 17.5 * Math.cos(a)} y2={20 + 17.5 * Math.sin(a)}
                            stroke="rgba(167,139,250,0.35)" strokeWidth="0.7" className="ga-tick" />;
                    })}

                    {/* Hexagram — two overlapping triangles */}
                    <g className="ga-hex" style={{ transformOrigin: '20px 20px' }}>
                        <polygon points="20,7 29.8,25 10.2,25"
                            fill="none" stroke="rgba(103,232,249,0.4)" strokeWidth="0.8" strokeLinejoin="round"/>
                        <polygon points="20,33 10.2,15 29.8,15"
                            fill="none" stroke="rgba(196,181,253,0.4)" strokeWidth="0.8" strokeLinejoin="round"/>
                    </g>

                    {/* Flower of life — overlapping circles */}
                    <g className="ga-flower" style={{ transformOrigin: '20px 20px' }}>
                        <circle cx="20" cy="20" r="7" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
                        <circle cx="20" cy="13" r="7" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                        <circle cx="26" cy="23.5" r="7" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                        <circle cx="14" cy="23.5" r="7" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                    </g>

                    {/* Central core */}
                    <circle cx="20" cy="20" r="5" fill="url(#gaCore)" className="ga-core" filter="url(#gaGlow)"/>
                    <circle cx="20" cy="20" r="2.5" fill="url(#gaIris)" className="ga-iris"/>

                    {/* Orbiting dots */}
                    <circle cx="20" cy="7" r="1" fill="#67e8f9" opacity="0.5" className="ga-dot d0"/>
                    <circle cx="31.3" cy="13.5" r="0.8" fill="#c4b5fd" opacity="0.4" className="ga-dot d1"/>
                    <circle cx="31.3" cy="26.5" r="1" fill="#f472b6" opacity="0.4" className="ga-dot d2"/>
                    <circle cx="20" cy="33" r="0.8" fill="#fbbf24" opacity="0.5" className="ga-dot d3"/>
                    <circle cx="8.7" cy="26.5" r="1" fill="#67e8f9" opacity="0.4" className="ga-dot d4"/>
                    <circle cx="8.7" cy="13.5" r="0.8" fill="#c4b5fd" opacity="0.4" className="ga-dot d5"/>
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

        </nav>
    );
}
