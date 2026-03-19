import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Settings, Users, FileText, Radio } from 'lucide-react';
import AdminGate from '../components/AdminGate';
import { supabase } from '../lib/supabase';
import { GAMES } from '../data/gameRegistry';
import './Admin.css';

const GAME_COUNT = Object.keys(GAMES).length;

export default function Admin() {
  return (
    <AdminGate>
      <AdminInner />
    </AdminGate>
  );
}

function AdminInner() {
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCount, setUserCount] = useState(null);
  const [nodeCount, setNodeCount] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const base = import.meta.env.BASE_URL || '/';

        const statusRes = await fetch(`${base}data/pipeline-status.json`);
        if (statusRes.ok) {
          const status = await statusRes.json();
          setPipelineStatus(status);
          setNodeCount(status?.stats?.nodeCount ?? null);
        }
      } catch (err) {
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Fetch user count if Supabase is available
    if (supabase) {
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .then(({ count }) => {
          if (count != null) setUserCount(count);
        })
        .catch(() => {});
    }
  }, []);

  const dashboardCards = [
    { to: '/admin/games', icon: Gamepad2, label: 'Game Lab', desc: `Test all ${GAME_COUNT} games`, color: '#a78bfa' },
    { to: '/admin/editors', icon: Settings, label: 'Editors', desc: 'All live visual editors', color: '#60a5fa' },
    { to: '/admin/users', icon: Users, label: 'Users', desc: userCount != null ? `${userCount} registered` : 'Manage users', color: '#f472b6' },
    { to: '/admin/content', icon: FileText, label: 'Content', desc: nodeCount != null ? `${nodeCount} nodes` : 'Browse content', color: '#34d399' },
    { to: '/admin/campaigns', icon: Radio, label: 'Campaigns', desc: 'Release takeovers', color: '#fbbf24' },
  ];

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading pipeline data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-error-banner">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <p className="admin-subtitle">Pipeline status, game lab, editors, and site management</p>
      </header>

      {/* Dashboard Hub Cards */}
      <section className="admin-section">
        <div className="admin-hub-grid">
          {dashboardCards.map(card => {
            const Icon = card.icon;
            const inner = (
              <div className="admin-hub-card admin-glass" style={{ '--hub-color': card.color }}>
                <Icon size={24} className="admin-hub-icon" />
                <span className="admin-hub-label">{card.label}</span>
                <span className="admin-hub-desc">{card.desc}</span>
              </div>
            );
            if (card.external) {
              return <a key={card.to} href={card.to} className="admin-hub-link">{inner}</a>;
            }
            return <Link key={card.to} to={card.to} className="admin-hub-link">{inner}</Link>;
          })}
        </div>
      </section>

      {/* Pipeline Status */}
      <section className="admin-section admin-glass">
        <h2>Pipeline Status</h2>
        {!pipelineStatus ? (
          <div className="admin-empty">
            <p>Pipeline has not been run yet.</p>
            <p>Run <code>npm run pipeline</code> to generate data.</p>
          </div>
        ) : (
          <div className="admin-status-grid">
            <div className="admin-status-item">
              <span className="admin-status-label">Last Run</span>
              <span className="admin-status-value">{new Date(pipelineStatus.lastRun).toLocaleString()}</span>
            </div>
            <div className="admin-status-item">
              <span className="admin-status-label">Status</span>
              <span className={`admin-badge ${pipelineStatus.status === 'success' ? 'admin-badge-success' : 'admin-badge-error'}`}>
                {pipelineStatus.status}
              </span>
            </div>
            {pipelineStatus.error && (
              <div className="admin-status-item admin-status-error-detail">
                <span className="admin-status-label">Error</span>
                <span className="admin-status-value">{pipelineStatus.error}</span>
              </div>
            )}
            {pipelineStatus.stats && (
              <>
                <div className="admin-status-item">
                  <span className="admin-status-label">Nodes</span>
                  <span className="admin-status-value">{pipelineStatus.stats.nodeCount}</span>
                </div>
                <div className="admin-status-item">
                  <span className="admin-status-label">Edges</span>
                  <span className="admin-status-value">{pipelineStatus.stats.edgeCount}</span>
                </div>
                <div className="admin-status-item">
                  <span className="admin-status-label">By Source</span>
                  <span className="admin-status-value">
                    {Object.entries(pipelineStatus.stats.bySource || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </span>
                </div>
                <div className="admin-status-item">
                  <span className="admin-status-label">By Type</span>
                  <span className="admin-status-value">
                    {Object.entries(pipelineStatus.stats.byType || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </span>
                </div>
                <div className="admin-status-item">
                  <span className="admin-status-label">Visibility</span>
                  <span className="admin-status-value">
                    {Object.entries(pipelineStatus.stats.byVisibility || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </span>
                </div>
                <div className="admin-status-item">
                  <span className="admin-status-label">Privacy Audit</span>
                  <span className="admin-status-value">
                    {pipelineStatus.stats.privacyAudit?.violations === 0
                      ? 'Passed'
                      : `${pipelineStatus.stats.privacyAudit?.violations} violation(s)`}
                    {pipelineStatus.stats.privacyAudit?.warnings > 0 &&
                      `, ${pipelineStatus.stats.privacyAudit.warnings} warning(s)`}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* Source Health */}
      {pipelineStatus?.stats?.ingestSources && (
        <section className="admin-section admin-glass">
          <h2>Source Health</h2>
          <div className="admin-status-grid">
            {Object.entries(pipelineStatus.stats.ingestSources).map(([source, info]) => (
              <div key={source} className="admin-status-item">
                <span className="admin-status-label">{source}</span>
                <span className="admin-status-value">
                  <span className={`admin-badge ${info.status === 'active' ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                    {info.status}
                  </span>
                  {' '}{info.count} node{info.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
