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
import { getPortalSceneId } from '../data/portalScenes';
import EntityChip from './EntityChip';
import useNodeConnections from './useNodeConnections';
import './StoryPanel.css';

const EVIDENCE_ICON_MAP = {
  temporal: Calendar,
  semantic: Folder,   // default for semantic; refined per-signal below
  thematic: Lightbulb,
  narrative: Star,
  identity: User,
  spatial: MapPin,
};

/** Color palette for evidence type left-border accent */
const EVIDENCE_COLORS = {
  temporal:  '#60a5fa', // blue
  semantic:  '#a78bfa', // purple
  thematic:  '#34d399', // green
  narrative: '#fbbf24', // amber
  identity:  '#f472b6', // pink
  spatial:   '#fb923c', // orange
};

/** Pick the best icon for a single evidence item. */
function getEvidenceIcon(ev) {
  if (ev.type === 'semantic' && ev.signal) {
    const s = ev.signal.toLowerCase();
    if (s.includes('entity') || s.includes('identity')) return User;
    if (s.includes('project') || s.includes('client')) return Folder;
    // tags or other semantic signals — fall back to Star
    return Star;
  }
  return EVIDENCE_ICON_MAP[ev.type] || Star;
}

/** Build a contextual tooltip string for an evidence item */
function getEvidenceTooltip(ev) {
  const signal = ev.signal || '';
  switch (ev.type) {
    case 'temporal':
      if (signal === 'same-day') return 'Same day';
      if (signal === 'seasonal-echo') return 'Seasonal echo';
      if (signal === 'temporal-proximity') return 'Close in time';
      if (signal === 'life-chapter') return 'Same life chapter';
      return 'Temporal link';
    case 'semantic':
      if (signal === 'shared-entity') {
        const match = ev.description?.match(/United by (.+?) in/);
        return match ? `Shared: ${match[1]}` : 'Shared entity';
      }
      if (signal === 'shared-client') {
        const match = ev.description?.match(/partnership with (.+)/);
        return match ? `Client: ${match[1]}` : 'Same client';
      }
      if (signal === 'shared-tags') {
        const match = ev.description?.match(/#(\w+)/);
        return match ? `Tag: #${match[1]}` : 'Shared tags';
      }
      return 'Semantic link';
    case 'thematic':
      if (signal === 'shared-motif') {
        // Extract the motif from descriptions like "Both expressions of creative vision"
        return 'Shared motif';
      }
      return 'Thematic link';
    case 'narrative':
      if (signal === 'narrative-arc') return 'Story arc';
      if (signal === 'cross-source-echo') return 'Cross-source echo';
      return 'Narrative thread';
    case 'identity':
      if (signal === 'shared-identity') {
        const match = ev.description?.match(/^(\w+) present/);
        return match ? `Person: ${match[1]}` : 'Shared identity';
      }
      return 'Identity link';
    case 'spatial':
      if (signal === 'shared-place') {
        const match = ev.description?.match(/rooted in (.+)/);
        return match ? match[1] : 'Same place';
      }
      return 'Spatial link';
    default:
      return ev.type || 'Connection';
  }
}

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

/* ─── Hero Parallax Image ─────────────────────────────────────── */

function HeroParallaxImage({ src, alt, onClick }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const mouseActive = useRef(false);
  const idleTimer = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const PARALLAX = 12;
    const IDLE_DELAY = 2500;

    const handleMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      mouseActive.current = true;

      if (imgRef.current) {
        imgRef.current.style.transform =
          `scale(1.06) translate(${-nx * PARALLAX}px, ${-ny * PARALLAX}px)`;
        imgRef.current.classList.remove('story-panel__hero-media--idle');
      }

      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        mouseActive.current = false;
        if (imgRef.current) {
          imgRef.current.style.transform = '';
          imgRef.current.classList.add('story-panel__hero-media--idle');
        }
      }, IDLE_DELAY);
    };

    const handleLeave = () => {
      mouseActive.current = false;
      if (imgRef.current) {
        imgRef.current.style.transform = '';
        imgRef.current.classList.add('story-panel__hero-media--idle');
      }
    };

    container.addEventListener('mousemove', handleMove);
    container.addEventListener('mouseleave', handleLeave);

    idleTimer.current = setTimeout(() => {
      if (imgRef.current) {
        imgRef.current.classList.add('story-panel__hero-media--idle');
      }
    }, 800);

    return () => {
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('mouseleave', handleLeave);
      clearTimeout(idleTimer.current);
    };
  }, [src]);

  return (
    <div ref={containerRef} className="story-panel__hero-parallax">
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="story-panel__hero-media"
        loading="eager"
        onClick={onClick}
        style={{
          cursor: 'pointer',
          willChange: 'transform',
          transition: 'transform 0.6s ease-out',
        }}
      />
    </div>
  );
}

/* ─── Portal CTA ──────────────────────────────────────────────── */

function PortalCTA({ node, onPortalEnter }) {
  if (!onPortalEnter || !node) return null;
  const sceneId = getPortalSceneId(node.id);
  if (!sceneId) return null;

  return (
    <motion.button
      className="story-panel__portal-cta"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
      onClick={() => onPortalEnter(node.id, sceneId)}
    >
      <span className="story-panel__portal-icon" aria-hidden="true" />
      <span className="story-panel__portal-label">Enter this memory</span>
    </motion.button>
  );
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

/* ─── Evidence item with tooltip ──────────────────────────────── */

function EvidenceItem({ ev }) {
  const [showTip, setShowTip] = useState(false);
  const Icon = getEvidenceIcon(ev);
  const color = EVIDENCE_COLORS[ev.type] || '#888';
  const tooltip = getEvidenceTooltip(ev);

  return (
    <div
      className="story-panel__evidence"
      style={{ borderLeftColor: color }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <span className="story-panel__evidence-icon" style={{ color }}>
        <Icon size={12} />
      </span>
      <span className="story-panel__evidence-desc">
        {ev.description}
      </span>
      <AnimatePresence>
        {showTip && (
          <motion.span
            className="story-panel__evidence-tip"
            style={{ backgroundColor: `${color}22`, color, borderColor: `${color}44` }}
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <span
              className="story-panel__evidence-tip-dot"
              style={{ backgroundColor: color }}
            />
            {tooltip}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Because section ──────────────────────────────────────────── */

function BecauseSection({ connectionGroups, focusNode }) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const setHighlightedEdgeNodeId = useConstellationStore((s) => s.setHighlightedEdgeNodeId);
  const clearHighlightedEdgeNodeId = useConstellationStore((s) => s.clearHighlightedEdgeNodeId);

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
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {visible.map((group, idx) => {
              const connStyle =
                TYPE_COLORS[group.nodeType] || TYPE_COLORS.moment;
              // Compute average weight for strength indicator (0-1 scale, capped)
              const avgWeight =
                group.evidence.length > 0
                  ? Math.min(
                      group.evidence.reduce((s, e) => s + (e.weight || 0), 0) /
                        group.evidence.length,
                      1
                    )
                  : 0.3;
              // Map weight to glow opacity (0.08 to 0.3)
              const glowOpacity = 0.08 + avgWeight * 0.22;

              return (
                <motion.div
                  key={group.nodeId}
                  className="story-panel__conn-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.2 }}
                  style={{
                    '--conn-color': connStyle.text,
                    '--conn-glow': glowOpacity,
                  }}
                  onMouseEnter={() => setHighlightedEdgeNodeId(group.nodeId, connStyle.text)}
                  onMouseLeave={() => clearHighlightedEdgeNodeId()}
                >
                  {/* Strength bar — thicker = stronger connection */}
                  <div
                    className="story-panel__conn-strength"
                    style={{
                      backgroundColor: connStyle.text,
                      opacity: 0.15 + avgWeight * 0.55,
                      width: `${Math.max(2, avgWeight * 4)}px`,
                    }}
                  />

                  <div className="story-panel__conn-inner">
                    <button
                      className="story-panel__conn-title"
                      onClick={() => focusNode(group.nodeId)}
                      style={{ color: connStyle.text }}
                    >
                      <span
                        className="story-panel__conn-dot"
                        style={{ backgroundColor: connStyle.text }}
                      />
                      <span className="story-panel__conn-title-text">
                        {group.nodeTitle}
                      </span>
                      <ChevronRight
                        size={14}
                        className="story-panel__conn-arrow"
                      />
                    </button>

                    {group.evidence.map((ev, j) => (
                      <EvidenceItem key={j} ev={ev} />
                    ))}
                  </div>
                </motion.div>
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

/* ─── Typewriter description ───────────────────────────────────── */

function TypewriterDescription({ text, nodeId, centered }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const shouldAnimate = text && text.length > 200;

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayedText(text || '');
      setIsTyping(false);
      setIsExpanded(false);
      return;
    }

    setDisplayedText('');
    setIsExpanded(false);
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [nodeId, text, shouldAnimate]);

  if (!text) return null;

  if (!shouldAnimate) {
    return (
      <p className={`story-panel__description${centered ? ' story-panel__description--centered' : ''}`}>
        {text}
      </p>
    );
  }

  return (
    <div className="story-panel__typewriter">
      <div className={`story-panel__typewriter-box${isExpanded ? ' story-panel__typewriter-box--expanded' : ''}`}>
        <p className={`story-panel__description${centered ? ' story-panel__description--centered' : ''}`}>
          {displayedText}
          {isTyping && <span className="story-panel__typewriter-cursor">|</span>}
        </p>
      </div>
      {!isExpanded && <div className="story-panel__typewriter-fade" />}
      {!isExpanded && (
        <button className="story-panel__typewriter-expand" onClick={() => setIsExpanded(true)}>
          Read full story
        </button>
      )}
    </div>
  );
}

/* ─── Main StoryPanel ──────────────────────────────────────────── */

export default function StoryPanel({ onPortalEnter = null }) {
  const clearFocus = useConstellationStore((s) => s.clearFocus);
  const focusNode = useConstellationStore((s) => s.focusNode);
  const openLightbox = useConstellationStore((s) => s.openLightbox);
  const setHighlightedEdgeNodeId = useConstellationStore((s) => s.setHighlightedEdgeNodeId);
  const clearHighlightedEdgeNodeId = useConstellationStore((s) => s.clearHighlightedEdgeNodeId);

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

  // ─── Audio prompt (two-tier: hero for first encounter, subtle after) ──
  const hasVideoMedia = node?.media?.some((item) => getMediaType(item) === 'video') || false;
  const hasAudioContent = !!audioSrc || hasVideoMedia;
  const audioPromptLabel = audioLabel || (hasVideoMedia ? 'This moment has audio' : null);
  const audioPromptCta = audioSrc ? 'Turn on the soundtrack' : 'Unmute this video';

  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const [hasHeardAudio, setHasHeardAudio] = useState(
    () => sessionStorage.getItem('jarowe_audio_ever_heard') === '1'
  );

  // Mark as "heard" whenever the user unmutes (by any means)
  useEffect(() => {
    if (!nodeAudioMuted && hasAudioContent) {
      sessionStorage.setItem('jarowe_audio_ever_heard', '1');
      setHasHeardAudio(true);
    }
  }, [nodeAudioMuted, hasAudioContent]);

  useEffect(() => {
    if (hasAudioContent && nodeAudioMuted) {
      setShowAudioPrompt(true);
      const timeout = hasHeardAudio ? 5000 : 8000;
      const timer = setTimeout(() => setShowAudioPrompt(false), timeout);
      return () => clearTimeout(timer);
    }
    setShowAudioPrompt(false);
  }, [hasAudioContent, nodeAudioMuted, hasHeardAudio]);

  const handleAudioPromptClick = useCallback(() => {
    if (audioSrc) {
      toggleNodeAudio();
    } else if (videoRef.current) {
      videoRef.current.muted = false;
      duckForNodeAudio();
      setNodeAudioMuted(false);
      sessionStorage.setItem('jarowe_video_unmuted', '1');
    }
    setShowAudioPrompt(false);
  }, [audioSrc, toggleNodeAudio, duckForNodeAudio]);

  // Detect mobile for animation direction
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // ─── Resizable panel width (desktop only) ─────────────────
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === 'undefined' || window.innerWidth <= 768) return null;
    const saved = localStorage.getItem('jarowe_story_panel_width');
    return saved ? Number(saved) : null;
  });
  const isResizing = useRef(false);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    const onMouseMove = (ev) => {
      if (!isResizing.current) return;
      const w = Math.min(Math.max(window.innerWidth - ev.clientX, 320), window.innerWidth * 0.7);
      setPanelWidth(w);
    };
    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setPanelWidth((w) => {
        if (w) localStorage.setItem('jarowe_story_panel_width', String(w));
        return w;
      });
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

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
            style={!isMobile && panelWidth ? { width: panelWidth } : undefined}
          >
            {/* Resize handle (desktop) */}
            {!isMobile && (
              <div className="story-panel__resize-handle" onMouseDown={handleResizeStart}>
                <div className="story-panel__resize-indicator" />
              </div>
            )}

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
                          <HeroParallaxImage
                            src={heroUrl}
                            alt={node.title}
                            onClick={() => openLightbox(media, heroIdx)}
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

                  <AnimatePresence>
                    {showAudioPrompt && !hasHeardAudio && (
                      <motion.button
                        key="hero-prompt"
                        className="story-panel__audio-prompt--hero"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        onClick={handleAudioPromptClick}
                      >
                        <div className="story-panel__audio-eq">
                          <span /><span /><span /><span /><span />
                        </div>
                        <span className="story-panel__audio-prompt-song">
                          {audioPromptLabel}
                        </span>
                        <span className="story-panel__audio-prompt-cta">
                          <Volume2 size={14} />
                          {audioPromptCta}
                        </span>
                      </motion.button>
                    )}
                    {showAudioPrompt && hasHeardAudio && (
                      <motion.button
                        key="subtle-prompt"
                        className="story-panel__audio-prompt"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        onClick={handleAudioPromptClick}
                      >
                        <Volume2 size={14} />
                        {audioSrc ? 'This moment has a soundtrack — tap to listen' : 'This video has audio — tap to unmute'}
                      </motion.button>
                    )}
                  </AnimatePresence>

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
                            <div
                              key={`${entity.type}-${entity.label}-${i}`}
                              onMouseEnter={() => entity.nodeId && setHighlightedEdgeNodeId(entity.nodeId, TYPE_COLORS[entity.type]?.text)}
                              onMouseLeave={() => clearHighlightedEdgeNodeId()}
                              style={{ display: 'inline-flex' }}
                            >
                              <EntityChip
                                type={entity.type}
                                label={entity.label}
                                count={entity.count}
                                onClick={entity.nodeId ? () => focusNode(entity.nodeId) : undefined}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <PortalCTA node={node} onPortalEnter={onPortalEnter} />
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
                          <HeroParallaxImage
                            src={heroUrl}
                            alt={node.title}
                            onClick={() => openLightbox(media, heroIdx)}
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

                  <AnimatePresence>
                    {showAudioPrompt && !hasHeardAudio && (
                      <motion.button
                        key="hero-prompt"
                        className="story-panel__audio-prompt--hero"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        onClick={handleAudioPromptClick}
                      >
                        <div className="story-panel__audio-eq">
                          <span /><span /><span /><span /><span />
                        </div>
                        <span className="story-panel__audio-prompt-song">
                          {audioPromptLabel}
                        </span>
                        <span className="story-panel__audio-prompt-cta">
                          <Volume2 size={14} />
                          {audioPromptCta}
                        </span>
                      </motion.button>
                    )}
                    {showAudioPrompt && hasHeardAudio && (
                      <motion.button
                        key="subtle-prompt"
                        className="story-panel__audio-prompt"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        onClick={handleAudioPromptClick}
                      >
                        <Volume2 size={14} />
                        {audioSrc ? 'This moment has a soundtrack — tap to listen' : 'This video has audio — tap to unmute'}
                      </motion.button>
                    )}
                  </AnimatePresence>

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
                      <TypewriterDescription
                        text={node.description}
                        nodeId={node.id}
                      />
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
                            <div
                              key={`${entity.type}-${entity.label}-${i}`}
                              onMouseEnter={() => entity.nodeId && setHighlightedEdgeNodeId(entity.nodeId, TYPE_COLORS[entity.type]?.text)}
                              onMouseLeave={() => clearHighlightedEdgeNodeId()}
                              style={{ display: 'inline-flex' }}
                            >
                              <EntityChip
                                type={entity.type}
                                label={entity.label}
                                count={entity.count}
                                onClick={entity.nodeId ? () => focusNode(entity.nodeId) : undefined}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <PortalCTA node={node} onPortalEnter={onPortalEnter} />
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
                      <TypewriterDescription
                        text={node.description}
                        nodeId={node.id}
                        centered
                      />
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
                            onClick={entity.nodeId ? () => focusNode(entity.nodeId) : undefined}
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
