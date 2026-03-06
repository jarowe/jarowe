import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  User,
  Folder,
  Lightbulb,
  Star,
} from 'lucide-react';
import { resolveMediaUrl, getMediaType } from '../media/resolveMediaUrl';
import { useConstellationStore } from '../store';
import { TYPE_COLORS, THEME_COLORS } from './DetailPanel';
import EntityChip from './EntityChip';
import useNodeConnections from './useNodeConnections';
import './NodeCards.css';

const EVIDENCE_ICON_MAP = {
  temporal: Calendar,
  place: MapPin,
  person: User,
  project: Folder,
  idea: Lightbulb,
};

const INITIAL_CONNECTION_LIMIT = 5;
const LONG_DESC_THRESHOLD = 50;

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

/* ─── Hero Media Card ──────────────────────────────────────────── */

function HeroCard({ node, onOpenLightbox }) {
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const media = node.media || [];
  const hasMultiple = media.length > 1;

  const featured = media[featuredIdx];
  const url = resolveMediaUrl(featured);
  const type = getMediaType(featured);

  const goPrev = useCallback(
    (e) => {
      e.stopPropagation();
      setFeaturedIdx((i) => (i - 1 + media.length) % media.length);
    },
    [media.length]
  );

  const goNext = useCallback(
    (e) => {
      e.stopPropagation();
      setFeaturedIdx((i) => (i + 1) % media.length);
    },
    [media.length]
  );

  return (
    <motion.div
      className="node-cards__hero"
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      {/* Featured image / video */}
      <button
        className="node-cards__hero-main"
        onClick={() => onOpenLightbox(media, featuredIdx)}
        aria-label="Open full-screen media"
      >
        {type === 'video' ? (
          <video
            key={featuredIdx}
            src={url}
            muted
            playsInline
            preload="metadata"
            className="node-cards__hero-media"
          />
        ) : (
          <img
            key={featuredIdx}
            src={url}
            alt={`${node.title} media ${featuredIdx + 1}`}
            className="node-cards__hero-media"
            loading="eager"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}

        {/* Arrow overlays */}
        {hasMultiple && (
          <>
            <button
              className="node-cards__hero-arrow node-cards__hero-arrow--left"
              onClick={goPrev}
              aria-label="Previous media"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="node-cards__hero-arrow node-cards__hero-arrow--right"
              onClick={goNext}
              aria-label="Next media"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Counter badge */}
        {hasMultiple && (
          <span className="node-cards__hero-counter">
            {featuredIdx + 1} / {media.length}
          </span>
        )}
      </button>

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div className="node-cards__thumb-strip">
          {media.map((item, idx) => {
            const thumbUrl = resolveMediaUrl(item);
            const thumbType = getMediaType(item);
            return (
              <button
                key={idx}
                className={`node-cards__thumb ${idx === featuredIdx ? 'node-cards__thumb--active' : ''}`}
                onClick={() => setFeaturedIdx(idx)}
                aria-label={`View media ${idx + 1}`}
              >
                {thumbType === 'video' ? (
                  <video src={thumbUrl} muted playsInline preload="metadata" />
                ) : (
                  <img
                    src={thumbUrl}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.target.closest('.node-cards__thumb').style.display =
                        'none';
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Info Card ─────────────────────────────────────────────────── */

function InfoCard({
  node,
  entities,
  connectionGroups,
  showDescription,
  onClose,
  onFocusNode,
}) {
  const [becauseOpen, setBecauseOpen] = useState(false);
  const [showAllConnections, setShowAllConnections] = useState(false);

  const typeStyle = TYPE_COLORS[node.type] || TYPE_COLORS.moment;
  const visibleConnections = showAllConnections
    ? connectionGroups
    : connectionGroups.slice(0, INITIAL_CONNECTION_LIMIT);
  const hiddenCount = connectionGroups.length - INITIAL_CONNECTION_LIMIT;

  return (
    <motion.div
      className={`node-cards__info ${showDescription && !node.media?.length ? 'node-cards__info--centered' : ''}`}
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* Close button */}
      <button
        className="node-cards__close"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={16} />
      </button>

      {/* Badges */}
      <div className="node-cards__badges">
        <span
          className="node-cards__badge"
          style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}
        >
          {node.type}
        </span>
        {node.theme && THEME_COLORS[node.theme] && (
          <span
            className="node-cards__badge"
            style={{
              backgroundColor: `${THEME_COLORS[node.theme]}22`,
              color: THEME_COLORS[node.theme],
            }}
          >
            <span
              className="node-cards__badge-dot"
              style={{ backgroundColor: THEME_COLORS[node.theme] }}
            />
            {node.theme}
          </span>
        )}
        {node.source && (
          <span className="node-cards__badge node-cards__badge--source">
            {node.source}
          </span>
        )}
      </div>

      {/* Title + date */}
      <h2 className="node-cards__title">{node.title}</h2>
      <div className="node-cards__date">{formatDate(node.date)}</div>
      {node.epoch && <div className="node-cards__epoch">{node.epoch}</div>}

      {/* Description (only when no separate Story card) */}
      {showDescription && node.description && (
        <p className="node-cards__desc">{node.description}</p>
      )}

      {/* Entity chips */}
      {entities.length > 0 && (
        <div className="node-cards__chips">
          {entities.map((entity, i) => (
            <EntityChip
              key={`${entity.type}-${entity.label}-${i}`}
              type={entity.type}
              label={entity.label}
              count={entity.count}
            />
          ))}
        </div>
      )}

      {/* Because connections */}
      {connectionGroups.length > 0 && (
        <div className="node-cards__because">
          <button
            className="node-cards__because-toggle"
            onClick={() => setBecauseOpen(!becauseOpen)}
            aria-expanded={becauseOpen}
          >
            <span>
              Because...{' '}
              <span className="node-cards__because-count">
                ({connectionGroups.length})
              </span>
            </span>
            {becauseOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <AnimatePresence>
            {becauseOpen && (
              <motion.div
                className="node-cards__because-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {visibleConnections.map((group) => {
                  const connStyle =
                    TYPE_COLORS[group.nodeType] || TYPE_COLORS.moment;
                  return (
                    <div
                      key={group.nodeId}
                      className="node-cards__conn-group"
                    >
                      <button
                        className="node-cards__conn-title"
                        onClick={() => onFocusNode(group.nodeId)}
                        style={{ color: connStyle.text }}
                      >
                        <span
                          className="node-cards__conn-dot"
                          style={{ backgroundColor: connStyle.text }}
                        />
                        {group.nodeTitle}
                      </button>

                      {group.evidence.map((ev, j) => {
                        const Icon = EVIDENCE_ICON_MAP[ev.type] || Star;
                        return (
                          <div key={j} className="node-cards__evidence">
                            <span className="node-cards__evidence-icon">
                              <Icon size={11} />
                            </span>
                            <span className="node-cards__evidence-desc">
                              {ev.description}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {hiddenCount > 0 && !showAllConnections && (
                  <button
                    className="node-cards__show-more"
                    onClick={() => setShowAllConnections(true)}
                  >
                    Show {hiddenCount} more
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Story Card ────────────────────────────────────────────────── */

function StoryCard({ description }) {
  return (
    <motion.div
      className="node-cards__story"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <p className="node-cards__story-text">{description}</p>
    </motion.div>
  );
}

/* ─── Main NodeCards ────────────────────────────────────────────── */

export default function NodeCards() {
  const clearFocus = useConstellationStore((s) => s.clearFocus);
  const focusNode = useConstellationStore((s) => s.focusNode);
  const openLightbox = useConstellationStore((s) => s.openLightbox);

  const { node, connectionGroups, entities } = useNodeConnections();

  if (!node) return null;

  const hasMedia = node.media && node.media.length > 0;
  const hasLongDesc =
    node.description && node.description.length > LONG_DESC_THRESHOLD;
  const showStory = hasMedia && hasLongDesc;
  // Show description inside InfoCard when there's no separate Story card
  const showDescInInfo = !showStory;

  // Layout class for adaptive positioning
  let layoutClass = 'node-cards--media-info'; // default: hero + info
  if (hasMedia && showStory) layoutClass = 'node-cards--full'; // hero + info + story
  if (!hasMedia) layoutClass = 'node-cards--info-only'; // centered info

  return (
    <AnimatePresence>
      <div className={`node-cards ${layoutClass}`}>
        {/* Click-to-close backdrop */}
        <motion.div
          className="node-cards__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={clearFocus}
        />

        {/* Hero Media Card */}
        {hasMedia && (
          <HeroCard node={node} onOpenLightbox={openLightbox} />
        )}

        {/* Info Card (always) */}
        <InfoCard
          node={node}
          entities={entities}
          connectionGroups={connectionGroups}
          showDescription={showDescInInfo}
          onClose={clearFocus}
          onFocusNode={focusNode}
        />

        {/* Story Card (conditional) */}
        {showStory && <StoryCard description={node.description} />}
      </div>
    </AnimatePresence>
  );
}
