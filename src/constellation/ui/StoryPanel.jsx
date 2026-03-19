import { useState, useRef, useEffect, useCallback } from 'react';
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
  Music,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { resolveMediaUrl, getMediaType } from '../media/resolveMediaUrl';
import { useConstellationStore } from '../store';
import { useAudio } from '../../context/AudioContext';
import { TYPE_COLORS, THEME_COLORS } from './DetailPanel';
import EntityChip from './EntityChip';
import useNodeConnections from './useNodeConnections';
import './StoryPanel.css';

const EVIDENCE_ICON_MAP = {
  temporal: Calendar,
  place: MapPin,
  person: User,
  project: Folder,
  idea: Lightbulb,
};

const INITIAL_CONNECTION_LIMIT = 5;

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
 * Determine content profile for a node:
 *   A = photo-only (has media, no meaningful description)
 *   B = full story (has media + meaningful description)
 *   C = text-only (no media)
 */
function getProfile(node) {
  const hasMedia = node.media && node.media.length > 0;
  const hasDesc = node.description && node.description.trim().length > 30;
  if (hasMedia && hasDesc) return 'B';
  if (hasMedia) return 'A';
  return 'C';
}

/* ─── Badges row ───────────────────────────────────────────────── */

function Badges({ node }) {
  const typeStyle = TYPE_COLORS[node.type] || TYPE_COLORS.moment;
  return (
    <div className="story-panel__badges">
      <span
        className="story-panel__badge"
        style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}
      >
        {node.type}
      </span>
      {node.theme && THEME_COLORS[node.theme] && (
        <span
          className="story-panel__badge"
          style={{
            backgroundColor: `${THEME_COLORS[node.theme]}22`,
            color: THEME_COLORS[node.theme],
          }}
        >
          <span
            className="story-panel__badge-dot"
            style={{ backgroundColor: THEME_COLORS[node.theme] }}
          />
          {node.theme}
        </span>
      )}
      {node.source && (
        <span className="story-panel__badge story-panel__badge--source">
          {node.source}
        </span>
      )}
    </div>
  );
}

/* ─── Because section ──────────────────────────────────────────── */

function BecauseSection({ connectionGroups, focusNode }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll
    ? connectionGroups
    : connectionGroups.slice(0, INITIAL_CONNECTION_LIMIT);
  const hiddenCount = connectionGroups.length - INITIAL_CONNECTION_LIMIT;

  if (connectionGroups.length === 0) return null;

  return (
    <div>
      <button
        className="story-panel__because-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>
          Because...{' '}
          <span className="story-panel__because-count">
            ({connectionGroups.length})
          </span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="story-panel__because-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {visible.map((group) => {
              const connStyle =
                TYPE_COLORS[group.nodeType] || TYPE_COLORS.moment;
              return (
                <div key={group.nodeId} className="story-panel__conn-group">
                  <button
                    className="story-panel__conn-title"
                    onClick={() => focusNode(group.nodeId)}
                    style={{ color: connStyle.text }}
                  >
                    <span
                      className="story-panel__conn-dot"
                      style={{ backgroundColor: connStyle.text }}
                    />
                    {group.nodeTitle}
                  </button>
                  {group.evidence.map((ev, j) => {
                    const Icon = EVIDENCE_ICON_MAP[ev.type] || Star;
                    return (
                      <div key={j} className="story-panel__evidence">
                        <span className="story-panel__evidence-icon">
                          <Icon size={12} />
                        </span>
                        <span className="story-panel__evidence-desc">
                          {ev.description}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {hiddenCount > 0 && !showAll && (
              <button
                className="story-panel__show-more"
                onClick={() => setShowAll(true)}
              >
                Show {hiddenCount} more connection
                {hiddenCount !== 1 ? 's' : ''}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main StoryPanel ──────────────────────────────────────────── */

export default function StoryPanel() {
  const clearFocus = useConstellationStore((s) => s.clearFocus);
  const focusNode = useConstellationStore((s) => s.focusNode);
  const openLightbox = useConstellationStore((s) => s.openLightbox);

  const { node, connectionGroups, entities } = useNodeConnections();
  const scrollRef = useRef(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const prevNodeId = useRef(null);

  // Reset state when node changes
  useEffect(() => {
    if (node && node.id !== prevNodeId.current) {
      prevNodeId.current = node.id;
      setHeroIdx(0);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [node]);

  // ─── Shared media mute state ─────────────────────────────────
  // Unmute one video or node audio → all subsequent media plays with sound
  const { duckForNodeAudio, restoreFromDuck } = useAudio();
  const videoRef = useRef(null);
  const nodeAudioRef = useRef(null);
  const [nodeAudioMuted, setNodeAudioMuted] = useState(
    () => sessionStorage.getItem('jarowe_video_unmuted') !== '1'
  );

  const handleVideoRef = useCallback((el) => {
    videoRef.current = el;
    if (!el) return;
    const wantSound = sessionStorage.getItem('jarowe_video_unmuted') === '1';
    if (wantSound) {
      const tryUnmute = () => {
        el.muted = false;
        duckForNodeAudio();
        el.removeEventListener('playing', tryUnmute);
      };
      el.addEventListener('playing', tryUnmute);
    }
  }, [duckForNodeAudio]);

  const handleVolumeChange = useCallback((e) => {
    const vid = e.currentTarget;
    const unmuted = !vid.muted;
    sessionStorage.setItem('jarowe_video_unmuted', unmuted ? '1' : '0');
    setNodeAudioMuted(!unmuted);
    if (unmuted) duckForNodeAudio();
    else restoreFromDuck();
  }, [duckForNodeAudio, restoreFromDuck]);

  // ─── Node background audio (for photo posts with music) ─────
  const audioSrc = node?.audio
    ? `${import.meta.env.BASE_URL}${node.audio.replace(/^\//, '')}`
    : null;
  // Three-point audio: Start (initial), Loop In, Loop Out
  // Check localStorage overrides first (set via admin panel), then graph data
  const audioInitTime = (() => {
    const s = node?.id ? localStorage.getItem(`jarowe_audioInit_${node.id}`) : null;
    return s != null ? Number(s) : (node?.audioStart || 0);
  })();
  const audioLoopIn = (() => {
    const s = node?.id ? localStorage.getItem(`jarowe_audioLoopIn_${node.id}`) : null;
    return s != null ? Number(s) : (node?.audioLoopIn || 0);
  })();
  const audioLoopOut = (() => {
    const s = node?.id ? localStorage.getItem(`jarowe_audioLoopOut_${node.id}`) : null;
    return s != null ? Number(s) : (node?.audioLoopOut || 0);
  })();

  // Extract song name from filename for display
  const audioLabel = node?.audio
    ? decodeURIComponent(node.audio.split('/').pop().replace(/\.mp3$/i, ''))
    : null;

  useEffect(() => {
    if (!audioSrc) return;

    const audio = new Audio(audioSrc);
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'auto';
    nodeAudioRef.current = audio;

    const wantSound = sessionStorage.getItem('jarowe_video_unmuted') === '1';
    setNodeAudioMuted(!wantSound);

    // Set initial start time (one-time, first play)
    const onCanPlay = () => {
      if (audioInitTime > 0) audio.currentTime = audioInitTime;
      audio.removeEventListener('canplay', onCanPlay);
    };
    audio.addEventListener('canplay', onCanPlay);

    // Loop enforcement: Start → plays through → hits Loop Out → jumps to Loop In
    // From then on loops between Loop In ↔ Loop Out
    const onTimeUpdate = () => {
      if (audioLoopOut > audioLoopIn && audio.currentTime >= audioLoopOut) {
        audio.currentTime = audioLoopIn;
      }
    };
    audio.addEventListener('timeupdate', onTimeUpdate);

    audio.play().then(() => {
      if (wantSound) {
        duckForNodeAudio();
        let v = 0;
        const fade = setInterval(() => {
          v = Math.min(v + 0.05, 0.6);
          audio.volume = v;
          if (v >= 0.6) clearInterval(fade);
        }, 50);
      }
    }).catch(() => {});

    return () => {
      // Fade out and cleanup
      const a = nodeAudioRef.current;
      if (a) {
        a.removeEventListener('timeupdate', onTimeUpdate);
        let v = a.volume;
        const fade = setInterval(() => {
          v = Math.max(v - 0.05, 0);
          a.volume = v;
          if (v <= 0) {
            clearInterval(fade);
            a.pause();
            a.src = '';
          }
        }, 30);
      }
      nodeAudioRef.current = null;
      restoreFromDuck();
    };
  }, [audioSrc, duckForNodeAudio, restoreFromDuck]);

  const toggleNodeAudio = useCallback(() => {
    const a = nodeAudioRef.current;
    if (!a) return;
    const willUnmute = nodeAudioMuted;
    setNodeAudioMuted(!willUnmute);
    sessionStorage.setItem('jarowe_video_unmuted', willUnmute ? '1' : '0');

    if (willUnmute) {
      // Unmute: fade in + duck GlobalPlayer
      a.play().catch(() => {});
      duckForNodeAudio();
      let v = a.volume;
      const fade = setInterval(() => {
        v = Math.min(v + 0.05, 0.6);
        a.volume = v;
        if (v >= 0.6) clearInterval(fade);
      }, 50);
    } else {
      // Mute: fade out + restore GlobalPlayer
      let v = a.volume;
      const fade = setInterval(() => {
        v = Math.max(v - 0.05, 0);
        a.volume = v;
        if (v <= 0) clearInterval(fade);
      }, 30);
      restoreFromDuck();
    }
  }, [nodeAudioMuted, duckForNodeAudio, restoreFromDuck]);

  // Detect mobile for animation direction
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const profile = node ? getProfile(node) : null;
  const media = node?.media || [];
  const heroItem = media[heroIdx] || media[0];
  const heroUrl = heroItem ? resolveMediaUrl(heroItem) : '';
  const heroType = heroItem ? getMediaType(heroItem) : 'image';

  return (
    <AnimatePresence>
      {node && (
          <motion.div
            className="story-panel"
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag={isMobile ? 'y' : false}
            dragConstraints={isMobile ? { top: 0, bottom: 0 } : undefined}
            dragElastic={0.15}
            onDragEnd={
              isMobile
                ? (_e, info) => {
                    if (info.offset.y > 100) clearFocus();
                  }
                : undefined
            }
          >
            {/* Mobile drag handle */}
            <div className="story-panel__drag-handle" />

            {/* Close button */}
            <button
              className="story-panel__close"
              onClick={clearFocus}
              aria-label="Close panel"
            >
              <X size={18} />
            </button>

            {/* Scrollable content */}
            <div className="story-panel__scroll" ref={scrollRef}>
              {/* ─── Profile A: Photo-only ─── */}
              {profile === 'A' && (
                <>
                  <motion.div
                    className={`story-panel__hero${heroType === 'video' ? ' story-panel__hero--video' : ''}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={heroIdx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        {heroType === 'video' ? (
                          <video
                            key={heroUrl}
                            ref={handleVideoRef}
                            src={heroUrl}
                            className="story-panel__hero-video"
                            controls
                            autoPlay
                            muted
                            playsInline
                            preload="auto"
                            onVolumeChange={handleVolumeChange}
                          />
                        ) : (
                          <img
                            src={heroUrl}
                            alt={node.title}
                            className="story-panel__hero-media"
                            loading="eager"
                            onClick={() => openLightbox(media, heroIdx)}
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Prev/Next arrows */}
                    {media.length > 1 && (
                      <>
                        <button
                          className="story-panel__hero-arrow story-panel__hero-arrow--left"
                          onClick={() => setHeroIdx((i) => (i - 1 + media.length) % media.length)}
                          aria-label="Previous photo"
                        >
                          <ChevronLeft size={22} />
                        </button>
                        <button
                          className="story-panel__hero-arrow story-panel__hero-arrow--right"
                          onClick={() => setHeroIdx((i) => (i + 1) % media.length)}
                          aria-label="Next photo"
                        >
                          <ChevronRight size={22} />
                        </button>
                        <span className="story-panel__hero-counter">
                          {heroIdx + 1} / {media.length}
                        </span>
                      </>
                    )}

                    {/* Gradient overlay with title — only for images */}
                    {heroType !== 'video' && (
                      <div className="story-panel__hero-overlay">
                        <Badges node={node} />
                        <h2 className="story-panel__title">{node.title}</h2>
                        <span className="story-panel__date">
                          {formatDate(node.date)}
                        </span>
                      </div>
                    )}
                  </motion.div>

                  {/* Title info below hero for videos */}
                  {heroType === 'video' && (
                    <div className="story-panel__hero-info">
                      <Badges node={node} />
                      <h2 className="story-panel__title">{node.title}</h2>
                      <span className="story-panel__date">
                        {formatDate(node.date)}
                      </span>
                    </div>
                  )}

                  {/* Node audio bar */}
                  {audioLabel && (
                    <button
                      className="story-panel__audio-bar"
                      onClick={toggleNodeAudio}
                      title={nodeAudioMuted ? 'Play music' : 'Mute music'}
                    >
                      <Music size={14} />
                      <span className="story-panel__audio-label">{audioLabel}</span>
                      {nodeAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  )}

                  <div className="story-panel__body">
                    {node.epoch && (
                      <span className="story-panel__epoch">{node.epoch}</span>
                    )}

                    {/* Gallery grid */}
                    {media.length > 1 && (
                      <div>
                        <div className="story-panel__gallery-label">Gallery</div>
                        <div className="story-panel__gallery">
                          {media.map((item, idx) => {
                            const url = resolveMediaUrl(item);
                            const type = getMediaType(item);
                            return (
                              <button
                                key={idx}
                                className={`story-panel__gallery-thumb ${idx === heroIdx ? 'story-panel__gallery-thumb--active' : ''}`}
                                onClick={() => setHeroIdx(idx)}
                                aria-label={`View media ${idx + 1}`}
                              >
                                {type === 'video' ? (
                                  <video src={url} muted playsInline preload="metadata" />
                                ) : (
                                  <img
                                    src={url}
                                    alt=""
                                    loading="lazy"
                                    onError={(e) => {
                                      e.target.closest('.story-panel__gallery-thumb').style.display = 'none';
                                    }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Entity chips */}
                    {entities.length > 0 && (
                      <div>
                        <div className="story-panel__chips-label">Connected</div>
                        <div className="story-panel__chips">
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

                    <BecauseSection
                      connectionGroups={connectionGroups}
                      focusNode={focusNode}
                    />
                  </div>
                </>
              )}

              {/* ─── Profile B: Full story ─── */}
              {profile === 'B' && (
                <>
                  <motion.div
                    className={`story-panel__hero story-panel__hero--article${heroType === 'video' ? ' story-panel__hero--video' : ''}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={heroIdx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        {heroType === 'video' ? (
                          <video
                            key={heroUrl}
                            ref={handleVideoRef}
                            src={heroUrl}
                            className="story-panel__hero-video"
                            controls
                            autoPlay
                            muted
                            playsInline
                            preload="auto"
                            onVolumeChange={handleVolumeChange}
                          />
                        ) : (
                          <img
                            src={heroUrl}
                            alt={node.title}
                            className="story-panel__hero-media"
                            loading="eager"
                            onClick={() => openLightbox(media, heroIdx)}
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Prev/Next arrows */}
                    {media.length > 1 && (
                      <>
                        <button
                          className="story-panel__hero-arrow story-panel__hero-arrow--left"
                          onClick={() => setHeroIdx((i) => (i - 1 + media.length) % media.length)}
                          aria-label="Previous photo"
                        >
                          <ChevronLeft size={22} />
                        </button>
                        <button
                          className="story-panel__hero-arrow story-panel__hero-arrow--right"
                          onClick={() => setHeroIdx((i) => (i + 1) % media.length)}
                          aria-label="Next photo"
                        >
                          <ChevronRight size={22} />
                        </button>
                        <span className="story-panel__hero-counter">
                          {heroIdx + 1} / {media.length}
                        </span>
                      </>
                    )}
                  </motion.div>

                  {/* Node audio bar */}
                  {audioLabel && (
                    <button
                      className="story-panel__audio-bar"
                      onClick={toggleNodeAudio}
                      title={nodeAudioMuted ? 'Play music' : 'Mute music'}
                    >
                      <Music size={14} />
                      <span className="story-panel__audio-label">{audioLabel}</span>
                      {nodeAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  )}

                  <div className="story-panel__body">
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <Badges node={node} />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25, duration: 0.3 }}
                    >
                      <span className="story-panel__date">
                        {formatDate(node.date)}
                      </span>
                      <h2 className="story-panel__title">{node.title}</h2>
                      {node.epoch && (
                        <span className="story-panel__epoch">{node.epoch}</span>
                      )}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    >
                      <p className="story-panel__description">
                        {node.description}
                      </p>
                    </motion.div>

                    {/* Gallery grid */}
                    {media.length > 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.3 }}
                      >
                        <div className="story-panel__gallery-label">Gallery</div>
                        <div className="story-panel__gallery">
                          {media.map((item, idx) => {
                            const url = resolveMediaUrl(item);
                            const type = getMediaType(item);
                            return (
                              <button
                                key={idx}
                                className={`story-panel__gallery-thumb ${idx === heroIdx ? 'story-panel__gallery-thumb--active' : ''}`}
                                onClick={() => setHeroIdx(idx)}
                                aria-label={`View media ${idx + 1}`}
                              >
                                {type === 'video' ? (
                                  <video src={url} muted playsInline preload="metadata" />
                                ) : (
                                  <img
                                    src={url}
                                    alt=""
                                    loading="lazy"
                                    onError={(e) => {
                                      e.target.closest('.story-panel__gallery-thumb').style.display = 'none';
                                    }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* Entity chips */}
                    {entities.length > 0 && (
                      <div>
                        <div className="story-panel__chips-label">Connected</div>
                        <div className="story-panel__chips">
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

                    <BecauseSection
                      connectionGroups={connectionGroups}
                      focusNode={focusNode}
                    />
                  </div>
                </>
              )}

              {/* ─── Profile C: Text-only ─── */}
              {profile === 'C' && (
                <div className="story-panel__body">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    <Badges node={node} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <span className="story-panel__date">
                      {formatDate(node.date)}
                    </span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                  >
                    <h2 className="story-panel__title story-panel__title--centered">
                      {node.title}
                    </h2>
                    {node.epoch && (
                      <span className="story-panel__epoch story-panel__epoch--centered">
                        {node.epoch}
                      </span>
                    )}
                  </motion.div>

                  {node.description && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                    >
                      <p className="story-panel__description story-panel__description--centered">
                        {node.description}
                      </p>
                    </motion.div>
                  )}

                  {/* Entity chips */}
                  {entities.length > 0 && (
                    <div>
                      <div className="story-panel__chips-label">Connected</div>
                      <div className="story-panel__chips">
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

                  <BecauseSection
                    connectionGroups={connectionGroups}
                    focusNode={focusNode}
                  />
                </div>
              )}
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
}
