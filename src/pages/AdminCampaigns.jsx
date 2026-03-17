import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import AdminGate from '../components/AdminGate';
import registry from '../content/takeovers/registry';
import { supabase, supabaseGet } from '../lib/supabase';
import './Admin.css';

export default function AdminCampaigns() {
  return (
    <AdminGate>
      <CampaignsInner />
    </AdminGate>
  );
}

const EXPOSURE_MODES = ['preview', 'takeover', 'archived'];
const ROLLOUT_PHASES = ['pre-single', 'single-live', 'pre-album', 'album-live'];

function CampaignsInner() {
  const [states, setStates] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabaseGet('site_takeovers').then((rows) => {
      if (!rows) return;
      const map = {};
      rows.forEach((r) => { map[r.takeover_id] = r; });
      setStates(map);
    });
  }, []);

  const handleUpdate = async (takeoverId, field, value) => {
    if (!supabase) return;
    setSaving(takeoverId);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('site_takeovers')
        .upsert(
          { takeover_id: takeoverId, [field]: value },
          { onConflict: 'takeover_id' }
        );
      if (err) throw err;
      setStates((prev) => ({
        ...prev,
        [takeoverId]: { ...prev[takeoverId], takeover_id: takeoverId, [field]: value },
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/admin" className="back-link">&larr; Admin</Link>
        <h1>Campaigns</h1>
        <p className="admin-subtitle">Manage release takeovers and exposure modes</p>
      </header>

      {!supabase && (
        <div className="admin-section admin-glass" style={{ padding: '1.2rem 1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)' }}>
            Supabase not configured &mdash; using static defaults from registry.
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable runtime control.
          </p>
        </div>
      )}

      {error && <div className="admin-error-banner">{error}</div>}

      {registry.map((entry) => {
        const remote = states[entry.id];
        const phase = remote?.rollout_phase ?? entry.defaultState.rollout_phase;
        const exposure = remote?.exposure_mode ?? entry.defaultState.exposure_mode;

        return (
          <section key={entry.id} className="admin-section admin-glass">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <Radio size={18} style={{ color: '#a78bfa' }} />
              <h2 style={{ margin: 0 }}>{entry.id}</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 1.2rem', fontSize: '0.88rem' }}>
              Slug: <code>{entry.slug}</code> &middot; Preview: <code>{entry.previewBasePath}</code>
            </p>

            <div className="admin-status-grid">
              <div className="admin-status-item">
                <span className="admin-status-label">Exposure Mode</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {EXPOSURE_MODES.map((mode) => (
                    <button
                      key={mode}
                      className={`admin-badge ${exposure === mode ? 'admin-badge-success' : ''}`}
                      onClick={() => handleUpdate(entry.id, 'exposure_mode', mode)}
                      disabled={!supabase || saving === entry.id}
                      style={{
                        cursor: supabase ? 'pointer' : 'not-allowed',
                        border: 'none',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        opacity: !supabase ? 0.5 : 1,
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-status-item">
                <span className="admin-status-label">Rollout Phase</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ROLLOUT_PHASES.map((p) => (
                    <button
                      key={p}
                      className={`admin-badge ${phase === p ? 'admin-badge-success' : ''}`}
                      onClick={() => handleUpdate(entry.id, 'rollout_phase', p)}
                      disabled={!supabase || saving === entry.id}
                      style={{
                        cursor: supabase ? 'pointer' : 'not-allowed',
                        border: 'none',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        opacity: !supabase ? 0.5 : 1,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link
                to={entry.previewBasePath}
                className="admin-badge admin-badge-success"
                style={{ textDecoration: 'none', padding: '0.35rem 0.75rem' }}
              >
                Open Preview
              </Link>
              <Link
                to={`/?takeoverPreview=${entry.id}`}
                className="admin-badge"
                style={{ textDecoration: 'none', padding: '0.35rem 0.75rem' }}
              >
                Preview as Takeover
              </Link>
              <Link
                to={`${entry.previewBasePath}/artist`}
                className="admin-badge"
                style={{ textDecoration: 'none', padding: '0.35rem 0.75rem' }}
              >
                Artist Page
              </Link>
              <Link
                to={`${entry.previewBasePath}/epk`}
                className="admin-badge"
                style={{ textDecoration: 'none', padding: '0.35rem 0.75rem' }}
              >
                EPK Page
              </Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}
