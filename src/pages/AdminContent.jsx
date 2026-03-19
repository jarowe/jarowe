import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpDown, Search, Eye, EyeOff, Calendar, Gamepad2, Globe2, ChevronDown, ChevronUp, Pencil, Play, LayoutGrid, List, X, Plus, AlertTriangle, RotateCcw, Cloud, CloudOff, Check, ChevronLeft, ChevronRight, StickyNote, ExternalLink, MapPin, User, Folder, Lightbulb, Star, Music, Volume2 } from 'lucide-react';
import { resolveMediaUrl, getMediaType } from '../constellation/media/resolveMediaUrl';
import { TYPE_COLORS, THEME_COLORS } from '../constellation/ui/DetailPanel';
import AdminGate from '../components/AdminGate';
import { HOLIDAY_CALENDAR, CATEGORIES, TIER_NAMES } from '../data/holidayCalendar';
import { GAMES } from '../data/gameRegistry';
import { supabase } from '../lib/supabase';
import { useCurationSync } from '../hooks/useCurationSync';
import './Admin.css';

const GameLauncher = lazy(() => import('../components/GameLauncher'));

const TYPE_LABELS = ['milestone', 'project', 'moment', 'idea', 'place', 'person', 'track'];
const FLAG_TYPES = ['third-party-mention', 'trivial-content', 'media-only', 'low-quality', 'sensitive', 'needs-review'];
const VIS_OPTIONS = ['public', 'friends', 'private'];
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
  const [flagFilter, setFlagFilter] = useState(null);
  const [visFilter, setVisFilter] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [newFlagType, setNewFlagType] = useState(FLAG_TYPES[0]);
  const [newFlagNote, setNewFlagNote] = useState('');

  // Supabase curation state
  const [curationMap, setCurationMap] = useState(new Map()); // nodeId → curation row
  const [supabaseConnected, setSupabaseConnected] = useState(!!supabase);
  const [curationLoading, setCurationLoading] = useState(!!supabase);
  const { fetchAll, saveNodeImmediate, saveNode, deleteOverride, savingState } = useCurationSync();

  // Load curation data from Supabase (called on mount + retry)
  const loadCuration = useCallback(async () => {
    if (!supabase) { setSupabaseConnected(false); setCurationLoading(false); return; }
    setCurationLoading(true);
    try {
      const result = await fetchAll();
      if (result) {
        setCurationMap(result);
        setSupabaseConnected(true);
      } else {
        setSupabaseConnected(false);
      }
    } catch {
      setSupabaseConnected(false);
    } finally {
      setCurationLoading(false);
    }
  }, [fetchAll]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const base = import.meta.env.BASE_URL || '/';
        const graphRes = await fetch(`${base}data/constellation.graph.json`);
        if (graphRes.ok) setGraphData(await graphRes.json());
      } catch { /* ignore */ }
      // Always finish loading — don't let Supabase block the page
      setLoading(false);

      // Load curation from Supabase in background (non-blocking, no timeout)
      loadCuration();
    }
    load();
  }, [loadCuration]);

  const nodes = graphData?.nodes || [];

  // Get curation data for a node
  const getCuration = useCallback((nodeId) => {
    return curationMap.get(nodeId) || {};
  }, [curationMap]);

  // Effective visibility for a node
  const getNodeVis = useCallback((node) => {
    const cur = getCuration(node.id);
    return cur.visibility || node.visibility || 'public';
  }, [getCuration]);

  // Is node hidden?
  const isNodeHidden = useCallback((nodeId) => {
    return getCuration(nodeId).hidden === true;
  }, [getCuration]);

  // Get flags for a node
  const getNodeFlags = useCallback((nodeId) => {
    const cur = getCuration(nodeId);
    return cur.flags || [];
  }, [getCuration]);

  // Update local curation map + save to Supabase
  const updateCuration = useCallback((nodeId, updates, immediate = false) => {
    setCurationMap(prev => {
      const next = new Map(prev);
      const existing = next.get(nodeId) || { node_id: nodeId };
      next.set(nodeId, { ...existing, ...updates });
      return next;
    });
    if (immediate) {
      saveNodeImmediate(nodeId, updates);
    } else {
      saveNode(nodeId, updates);
    }
  }, [saveNode, saveNodeImmediate]);

  const toggleNodeHidden = useCallback((nodeId) => {
    const cur = getCuration(nodeId);
    const newHidden = !cur.hidden;
    updateCuration(nodeId, { hidden: newHidden }, true);
  }, [getCuration, updateCuration]);

  const changeNodeVis = useCallback((nodeId, vis) => {
    updateCuration(nodeId, { visibility: vis }, true);
  }, [updateCuration]);

  const addFlag = useCallback((nodeId, type, note) => {
    const cur = getCuration(nodeId);
    const existing = cur.flags || [];
    const today = new Date().toISOString().slice(0, 10);
    const newFlags = [...existing, { type, note, createdAt: today, source: 'manual' }];
    updateCuration(nodeId, { flags: newFlags }, true);
  }, [getCuration, updateCuration]);

  const removeFlag = useCallback((nodeId, index) => {
    const cur = getCuration(nodeId);
    const existing = [...(cur.flags || [])];
    existing.splice(index, 1);
    updateCuration(nodeId, { flags: existing }, true);
  }, [getCuration, updateCuration]);

  const handleResetNode = useCallback(async (nodeId) => {
    const ok = await deleteOverride(nodeId);
    if (ok) {
      setCurationMap(prev => {
        const next = new Map(prev);
        next.delete(nodeId);
        return next;
      });
    }
  }, [deleteOverride]);

  // Stats
  const { epochs, sources, typeCounts, flaggedCount, flagTypeCounts } = useMemo(() => {
    const epochSet = new Set();
    const sourceSet = new Set();
    const tc = {};
    let fc = 0;
    const ftc = {};
    for (const n of nodes) {
      if (n.epoch) epochSet.add(n.epoch);
      if (n.source) sourceSet.add(n.source);
      tc[n.type] = (tc[n.type] || 0) + 1;
      const flags = getNodeFlags(n.id);
      if (flags?.length) {
        fc++;
        for (const f of flags) ftc[f.type] = (ftc[f.type] || 0) + 1;
      }
    }
    return {
      epochs: [...epochSet].sort(),
      sources: [...sourceSet].sort(),
      typeCounts: tc,
      flaggedCount: fc,
      flagTypeCounts: ftc,
    };
  }, [nodes, getNodeFlags]);

  const filteredNodes = useMemo(() => {
    let result = [...nodes];

    if (typeFilter) result = result.filter(n => n.type === typeFilter);
    if (epochFilter) result = result.filter(n => n.epoch === epochFilter);
    if (sourceFilter) result = result.filter(n => n.source === sourceFilter);
    if (visFilter) result = result.filter(n => getNodeVis(n) === visFilter);

    if (flagFilter === 'flagged') result = result.filter(n => getNodeFlags(n.id)?.length);
    else if (flagFilter === 'unflagged') result = result.filter(n => !getNodeFlags(n.id)?.length);
    else if (flagFilter && FLAG_TYPES.includes(flagFilter)) result = result.filter(n => getNodeFlags(n.id)?.some(f => f.type === flagFilter));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.title?.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q));
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
  }, [nodes, typeFilter, epochFilter, sourceFilter, visFilter, flagFilter, searchQuery, sortKey, sortDir, getNodeFlags, getNodeVis]);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const edges = graphData?.edges || [];
  const detail = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  if (loading) return <div className="admin-loading">Loading constellation data...</div>;

  return (
    <>
      {/* Connection status */}
      {curationLoading && (
        <section className="admin-section">
          <div className="admin-curation-warning" style={{ borderColor: 'rgba(100,160,255,0.2)', background: 'rgba(100,160,255,0.06)' }}>
            <Cloud size={16} style={{ color: 'rgb(140,190,255)' }} />
            <span style={{ color: 'rgb(140,190,255)' }}>Connecting to Supabase...</span>
          </div>
        </section>
      )}
      {!supabaseConnected && !curationLoading && (
        <section className="admin-section">
          <div className="admin-curation-warning">
            <CloudOff size={16} />
            {supabase
              ? 'Supabase connection failed. Changes will not persist.'
              : <>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable live CMS.</>
            }
            {supabase && (
              <button
                onClick={loadCuration}
                style={{ marginLeft: '0.75rem', padding: '0.3rem 0.8rem', background: 'rgba(100,160,255,0.15)', color: 'rgb(140,190,255)', border: '1px solid rgba(100,160,255,0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Retry
              </button>
            )}
          </div>
        </section>
      )}

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
          {flaggedCount > 0 && (
            <span className="admin-content-stat">
              <AlertTriangle size={14} style={{ color: 'rgb(251,191,36)' }} />
              <span style={{ color: 'rgb(251,191,36)', fontWeight: 600 }}>{flaggedCount} flagged</span>
            </span>
          )}
          {supabaseConnected && (
            <span className="admin-content-stat">
              <Cloud size={14} style={{ color: 'rgb(100,210,140)' }} />
              <span style={{ color: 'rgb(100,210,140)', fontSize: '0.78rem' }}>Live</span>
            </span>
          )}
        </div>
      </section>

      <section className="admin-section admin-glass">
        <div className="admin-table-header">
          <h2>
            Nodes ({filteredNodes.length})
            {flaggedCount > 0 && <span className="admin-flag-count-badge">{flaggedCount}</span>}
          </h2>
        </div>

        {nodes.length === 0 ? (
          <div className="admin-empty">
            <p>No nodes found. Run <code>npm run pipeline</code> to generate data.</p>
          </div>
        ) : (
          <>
            <div className="admin-filters">
              <div className="admin-search">
                <Search size={16} />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search title or description..." className="admin-input admin-search-input" />
              </div>
              <div className="admin-type-pills">
                <button className={`admin-pill ${!typeFilter ? 'admin-pill-active' : ''}`} onClick={() => setTypeFilter(null)}>all</button>
                {TYPE_LABELS.map(t => (
                  <button key={t} className={`admin-pill ${typeFilter === t ? 'admin-pill-active' : ''}`} onClick={() => setTypeFilter(typeFilter === t ? null : t)}>{t}</button>
                ))}
              </div>
            </div>

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

            <div className="admin-filters" style={{ marginTop: '-0.25rem' }}>
              <div className="admin-type-pills">
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>Flags</span>
                <button className={`admin-pill ${!flagFilter ? 'admin-pill-active' : ''}`} onClick={() => setFlagFilter(null)}>all</button>
                <button className={`admin-pill ${flagFilter === 'flagged' ? 'admin-pill-active' : ''}`} onClick={() => setFlagFilter(flagFilter === 'flagged' ? null : 'flagged')}>flagged</button>
                <button className={`admin-pill ${flagFilter === 'unflagged' ? 'admin-pill-active' : ''}`} onClick={() => setFlagFilter(flagFilter === 'unflagged' ? null : 'unflagged')}>unflagged</button>
                {FLAG_TYPES.filter(t => flagTypeCounts[t]).map(t => (
                  <button key={t} className={`admin-pill ${flagFilter === t ? 'admin-pill-active' : ''}`} onClick={() => setFlagFilter(flagFilter === t ? null : t)}>
                    {t} ({flagTypeCounts[t]})
                  </button>
                ))}
              </div>
              <div className="admin-type-pills">
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.25rem' }}>Vis</span>
                <button className={`admin-pill ${!visFilter ? 'admin-pill-active' : ''}`} onClick={() => setVisFilter(null)}>all</button>
                {VIS_OPTIONS.map(v => (
                  <button key={v} className={`admin-pill ${visFilter === v ? 'admin-pill-active' : ''}`} onClick={() => setVisFilter(visFilter === v ? null : v)}>{v}</button>
                ))}
              </div>
            </div>

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
                    {supabaseConnected && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredNodes.map(node => {
                    const hidden = isNodeHidden(node.id);
                    const isFlagged = getNodeFlags(node.id)?.length > 0;
                    const vis = getNodeVis(node);
                    const saveState = savingState.get(node.id);
                    return (
                      <tr
                        key={node.id}
                        className={`admin-node-clickable ${hidden ? 'admin-row-hidden' : ''} ${isFlagged ? 'admin-node-row-flagged' : ''} ${selectedNode === node.id ? 'admin-node-selected' : ''}`}
                        onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                      >
                        <td className="admin-td-title" title={node.id}>{node.title || node.id}</td>
                        <td><span className={`admin-type-tag admin-type-${node.type}`}>{node.type}</span></td>
                        <td>{node.source}</td>
                        <td>{node.date || '--'}</td>
                        <td>{node.epoch || '--'}</td>
                        <td>{node.significance != null ? node.significance.toFixed(2) : '--'}</td>
                        <td><span className={`admin-vis-tag admin-vis-${vis}`}>{vis}</span></td>
                        <td>
                          <button
                            className={`admin-toggle ${hidden ? 'admin-toggle-off' : 'admin-toggle-on'}`}
                            onClick={e => { e.stopPropagation(); toggleNodeHidden(node.id); }}
                            title={hidden ? 'Hidden — click to publish' : 'Published — click to hide'}
                          >
                            {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </td>
                        {supabaseConnected && (
                          <td>
                            <span className={`admin-save-dot ${saveState === 'saving' ? 'admin-save-dot-saving' : saveState === 'saved' ? 'admin-save-dot-saved' : saveState === 'error' ? 'admin-save-dot-error' : ''}`} />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Node detail panel */}
      {detail && (
        <NodeDetailPanel
          node={detail}
          curation={getCuration(detail.id)}
          vis={getNodeVis(detail)}
          flags={getNodeFlags(detail.id)}
          saveState={savingState.get(detail.id)}
          supabaseConnected={supabaseConnected}
          onChangeVis={(vis) => changeNodeVis(detail.id, vis)}
          onToggleHidden={() => toggleNodeHidden(detail.id)}
          onAddFlag={(type, note) => addFlag(detail.id, type, note)}
          onRemoveFlag={(idx) => removeFlag(detail.id, idx)}
          onUpdateCuration={(updates, immediate) => updateCuration(detail.id, updates, immediate)}
          onReset={() => handleResetNode(detail.id)}
          onClose={() => setSelectedNode(null)}
          newFlagType={newFlagType}
          setNewFlagType={setNewFlagType}
          newFlagNote={newFlagNote}
          setNewFlagNote={setNewFlagNote}
          allNodes={nodes}
          allEdges={edges}
        />
      )}
    </>
  );
}

// ─── ADMIN AUDIO SECTION ────────────────────────────────────────────────

function AdminAudioSection({ node }) {
  const audioUrl = resolveMediaUrl(node.audio);
  const trackName = decodeURIComponent(node.audio.split('/').pop().replace(/\.mp3$/i, ''));
  const audioRef = useRef(null);
  const trackBarRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const draggingRef = useRef(null); // 'start' | 'in' | 'out' | null

  const initKey = `jarowe_audioInit_${node.id}`;
  const inKey = `jarowe_audioLoopIn_${node.id}`;
  const outKey = `jarowe_audioLoopOut_${node.id}`;

  const [startPt, setStartPt] = useState(() => {
    const s = localStorage.getItem(initKey);
    return s != null ? Number(s) : (node.audioStart || 0);
  });
  const [inPt, setInPt] = useState(() => {
    const s = localStorage.getItem(inKey);
    return s != null ? Number(s) : (node.audioLoopIn || 0);
  });
  const [outPt, setOutPt] = useState(() => {
    const s = localStorage.getItem(outKey);
    return s != null ? Number(s) : (node.audioLoopOut || 0);
  });

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const effectiveOut = outPt > inPt ? outPt : duration;
  const loopLen = effectiveOut - inPt;

  const saveStart = (v) => { const n = Math.max(0, Math.floor(v)); setStartPt(n); localStorage.setItem(initKey, n); node.audioStart = n; };
  const saveIn = (v) => { const n = Math.max(0, Math.floor(v)); setInPt(n); localStorage.setItem(inKey, n); node.audioLoopIn = n; };
  const saveOut = (v) => { const n = Math.max(0, Math.floor(v)); setOutPt(n); localStorage.setItem(outKey, n); node.audioLoopOut = n; };

  // Loop: when playback passes outPt, jump to inPt
  const handleTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setCurrentTime(a.currentTime);
    const end = outPt > inPt ? outPt : 0;
    if (end > 0 && a.currentTime >= end) {
      a.currentTime = inPt;
    }
  }, [inPt, outPt]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.currentTime = startPt; a.play().catch(() => {}); }
  };

  // Drag handlers
  const pctFromEvent = useCallback((e) => {
    const bar = trackBarRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, [duration]);

  const onPointerDown = useCallback((which, e) => {
    e.preventDefault();
    draggingRef.current = which;
    const onMove = (ev) => {
      const sec = pctFromEvent(ev) * duration;
      if (draggingRef.current === 'start') saveStart(sec);
      else if (draggingRef.current === 'in') saveIn(Math.min(sec, (outPt || duration) - 1));
      else saveOut(Math.max(sec, inPt + 1));
    };
    const onUp = () => {
      draggingRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [duration, startPt, inPt, outPt, pctFromEvent]);

  const seekBar = (e) => {
    if (draggingRef.current) return;
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = pctFromEvent(e) * duration;
  };

  const startPct = duration ? (startPt / duration) * 100 : 0;
  const inPct = duration ? (inPt / duration) * 100 : 0;
  const outPct = duration ? ((outPt > inPt ? outPt : duration) / duration) * 100 : 100;
  const playPct = duration ? (currentTime / duration) * 100 : 0;

  const TimeInput = ({ label, value, onChange, color }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.05)', borderRadius: 6, border: `1px solid ${color}33`, overflow: 'hidden' }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} style={{ width: 22, height: 26, border: 'none', background: 'transparent', color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronDown size={12} />
        </button>
        <input
          type="number" min="0" step="1" value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
          style={{ width: 38, background: 'transparent', border: 'none', borderLeft: `1px solid ${color}22`, borderRight: `1px solid ${color}22`, color: '#fff', padding: '0.15rem 0', fontSize: '0.75rem', textAlign: 'center' }}
        />
        <button onClick={() => onChange(value + 1)} style={{ width: 22, height: 26, border: 'none', background: 'transparent', color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronUp size={12} />
        </button>
      </div>
      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{fmt(value)}</span>
    </div>
  );

  const SetBtn = ({ label, color, onClick }) => (
    <button onClick={onClick} style={{ fontSize: '0.62rem', color, background: `${color}14`, border: `1px solid ${color}28`, borderRadius: 4, padding: '0.15rem 0.35rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {label}
    </button>
  );

  return (
    <>
      <h4><Music size={12} style={{ verticalAlign: '-1px', marginRight: '0.3rem' }} />Audio Track</h4>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.85rem', marginBottom: '0.75rem' }}>
        {/* Track name + play */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.7rem' }}>
          <button
            onClick={togglePlay}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(100,160,255,0.25)', background: playing ? 'rgba(100,160,255,0.2)' : 'rgba(255,255,255,0.04)', color: 'rgb(140,190,255)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
          >
            {playing ? <span style={{ fontSize: 12 }}>⏸</span> : <Play size={14} style={{ marginLeft: 2 }} />}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trackName}</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
              {fmt(currentTime)} / {fmt(duration)}
              {loopLen > 0 && loopLen < duration ? ` · loop ${fmt(loopLen)}` : ''}
              {startPt > 0 ? ` · starts ${fmt(startPt)}` : ''}
            </div>
          </div>
        </div>

        {/* IG-style trim bar */}
        <div style={{ position: 'relative', marginBottom: '0.7rem' }}>
          <div
            ref={trackBarRef}
            onClick={seekBar}
            style={{ position: 'relative', height: 38, background: 'rgba(255,255,255,0.04)', borderRadius: 6, cursor: 'pointer', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Dimmed regions outside loop selection */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: `${inPct}%`, height: '100%', background: 'rgba(0,0,0,0.45)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: `${100 - outPct}%`, height: '100%', background: 'rgba(0,0,0,0.45)', pointerEvents: 'none' }} />

            {/* Loop region highlight */}
            <div style={{ position: 'absolute', top: 0, left: `${inPct}%`, width: `${outPct - inPct}%`, height: '100%', background: 'rgba(100,160,255,0.06)', borderTop: '2px solid rgba(100,160,255,0.25)', borderBottom: '2px solid rgba(100,160,255,0.25)', pointerEvents: 'none' }} />

            {/* Playhead */}
            <div style={{ position: 'absolute', top: 0, left: `${playPct}%`, width: 2, height: '100%', background: '#fff', opacity: 0.8, pointerEvents: 'none', transition: 'left 0.15s linear' }} />

            {/* Start handle (yellow/amber triangle) */}
            <div
              onPointerDown={(e) => onPointerDown('start', e)}
              style={{ position: 'absolute', top: 0, left: `${startPct}%`, transform: 'translateX(-50%)', width: 16, height: '100%', cursor: 'ew-resize', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid rgb(250,190,80)', filter: 'drop-shadow(0 0 4px rgba(250,190,80,0.5))' }} />
            </div>

            {/* In handle (green bar) */}
            <div
              onPointerDown={(e) => onPointerDown('in', e)}
              style={{ position: 'absolute', top: 0, left: `${inPct}%`, transform: 'translateX(-50%)', width: 14, height: '100%', cursor: 'ew-resize', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div style={{ width: 4, height: 22, borderRadius: 2, background: 'rgb(52,211,153)', boxShadow: '0 0 6px rgba(52,211,153,0.4)' }} />
            </div>

            {/* Out handle (red bar) */}
            <div
              onPointerDown={(e) => onPointerDown('out', e)}
              style={{ position: 'absolute', top: 0, left: `${outPct}%`, transform: 'translateX(-50%)', width: 14, height: '100%', cursor: 'ew-resize', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div style={{ width: 4, height: 22, borderRadius: 2, background: 'rgb(248,113,113)', boxShadow: '0 0 6px rgba(248,113,113,0.4)' }} />
            </div>
          </div>
        </div>

        {/* Three-point controls */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.25rem' }}>
          <TimeInput label="Start" value={startPt} onChange={saveStart} color="rgb(250,190,80)" />
          <TimeInput label="Loop In" value={inPt} onChange={saveIn} color="rgb(52,211,153)" />

          {/* Center: set-to-current buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, paddingTop: 14 }}>
            <SetBtn label="Set Start" color="rgb(250,190,80)" onClick={() => { if (audioRef.current) saveStart(Math.floor(audioRef.current.currentTime)); }} />
            <SetBtn label="Set In" color="rgb(52,211,153)" onClick={() => { if (audioRef.current) saveIn(Math.floor(audioRef.current.currentTime)); }} />
            <SetBtn label="Set Out" color="rgb(248,113,113)" onClick={() => { if (audioRef.current) saveOut(Math.floor(audioRef.current.currentTime)); }} />
            {(startPt > 0 || outPt > 0 || inPt > 0) && (
              <button
                onClick={() => { saveStart(0); saveIn(0); saveOut(0); }}
                style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 1 }}
              >
                Reset all
              </button>
            )}
          </div>

          <TimeInput label="Loop Out" value={outPt || Math.floor(duration)} onChange={saveOut} color="rgb(248,113,113)" />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '0.6rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
          <span><span style={{ display: 'inline-block', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid rgb(250,190,80)', verticalAlign: 'middle', marginRight: 3 }} />Start</span>
          <span><span style={{ display: 'inline-block', width: 3, height: 8, borderRadius: 1, background: 'rgb(52,211,153)', verticalAlign: 'middle', marginRight: 3 }} />Loop In</span>
          <span><span style={{ display: 'inline-block', width: 3, height: 8, borderRadius: 1, background: 'rgb(248,113,113)', verticalAlign: 'middle', marginRight: 3 }} />Loop Out</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); if (audioRef.current) { audioRef.current.currentTime = inPt; audioRef.current.play().catch(() => {}); } }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        style={{ display: 'none' }}
      />
    </>
  );
}

// ─── NODE DETAIL PANEL ──────────────────────────────────────────────────

const ENTITY_GROUPS = [
  { key: 'people', label: 'People' },
  { key: 'places', label: 'Places' },
  { key: 'tags', label: 'Tags' },
  { key: 'projects', label: 'Projects' },
  { key: 'clients', label: 'Clients' },
];

const CONNECTION_TYPE_COLORS = {
  temporal: '#60a5fa',
  entity: '#a78bfa',
  thematic: '#34d399',
  causal: '#fbbf24',
  collaborative: '#f472b6',
  geographic: '#fb923c',
};

const EVIDENCE_ICON_MAP = {
  temporal: Calendar,
  place: MapPin,
  person: User,
  project: Folder,
  idea: Lightbulb,
};

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

function NodeDetailPanel({ node, curation, vis, flags, saveState, supabaseConnected, onChangeVis, onToggleHidden, onAddFlag, onRemoveFlag, onUpdateCuration, onReset, onClose, newFlagType, setNewFlagType, newFlagNote, setNewFlagNote, allNodes, allEdges }) {
  const media = node.media || [];
  const entities = node.entities || {};

  // Preview vs Edit mode
  const [previewMode, setPreviewMode] = useState(false);

  // Grouped entities
  const entityGroups = useMemo(() => {
    const groups = [];
    let total = 0;
    for (const g of ENTITY_GROUPS) {
      const items = entities[g.key] || [];
      if (items.length > 0) {
        groups.push({ ...g, items });
        total += items.length;
      }
    }
    return { groups, total };
  }, [entities]);

  // Lightbox state
  const [lightboxIdx, setLightboxIdx] = useState(null);

  // Connections accordion
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [showAllConnections, setShowAllConnections] = useState(false);

  // Admin notes
  const [notesVal, setNotesVal] = useState(curation.admin_notes || '');
  const notesTimerRef = useRef(null);

  // Inline edit state
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleVal, setTitleVal] = useState(curation.title_override || '');
  const [descVal, setDescVal] = useState(curation.description_override || '');
  const [sigVal, setSigVal] = useState(curation.significance_override ?? node.significance ?? 0.5);
  const titleRef = useRef(null);
  const descRef = useRef(null);

  // Connections data
  const connectionGroups = useMemo(() => {
    if (!allEdges?.length || !allNodes?.length) return [];
    const connectedEdges = allEdges.filter(e => e.source === node.id || e.target === node.id);
    const groupMap = new Map();
    for (const edge of connectedEdges) {
      const otherId = edge.source === node.id ? edge.target : edge.source;
      const otherNode = allNodes.find(n => n.id === otherId);
      if (!otherNode) continue;
      if (!groupMap.has(otherId)) {
        groupMap.set(otherId, { nodeId: otherId, nodeTitle: otherNode.title, nodeType: otherNode.type, evidence: [] });
      }
      const group = groupMap.get(otherId);
      for (const ev of (edge.evidence || [])) {
        group.evidence.push({ ...ev, weight: edge.weight });
      }
    }
    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => {
      const avgA = a.evidence.reduce((s, e) => s + (e.weight || 0), 0) / (a.evidence.length || 1);
      const avgB = b.evidence.reduce((s, e) => s + (e.weight || 0), 0) / (b.evidence.length || 1);
      return avgB - avgA;
    });
    return groups;
  }, [node.id, allEdges, allNodes]);

  // Sync local state when curation changes (e.g. different node selected)
  useEffect(() => {
    setTitleVal(curation.title_override || '');
    setDescVal(curation.description_override || '');
    setSigVal(curation.significance_override ?? node.significance ?? 0.5);
    setNotesVal(curation.admin_notes || '');
    setEditingTitle(false);
    setEditingDesc(false);
    setLightboxIdx(null);
    setConnectionsOpen(false);
    setShowAllConnections(false);
    setPreviewMode(false);
  }, [node.id, curation]);

  // Keyboard navigation: Escape closes drawer (or lightbox if open)
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        if (lightboxIdx !== null) setLightboxIdx(null);
        else onClose();
      }
      if (lightboxIdx !== null) {
        if (e.key === 'ArrowRight') setLightboxIdx(i => (i + 1) % media.length);
        else if (e.key === 'ArrowLeft') setLightboxIdx(i => (i - 1 + media.length) % media.length);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIdx, media.length, onClose]);

  function handleTitleSave() {
    setEditingTitle(false);
    const val = titleVal.trim();
    onUpdateCuration({ title_override: val || null }, true);
  }

  function handleDescSave() {
    setEditingDesc(false);
    const val = descVal.trim();
    onUpdateCuration({ description_override: val || null }, true);
  }

  function handleSigChange(val) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setSigVal(num);
    onUpdateCuration({ significance_override: num }, false);
  }

  function handleNotesChange(val) {
    setNotesVal(val);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      onUpdateCuration({ admin_notes: val.trim() || null }, false);
    }, 800);
  }

  function handleAddFlag() {
    if (!newFlagType) return;
    onAddFlag(newFlagType, newFlagNote.trim());
    setNewFlagNote('');
  }

  const hasOverrides = curation.node_id != null;
  const visibleConnections = showAllConnections ? connectionGroups : connectionGroups.slice(0, 8);

  // Effective title and description (with overrides applied)
  const effectiveTitle = curation.title_override || node.title || node.id;
  const effectiveDesc = curation.description_override || node.description || '';
  const typeStyle = TYPE_COLORS[node.type] || TYPE_COLORS.moment;
  const themeColor = node.theme ? THEME_COLORS[node.theme] : null;

  return (
    <div className="admin-detail-drawer-backdrop" onClick={onClose}>
    <div className="admin-detail-drawer" onClick={e => e.stopPropagation()}>
      <button className="admin-drawer-close" onClick={onClose} title="Close (Esc)"><X size={20} /></button>
      <div className="admin-node-detail-header">
        <div>
          {editingTitle && !previewMode ? (
            <input
              ref={titleRef}
              className="admin-inline-edit admin-inline-edit-title"
              value={titleVal}
              placeholder={node.title || node.id}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(curation.title_override || ''); } }}
              autoFocus
            />
          ) : (
            <h3
              className="admin-node-title-editable"
              onClick={() => { if (supabaseConnected && !previewMode) { setEditingTitle(true); setTitleVal(curation.title_override || node.title || ''); } }}
              title={supabaseConnected ? 'Click to edit title' : node.title}
            >
              {effectiveTitle}
              {supabaseConnected && !previewMode && <Pencil size={12} className="admin-inline-edit-icon" />}
            </h3>
          )}
          <div className="admin-node-detail-badges">
            <span className={`admin-type-tag admin-type-${node.type}`}>{node.type}</span>
            <span className="admin-pill" style={{ fontSize: '0.7rem' }}>{node.source}</span>
            {node.date && <span className="admin-pill" style={{ fontSize: '0.7rem' }}>{node.date}</span>}
            {node.epoch && <span className="admin-pill" style={{ fontSize: '0.7rem' }}>{node.epoch}</span>}
            {saveState && (
              <span className={`admin-save-status admin-save-status-${saveState}`}>
                {saveState === 'saving' && 'Saving...'}
                {saveState === 'saved' && <><Check size={12} /> Saved</>}
                {saveState === 'error' && 'Error'}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <button
            className={`admin-btn ${previewMode ? 'admin-btn-primary' : ''}`}
            style={previewMode ? {} : { background: 'rgba(100,160,255,0.1)', color: 'rgb(140,190,255)', border: '1px solid rgba(100,160,255,0.2)', fontSize: '0.78rem' }}
            onClick={() => setPreviewMode(!previewMode)}
            title={previewMode ? 'Back to edit mode' : 'Preview as visitors see it'}
          >
            <ExternalLink size={14} /> {previewMode ? 'Edit' : 'Preview'}
          </button>
          {hasOverrides && supabaseConnected && !previewMode && (
            <button
              className="admin-btn"
              style={{ background: 'rgba(255,150,80,0.1)', color: 'rgb(255,170,110)', border: '1px solid rgba(255,150,80,0.2)', fontSize: '0.78rem' }}
              onClick={onReset}
              title="Remove all overrides and revert to pipeline defaults"
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ─── PREVIEW MODE ─── */}
      {previewMode ? (
        <div className="admin-preview-visitor">
          {/* Mirrors the public StoryPanel layout */}
          <div className="admin-preview-visitor-inner">
            {/* Hero media */}
            {media.length > 0 && (() => {
              const raw = typeof media[0] === 'string' ? media[0] : media[0].url;
              const url = resolveMediaUrl(raw);
              const type = getMediaType(raw);
              return (
                <div style={{ position: 'relative', width: '100%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '50vh', overflow: 'hidden', borderRadius: '6px 6px 0 0' }}>
                  {type === 'video' ? (
                    <video src={url} controls muted playsInline preload="auto" style={{ width: '100%', maxHeight: '50vh', objectFit: 'contain' }} />
                  ) : (
                    <img src={url} alt="" style={{ width: '100%', maxHeight: '50vh', objectFit: 'contain' }} loading="eager" onClick={() => setLightboxIdx(0)} />
                  )}
                </div>
              );
            })()}

            {/* Audio bar */}
            {node.audio && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                <Music size={14} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {decodeURIComponent(node.audio.split('/').pop().replace(/\.mp3$/i, ''))}
                </span>
                <Volume2 size={14} />
              </div>
            )}

            {/* Header */}
            <div className="admin-pv-header">
              <div className="admin-pv-meta">
                <span className="admin-pv-badge" style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}>{node.type}</span>
                {themeColor && (
                  <span className="admin-pv-badge" style={{ backgroundColor: `${themeColor}22`, color: themeColor }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: themeColor, marginRight: 4 }} />
                    {node.theme}
                  </span>
                )}
                {node.source && <span className="admin-pv-badge" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{node.source}</span>}
                {node.date && <span className="admin-pv-date">{formatDate(node.date)}</span>}
              </div>
              <h2 className="admin-pv-title">{effectiveTitle}</h2>
              {node.epoch && <span className="admin-pv-epoch">{node.epoch}</span>}
            </div>

            {/* Description */}
            <div className="admin-pv-section">
              <p className="admin-pv-description">{effectiveDesc || <span style={{ opacity: 0.3, fontStyle: 'italic' }}>No description</span>}</p>
            </div>

            {/* Media gallery (rest of images) */}
            {media.length > 1 && (
              <div className="admin-pv-section">
                <h3 className="admin-pv-section-title">Gallery</h3>
                <div className="admin-pv-media-grid">
                  {media.slice(1).map((m, i) => {
                    const raw = typeof m === 'string' ? m : m.url;
                    const url = resolveMediaUrl(raw);
                    const type = getMediaType(raw);
                    return (
                      <button key={i} className="admin-pv-media-thumb" onClick={() => setLightboxIdx(i + 1)}>
                        {type === 'video' ? (
                          <video src={url} muted playsInline preload="metadata" />
                        ) : (
                          <img src={url} alt="" loading="lazy" onError={e => { e.target.closest('.admin-pv-media-thumb').style.display = 'none'; }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Entity chips */}
            {entityGroups.total > 0 && (
              <div className="admin-pv-section">
                <h3 className="admin-pv-section-title">Connected</h3>
                <div className="admin-pv-chips">
                  {entityGroups.groups.flatMap(g => g.items.map((item, i) => {
                    const chipTypeStyle = TYPE_COLORS[g.key === 'people' ? 'person' : g.key === 'places' ? 'place' : g.key === 'projects' ? 'project' : 'idea'] || TYPE_COLORS.idea;
                    return (
                      <span key={`${g.key}-${i}`} className="admin-pv-chip" style={{ backgroundColor: chipTypeStyle.bg, color: chipTypeStyle.text }}>
                        {item}
                      </span>
                    );
                  }))}
                </div>
              </div>
            )}

            {/* Because section */}
            {connectionGroups.length > 0 && (
              <div className="admin-pv-section">
                <button className="admin-pv-because-toggle" onClick={() => setConnectionsOpen(!connectionsOpen)}>
                  <span>Because... <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>({connectionGroups.length})</span></span>
                  {connectionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {connectionsOpen && (
                  <div className="admin-pv-because-content">
                    {visibleConnections.map(cg => {
                      const connStyle = TYPE_COLORS[cg.nodeType] || TYPE_COLORS.moment;
                      return (
                        <div key={cg.nodeId} className="admin-pv-conn-group">
                          <div className="admin-pv-conn-title" style={{ color: connStyle.text }}>
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: connStyle.text, flexShrink: 0 }} />
                            {cg.nodeTitle}
                          </div>
                          {cg.evidence.map((ev, j) => {
                            const EvIcon = EVIDENCE_ICON_MAP[ev.type] || Star;
                            return (
                              <div key={j} className="admin-pv-evidence">
                                <span className="admin-pv-evidence-icon"><EvIcon size={12} /></span>
                                <span className="admin-pv-evidence-desc">{ev.description || ''}</span>
                                {ev.weight != null && (
                                  <span className="admin-pv-evidence-weight">
                                    <span className="admin-pv-evidence-weight-bar" style={{ width: `${Math.round(ev.weight * 100)}%` }} />
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    {connectionGroups.length > 8 && !showAllConnections && (
                      <button className="admin-pv-show-more" onClick={() => setShowAllConnections(true)}>
                        Show {connectionGroups.length - 8} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Status bar */}
            <div className="admin-pv-status">
              <span className={`admin-vis-tag admin-vis-${vis}`}>{vis}</span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                sig: {(curation.significance_override ?? node.significance ?? 0).toFixed(2)}
              </span>
              {curation.hidden && <span style={{ fontSize: '0.72rem', color: 'rgb(248,113,113)' }}>HIDDEN</span>}
              {flags.length > 0 && <span style={{ fontSize: '0.72rem', color: 'rgb(251,191,36)' }}>{flags.length} flag{flags.length !== 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>
      ) : (
      /* ─── EDIT MODE ─── */
      <div className="admin-node-detail-body">
        {/* Left column */}
        <div className="admin-node-detail-section">
          {/* Full media grid with lightbox */}
          {media.length > 0 && (
            <>
              <h4>Media ({media.length})</h4>
              <div className="admin-node-media-grid admin-node-media-grid-full">
                {media.map((m, i) => {
                  const raw = typeof m === 'string' ? m : m.url;
                  const url = resolveMediaUrl(raw);
                  const type = getMediaType(raw);
                  return (
                    <div key={i} className="admin-media-thumb-wrap" onClick={() => setLightboxIdx(i)}>
                      {type === 'video' ? (
                        <>
                          <video src={url} className="admin-node-media-thumb" preload="metadata" muted />
                          <div className="admin-media-play-badge"><Play size={14} /></div>
                        </>
                      ) : (
                        <img src={url} alt="" className="admin-node-media-thumb" loading="lazy" onError={e => { e.target.style.opacity = '0.2'; }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Description */}
          <h4>Description</h4>
          {editingDesc ? (
            <textarea
              ref={descRef}
              className="admin-inline-edit admin-inline-edit-desc"
              value={descVal}
              placeholder={node.description || 'Add description...'}
              onChange={e => setDescVal(e.target.value)}
              onBlur={handleDescSave}
              rows={4}
              autoFocus
            />
          ) : (
            <div
              className={`admin-node-description ${supabaseConnected ? 'admin-node-description-editable' : ''}`}
              onClick={() => { if (supabaseConnected) { setEditingDesc(true); setDescVal(curation.description_override || node.description || ''); } }}
              title={supabaseConnected ? 'Click to edit description' : undefined}
            >
              {curation.description_override || node.description || <span style={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No description</span>}
            </div>
          )}

          {/* Admin Notes */}
          {supabaseConnected && (
            <>
              <h4>
                <StickyNote size={12} style={{ verticalAlign: '-1px', marginRight: '0.3rem' }} />
                Admin Notes
                {notesVal.trim() && <span className="admin-notes-dot" />}
              </h4>
              <textarea
                className="admin-notes-textarea"
                value={notesVal}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="Internal notes: what needs fixing, context, editorial reminders..."
                rows={3}
              />
            </>
          )}

          {/* Audio / Music */}
          {node.audio && <AdminAudioSection node={node} />}

          {/* Grouped Entities */}
          {entityGroups.total > 0 && (
            <>
              <h4>Entities ({entityGroups.total})</h4>
              {entityGroups.groups.map(g => (
                <div key={g.key} className="admin-entity-group">
                  <span className="admin-entity-group-label">{g.label} ({g.items.length})</span>
                  <div className="admin-entity-pills">
                    {g.items.map((item, i) => (
                      <span key={i} className={`admin-entity-pill admin-entity-${g.key}`}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Right column */}
        <div className="admin-node-detail-section">
          {/* Significance override */}
          {supabaseConnected && (
            <>
              <h4>Significance Override</h4>
              <div className="admin-sig-control">
                <input type="range" min="0" max="1" step="0.01" value={sigVal} onChange={e => handleSigChange(e.target.value)} className="admin-sig-slider" />
                <input type="number" min="0" max="1" step="0.05" value={sigVal} onChange={e => handleSigChange(e.target.value)} className="admin-sig-input" />
                <span className="admin-sig-original" title="Pipeline value">orig: {node.significance?.toFixed(2) ?? '--'}</span>
              </div>
            </>
          )}

          {/* Visibility control */}
          <h4>Visibility</h4>
          <select className="admin-vis-select" value={vis} onChange={e => onChangeVis(e.target.value)}>
            {VIS_OPTIONS.map(v => (<option key={v} value={v}>{v}</option>))}
          </select>

          {/* Hidden toggle */}
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className={`admin-toggle ${curation.hidden ? 'admin-toggle-off' : 'admin-toggle-on'}`} onClick={onToggleHidden}>
              {curation.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
              {curation.hidden ? 'Hidden from visitors' : 'Published'}
            </span>
          </div>

          {/* Flags */}
          <h4 style={{ marginTop: '0.75rem' }}>
            Flags {flags.length > 0 && <span className="admin-flag-count-badge">{flags.length}</span>}
          </h4>
          {flags.length > 0 && (
            <div className="admin-flag-list">
              {flags.map((f, i) => (
                <div key={i} className="admin-flag-entry">
                  <span className="admin-flag-badge">{f.type}</span>
                  <span className="admin-flag-note" title={f.note}>{f.note || '\u2014'}</span>
                  <span className="admin-flag-date">{f.createdAt}</span>
                  <span className="admin-flag-source">{f.source}</span>
                  <button className="admin-flag-remove" onClick={() => onRemoveFlag(i)} title="Remove flag"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Add flag */}
          <div className="admin-flag-add">
            <select value={newFlagType} onChange={e => setNewFlagType(e.target.value)}>
              {FLAG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <textarea value={newFlagNote} onChange={e => setNewFlagNote(e.target.value)} placeholder="Note (optional)" rows={1} />
            <button onClick={handleAddFlag}><Plus size={12} /> Flag</button>
          </div>

          {/* Connections accordion */}
          {connectionGroups.length > 0 && (
            <>
              <button className="admin-connections-toggle" onClick={() => setConnectionsOpen(!connectionsOpen)}>
                {connectionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Because... ({connectionGroups.length} connection{connectionGroups.length !== 1 ? 's' : ''})
              </button>
              {connectionsOpen && (
                <div className="admin-connections-list">
                  {visibleConnections.map(cg => (
                    <div key={cg.nodeId} className="admin-connection-group">
                      <div className="admin-connection-header">
                        <span className="admin-connection-type-dot" style={{ background: CONNECTION_TYPE_COLORS[cg.evidence[0]?.type] || '#888' }} />
                        <span className={`admin-type-tag admin-type-${cg.nodeType}`} style={{ fontSize: '0.6rem', padding: '0.1em 0.35em' }}>{cg.nodeType}</span>
                        <span className="admin-connection-title">{cg.nodeTitle}</span>
                      </div>
                      {cg.evidence.map((ev, i) => (
                        <div key={i} className="admin-connection-evidence">
                          <span className="admin-evidence-signal">{ev.signal || ev.type}</span>
                          <span className="admin-evidence-desc">{ev.description || ''}</span>
                          <div className="admin-evidence-weight-bar">
                            <div className="admin-evidence-weight-fill" style={{ width: `${(ev.weight || 0) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {connectionGroups.length > 8 && !showAllConnections && (
                    <button className="admin-connections-show-more" onClick={() => setShowAllConnections(true)}>
                      Show {connectionGroups.length - 8} more
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}

      {/* Lightbox overlay */}
      {lightboxIdx !== null && media[lightboxIdx] && (
        <div className="admin-lightbox-overlay" onClick={() => setLightboxIdx(null)}>
          <div className="admin-lightbox-content" onClick={e => e.stopPropagation()}>
            <div className="admin-lightbox-counter">{lightboxIdx + 1} / {media.length}</div>
            <button className="admin-lightbox-close" onClick={() => setLightboxIdx(null)}><X size={20} /></button>
            {media.length > 1 && (
              <>
                <button className="admin-lightbox-arrow admin-lightbox-prev" onClick={() => setLightboxIdx((lightboxIdx - 1 + media.length) % media.length)}><ChevronLeft size={28} /></button>
                <button className="admin-lightbox-arrow admin-lightbox-next" onClick={() => setLightboxIdx((lightboxIdx + 1) % media.length)}><ChevronRight size={28} /></button>
              </>
            )}
            {(() => {
              const raw = typeof media[lightboxIdx] === 'string' ? media[lightboxIdx] : media[lightboxIdx].url;
              return getMediaType(raw) === 'video' ? (
                <video src={resolveMediaUrl(raw)} className="admin-lightbox-media" controls autoPlay />
              ) : (
                <img src={resolveMediaUrl(raw)} alt="" className="admin-lightbox-media" />
              );
            })()}
          </div>
        </div>
      )}
    </div>
    </div>
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
  const [viewMode, setViewMode] = useState('grid'); // grid | preview

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
          {/* View toggle */}
          <div className="admin-type-pills" style={{ marginLeft: 'auto' }}>
            <button className={`admin-pill ${viewMode === 'grid' ? 'admin-pill-active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view"><LayoutGrid size={14} /></button>
            <button className={`admin-pill ${viewMode === 'preview' ? 'admin-pill-active' : ''}`} onClick={() => setViewMode('preview')} title="Banner preview"><List size={14} /></button>
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

        {viewMode === 'grid' ? (
          <>
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
          </>
        ) : (
          /* Banner preview mode */
          <div className="admin-preview-list">
            {Object.keys(byMonth).sort((a, b) => a - b).map(month => (
              <div key={month} className="admin-holiday-month">
                <h3 className="admin-holiday-month-title">{MONTHS[month - 1]}</h3>
                {byMonth[month].sort((a, b) => a.day - b.day).map(entry => {
                  const m = getMerged(entry);
                  const cat = CATEGORIES[m.category] || {};
                  const gameInfo = m.game ? GAMES[m.game] : null;
                  return (
                    <div
                      key={entry.key}
                      className={`admin-preview-card admin-preview-card-t${m.tier}`}
                      style={{
                        '--hb-primary': cat.accentPrimary || '#7c3aed',
                        '--hb-secondary': cat.accentSecondary || '#06b6d4',
                        '--hb-glow': cat.accentGlow || 'rgba(124,58,237,0.2)',
                      }}
                      onClick={() => { setSelectedDay(entry.key); setViewMode('grid'); }}
                    >
                      {/* T1: toast strip */}
                      {m.tier === 1 && (
                        <div className="admin-preview-t1">
                          <span className="admin-preview-emoji">{m.emoji}</span>
                          <div className="admin-preview-t1-body">
                            <span className="admin-preview-date">{entry.key}</span>
                            <span className="admin-preview-name" style={{ color: cat.accentPrimary }}>{m.name}</span>
                            <span className="admin-preview-greeting">{m.greeting}</span>
                          </div>
                          {gameInfo && <span className="admin-preview-game-tag">🎮 {gameInfo.name}</span>}
                        </div>
                      )}
                      {/* T2: glass panel */}
                      {m.tier === 2 && (
                        <div className="admin-preview-t2">
                          <span className="admin-preview-emoji-hero">{m.emoji}</span>
                          <div className="admin-preview-t2-body">
                            <span className="admin-preview-date">{entry.key}</span>
                            <span className="admin-preview-name" style={{ color: cat.accentPrimary }}>{m.name}</span>
                            <span className="admin-preview-greeting">{m.greeting}</span>
                            <div className="admin-preview-footer">
                              <span className="admin-preview-cat-tag" style={{ color: cat.accentPrimary, borderColor: `${cat.accentPrimary}33` }}>{m.emoji} {m.category}</span>
                              {gameInfo && <span className="admin-preview-game-tag">🎮 {gameInfo.name}</span>}
                            </div>
                          </div>
                        </div>
                      )}
                      {/* T3+: celebration */}
                      {m.tier >= 3 && (
                        <div className="admin-preview-t3">
                          <span className="admin-preview-emoji-large">{m.emoji}</span>
                          <span className="admin-preview-date">{entry.key}</span>
                          <span className="admin-preview-name admin-preview-name-t3" style={{
                            background: `linear-gradient(90deg, ${cat.accentPrimary || '#7c3aed'}, ${cat.accentSecondary || '#06b6d4'})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}>{m.name}</span>
                          <span className="admin-preview-greeting">{m.greeting}</span>
                          <div className="admin-preview-footer" style={{ justifyContent: 'center' }}>
                            {gameInfo && <span className="admin-preview-game-tag admin-preview-game-cta" style={{
                              background: `linear-gradient(135deg, ${cat.accentPrimary}, ${cat.accentSecondary})`,
                            }}>🎮 {gameInfo.name}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

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
