import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './UserMenu.css';

export default function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!user) return null;

  const xp = parseInt(localStorage.getItem('jarowe_xp') || '0', 10);
  const level = Math.floor(xp / 100) + 1;
  const displayName = profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Explorer';
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="user-menu" ref={menuRef}>
      <button className="user-menu-avatar" onClick={() => setOpen(!open)} aria-label="User menu">
        <span className="user-menu-ring" />
        <span className="user-menu-inner">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="user-menu-img" />
          ) : (
            <span className="user-menu-initials">{initials}</span>
          )}
        </span>
        {/* Level badge */}
        <span className="user-menu-badge">{level}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="user-menu-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {/* User info header */}
            <div className="user-menu-header">
              <div className="user-menu-info">
                <span className="user-menu-name">{displayName}</span>
                <span className="user-menu-xp">{xp} XP</span>
              </div>
              <span className="user-menu-level">LVL {level}</span>
            </div>

            {/* XP progress to next level */}
            <div className="user-menu-progress">
              <div className="user-menu-progress-fill" style={{ width: `${xp % 100}%` }} />
            </div>

            <Link to="/profile" className="user-menu-item" onClick={() => setOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </Link>
            <button className="user-menu-item user-menu-signout" onClick={async () => { setOpen(false); await signOut(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
