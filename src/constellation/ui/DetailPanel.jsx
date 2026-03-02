import { useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { resolveMediaUrl, getMediaType } from '../media/resolveMediaUrl';
import {
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  User,
  Folder,
  Lightbulb,
  Star,
} from 'lucide-react';
import { useConstellationStore } from '../store';
import EntityChip from './EntityChip';
import './DetailPanel.css';

/** Type badge color mapping */
const TYPE_COLORS = {
  project: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
  moment: { bg: 'rgba(248, 113, 113, 0.2)', text: '#f87171' },
  person: { bg: 'rgba(167, 139, 250, 0.2)', text: '#a78bfa' },
  place: { bg: 'rgba(45, 212, 191, 0.2)', text: '#2dd4bf' },
  idea: { bg: 'rgba(34, 211, 238, 0.2)', text: '#22d3ee' },
  milestone: { bg: 'rgba(251, 191, 36, 0.2)', text: '#fbbf24' },
  track: { bg: 'rgba(52, 211, 153, 0.2)', text: '#34d399' },
};

/** Evidence type icon components */
const EVIDENCE_ICON_MAP = {
  temporal: Calendar,
  place: MapPin,
  person: User,
  project: Folder,
  idea: Lightbulb,
};

/** Number of connections to show before "Show N more" */
const INITIAL_CONNECTION_LIMIT = 5;

/**
 * Format a date string to a human-readable format.
 */
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Right sidebar detail panel for focused constellation node.
 * Slides in from right on desktop, bottom sheet on mobile.
 * Shows title, type badge, date, description, media, entity chips,
 * and enhanced "Because..." connection evidence with clickable node names.
 */
export default function DetailPanel() {
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const clearFocus = useConstellationStore((s) => s.clearFocus);
  const focusNode = useConstellationStore((s) => s.focusNode);
  const openLightbox = useConstellationStore((s) => s.openLightbox);
  const storeNodes = useConstellationStore((s) => s.nodes);
  const storeEdges = useConstellationStore((s) => s.edges);

  const [becauseOpen, setBecauseOpen] = useState(false);
  const [showAllConnections, setShowAllConnections] = useState(false);

  // Find focused node and its edges, grouped by connected node
  const { node, connectionGroups, entities } = useMemo(() => {
    if (!focusedNodeId)
      return { node: null, connectionGroups: [], entities: [] };

    const foundNode = storeNodes.find((n) => n.id === focusedNodeId);
    if (!foundNode)
      return { node: null, connectionGroups: [], entities: [] };

    // Find all edges connected to this node
    const connectedEdges = storeEdges.filter(
      (e) => e.source === focusedNodeId || e.target === focusedNodeId
    );

    // Group edges by connected node, with node info and all evidence
    const groupMap = new Map();
    for (const edge of connectedEdges) {
      const otherId =
        edge.source === focusedNodeId ? edge.target : edge.source;
      const otherNode = storeNodes.find((n) => n.id === otherId);
      if (!otherNode) continue;

      if (!groupMap.has(otherId)) {
        groupMap.set(otherId, {
          nodeId: otherId,
          nodeTitle: otherNode.title,
          nodeType: otherNode.type,
          evidence: [],
        });
      }
      // Add all evidence from this edge (cap at 5 per connection)
      const group = groupMap.get(otherId);
      for (const ev of edge.evidence) {
        if (group.evidence.length < 5) {
          group.evidence.push({
            ...ev,
            weight: edge.weight,
          });
        }
      }
    }

    const groups = Array.from(groupMap.values());
    // Sort by weight descending (strongest connections first)
    groups.sort((a, b) => {
      const avgA =
        a.evidence.reduce((sum, e) => sum + (e.weight || 0), 0) /
        a.evidence.length;
      const avgB =
        b.evidence.reduce((sum, e) => sum + (e.weight || 0), 0) /
        b.evidence.length;
      return avgB - avgA;
    });

    // Extract unique entities for chips
    const entityMap = new Map();
    for (const edge of connectedEdges) {
      const otherId =
        edge.source === focusedNodeId ? edge.target : edge.source;
      const otherNode = storeNodes.find((n) => n.id === otherId);
      if (!otherNode) continue;

      const key = `${otherNode.type}:${otherNode.title}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          type: otherNode.type,
          label: otherNode.title,
          count: 0,
        });
      }
      entityMap.get(key).count += 1;
    }

    const entityList = Array.from(entityMap.values()).map((entity) => {
      const entityNode = storeNodes.find(
        (n) => n.title === entity.label && n.type === entity.type
      );
      if (entityNode) {
        const totalEdges = storeEdges.filter(
          (e) => e.source === entityNode.id || e.target === entityNode.id
        );
        entity.count = totalEdges.length;
      }
      return entity;
    });

    entityList.sort((a, b) => {
      const typeOrder = {
        person: 0,
        place: 1,
        project: 2,
        track: 3,
        idea: 4,
        moment: 5,
        milestone: 6,
      };
      const aOrder = typeOrder[a.type] ?? 99;
      const bOrder = typeOrder[b.type] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.count - a.count;
    });

    return { node: foundNode, connectionGroups: groups, entities: entityList };
  }, [focusedNodeId, storeNodes, storeEdges]);

  // Reset states when node changes
  useMemo(() => {
    setBecauseOpen(false);
    setShowAllConnections(false);
  }, [focusedNodeId]);

  const typeStyle = node ? TYPE_COLORS[node.type] || TYPE_COLORS.moment : {};

  // Determine visible connections
  const visibleConnections = showAllConnections
    ? connectionGroups
    : connectionGroups.slice(0, INITIAL_CONNECTION_LIMIT);
  const hiddenCount = connectionGroups.length - INITIAL_CONNECTION_LIMIT;

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          className="detail-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          drag={window.innerWidth <= 768 ? 'y' : false}
          dragConstraints={
            window.innerWidth <= 768
              ? { top: -window.innerHeight * 0.3, bottom: 0 }
              : undefined
          }
          dragElastic={0.1}
        >
          {/* Close button */}
          <button
            className="detail-panel__close"
            onClick={clearFocus}
            aria-label="Close detail panel"
          >
            <X size={18} />
          </button>

          {/* Mobile drag handle */}
          <div className="detail-panel__drag-handle" />

          {/* Header */}
          <div className="detail-panel__header">
            <div className="detail-panel__meta">
              <span
                className="detail-panel__type-badge"
                style={{
                  backgroundColor: typeStyle.bg,
                  color: typeStyle.text,
                }}
              >
                {node.type}
              </span>
              {node.source && (
                <span
                  className="detail-panel__type-badge"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {node.source}
                </span>
              )}
              <span className="detail-panel__date">
                {formatDate(node.date)}
              </span>
            </div>
            <h2 className="detail-panel__title">{node.title}</h2>
            {node.epoch && (
              <span className="detail-panel__epoch">{node.epoch}</span>
            )}
          </div>

          {/* Description */}
          <div className="detail-panel__section">
            <p className="detail-panel__description">{node.description}</p>
          </div>

          {/* Media gallery */}
          {node.media && node.media.length > 0 && (
            <div className="detail-panel__section">
              <h3 className="detail-panel__section-title">Media</h3>
              <div className="detail-panel__media-grid">
                {node.media.map((item, idx) => {
                  const url = resolveMediaUrl(item);
                  const type = getMediaType(item);
                  return (
                    <button
                      key={idx}
                      className="detail-panel__media-thumb"
                      onClick={() => openLightbox(node.media, idx)}
                      aria-label={`View media ${idx + 1}`}
                    >
                      {type === 'video' ? (
                        <video
                          src={url}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={url}
                          alt={`${node.title} media ${idx + 1}`}
                          loading="lazy"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Placeholder for nodes with no media */}
          {(!node.media || node.media.length === 0) && (
            <div className="detail-panel__section">
              <div className="detail-panel__media-placeholder">
                No media yet
              </div>
            </div>
          )}

          {/* Entity chips */}
          {entities.length > 0 && (
            <div className="detail-panel__section">
              <h3 className="detail-panel__section-title">Connected</h3>
              <div className="detail-panel__chips">
                {entities.map((entity, i) => (
                  <EntityChip
                    key={`${entity.type}-${entity.label}-${i}`}
                    type={entity.type}
                    label={entity.label}
                    count={entity.count}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Because section */}
          {connectionGroups.length > 0 && (
            <div className="detail-panel__section">
              <button
                className="detail-panel__because-toggle"
                onClick={() => setBecauseOpen(!becauseOpen)}
                aria-expanded={becauseOpen}
              >
                <span>
                  Because...{' '}
                  <span className="detail-panel__because-count">
                    ({connectionGroups.length})
                  </span>
                </span>
                {becauseOpen ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>

              <AnimatePresence>
                {becauseOpen && (
                  <motion.div
                    className="detail-panel__because-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {visibleConnections.map((group) => {
                      const connTypeStyle =
                        TYPE_COLORS[group.nodeType] || TYPE_COLORS.moment;
                      return (
                        <div
                          key={group.nodeId}
                          className="detail-panel__connection-group"
                        >
                          {/* Connected node title (clickable to fly to) */}
                          <button
                            className="detail-panel__connection-title"
                            onClick={() => focusNode(group.nodeId)}
                            style={{ color: connTypeStyle.text }}
                          >
                            <span
                              className="detail-panel__connection-dot"
                              style={{ backgroundColor: connTypeStyle.text }}
                            />
                            {group.nodeTitle}
                          </button>

                          {/* Evidence items */}
                          {group.evidence.map((ev, j) => {
                            const IconComponent =
                              EVIDENCE_ICON_MAP[ev.type] || Star;
                            return (
                              <div
                                key={j}
                                className="detail-panel__evidence-item"
                              >
                                <span className="detail-panel__evidence-icon">
                                  <IconComponent size={12} />
                                </span>
                                <span className="detail-panel__evidence-desc">
                                  {ev.description}
                                </span>
                                {ev.weight != null && (
                                  <span className="detail-panel__evidence-weight">
                                    <span
                                      className="detail-panel__evidence-weight-bar"
                                      style={{
                                        width: `${Math.round(ev.weight * 100)}%`,
                                      }}
                                    />
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Show more button */}
                    {hiddenCount > 0 && !showAllConnections && (
                      <button
                        className="detail-panel__show-more"
                        onClick={() => setShowAllConnections(true)}
                      >
                        Show {hiddenCount} more connection
                        {hiddenCount !== 1 ? 's' : ''}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
