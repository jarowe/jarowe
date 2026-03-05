import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Github, Linkedin, Wrench, Instagram, Volume2, VolumeX, LogIn } from 'lucide-react';
import { useState } from 'react';
import { getMuted, setMuted, playClickSound } from '../utils/sounds';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';
import './Navbar.css';

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
            // Play a tiny sound after unmuting to confirm
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
                        <button
                            onClick={auth.openAuthModal}
                            className="social-icon nav-signin"
                            title="Sign In"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', marginLeft: '8px' }}
                        >
                            <LogIn size={18} />
                        </button>
                    ) : null}
                </div>
            </div>
            {auth && <AuthModal />}
        </nav>
    );
}
