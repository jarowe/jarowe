import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Download, ArrowUpDown, Search, Gamepad2, Settings, Globe2, Sparkles, Users, FileText } from 'lucide-react';
import AdminGate from '../components/AdminGate';
import './Admin.css';

const TYPE_LABELS = ['milestone', 'project', 'moment', 'idea', 'place', 'person', 'track'];

const DASHBOARD_CARDS = [
  { to: '/admin/games', icon: Gamepad2, label: 'Game Lab', desc: 'Test all 64 games', color: '#a78bfa' },
  { to: '/?editor=jarowe', icon: Settings, label: 'Editors', desc: 'Globe + Glint editors', color: '#60a5fa', external: true },
  { to: '/admin/users', icon: Users, label: 'Users', desc: 'Coming soon', color: '#f472b6', stub: true },
  { to: '/admin/content', icon: FileText, label: 'Content', desc: 'Coming soon', color: '#34d399', stub: true },
];

export default function Admin() {
  return (
    <AdminGate>
      <AdminInner />
    </AdminGate>
  );
}

function AdminInner() {
  // Data state
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Table state
  const [sortKey, setSortKey] = useState('title');
  const [sortDir, setSortDir] = useState('asc');
  const [typeFilter, setTypeFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Track local changes for save
  const [localHidden, setLocalHidden] = useState(new Set());
  const [localOverrides, setLocalOverrides] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // -----------------------------------------------------------------------
  // Data fetching -- AdminGate guarantees we're admin by this point
  // -----------------------------------------------------------------------
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const base = import.meta.env.BASE_URL || '/';

        const statusRes = await fetch(`${base}data/pipeline-status.json`);
        if (statusRes.ok) {
          setPipelineStatus(await statusRes.json());
        }

        const graphRes = await fetch(`${base}data/constellation.graph.json`);
        if (graphRes.ok) {
          setGraphData(await graphRes.json());
        }

        try {
          const curationRes = await fetch(`${base}curation.json`);
          if (curationRes.ok) {
            const curation = await curationRes.json();
            setLocalHidden(new Set(curation.hidden || []));
            setLocalOverrides(curation.visibility_overrides || {});
          }
        } catch {
          // curation.json not available via HTTP -- use defaults
        }
      } catch (err) {
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // -----------------------------------------------------------------------
  // Node list with sorting and filtering
  // -----------------------------------------------------------------------
  const nodes = graphData?.nodes || [];

  const filteredNodes = useMemo(() => {
    let result = [...nodes];

    if (typeFilter) {
      result = result.filter((n) => n.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) => n.title?.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      let aVal = a[sortKey] ?? '';
      let bVal = b[sortKey] ?? '';

      if (sortKey === 'date') {
        aVal = aVal || '0000-00-00';
        bVal = bVal || '0000-00-00';
      }

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDir === 'asc' ? cmp : -cmp;
      }

      const cmp = aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [nodes, typeFilter, searchQuery, sortKey, sortDir]);

  // -----------------------------------------------------------------------
  // Toggle publish/hide
  // -----------------------------------------------------------------------
  const toggleNodeVisibility = useCallback(
    (nodeId) => {
      setLocalHidden((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });
      setHasChanges(true);
    },
    []
  );

  // -----------------------------------------------------------------------
  // Save: download updated curation.json
  // -----------------------------------------------------------------------
  function handleSave() {
    const updatedCuration = {
      _comment:
        'Node curation state. Pipeline reads this to apply publish/hide. Managed via admin UI. Pipeline NEVER writes to this file.',
      hidden: [...localHidden].sort(),
      visibility_overrides: localOverrides,
    };

    const json = JSON.stringify(updatedCuration, null, 2) + '\n';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'curation.json';
    a.click();
    URL.revokeObjectURL(url);

    setHasChanges(false);
  }

  // -----------------------------------------------------------------------
  // Sort handler
  // -----------------------------------------------------------------------
  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

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

  // -----------------------------------------------------------------------
  // Render: Main admin UI
  // -----------------------------------------------------------------------

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <p className="admin-subtitle">Pipeline status, game lab, editors, and site management</p>
      </header>

      {/* ---- Dashboard Hub Cards ---- */}
      <section className="admin-section">
        <div className="admin-hub-grid">
          {DASHBOARD_CARDS.map((card) => {
            const Icon = card.icon;
            const inner = (
              <div className="admin-hub-card admin-glass" style={{ '--hub-color': card.color }}>
                <Icon size={24} className="admin-hub-icon" />
                <span className="admin-hub-label">{card.label}</span>
                <span className="admin-hub-desc">{card.desc}</span>
                {card.stub && <span className="admin-badge admin-badge-warning" style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>Soon</span>}
              </div>
            );
            if (card.stub) {
              return <div key={card.to} style={{ opacity: 0.5, cursor: 'default' }}>{inner}</div>;
            }
            if (card.external) {
              return <a key={card.to} href={card.to} className="admin-hub-link">{inner}</a>;
            }
            return <Link key={card.to} to={card.to} className="admin-hub-link">{inner}</Link>;
          })}
        </div>
      </section>

      {/* ---- Pipeline Status ---- */}
      <section className="admin-section admin-glass">
        <h2>Pipeline Status</h2>
        {!pipelineStatus ? (
          <div className="admin-empty">
            <p>Pipeline has not been run yet.</p>
            <p>
              Run <code>npm run pipeline</code> to generate data.
            </p>
          </div>
        ) : (
          <div className="admin-status-grid">
            <div className="admin-status-item">
              <span className="admin-status-label">Last Run</span>
              <span className="admin-status-value">
                {new Date(pipelineStatus.lastRun).toLocaleString()}
              </span>
            </div>
            <div className="admin-status-item">
              <span className="admin-status-label">Status</span>
              <span
                className={`admin-badge ${pipelineStatus.status === 'success' ? 'admin-badge-success' : 'admin-badge-error'}`}
              >
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
                    {Object.entries(pipelineStatus.stats.bySource || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </span>
                </div>
                <div className="admin-status-item">
                  <span className="admin-status-label">By Type</span>
                  <span className="admin-status-value">
                    {Object.entries(pipelineStatus.stats.byType || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </span>
                </div>
                <div className="admin-status-item">
                  <span className="admin-status-label">Visibility</span>
                  <span className="admin-status-value">
                    {Object.entries(pipelineStatus.stats.byVisibility || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
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

      {/* ---- Source Health ---- */}
      {pipelineStatus?.stats?.ingestSources && (
        <section className="admin-section admin-glass">
          <h2>Source Health</h2>
          <div className="admin-status-grid">
            {Object.entries(pipelineStatus.stats.ingestSources).map(([source, info]) => (
              <div key={source} className="admin-status-item">
                <span className="admin-status-label">{source}</span>
                <span className="admin-status-value">
                  <span
                    className={`admin-badge ${info.status === 'active' ? 'admin-badge-success' : 'admin-badge-warning'}`}
                  >
                    {info.status}
                  </span>
                  {' '}{info.count} node{info.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- Node Table ---- */}
      <section className="admin-section admin-glass">
        <div className="admin-table-header">
          <h2>Nodes ({filteredNodes.length})</h2>

          {hasChanges && (
            <button className="admin-btn admin-btn-save" onClick={handleSave}>
              <Download size={16} />
              Save Changes
            </button>
          )}
        </div>

        {hasChanges && (
          <div className="admin-save-instructions">
            Download updated <code>curation.json</code>, replace in project root, and run{' '}
            <code>npm run pipeline</code> to apply changes.
          </div>
        )}

        {nodes.length === 0 ? (
          <div className="admin-empty">
            <p>No nodes found in constellation data.</p>
            {!graphData && (
              <p>
                Run <code>npm run pipeline</code> to generate data.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="admin-filters">
              <div className="admin-search">
                <Search size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title..."
                  className="admin-input admin-search-input"
                />
              </div>

              <div className="admin-type-pills">
                <button
                  className={`admin-pill ${typeFilter === null ? 'admin-pill-active' : ''}`}
                  onClick={() => setTypeFilter(null)}
                >
                  all
                </button>
                {TYPE_LABELS.map((t) => (
                  <button
                    key={t}
                    className={`admin-pill ${typeFilter === t ? 'admin-pill-active' : ''}`}
                    onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
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
                      { key: 'visibility', label: 'Visibility' },
                    ].map((col) => (
                      <th key={col.key} onClick={() => handleSort(col.key)} className="admin-th-sort">
                        {col.label}
                        {sortKey === col.key && (
                          <ArrowUpDown size={12} className="admin-sort-icon" />
                        )}
                      </th>
                    ))}
                    <th>Published</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNodes.map((node) => {
                    const isHidden = localHidden.has(node.id);
                    return (
                      <tr key={node.id} className={isHidden ? 'admin-row-hidden' : ''}>
                        <td className="admin-td-title" title={node.id}>
                          {node.title || node.id}
                        </td>
                        <td>
                          <span className={`admin-type-tag admin-type-${node.type}`}>
                            {node.type}
                          </span>
                        </td>
                        <td>{node.source}</td>
                        <td>{node.date || '--'}</td>
                        <td>{node.epoch || '--'}</td>
                        <td>
                          <span className={`admin-vis-tag admin-vis-${node.visibility}`}>
                            {node.visibility}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`admin-toggle ${isHidden ? 'admin-toggle-off' : 'admin-toggle-on'}`}
                            onClick={() => toggleNodeVisibility(node.id)}
                            title={isHidden ? 'Hidden -- click to publish' : 'Published -- click to hide'}
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
    </div>
  );
}
