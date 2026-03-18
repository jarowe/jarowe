import { useState, useRef, useEffect } from 'react';
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
import useNodeConnections from './useNodeConnections';
import './DetailPanel.css';

/** Type badge color mapping */
export const TYPE_COLORS = {
  project: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
  moment: { bg: 'rgba(248, 113, 113, 0.2)', text: '#f87171' },
  person: { bg: 'rgba(167, 139, 250, 0.2)', text: '#a78bfa' },
  place: { bg: 'rgba(45, 212, 191, 0.2)', text: '#2dd4bf' },
  idea: { bg: 'rgba(34, 211, 238, 0.2)', text: '#22d3ee' },
  milestone: { bg: 'rgba(251, 191, 36, 0.2)', text: '#fbbf24' },
  track: { bg: 'rgba(52, 211, 153, 0.2)', text: '#34d399' },
};

/** Theme color mapping for theme badges */
export const THEME_COLORS = {
  love:        '#f472b6',
  family:      '#fb923c',
  fatherhood:  '#fb923c',
  career:      '#60a5fa',
  craft:       '#38bdf8',
  growth:      '#a78bfa',
  reflection:  '#c084fc',
  adventure:   '#2dd4bf',
  travel:      '#2dd4bf',
  greece:      '#2dd4bf',
  celebration: '#fbbf24',
  friendship:  '#818cf8',
  nature:      '#34d399',
  food:        '#f97316',
  nostalgia:   '#d4a574',
  faith:       '#e2c6ff',
  home:        '#86efac',
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

  const [becauseOpen, setBecauseOpen] = useState(false);
  const [showAllConnections, setShowAllConnections] = useState(false);

  // Use shared hook for connection logic
  const { node, connectionGroups, entities } = useNodeConnections();

  // Reset states when node changes
  const prevNodeRef = useRef(focusedNodeId);
  useEffect(() => {
    if (focusedNodeId !== prevNodeRef.current) {
      prevNodeRef.current = focusedNodeId;
      setBecauseOpen(false);
      setShowAllConnections(false);
    }
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

          {/* Hero media — first item displayed prominently */}
          {node.media && node.media.length > 0 && (() => {
            const heroUrl = resolveMediaUrl(node.media[0]);
            const heroType = getMediaType(node.media[0]);
            return (
              <div
                className="detail-panel__hero"
                onClick={() => openLightbox(node.media, 0)}
                role="button"
                tabIndex={0}
                aria-label="View media fullscreen"
              >
                {heroType === 'video' ? (
                  <video
                    src={heroUrl}
                    className="detail-panel__hero-media"
                    controls
                    playsInline
                    preload="metadata"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img
                    src={heroUrl}
                    alt={node.title}
                    className="detail-panel__hero-media"
                    loading="eager"
                  />
                )}
                {node.media.length > 1 && (
                  <div className="detail-panel__hero-count">
                    1 / {node.media.length}
                  </div>
                )}
              </div>
            );
          })()}

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
              {node.theme && THEME_COLORS[node.theme] && (
                <span
                  className="detail-panel__type-badge"
                  style={{
                    backgroundColor: `${THEME_COLORS[node.theme]}22`,
                    color: THEME_COLORS[node.theme],
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: THEME_COLORS[node.theme],
                      marginRight: 4,
                    }}
                  />
                  {node.theme}
                </span>
              )}
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

          {/* Media gallery — remaining items (first is hero above) */}
          {node.media && node.media.length > 1 && (
            <div className="detail-panel__section">
              <h3 className="detail-panel__section-title">Media</h3>
              <div className="detail-panel__media-grid">
                {node.media.slice(1).map((item, idx) => {
                  const realIdx = idx + 1;
                  const url = resolveMediaUrl(item);
                  const type = getMediaType(item);
                  return (
                    <button
                      key={realIdx}
                      className="detail-panel__media-thumb"
                      onClick={() => openLightbox(node.media, realIdx)}
                      aria-label={`View media ${realIdx + 1}`}
                    >
                      {type === 'video' ? (
                        <>
                          <video
                            src={url}
                            muted
                            playsInline
                            autoPlay
                            loop
                            preload="metadata"
                          />
                          <div className="detail-panel__video-badge" aria-hidden="true">▶</div>
                        </>
                      ) : (
                        <img
                          src={url}
                          alt={`${node.title} media ${idx + 1}`}
                          loading="lazy"
                          onError={(e) => {
                            // Hide entire thumbnail button on broken image
                            e.target.closest('.detail-panel__media-thumb').style.display = 'none';
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* External links / articles */}
          {node.links && node.links.length > 0 && (
            <div className="detail-panel__section">
              <h3 className="detail-panel__section-title">Articles & Links</h3>
              <div className="detail-panel__links">
                {node.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-panel__link"
                  >
                    <span className="detail-panel__link-title">{link.title}</span>
                    <span className="detail-panel__link-source">{link.source}</span>
                  </a>
                ))}
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
