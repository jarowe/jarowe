import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from 'react';
import { Link } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  artist,
  album,
  tracks,
  ctas,
  timeline,
  focusTrackId,
  press,
  streamingLinks,
} from '../../../content/takeovers/bitb/config';
import './ReleaseLandingPage.css';

/* Module-level flag — intro flash plays only once per SPA session */
let introFlashPlayed = false;

const EASE_OUT = [0.22, 1, 0.36, 1];

const sectionReveal = {
  hidden: { opacity: 0, y: 54 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.92, ease: EASE_OUT },
  },
};

const staggerReveal = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

/* Hero entrance — delayed to sync with intro flash */
const heroStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.10, delayChildren: 0.5 },
  },
};

const heroChildReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_OUT },
  },
};

const childReveal = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.82, ease: EASE_OUT },
  },
};

function getTimelineItemState(item, currentPhase) {
  const phaseOrder = ['pre-single', 'single-live', 'pre-album', 'album-live'];
  const currentIdx = phaseOrder.indexOf(currentPhase);
  const itemIdx = phaseOrder.indexOf(item.phase);
  if (itemIdx < currentIdx) return 'past';
  if (itemIdx === currentIdx) return 'active';
  return 'upcoming';
}

function formatTime(sec) {
  const safeSeconds = Number.isFinite(sec) ? sec : 0;
  const m = Math.floor(safeSeconds / 60);
  const s = Math.floor(safeSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getRevealProps(reduceMotion, amount = 0.22) {
  if (reduceMotion) return {};
  return {
    initial: 'hidden',
    whileInView: 'visible',
    viewport: { once: true, amount },
    variants: sectionReveal,
  };
}

function getContainerProps(reduceMotion, amount = 0.22) {
  if (reduceMotion) return {};
  return {
    initial: 'hidden',
    whileInView: 'visible',
    viewport: { once: true, amount },
    variants: staggerReveal,
  };
}

function PreviewPlayer({ track }) {
  const audioRef = useRef(null);
  const rafRef = useRef(0);
  const playerRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const playerId = useId();

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(track.durationSec || 0);
  const [energy, setEnergy] = useState(0);
  const [audioReady, setAudioReady] = useState(Boolean(track.previewSrc));
  const [audioFailed, setAudioFailed] = useState(false);

  const stopMeter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const sampleMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avg = data.length ? sum / data.length / 255 : 0;
    setEnergy((prev) => prev + (avg - prev) * 0.18);
    rafRef.current = requestAnimationFrame(sampleMeter);
  }, []);

  const ensureAudioGraph = useCallback(async () => {
    if (!audioRef.current || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContextRef.current) {
      const context = new AudioCtx();
      const source = context.createMediaElementSource(audioRef.current);
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(context.destination);
      audioContextRef.current = context;
      sourceNodeRef.current = source;
      analyserRef.current = analyser;
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const syncPlaybackState = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const isPlaying = !el.paused && !el.ended;
    setPlaying(isPlaying);
    if (isPlaying) {
      stopMeter();
      sampleMeter();
    } else {
      stopMeter();
      setEnergy((prev) => prev * 0.82);
    }
  }, [sampleMeter, stopMeter]);

  const toggle = useCallback(async () => {
    const el = audioRef.current;
    if (!el || audioFailed || !track.previewSrc) return;

    if (!el.paused && !el.ended) {
      el.pause();
      return;
    }

    try {
      await ensureAudioGraph();
      window.dispatchEvent(new CustomEvent('bitb-preview-play', { detail: { id: playerId } }));
      await el.play();
    } catch (_) {
      setAudioFailed(true);
      setPlaying(false);
    }
  }, [audioFailed, ensureAudioGraph, playerId, track.previewSrc]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;

    const onMetadata = () => {
      setDuration(el.duration || track.durationSec || 0);
      setAudioReady(true);
      setAudioFailed(false);
    };
    const onTime = () => {
      setElapsed(el.currentTime);
      setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
    };
    const onError = () => {
      setAudioReady(false);
      setAudioFailed(true);
      setPlaying(false);
      stopMeter();
      setEnergy(0);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
      setElapsed(0);
      stopMeter();
      setEnergy(0);
      el.currentTime = 0;
    };

    el.addEventListener('loadedmetadata', onMetadata);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', syncPlaybackState);
    el.addEventListener('pause', syncPlaybackState);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);

    return () => {
      el.removeEventListener('loadedmetadata', onMetadata);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', syncPlaybackState);
      el.removeEventListener('pause', syncPlaybackState);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
      stopMeter();
    };
  }, [sampleMeter, stopMeter, syncPlaybackState, track.durationSec]);

  useEffect(() => {
    const handleExternalPlay = (event) => {
      if (event.detail?.id === playerId) return;
      const el = audioRef.current;
      if (el && !el.paused) {
        el.pause();
      }
    };

    window.addEventListener('bitb-preview-play', handleExternalPlay);
    return () => window.removeEventListener('bitb-preview-play', handleExternalPlay);
  }, [playerId]);

  useEffect(() => () => {
    stopMeter();
    try {
      sourceNodeRef.current?.disconnect();
      analyserRef.current?.disconnect();
    } catch (_) {
      // Ignore Web Audio teardown issues on route transitions.
    }
  }, [stopMeter]);

  const seekToPercent = useCallback((percent) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const pct = Math.max(0, Math.min(1, percent));
    el.currentTime = pct * el.duration;
  }, []);

  const seek = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pct = (event.clientX - rect.left) / rect.width;
    seekToPercent(pct);
  };

  const handleKeySeek = (event) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      seekToPercent((el.currentTime + 5) / el.duration);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      seekToPercent((el.currentTime - 5) / el.duration);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      seekToPercent(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      seekToPercent(1);
    }
  };

  return (
    <div
      ref={playerRef}
      className="bitb-player"
      data-playing={playing ? 'true' : 'false'}
      style={{
        '--bitb-player-energy': energy.toFixed(3),
        '--bitb-player-progress': `${progress}%`,
      }}
    >
      <audio ref={audioRef} src={track.previewSrc} preload="metadata" />
      <img
        className="bitb-player__artwork"
        src={album.artwork}
        alt={`${track.title} artwork`}
        draggable={false}
      />
      <div className="bitb-player__info">
        <span className="bitb-player__title">{track.title}</span>
        <span className="bitb-player__artist">{artist.name}</span>
      </div>
      <button
        className={`bitb-player__toggle ${playing ? 'bitb-player__toggle--playing' : ''}`}
        onClick={toggle}
        aria-label={playing ? 'Pause preview' : 'Play preview'}
        disabled={!audioReady || audioFailed}
      >
        <span className="bitb-player__toggle-icon" aria-hidden="true">
          {playing ? '||' : '>'}
        </span>
      </button>
      <div
        className="bitb-player__rail"
        onClick={seek}
        onKeyDown={handleKeySeek}
        role="slider"
        tabIndex={0}
        aria-label={`Preview seek for ${track.title}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || track.durationSec || 0)}
        aria-valuenow={Math.round(elapsed)}
      >
        <div className="bitb-player__fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="bitb-player__elapsed">{formatTime(elapsed)}</span>
      <span className="bitb-player__duration">{formatTime(duration || track.durationSec || 0)}</span>
    </div>
  );
}

function TrackCard({ track, phase, expanded, onToggle, reduceMotion }) {
  const isLocked = !track.isFocusTrack && (phase === 'pre-single' || phase === 'single-live');

  const cardClass = [
    'bitb-track-card',
    expanded ? 'bitb-track-card--expanded' : 'bitb-track-card--collapsed',
    isLocked && 'bitb-track-card--locked',
    track.isFocusTrack && 'bitb-track-card--focus',
  ].filter(Boolean).join(' ');

  const handleInteraction = () => {
    if (!isLocked) onToggle(track.id);
  };

  const handleKeyDown = (event) => {
    if (isLocked) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(track.id);
    }
  };

  return (
    <motion.div
      layout={!reduceMotion}
      className={cardClass}
      role={isLocked ? undefined : 'button'}
      tabIndex={isLocked ? -1 : 0}
      aria-expanded={!isLocked ? expanded : undefined}
      onClick={handleInteraction}
      onKeyDown={handleKeyDown}
      whileHover={reduceMotion || isLocked ? undefined : { y: -3 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      <div className="bitb-track-card__header">
        <span className="bitb-track-card__number">{String(track.number).padStart(2, '0')}</span>
        <span className="bitb-track-card__title">{track.title}</span>
        <span className="bitb-track-card__duration">{track.duration}</span>
        {track.isFocusTrack && <span className="bitb-track-card__badge">Single</span>}
        {isLocked && <span className="bitb-track-card__lock" aria-label="Coming soon">Locked</span>}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key={`${track.id}-body`}
            className="bitb-track-card__body"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={reduceMotion ? {} : { opacity: 1, height: 'auto' }}
            exit={reduceMotion ? {} : { opacity: 0, height: 0 }}
            transition={{ duration: 0.42, ease: EASE_OUT }}
          >
            <div className="bitb-track-card__tags">
              {track.themeTags.map((tag) => (
                <span key={tag} className="bitb-track-card__tag">{tag}</span>
              ))}
            </div>
            {track.lyricExcerpt && (
              <blockquote className="bitb-track-card__lyric">{track.lyricExcerpt}</blockquote>
            )}
            {!isLocked && (
              <div className="bitb-streaming-links">
                {streamingLinks.map(({ platform, label, url }) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className={`bitb-streaming-link bitb-streaming-link--${platform}`}>
                    {label}
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ReleaseLandingPage({ phase = 'pre-single' }) {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef(null);
  const [expandedTrack, setExpandedTrack] = useState(focusTrackId);
  const ctaSet = ctas[phase] ?? ctas['pre-single'];
  const focusTrack = tracks.find((track) => track.id === focusTrackId);

  /* Show intro flash only on first visit this session */
  const showIntro = !reduceMotion && !introFlashPlayed;
  const heroChild = showIntro ? heroChildReveal : childReveal;
  useEffect(() => { introFlashPlayed = true; }, []);

  /* ── Hero parallax ─────────────────────────────────────── */
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroBgScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const heroBgY = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const heroHaloY = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const heroHaloOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.82, 0.26]);
  const heroContentY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const heroContentOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 0.94, 0.24]);

  const handleToggle = (id) => {
    setExpandedTrack((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bitb-landing">
      {/* ── Cinematic intro flash (first visit only) ───── */}
      {showIntro && <div className="bitb-intro-flash" aria-hidden="true" />}

      {/* ── Hero ──────────────────────────────────────────── */}
      <motion.section
        id="bitb-hero"
        ref={heroRef}
        className="bitb-hero"
        initial={reduceMotion ? false : 'hidden'}
        animate={reduceMotion ? undefined : 'visible'}
        variants={showIntro ? heroStagger : staggerReveal}
      >
        <motion.div
          className="bitb-hero__bg"
          aria-hidden="true"
          variants={heroChild}
          style={reduceMotion ? undefined : { scale: heroBgScale, y: heroBgY }}
        />
        <motion.div
          className="bitb-hero__halo"
          aria-hidden="true"
          variants={heroChild}
          style={reduceMotion ? undefined : { y: heroHaloY, opacity: heroHaloOpacity }}
        />
        <motion.div
          className="bitb-hero__content"
          variants={heroChild}
          style={reduceMotion ? undefined : { y: heroContentY, opacity: heroContentOpacity }}
        >
          <motion.p className="bitb-hero__album-tag" variants={heroChildReveal}>
            from {album.title}
          </motion.p>
          <motion.h1 className="bitb-hero__title" variants={heroChildReveal}>
            We Were Never Ready for the Light
          </motion.h1>
          <motion.p className="bitb-hero__subtitle" variants={heroChildReveal}>
            {album.subtitle}
          </motion.p>
          <motion.p className="bitb-hero__whisper" variants={heroChildReveal}>
            Only the echo. Never the sound.
          </motion.p>
          <motion.div className="bitb-hero__dates" variants={heroChildReveal}>
            <span>{phase === 'album-live' ? 'Album out' : 'Single'} {phase === 'album-live' ? '' : 'April 10, 2026'}</span>
            <span>Album May 8, 2026</span>
          </motion.div>
        </motion.div>
        <motion.div className="bitb-hero__cta" variants={heroChildReveal}>
          <a
            href={ctaSet.primary.url}
            className="bitb-cta bitb-cta--primary"
            target="_blank"
            rel="noopener noreferrer"
            data-utm-campaign={ctaSet.primary.utmCampaign}
          >
            {ctaSet.primary.label}
          </a>
          <Link to={ctaSet.secondary.url} className="bitb-cta bitb-cta--secondary">
            {ctaSet.secondary.label}
          </Link>
        </motion.div>
      </motion.section>

      <motion.section
        id="bitb-manifesto"
        className="bitb-manifesto"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-manifesto__artist bitb-surface" variants={childReveal}>
          <span className="bitb-eyebrow">Artist</span>
          <h2 className="bitb-manifesto__heading bitb-section-heading">{artist.name}</h2>
          <p className="bitb-manifesto__text bitb-body-copy">{artist.statement}</p>
        </motion.div>
        <motion.div className="bitb-manifesto__album bitb-surface" variants={childReveal}>
          <span className="bitb-eyebrow">Album</span>
          <h2 className="bitb-manifesto__heading bitb-section-heading">{album.title}</h2>
          <p className="bitb-manifesto__text bitb-body-copy">{album.statement}</p>
        </motion.div>
      </motion.section>

      <motion.section
        id="bitb-focus"
        className="bitb-focus"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-focus__intro" variants={childReveal}>
          <span className="bitb-eyebrow">Focus Single</span>
          <h2 className="bitb-focus__heading bitb-section-heading">The moment where the private ache turns outward.</h2>
        </motion.div>
        {focusTrack && (
          <motion.div className="bitb-focus__module bitb-surface" variants={childReveal}>
            <div className="bitb-focus__artwork-wrap">
              <img
                className="bitb-focus__artwork"
                src={album.artwork}
                alt={focusTrack.title}
                draggable={false}
              />
            </div>
            <div className="bitb-focus__details">
              <p className="bitb-focus__kicker">Track {focusTrack.number}</p>
              <h3 className="bitb-focus__track-title">{focusTrack.title}</h3>
              <div className="bitb-focus__tags">
                {focusTrack.themeTags.map((tag) => (
                  <span key={tag} className="bitb-focus__tag">{tag}</span>
                ))}
              </div>
              <blockquote className="bitb-focus__lyric">{focusTrack.lyricExcerpt}</blockquote>
              <p className="bitb-focus__story bitb-body-copy">
                The lead single is not an anthem of certainty. It is the sound of standing inside exposure,
                grief, and awakening without pretending to be ready for any of it.
              </p>
              <div className="bitb-streaming-links">
                {streamingLinks.map(({ platform, label, url }) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className={`bitb-streaming-link bitb-streaming-link--${platform}`}>
                    {label}
                  </a>
                ))}
              </div>
              <div className="bitb-focus__cta-row">
                <a
                  href={ctaSet.primary.url}
                  className="bitb-cta bitb-cta--primary"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-utm-campaign={ctaSet.primary.utmCampaign}
                >
                  {ctaSet.primary.label}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </motion.section>

      <motion.section
        id="bitb-world"
        className="bitb-world"
        {...getContainerProps(reduceMotion, 0.12)}
      >
        <motion.div className="bitb-world__header" variants={childReveal}>
          <span className="bitb-eyebrow">Album World</span>
          <h2 className="bitb-world__heading bitb-section-heading">Contained emotion becoming cosmic.</h2>
          <p className="bitb-world__intro bitb-body-copy">{album.statement}</p>
        </motion.div>
        <motion.div className="bitb-world__tracklist" variants={childReveal}>
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              phase={phase}
              expanded={expandedTrack === track.id}
              onToggle={handleToggle}
              reduceMotion={reduceMotion}
            />
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        id="bitb-timeline"
        className="bitb-timeline"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-timeline__header" variants={childReveal}>
          <span className="bitb-eyebrow">Rollout</span>
          <h2 className="bitb-timeline__heading">A clear spine after the rupture.</h2>
        </motion.div>
        <motion.div className="bitb-timeline__track" variants={childReveal}>
          {timeline.map((item, index) => {
            const state = getTimelineItemState(item, phase);
            return (
              <motion.div
                key={item.id}
                className={`bitb-timeline-item bitb-timeline-item--${state}`}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.72, delay: index * 0.08, ease: EASE_OUT }}
              >
                <span className="bitb-timeline-item__marker" />
                <span className="bitb-timeline-item__label">{item.label}</span>
                {item.date && <span className="bitb-timeline-item__date">{item.date}</span>}
              </motion.div>
            );
          })}
        </motion.div>
      </motion.section>

      <motion.section
        id="bitb-press"
        className="bitb-press"
        {...getContainerProps(reduceMotion)}
      >
        <motion.div className="bitb-press__header" variants={childReveal}>
          <span className="bitb-eyebrow">For Press and Creators</span>
          <h2 className="bitb-press__heading">The practical layer, without breaking the spell.</h2>
          <p className="bitb-press__blurb bitb-body-copy">{press.oneLiner}</p>
        </motion.div>
        <motion.div className="bitb-press__cards" variants={childReveal}>
          <motion.div className="bitb-press-card bitb-surface" whileHover={reduceMotion ? undefined : { y: -4 }}>
            <h3 className="bitb-press-card__title">Electronic Press Kit</h3>
            <p className="bitb-press-card__text">
              Bios, assets, tracklist, credits, and contact - everything needed in one place.
            </p>
            <Link to="/music/boy-in-the-bubble/epk" className="bitb-press-card__cta">
              Open EPK
            </Link>
          </motion.div>
          <motion.div className="bitb-press-card bitb-surface" whileHover={reduceMotion ? undefined : { y: -4 }}>
            <h3 className="bitb-press-card__title">About the Artist</h3>
            <p className="bitb-press-card__text">
              The story behind Jarowe, the emotional logic of the album, and the context that surrounds it.
            </p>
            <Link to="/music/boy-in-the-bubble/artist" className="bitb-press-card__cta">
              Read More
            </Link>
          </motion.div>
        </motion.div>
      </motion.section>

      <motion.section
        id="bitb-footer"
        className="bitb-footer"
        {...getRevealProps(reduceMotion)}
      >
        <div className="bitb-footer__links">
          <Link to="/music/boy-in-the-bubble/artist" className="bitb-footer__link">
            About {artist.name}
          </Link>
          <span className="bitb-footer__divider" aria-hidden="true" />
          <Link to="/world" className="bitb-footer__link">
            Visit jarowe.com
          </Link>
        </div>
        <div className="bitb-footer__socials">
          {Object.entries(artist.socials).map(([platform, url]) => (
            <a
              key={platform}
              href={url}
              className="bitb-footer__social"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={platform}
              data-platform={platform}
            >
              {platform}
            </a>
          ))}
        </div>
        <p className="bitb-footer__copy">&copy; {new Date().getFullYear()} {artist.name}</p>
      </motion.section>
    </div>
  );
}
