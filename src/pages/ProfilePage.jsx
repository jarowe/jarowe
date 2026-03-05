import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ACHIEVEMENTS, gatherStats } from '../data/achievements';
import { GAMES } from '../data/gameRegistry';
import './ProfilePage.css';

export default function ProfilePage() {
  const auth = useAuth();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const xp = parseInt(localStorage.getItem('jarowe_xp') || '0', 10);
  const level = Math.floor(xp / 100) + 1;
  const stats = gatherStats(xp);
  const unlockedIds = JSON.parse(localStorage.getItem('jarowe_achievements') || '[]');
  const unlockedSet = new Set(unlockedIds);

  // Game high scores
  const gameIds = Object.keys(GAMES);
  const scores = gameIds.map(gid => ({
    id: gid,
    name: GAMES[gid].name,
    score: parseInt(localStorage.getItem(`jarowe_highscore_${gid}`) || '0', 10),
  })).filter(g => g.score > 0).sort((a, b) => b.score - a.score);

  const user = auth?.user;
  const profile = auth?.profile;

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Explorer';
  const avatarUrl = profile?.avatar_url;
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSaveName = async () => {
    if (nameInput.trim() && auth?.updateProfile) {
      await auth.updateProfile({ display_name: nameInput.trim() });
    }
    setEditing(false);
  };

  if (!user) {
    return (
      <div className="profile-page">
        <Link to="/" className="back-link">Home</Link>
        <div className="profile-empty glass-panel">
          <h2>Your Profile</h2>
          <p>Sign in to track your progress, earn achievements, and compete on leaderboards.</p>
          <button className="profile-signin-btn" onClick={() => auth?.openAuthModal?.()}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Link to="/" className="back-link">Home</Link>

      {/* Header */}
      <div className="profile-header glass-panel">
        <div className="profile-avatar-large">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="profile-avatar-img" />
          ) : (
            <span className="profile-avatar-initials">{initials}</span>
          )}
        </div>
        <div className="profile-info">
          {editing ? (
            <div className="profile-name-edit">
              <input
                className="profile-name-input"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
                maxLength={30}
              />
              <button className="profile-name-save" onClick={handleSaveName}>Save</button>
            </div>
          ) : (
            <h1 className="profile-name" onClick={() => { setNameInput(displayName); setEditing(true); }}>
              {displayName}
              <span className="profile-name-edit-hint">edit</span>
            </h1>
          )}
          <div className="profile-level-bar">
            <span className="profile-level-badge">LVL {level}</span>
            <div className="profile-xp-bar">
              <div className="profile-xp-fill" style={{ width: `${xp % 100}%` }} />
            </div>
            <span className="profile-xp-text">{xp} XP</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="profile-stats">
        <div className="profile-stat glass-panel">
          <span className="profile-stat-value">{stats.xp}</span>
          <span className="profile-stat-label">Total XP</span>
        </div>
        <div className="profile-stat glass-panel">
          <span className="profile-stat-value">{stats.gamesPlayed}</span>
          <span className="profile-stat-label">Games Played</span>
        </div>
        <div className="profile-stat glass-panel">
          <span className="profile-stat-value">{stats.pagesVisited}</span>
          <span className="profile-stat-label">Pages Explored</span>
        </div>
        <div className="profile-stat glass-panel">
          <span className="profile-stat-value">{unlockedIds.length}</span>
          <span className="profile-stat-label">Achievements</span>
        </div>
      </div>

      {/* Achievements */}
      <h2 className="profile-section-title">Achievements</h2>
      <div className="profile-achievements">
        {ACHIEVEMENTS.map(ach => {
          const unlocked = unlockedSet.has(ach.id);
          return (
            <div key={ach.id} className={`profile-badge glass-panel${unlocked ? '' : ' profile-badge-locked'}`}>
              <span className="profile-badge-icon">{unlocked ? ach.icon : '\u{1F512}'}</span>
              <span className="profile-badge-name">{ach.name}</span>
              <span className="profile-badge-desc">{ach.desc}</span>
            </div>
          );
        })}
      </div>

      {/* High Scores */}
      {scores.length > 0 && (
        <>
          <h2 className="profile-section-title">High Scores</h2>
          <div className="profile-scores glass-panel">
            {scores.map(g => (
              <div key={g.id} className="profile-score-row">
                <span className="profile-score-name">{g.name}</span>
                <span className="profile-score-value">{g.score}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
