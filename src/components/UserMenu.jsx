import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './UserMenu.css';

export default function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on click outside
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
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url;

  // Initials fallback
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="user-menu" ref={menuRef}>
      <button className="user-menu-avatar" onClick={() => setOpen(!open)} aria-label="User menu">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="user-menu-img" />
        ) : (
          <span className="user-menu-initials">{initials}</span>
        )}
      </button>

      {open && (
        <div className="user-menu-dropdown glass-panel">
          <div className="user-menu-header">
            <span className="user-menu-name">{displayName}</span>
            <span className="user-menu-level">LVL {level}</span>
          </div>
          <Link to="/profile" className="user-menu-item" onClick={() => setOpen(false)}>
            Profile
          </Link>
          <button className="user-menu-item user-menu-signout" onClick={() => { signOut(); setOpen(false); }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
