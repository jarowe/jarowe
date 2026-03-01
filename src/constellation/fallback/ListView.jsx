import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useConstellationStore } from '../store';
import './ListView.css';

/** Type badge color mapping (matches 3D node colors) */
const TYPE_COLORS = {
  project: '#f59e0b',
  moment: '#f87171',
  person: '#a78bfa',
  place: '#2dd4bf',
  idea: '#22d3ee',
  milestone: '#fbbf24',
  track: '#34d399',
};

const TYPE_BG = {
  project: 'rgba(245, 158, 11, 0.15)',
  moment: 'rgba(248, 113, 113, 0.15)',
  person: 'rgba(167, 139, 250, 0.15)',
  place: 'rgba(45, 212, 191, 0.15)',
  idea: 'rgba(34, 211, 238, 0.15)',
  milestone: 'rgba(251, 191, 36, 0.15)',
  track: 'rgba(52, 211, 153, 0.15)',
};

/** All available node types for filter pills */
const NODE_TYPES = ['all', 'project', 'moment', 'person', 'place', 'idea', 'milestone', 'track'];

/** Sort options */
const SORT_OPTIONS = [
  { key: 'date-desc', label: 'Date (newest)' },
  { key: 'date-asc', label: 'Date (oldest)' },
  { key: 'type', label: 'Type' },
  { key: 'title', label: 'Title (A-Z)' },
];

/**
 * Pre-compute connection count for each node.
 */
function getConnectionCounts(edges) {
  const counts = new Map();
  for (const edge of edges) {
    counts.set(edge.source, (counts.get(edge.source) || 0) + 1);
    counts.set(edge.target, (counts.get(edge.target) || 0) + 1);
  }
  return counts;
}

/**
 * Format date string to short human-readable format.
 */
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Debounce hook.
 */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * 2D accessible list view for the constellation.
 * Provides search, type filter, sortable list, and full keyboard navigation.
 * Shares DetailPanel from 3D mode via Zustand store.
 */
export default function ListView() {
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const focusNode = useConstellationStore((s) => s.focusNode);
  const storeNodes = useConstellationStore((s) => s.nodes);
  const storeEdges = useConstellationStore((s) => s.edges);

  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date-desc');
  const [activeIndex, setActiveIndex] = useState(0);
  const [sortOpen, setSortOpen] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 200);
  const listRef = useRef(null);
  const rowRefs = useRef([]);

  const connectionCounts = useMemo(() => getConnectionCounts(storeEdges), [storeEdges]);

  // Filter and sort nodes
  const filteredNodes = useMemo(() => {
    let nodes = [...storeNodes];

    // Type filter
    if (typeFilter !== 'all') {
      nodes = nodes.filter((n) => n.type === typeFilter);
    }

    // Search filter (title, type, epoch, description)
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      nodes = nodes.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.type.toLowerCase().includes(query) ||
          (n.epoch && n.epoch.toLowerCase().includes(query)) ||
          (n.description && n.description.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortKey) {
      case 'date-desc':
        nodes.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'date-asc':
        nodes.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'type':
        nodes.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case 'title':
        nodes.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return nodes;
  }, [typeFilter, debouncedSearch, sortKey, storeNodes]);

  // Reset active index when filters change
  useEffect(() => {
    setActiveIndex(0);
  }, [typeFilter, debouncedSearch, sortKey]);

  // Scroll active row into view
  useEffect(() => {
    const row = rowRefs.current[activeIndex];
    if (row) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  // Keyboard navigation for list
  const handleListKeyDown = useCallback(
    (e) => {
      const len = filteredNodes.length;
      if (len === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, len - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(len - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredNodes[activeIndex]) {
            focusNode(filteredNodes[activeIndex].id);
          }
          break;
      }
    },
    [filteredNodes, activeIndex, focusNode]
  );

  const handleRowClick = useCallback(
    (nodeId, index) => {
      setActiveIndex(index);
      focusNode(nodeId);
    },
    [focusNode]
  );

  return (
    <div className="list-view" role="region" aria-label="Constellation node list">
      {/* Search bar */}
      <div className="list-view__search-wrap">
        <Search size={16} className="list-view__search-icon" />
        <input
          className="list-view__search"
          type="text"
          placeholder="Search nodes..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search constellation nodes"
        />
      </div>

      {/* Type filter pills */}
      <div className="list-view__filters" role="tablist" aria-label="Filter by type">
        {NODE_TYPES.map((type) => (
          <button
            key={type}
            className={`list-view__filter-pill ${typeFilter === type ? 'list-view__filter-pill--active' : ''}`}
            onClick={() => setTypeFilter(type)}
            role="tab"
            aria-selected={typeFilter === type}
            style={
              typeFilter === type && type !== 'all'
                ? {
                    backgroundColor: TYPE_BG[type],
                    borderColor: TYPE_COLORS[type],
                    color: TYPE_COLORS[type],
                  }
                : undefined
            }
          >
            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Sort + result count */}
      <div className="list-view__controls">
        <span className="list-view__result-count" aria-live="polite">
          {filteredNodes.length} node{filteredNodes.length !== 1 ? 's' : ''}
        </span>

        <div className="list-view__sort-wrap">
          <button
            className="list-view__sort-btn"
            onClick={() => setSortOpen(!sortOpen)}
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
          >
            <ArrowUpDown size={14} />
            {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
            <ChevronDown size={12} />
          </button>
          {sortOpen && (
            <div className="list-view__sort-dropdown" role="listbox">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={`list-view__sort-option ${sortKey === opt.key ? 'list-view__sort-option--active' : ''}`}
                  onClick={() => {
                    setSortKey(opt.key);
                    setSortOpen(false);
                  }}
                  role="option"
                  aria-selected={sortKey === opt.key}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Node list */}
      <div
        className="list-view__list"
        ref={listRef}
        role="listbox"
        aria-label="Constellation nodes"
        onKeyDown={handleListKeyDown}
        tabIndex={0}
      >
        {filteredNodes.length === 0 && (
          <div className="list-view__empty">No nodes match your search.</div>
        )}

        {filteredNodes.map((node, idx) => {
          const isActive = idx === activeIndex;
          const isSelected = node.id === focusedNodeId;
          const connCount = connectionCounts.get(node.id) || 0;
          return (
            <div
              key={node.id}
              ref={(el) => {
                rowRefs.current[idx] = el;
              }}
              className={`list-view__row ${isActive ? 'list-view__row--active' : ''} ${isSelected ? 'list-view__row--selected' : ''}`}
              role="option"
              aria-selected={isSelected}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleRowClick(node.id, idx)}
              onFocus={() => setActiveIndex(idx)}
            >
              <div className="list-view__row-main">
                <span
                  className="list-view__type-badge"
                  style={{
                    backgroundColor: TYPE_BG[node.type],
                    color: TYPE_COLORS[node.type],
                  }}
                >
                  {node.type}
                </span>
                <span className="list-view__row-title">{node.title}</span>
              </div>
              <div className="list-view__row-meta">
                <span className="list-view__row-date">
                  {formatDate(node.date)}
                </span>
                {connCount > 0 && (
                  <span className="list-view__row-connections">
                    {connCount} link{connCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
