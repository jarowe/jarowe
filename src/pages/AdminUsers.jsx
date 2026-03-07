import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, Search, Shield, ShieldOff, ChevronDown, ChevronUp, Users, Trophy, Gamepad2, Map } from 'lucide-react';
import AdminGate from '../components/AdminGate';
import { supabase } from '../lib/supabase';
import { ACHIEVEMENTS } from '../data/achievements';
import { GAMES } from '../data/gameRegistry';
import './Admin.css';

export default function AdminUsers() {
  return (
    <AdminGate>
      <AdminUsersInner />
    </AdminGate>
  );
}

function AdminUsersInner() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | admins | active
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null); // { id, name, currentAdmin }

  const loadUsers = useCallback(async function _load(attempt = 0) {
      setLoading(true);
      setError(null);
      try {
        // Safety timeout: Supabase client can hang if session lock is
        // corrupted. 30s is generous but prevents infinite loading.
        const safetyTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out after 30s. Try signing out and back in, then reload.')), 30000));

        const profilesRes = await Promise.race([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          safetyTimeout,
        ]);

        // If we get an auth error on first attempt, wait and retry once
        if (profilesRes.error) {
          const code = profilesRes.error.code || profilesRes.error.message || '';
          if (attempt < 1 && (code.includes('JWT') || code.includes('401') || code === 'PGRST301')) {
            await new Promise(r => setTimeout(r, 2000));
            return _load(attempt + 1);
          }
          throw profilesRes.error;
        }

        // Fetch related data in parallel (share the safety timeout)
        const [scoresRes, achievementsRes] = await Promise.race([
          Promise.all([
            supabase.from('high_scores').select('user_id, game_id, score'),
            supabase.from('achievements').select('user_id, achievement_id'),
          ]),
          safetyTimeout,
        ]);

        // Group scores and achievements by user_id
        const scoresByUser = {};
        for (const s of (scoresRes.data || [])) {
          if (!scoresByUser[s.user_id]) scoresByUser[s.user_id] = [];
          scoresByUser[s.user_id].push({ game_id: s.game_id, score: s.score });
        }
        const achievementsByUser = {};
        for (const a of (achievementsRes.data || [])) {
          if (!achievementsByUser[a.user_id]) achievementsByUser[a.user_id] = [];
          achievementsByUser[a.user_id].push({ achievement_id: a.achievement_id });
        }

        // Attach to each profile
        const merged = (profilesRes.data || []).map(p => ({
          ...p,
          high_scores: scoresByUser[p.id] || [],
          achievements: achievementsByUser[p.id] || [],
        }));

        setProfiles(merged);
      } catch (err) {
        setError(err.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
  }, []);

  // Load on mount
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    loadUsers();
  }, [loadUsers]);

  // Stats
  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return {
      total: profiles.length,
      admins: profiles.filter(p => p.is_admin).length,
      activeWeek: profiles.filter(p => p.last_active_at && new Date(p.last_active_at).getTime() > weekAgo).length,
      totalXp: profiles.reduce((sum, p) => sum + (p.xp || 0), 0),
    };
  }, [profiles]);

  // Filter + sort
  const filteredUsers = useMemo(() => {
    let result = [...profiles];
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    if (filter === 'admins') {
      result = result.filter(p => p.is_admin);
    } else if (filter === 'active') {
      result = result.filter(p => p.last_active_at && new Date(p.last_active_at).getTime() > weekAgo);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.display_name || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortKey] ?? '';
      let bVal = b[sortKey] ?? '';

      if (sortKey === 'xp' || sortKey === 'total_bops') {
        aVal = aVal || 0;
        bVal = bVal || 0;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (sortKey === 'games') {
        aVal = a.high_scores?.length || 0;
        bVal = b.high_scores?.length || 0;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (sortKey === 'achievements_count') {
        aVal = a.achievements?.length || 0;
        bVal = b.achievements?.length || 0;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (sortKey === 'pages') {
        aVal = Array.isArray(a.visited_paths) ? a.visited_paths.length : 0;
        bVal = Array.isArray(b.visited_paths) ? b.visited_paths.length : 0;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDir === 'asc' ? cmp : -cmp;
      }

      return 0;
    });

    return result;
  }, [profiles, filter, searchQuery, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  // Admin toggle
  const handleAdminToggle = useCallback(async (userId, displayName, currentAdmin) => {
    if (confirmToggle?.id === userId) {
      // Confirmed — execute
      try {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ is_admin: !currentAdmin })
          .eq('id', userId);

        if (updateErr) throw updateErr;

        setProfiles(prev => prev.map(p =>
          p.id === userId ? { ...p, is_admin: !currentAdmin } : p
        ));
      } catch (err) {
        setError(`Failed to update admin status: ${err.message}`);
      }
      setConfirmToggle(null);
    } else {
      setConfirmToggle({ id: userId, name: displayName, currentAdmin });
    }
  }, [confirmToggle]);

  // No Supabase fallback
  if (!supabase) {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Admin</Link>
          <h1>User Management</h1>
          <p className="admin-subtitle">View and manage registered users</p>
        </header>
        <section className="admin-section admin-glass" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', maxWidth: '400px', margin: '0 auto' }}>
            Connect Supabase to manage users. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your environment.
          </p>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Admin</Link>
          <h1>User Management</h1>
        </header>
        <div className="admin-error-banner">
          {error}
          <button
            onClick={() => loadUsers()}
            style={{ marginLeft: '1rem', padding: '0.4rem 1rem', background: 'rgba(100,160,255,0.2)', color: 'rgb(140,190,255)', border: '1px solid rgba(100,160,255,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Admin</Link>
        <h1>User Management</h1>
        <p className="admin-subtitle">{profiles.length} registered user{profiles.length !== 1 ? 's' : ''}</p>
      </header>

      {/* Stats bar */}
      <section className="admin-section">
        <div className="admin-status-grid">
          <div className="admin-status-item">
            <span className="admin-status-label">Total Users</span>
            <span className="admin-status-value">{stats.total}</span>
          </div>
          <div className="admin-status-item">
            <span className="admin-status-label">Active This Week</span>
            <span className="admin-status-value">{stats.activeWeek}</span>
          </div>
          <div className="admin-status-item">
            <span className="admin-status-label">Total XP</span>
            <span className="admin-status-value">{stats.totalXp.toLocaleString()}</span>
          </div>
          <div className="admin-status-item">
            <span className="admin-status-label">Admins</span>
            <span className="admin-status-value">{stats.admins}</span>
          </div>
        </div>
      </section>

      {/* Filters + Search */}
      <section className="admin-section admin-glass">
        <div className="admin-filters">
          <div className="admin-search">
            <Search size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="admin-input admin-search-input"
            />
          </div>
          <div className="admin-type-pills">
            {[
              { key: 'all', label: 'All' },
              { key: 'admins', label: 'Admins' },
              { key: 'active', label: 'Active 7d' },
            ].map(f => (
              <button
                key={f.key}
                className={`admin-pill ${filter === f.key ? 'admin-pill-active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm toggle banner */}
        {confirmToggle && (
          <div className="admin-confirm-banner">
            <span>
              {confirmToggle.currentAdmin ? 'Remove admin from' : 'Make admin:'}{' '}
              <strong>{confirmToggle.name || 'this user'}</strong>?
            </span>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => handleAdminToggle(confirmToggle.id, confirmToggle.name, confirmToggle.currentAdmin)}
            >
              Confirm
            </button>
            <button
              className="admin-btn"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => setConfirmToggle(null)}
            >
              Cancel
            </button>
          </div>
        )}

        {profiles.length === 0 ? (
          <div className="admin-empty">No users registered yet.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {[
                    { key: 'display_name', label: 'User' },
                    { key: 'xp', label: 'XP' },
                    { key: 'games', label: 'Games' },
                    { key: 'achievements_count', label: 'Badges' },
                    { key: 'pages', label: 'Pages' },
                    { key: 'created_at', label: 'Joined' },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)} className="admin-th-sort">
                      {col.label}
                      {sortKey === col.key && <ArrowUpDown size={12} className="admin-sort-icon" />}
                    </th>
                  ))}
                  <th>Admin</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const level = Math.floor((user.xp || 0) / 100) + 1;
                  const isExpanded = expandedId === user.id;
                  return (
                    <UserRow
                      key={user.id}
                      user={user}
                      level={level}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setExpandedId(isExpanded ? null : user.id)}
                      onAdminToggle={handleAdminToggle}
                      confirmToggle={confirmToggle}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function UserRow({ user, level, isExpanded, onToggleExpand, onAdminToggle, confirmToggle }) {
  const gameCount = user.high_scores?.length || 0;
  const achievementCount = user.achievements?.length || 0;
  const pageCount = Array.isArray(user.visited_paths) ? user.visited_paths.length : 0;

  return (
    <>
      <tr
        className={`admin-user-row ${isExpanded ? 'admin-user-row-expanded' : ''}`}
        onClick={onToggleExpand}
        style={{ cursor: 'pointer' }}
      >
        <td>
          <div className="admin-user-cell">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="admin-user-avatar" />
            ) : (
              <div className="admin-user-avatar-placeholder">
                {(user.display_name || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="admin-user-name">{user.display_name || 'Anonymous'}</div>
              <div className="admin-user-level">Lvl {level}</div>
            </div>
          </div>
        </td>
        <td>{(user.xp || 0).toLocaleString()}</td>
        <td>{gameCount}</td>
        <td>{achievementCount}</td>
        <td>{pageCount}</td>
        <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '--'}</td>
        <td>
          <button
            className={`admin-toggle ${user.is_admin ? 'admin-toggle-on' : 'admin-toggle-off'}`}
            onClick={e => {
              e.stopPropagation();
              onAdminToggle(user.id, user.display_name, user.is_admin);
            }}
            title={user.is_admin ? 'Admin — click to demote' : 'User — click to promote'}
          >
            {user.is_admin ? <Shield size={16} /> : <ShieldOff size={16} />}
          </button>
        </td>
        <td>
          {isExpanded ? <ChevronUp size={16} style={{ opacity: 0.4 }} /> : <ChevronDown size={16} style={{ opacity: 0.4 }} />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="admin-user-detail-row">
          <td colSpan={8}>
            <UserDetail user={user} level={level} />
          </td>
        </tr>
      )}
    </>
  );
}

function UserDetail({ user, level }) {
  const flags = user.flags || {};
  const xp = user.xp || 0;
  const nextLevel = level * 100;
  const progress = xp % 100;

  // Achievement lookup
  const earnedIds = new Set((user.achievements || []).map(a => a.achievement_id));
  const earnedAchievements = ACHIEVEMENTS.filter(a => earnedIds.has(a.id));

  // High scores
  const scores = (user.high_scores || [])
    .map(hs => ({
      game: GAMES[hs.game_id]?.name || hs.game_id,
      score: hs.score,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="admin-user-detail">
      <div className="admin-user-detail-grid">
        {/* Stats */}
        <div className="admin-user-detail-section">
          <h4>Stats</h4>
          <div className="admin-detail-stats">
            <div><span className="admin-status-label">XP</span><span>{xp.toLocaleString()} / {nextLevel.toLocaleString()}</span></div>
            <div><span className="admin-status-label">Level</span><span>{level}</span></div>
            <div><span className="admin-status-label">Total Bops</span><span>{user.total_bops || 0}</span></div>
            <div><span className="admin-status-label">Cipher Streak</span><span>{user.cipher_streak || 0}</span></div>
            <div><span className="admin-status-label">Vault Cards</span><span>{Array.isArray(user.vault_collection) ? user.vault_collection.length : 0}</span></div>
          </div>
          <div className="admin-xp-bar">
            <div className="admin-xp-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Flags */}
        <div className="admin-user-detail-section">
          <h4>Flags</h4>
          <div className="admin-detail-flags">
            <span className={`admin-badge ${flags.konami ? 'admin-badge-success' : 'admin-badge-dim'}`}>Konami</span>
            <span className={`admin-badge ${flags.glint_met ? 'admin-badge-success' : 'admin-badge-dim'}`}>Met Glint</span>
            <span className={`admin-badge ${flags.vault_opened ? 'admin-badge-success' : 'admin-badge-dim'}`}>Vault</span>
          </div>
        </div>

        {/* Achievements */}
        {earnedAchievements.length > 0 && (
          <div className="admin-user-detail-section">
            <h4>Achievements ({earnedAchievements.length})</h4>
            <div className="admin-detail-badges">
              {earnedAchievements.map(a => (
                <span key={a.id} className="admin-achievement-badge" title={a.desc}>
                  {a.icon} {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* High Scores */}
        {scores.length > 0 && (
          <div className="admin-user-detail-section">
            <h4>High Scores ({scores.length})</h4>
            <div className="admin-detail-scores">
              {scores.slice(0, 10).map((s, i) => (
                <div key={i} className="admin-score-row">
                  <span>{s.game}</span>
                  <span className="admin-score-value">{s.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visited Pages */}
        {Array.isArray(user.visited_paths) && user.visited_paths.length > 0 && (
          <div className="admin-user-detail-section">
            <h4>Visited Pages ({user.visited_paths.length})</h4>
            <div className="admin-detail-paths">
              {user.visited_paths.map(p => (
                <span key={p} className="admin-pill">{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
