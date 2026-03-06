import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, Search, Eye, EyeOff, Download, Calendar, Gamepad2, Globe2, ChevronDown, ChevronUp, Pencil, Play } from 'lucide-react';
import AdminGate from '../components/AdminGate';
import { HOLIDAY_CALENDAR, CATEGORIES, TIER_NAMES } from '../data/holidayCalendar';
import { GAMES } from '../data/gameRegistry';
import './Admin.css';

const GameLauncher = lazy(() => import('../components/GameLauncher'));

const TYPE_LABELS = ['milestone', 'project', 'moment', 'idea', 'place', 'person', 'track'];
const TABS = [
  { key: 'nodes', label: 'Nodes', icon: Globe2 },
  { key: 'holidays', label: 'Holidays', icon: Calendar },
  { key: 'games', label: 'Games', icon: Gamepad2 },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AdminContent() {
  return (
    <AdminGate>
      <AdminContentInner />
    </AdminGate>
  );
}

function AdminContentInner() {
  const [tab, setTab] = useState('nodes');

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/admin" className="back-link"><ArrowLeft size={16} /> Admin</Link>
        <h1>Content Manager</h1>
        <p className="admin-subtitle">Constellation nodes, holiday calendar, and game registry</p>
      </header>

      {/* Tab switcher */}
      <section className="admin-section">
        <div className="admin-tab-bar">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                className={`admin-tab ${tab === t.key ? 'admin-tab-active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {tab === 'nodes' && <NodesTab />}
      {tab === 'holidays' && <HolidaysTab />}
      {tab === 'games' && <GamesTab />}
    </div>
  );
}

// ─── NODES TAB ──────────────────────────────────────────────────────────
function NodesTab() {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('title');
  const [sortDir, setSortDir] = useState('asc');
  const [typeFilter, setTypeFilter] = useState(null);
  const [epochFilter, setEpochFilter] = useState(null);
  const [sourceFilter, setSourceFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localHidden, setLocalHidden] = useState(new Set());
  const [localOverrides, setLocalOverrides] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const base = import.meta.env.BASE_URL || '/';
        const graphRes = await fetch(`${base}data/constellation.graph.json`);
        if (graphRes.ok) setGraphData(await graphRes.json());

        try {
          const curationRes = await fetch(`${base}curation.json`);
          if (curationRes.ok) {
            const curation = await curationRes.json();
            setLocalHidden(new Set(curation.hidden || []));
            setLocalOverrides(curation.visibility_overrides || {});
          }
        } catch { /* curation.json not available */ }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const nodes = graphData?.nodes || [];

  // Collect unique epochs and sources for filter pills
  const { epochs, sources, typeCounts } = useMemo(() => {
    const epochSet = new Set();
    const sourceSet = new Set();
    const tc = {};
    for (const n of nodes) {
      if (n.epoch) epochSet.add(n.epoch);
      if (n.source) sourceSet.add(n.source);
      tc[n.type] = (tc[n.type] || 0) + 1;
    }
    return {
      epochs: [...epochSet].sort(),
      sources: [...sourceSet].sort(),
      typeCounts: tc,
    };
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    let result = [...nodes];

    if (typeFilter) result = result.filter(n => n.type === typeFilter);
    if (epochFilter) result = result.filter(n => n.epoch === epochFilter);
    if (sourceFilter) result = result.filter(n => n.source === sourceFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.title?.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      let aVal = a[sortKey] ?? '';
      let bVal = b[sortKey] ?? '';
      if (sortKey === 'date') { aVal = aVal || '0000-00-00'; bVal = bVal || '0000-00-00'; }
      if (sortKey === 'significance') { aVal = aVal || 0; bVal = bVal || 0; return sortDir === 'asc' ? aVal - bVal : bVal - aVal; }
      if (typeof aVal === 'string') { const c = aVal.localeCompare(bVal); return sortDir === 'asc' ? c : -c; }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [nodes, typeFilter, epochFilter, sourceFilter, searchQuery, sortKey, sortDir]);

  const toggleNodeVisibility = useCallback((nodeId) => {
    setLocalHidden(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
    setHasChanges(true);
  }, []);

  function handleSave() {
    const updatedCuration = {
      _comment: 'Node curation state. Pipeline reads this to apply publish/hide.',
      hidden: [...localHidden].sort(),
      visibility_overrides: localOverrides,
    };
    const blob = new Blob([JSON.stringify(updatedCuration, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'curation.json'; a.click();
    URL.revokeObjectURL(url);
    setHasChanges(false);
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  if (loading) return <div className="admin-loading">Loading constellation data...</div>;

  return (
    <>
      {/* Stats bar */}
      <section className="admin-section">
        <div className="admin-content-stats">
          {TYPE_LABELS.map(t => (
            <span key={t} className="admin-content-stat">
              <span className={`admin-type-tag admin-type-${t}`}>{t}</span>
              <span>{typeCounts[t] || 0}</span>
            </span>
          ))}
          <span className="admin-content-stat">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>total</span>
            <span>{nodes.length}</span>
          </span>
        </div>
      </section>

      <section className="admin-section admin-glass">
        <div className="admin-table-header">
          <h2>Nodes ({filteredNodes.length})</h2>
          {hasChanges && (
            <button className="admin-btn admin-btn-save" onClick={handleSave}>
              <Download size={16} /> Save Changes
            </button>
          )}
        </div>

        {hasChanges && (
          <div className="admin-save-instructions">
            Download updated <code>curation.json</code>, replace in project root, and run <code>npm run pipeline</code>.
          </div>
        )}

        {nodes.length === 0 ? (
          <div className="admin-empty">
            <p>No nodes found. Run <code>npm run pipeline</code> to generate data.</p>
          </div>
        ) : (
          <>
            <div className="admin-filters">
              <div className="admin-search">
                <Search size={16} />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by title..." className="admin-input admin-search-input" />
              </div>
              <div className="admin-type-pills">
                <button className={`admin-pill ${!typeFilter ? 'admin-pill-active' : ''}`} onClick={() => setTypeFilter(null)}>all</button>
                {TYPE_LABELS.map(t => (
                  <button key={t} className={`admin-pill ${typeFilter === t ? 'admin-pill-active' : ''}`} onClick={() => setTypeFilter(typeFilter === t ? null : t)}>{t}</button>
                ))}
              </div>
            </div>

            {/* Epoch + Source filters */}
            {(epochs.length > 1 || sources.length > 1) && (
              <div className="admin-filters" style={{ marginTop: '-0.25rem' }}>
                {epochs.length > 1 && (
                  <div className="admin-type-pills">
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>Epoch</span>
                    <button className={`admin-pill ${!epochFilter ? 'admin-pill-active' : ''}`} onClick={() => setEpochFilter(null)}>all</button>
                    {epochs.map(e => (
                      <button key={e} className={`admin-pill ${epochFilter === e ? 'admin-pill-active' : ''}`} onClick={() => setEpochFilter(epochFilter === e ? null : e)}>{e}</button>
                    ))}
                  </div>
                )}
                {sources.length > 1 && (
                  <div className="admin-type-pills">
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>Source</span>
                    <button className={`admin-pill ${!sourceFilter ? 'admin-pill-active' : ''}`} onClick={() => setSourceFilter(null)}>all</button>
                    {sources.map(s => (
                      <button key={s} className={`admin-pill ${sourceFilter === s ? 'admin-pill-active' : ''}`} onClick={() => setSourceFilter(sourceFilter === s ? null : s)}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {[
                      { key: 'title', label: 'Title' },
                      { key: 'type', label: 'Type' },
                      { key: 'source', label: 'Source' },
                      { key: 'date', label: 'Date' },
                      { key: 'epoch', label: 'Epoch' },
                      { key: 'significance', label: 'Sig' },
                      { key: 'visibility', label: 'Visibility' },
                    ].map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)} className="admin-th-sort">
                        {col.label}
                        {sortKey === col.key && <ArrowUpDown size={12} className="admin-sort-icon" />}
                      </th>
                    ))}
                    <th>Published</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNodes.map(node => {
                    const isHidden = localHidden.has(node.id);
                    return (
                      <tr key={node.id} className={isHidden ? 'admin-row-hidden' : ''}>
                        <td className="admin-td-title" title={node.id}>{node.title || node.id}</td>
                        <td><span className={`admin-type-tag admin-type-${node.type}`}>{node.type}</span></td>
                        <td>{node.source}</td>
                        <td>{node.date || '--'}</td>
                        <td>{node.epoch || '--'}</td>
                        <td>{node.significance != null ? node.significance.toFixed(2) : '--'}</td>
                        <td><span className={`admin-vis-tag admin-vis-${node.visibility}`}>{node.visibility}</span></td>
                        <td>
                          <button
                            className={`admin-toggle ${isHidden ? 'admin-toggle-off' : 'admin-toggle-on'}`}
                            onClick={() => toggleNodeVisibility(node.id)}
                            title={isHidden ? 'Hidden — click to publish' : 'Published — click to hide'}
                          >
                            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}

// ─── HOLIDAYS TAB ───────────────────────────────────────────────────────
const CATEGORY_KEYS = Object.keys(CATEGORIES).sort();
const GAME_KEYS = Object.keys(GAMES).sort();

function HolidaysTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [gameOnly, setGameOnly] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [localEdits, setLocalEdits] = useState({}); // { 'MM-DD': { field: value } }

  const entries = useMemo(() => {
    return Object.entries(HOLIDAY_CALENDAR).map(([key, val]) => ({
      key,
      month: parseInt(key.split('-')[0], 10),
      day: parseInt(key.split('-')[1], 10),
      ...val,
    }));
  }, []);

  // Stats
  const stats = useMemo(() => {
    const byTier = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const byCat = {};
    let withGame = 0;
    for (const e of entries) {
      byTier[e.tier] = (byTier[e.tier] || 0) + 1;
      byCat[e.category] = (byCat[e.category] || 0) + 1;
      if (e.game) withGame++;
    }
    return { byTier, byCat, withGame, total: entries.length };
  }, [entries]);

  const categoryKeys = useMemo(() => Object.keys(stats.byCat).sort(), [stats]);

  const editCount = Object.keys(localEdits).length;

  function getEditedField(key, field) {
    return localEdits[key]?.[field];
  }

  function getMerged(entry) {
    const edits = localEdits[entry.key];
    return edits ? { ...entry, ...edits } : entry;
  }

  function handleFieldEdit(key, field, value) {
    setLocalEdits(prev => {
      const existing = prev[key] || {};
      const updated = { ...existing, [field]: value };
      // If value matches original, remove the field override
      const original = HOLIDAY_CALENDAR[key];
      if (original && original[field] === value) {
        delete updated[field];
      }
      if (Object.keys(updated).length === 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: updated };
    });
  }

  function handleExport() {
    const changes = Object.entries(localEdits).map(([key, edits]) => ({
      key,
      ...HOLIDAY_CALENDAR[key],
      ...edits,
    }));
    const blob = new Blob([JSON.stringify(changes, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'holiday-edits.json'; a.click();
    URL.revokeObjectURL(url);
  }

  // Filter
  const filtered = useMemo(() => {
    let result = entries;
    if (tierFilter) result = result.filter(e => e.tier === tierFilter);
    if (categoryFilter) result = result.filter(e => e.category === categoryFilter);
    if (gameOnly) result = result.filter(e => e.game);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q));
    }
    if (selectedMonth) result = result.filter(e => e.month === selectedMonth);
    return result;
  }, [entries, tierFilter, categoryFilter, gameOnly, searchQuery, selectedMonth]);

  // Group by month
  const byMonth = useMemo(() => {
    const groups = {};
    for (const e of filtered) {
      if (!groups[e.month]) groups[e.month] = [];
      groups[e.month].push(e);
    }
    return groups;
  }, [filtered]);

  const detail = selectedDay ? entries.find(e => e.key === selectedDay) : null;

  return (
    <>
      {/* Stats */}
      <section className="admin-section">
        <div className="admin-content-stats">
          {[1, 2, 3, 4].map(t => (
            <span key={t} className="admin-content-stat">
              <span className={`admin-game-tier admin-game-tier-${t === 4 ? 3 : t}`}>{TIER_NAMES[t]}</span>
              <span>{stats.byTier[t]}</span>
            </span>
          ))}
          <span className="admin-content-stat">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>with game</span>
            <span>{stats.withGame}</span>
          </span>
          <span className="admin-content-stat">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>total</span>
            <span>{stats.total}</span>
          </span>
          {editCount > 0 && (
            <button className="admin-edits-badge" onClick={handleExport}>
              {editCount} edit{editCount !== 1 ? 's' : ''} — Export
            </button>
          )}
        </div>
      </section>

      <section className="admin-section admin-glass">
        <div className="admin-filters">
          <div className="admin-search">
            <Search size={16} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search holidays..." className="admin-input admin-search-input" />
          </div>
          <div className="admin-type-pills">
            <button className={`admin-pill ${!tierFilter ? 'admin-pill-active' : ''}`} onClick={() => setTierFilter(null)}>all tiers</button>
            {[1, 2, 3].map(t => (
              <button key={t} className={`admin-pill ${tierFilter === t ? 'admin-pill-active' : ''}`} onClick={() => setTierFilter(tierFilter === t ? null : t)}>T{t}</button>
            ))}
            <button className={`admin-pill ${gameOnly ? 'admin-pill-active' : ''}`} onClick={() => setGameOnly(!gameOnly)}>has game</button>
          </div>
        </div>

        {/* Category filter */}
        <div className="admin-filters" style={{ marginTop: '-0.25rem' }}>
          <div className="admin-type-pills">
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>Category</span>
            <button className={`admin-pill ${!categoryFilter ? 'admin-pill-active' : ''}`} onClick={() => setCategoryFilter(null)}>all</button>
            {categoryKeys.map(c => (
              <button key={c} className={`admin-pill ${categoryFilter === c ? 'admin-pill-active' : ''}`} onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}>{c}</button>
            ))}
          </div>
        </div>

        {/* Month tabs */}
        <div className="admin-type-pills" style={{ marginBottom: '1rem' }}>
          <button className={`admin-pill ${!selectedMonth ? 'admin-pill-active' : ''}`} onClick={() => setSelectedMonth(null)}>All months</button>
          {MONTHS.map((m, i) => (
            <button key={i} className={`admin-pill ${selectedMonth === i + 1 ? 'admin-pill-active' : ''}`} onClick={() => setSelectedMonth(selectedMonth === i + 1 ? null : i + 1)}>{m}</button>
          ))}
        </div>

        {/* Day grid by month */}
        {Object.keys(byMonth).sort((a, b) => a - b).map(month => (
          <div key={month} className="admin-holiday-month">
            <h3 className="admin-holiday-month-title">{MONTHS[month - 1]}</h3>
            <div className="admin-holiday-grid">
              {byMonth[month].sort((a, b) => a.day - b.day).map(entry => {
                const isEdited = !!localEdits[entry.key];
                const m = getMerged(entry);
                return (
                  <button
                    key={entry.key}
                    className={`admin-holiday-card ${selectedDay === entry.key ? 'admin-holiday-card-selected' : ''} ${isEdited ? 'admin-holiday-card-edited' : ''}`}
                    onClick={() => setSelectedDay(selectedDay === entry.key ? null : entry.key)}
                  >
                    <span className="admin-holiday-emoji">{m.emoji}</span>
                    <span className="admin-holiday-day">{entry.day}</span>
                    <span className="admin-holiday-name">{m.name}</span>
                    <div className="admin-holiday-meta">
                      <span className={`admin-game-tier admin-game-tier-${(m.tier === 4 ? 3 : m.tier)}`}>T{m.tier}</span>
                      {m.game && <Gamepad2 size={10} style={{ opacity: 0.5 }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="admin-empty">No holidays match your filters.</div>
        )}
      </section>

      {/* Detail panel */}
      {detail && <HolidayDetail
        detail={detail}
        selectedDay={selectedDay}
        editMode={editMode}
        setEditMode={setEditMode}
        localEdits={localEdits}
        getMerged={getMerged}
        handleFieldEdit={handleFieldEdit}
        onClose={() => { setSelectedDay(null); setEditMode(false); }}
      />}
    </>
  );
}

// ─── HOLIDAY DETAIL PANEL ────────────────────────────────────────────────
function HolidayDetail({ detail, selectedDay, editMode, setEditMode, localEdits, getMerged, handleFieldEdit, onClose }) {
  const m = getMerged(detail);
  const catColor = CATEGORIES[m.category]?.accentPrimary || '#fff';

  return (
    <section className="admin-section admin-glass">
      <div className="admin-table-header">
        <h2>{m.emoji} {m.name}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`admin-btn ${editMode ? 'admin-btn-primary' : ''}`}
            style={editMode ? {} : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => setEditMode(!editMode)}
          >
            <Pencil size={14} /> {editMode ? 'Editing' : 'Edit'}
          </button>
          <button className="admin-btn" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="admin-detail-grid-2col">
        <div>
          <div className="admin-detail-row"><span className="admin-status-label">Date</span><span>{selectedDay}</span></div>

          {editMode ? (
            <>
              <div className="admin-edit-row">
                <span className="admin-status-label">Name</span>
                <input className="admin-edit-field" value={m.name} onChange={e => handleFieldEdit(selectedDay, 'name', e.target.value)} />
              </div>
              <div className="admin-edit-row">
                <span className="admin-status-label">Emoji</span>
                <input className="admin-edit-field" value={m.emoji} onChange={e => handleFieldEdit(selectedDay, 'emoji', e.target.value)} style={{ width: '4rem' }} />
              </div>
              <div className="admin-edit-row">
                <span className="admin-status-label">Tier</span>
                <select className="admin-edit-field" value={m.tier} onChange={e => handleFieldEdit(selectedDay, 'tier', Number(e.target.value))}>
                  {[1, 2, 3, 4].map(t => <option key={t} value={t}>{TIER_NAMES[t]} (T{t})</option>)}
                </select>
              </div>
              <div className="admin-edit-row">
                <span className="admin-status-label">Category</span>
                <select className="admin-edit-field" value={m.category} onChange={e => handleFieldEdit(selectedDay, 'category', e.target.value)}>
                  {CATEGORY_KEYS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="admin-edit-row">
                <span className="admin-status-label">Greeting</span>
                <textarea className="admin-edit-field" rows={2} value={m.greeting || ''} onChange={e => handleFieldEdit(selectedDay, 'greeting', e.target.value)} />
              </div>
              <div className="admin-edit-row">
                <span className="admin-status-label">Alt Greeting</span>
                <textarea className="admin-edit-field" rows={2} value={m.greetingAlt || ''} onChange={e => handleFieldEdit(selectedDay, 'greetingAlt', e.target.value)} />
              </div>
              <div className="admin-edit-row">
                <span className="admin-status-label">Game</span>
                <select className="admin-edit-field" value={m.game || ''} onChange={e => handleFieldEdit(selectedDay, 'game', e.target.value || undefined)}>
                  <option value="">None</option>
                  {GAME_KEYS.map(g => <option key={g} value={g}>{GAMES[g]?.name || g}</option>)}
                </select>
              </div>
              <div className="admin-edit-row">
                <span className="admin-status-label">BG Effect</span>
                <input className="admin-edit-field" value={m.bgEffect || ''} onChange={e => handleFieldEdit(selectedDay, 'bgEffect', e.target.value || undefined)} />
              </div>
            </>
          ) : (
            <>
              <div className="admin-detail-row"><span className="admin-status-label">Tier</span><span className={`admin-game-tier admin-game-tier-${m.tier === 4 ? 3 : m.tier}`}>{TIER_NAMES[m.tier]}</span></div>
              <div className="admin-detail-row"><span className="admin-status-label">Category</span><span style={{ color: catColor }}>{m.category}</span></div>
              <div className="admin-detail-row"><span className="admin-status-label">Greeting</span><span style={{ color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>{m.greeting}</span></div>
              {m.greetingAlt && <div className="admin-detail-row"><span className="admin-status-label">Alt Greeting</span><span style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>{m.greetingAlt}</span></div>}
              {m.fact && <div className="admin-detail-row"><span className="admin-status-label">Fact</span><span style={{ color: 'rgba(255,255,255,0.6)' }}>{m.fact}</span></div>}
              {m.game && <div className="admin-detail-row"><span className="admin-status-label">Game</span><span>{GAMES[m.game]?.name || m.game}</span></div>}
              {m.bgEffect && <div className="admin-detail-row"><span className="admin-status-label">BG Effect</span><span>{m.bgEffect}</span></div>}
            </>
          )}
        </div>
        <div>
          {editMode ? (
            <>
              <div className="admin-edit-row">
                <span className="admin-status-label">Glint Ideas (one per line)</span>
                <textarea
                  className="admin-edit-field"
                  rows={4}
                  value={(m.glintIdeas || []).join('\n')}
                  onChange={e => {
                    const lines = e.target.value.split('\n').filter(l => l.trim());
                    handleFieldEdit(selectedDay, 'glintIdeas', lines.length ? lines : undefined);
                  }}
                />
              </div>
              <div className="admin-edit-row">
                <span className="admin-status-label">Cipher Words (comma-separated)</span>
                <input
                  className="admin-edit-field"
                  value={(m.cipherWords || []).join(', ')}
                  onChange={e => {
                    const words = e.target.value.split(',').map(w => w.trim().toUpperCase()).filter(Boolean);
                    handleFieldEdit(selectedDay, 'cipherWords', words.length ? words : undefined);
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {detail.trivia && (
                <div>
                  <span className="admin-status-label">Trivia ({detail.trivia.length} questions)</span>
                  {detail.trivia.map((t, i) => (
                    <div key={i} style={{ margin: '0.4rem 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                      <div>{t.q}</div>
                      <div style={{ color: 'rgba(100,210,140,0.8)', fontSize: '0.75rem' }}>Answer: {t.options[t.answer]}</div>
                    </div>
                  ))}
                </div>
              )}
              {m.glintIdeas && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="admin-status-label">Glint Ideas</span>
                  {m.glintIdeas.map((idea, i) => (
                    <div key={i} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', margin: '0.2rem 0' }}>{idea}</div>
                  ))}
                </div>
              )}
              {m.cipherWords && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="admin-status-label">Cipher Words</span>
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                    {m.cipherWords.map(w => (
                      <span key={w} className="admin-pill">{w}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Preview banner */}
          <div className="admin-preview-banner" style={{ marginTop: '1rem' }}>
            <span className="admin-status-label">Preview</span>
            <div style={{
              marginTop: '0.5rem',
              padding: '0.75rem 1rem',
              background: `linear-gradient(135deg, ${CATEGORIES[m.category]?.accentGlow || 'rgba(255,255,255,0.05)'}, transparent)`,
              borderRadius: '10px',
              border: `1px solid ${catColor}33`,
            }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>{m.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: catColor }}>{m.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                {m.greeting}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', alignItems: 'center' }}>
                <span className={`admin-game-tier admin-game-tier-${m.tier === 4 ? 3 : m.tier}`}>{TIER_NAMES[m.tier]}</span>
                <span style={{ fontSize: '0.72rem', color: catColor }}>{m.category}</span>
                {m.game && <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>+ {GAMES[m.game]?.name || m.game}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── GAMES TAB ──────────────────────────────────────────────────────────
function GamesTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState(null);
  const [expandedGame, setExpandedGame] = useState(null);
  const [showGame, setShowGame] = useState(null);

  // Build game list with holiday counts
  const gameList = useMemo(() => {
    const holidayCounts = {};
    for (const [, entry] of Object.entries(HOLIDAY_CALENDAR)) {
      if (entry.game) {
        holidayCounts[entry.game] = (holidayCounts[entry.game] || 0) + 1;
      }
    }

    return Object.entries(GAMES).map(([id, game]) => ({
      id,
      name: game.name,
      tier: game.tier,
      xp: game.xp,
      duration: game.duration,
      variant: game.variant || null,
      holidayCount: holidayCounts[id] || 0,
    })).sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.name.localeCompare(b.name);
    });
  }, []);

  // Stats
  const stats = useMemo(() => {
    const byTier = { 1: 0, 2: 0, 3: 0 };
    let bases = 0;
    let variants = 0;
    for (const g of gameList) {
      byTier[g.tier] = (byTier[g.tier] || 0) + 1;
      if (g.variant) variants++; else bases++;
    }
    return { total: gameList.length, bases, variants, byTier };
  }, [gameList]);

  // Category → game mapping
  const categoryMapping = useMemo(() => {
    const map = {};
    for (const [, entry] of Object.entries(HOLIDAY_CALENDAR)) {
      if (entry.game && entry.category) {
        if (!map[entry.category]) map[entry.category] = new Set();
        map[entry.category].add(entry.game);
      }
    }
    // Convert sets to arrays
    const result = {};
    for (const [cat, gameSet] of Object.entries(map)) {
      result[cat] = [...gameSet].map(id => GAMES[id]?.name || id);
    }
    return result;
  }, []);

  // Filter
  const filtered = useMemo(() => {
    let result = gameList;
    if (tierFilter) result = result.filter(g => g.tier === tierFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q));
    }
    return result;
  }, [gameList, tierFilter, searchQuery]);

  return (
    <>
      {/* Stats */}
      <section className="admin-section">
        <div className="admin-content-stats">
          <span className="admin-content-stat">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>total</span>
            <span>{stats.total}</span>
          </span>
          <span className="admin-content-stat">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>base</span>
            <span>{stats.bases}</span>
          </span>
          <span className="admin-content-stat">
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>variants</span>
            <span>{stats.variants}</span>
          </span>
          {[1, 2, 3].map(t => (
            <span key={t} className="admin-content-stat">
              <span className={`admin-game-tier admin-game-tier-${t}`}>T{t}</span>
              <span>{stats.byTier[t]}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="admin-section admin-glass">
        <h2>Game Registry</h2>
        <div className="admin-filters">
          <div className="admin-search">
            <Search size={16} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search games..." className="admin-input admin-search-input" />
          </div>
          <div className="admin-type-pills">
            <button className={`admin-pill ${!tierFilter ? 'admin-pill-active' : ''}`} onClick={() => setTierFilter(null)}>all</button>
            {[1, 2, 3].map(t => (
              <button key={t} className={`admin-pill ${tierFilter === t ? 'admin-pill-active' : ''}`} onClick={() => setTierFilter(tierFilter === t ? null : t)}>T{t}</button>
            ))}
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Tier</th>
                <th>XP</th>
                <th>Duration</th>
                <th>Variant</th>
                <th>Holidays</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} onClick={() => setExpandedGame(expandedGame === g.id ? null : g.id)} style={{ cursor: 'pointer' }}>
                  <td className="admin-td-title">{g.name}</td>
                  <td><span className={`admin-game-tier admin-game-tier-${g.tier}`}>T{g.tier}</span></td>
                  <td>{g.xp}</td>
                  <td>{g.duration}</td>
                  <td>{g.variant ? <span className="admin-game-variant">{g.variant}</span> : '--'}</td>
                  <td>{g.holidayCount > 0 ? g.holidayCount : <span style={{ opacity: 0.3 }}>0</span>}</td>
                  <td>
                    <button
                      className="admin-play-btn"
                      onClick={e => { e.stopPropagation(); setShowGame(g.id); }}
                      title={`Play ${g.name}`}
                    >
                      <Play size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Category → Game mapping */}
      <section className="admin-section admin-glass">
        <h2>Category Coverage</h2>
        <div className="admin-detail-grid-2col">
          {Object.entries(categoryMapping).sort(([a], [b]) => a.localeCompare(b)).map(([cat, games]) => (
            <div key={cat} style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: CATEGORIES[cat]?.accentPrimary || '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{cat}</span>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {games.map(name => (
                  <span key={name} className="admin-pill" style={{ fontSize: '0.72rem' }}>{name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GameLauncher overlay */}
      {showGame && (
        <Suspense fallback={null}>
          <GameLauncher
            gameId={showGame}
            holiday={{ name: 'Content Test', tier: 3, category: 'tech', emoji: '🎮' }}
            onClose={() => setShowGame(null)}
          />
        </Suspense>
      )}
    </>
  );
}
