import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, MoveRight, Sparkles, Wind } from 'lucide-react';

import MemoryCorridorTransition from '../components/MemoryCorridorTransition';
import WorldMemoryRenderer from '../components/WorldMemoryRenderer';
import { useAudio } from '../context/AudioContext';
import {
  getArchiveScenes,
  getDefaultArchiveSceneId,
  getPreferredNeighborSceneId,
  getSceneById,
  getSceneNeighbors,
} from '../data/memoryScenes';
import { getGpuTier } from '../utils/gpuCapability';
import './MemoryArchiveScene.css';

const BASE = import.meta.env.BASE_URL;
const ARRIVAL_DURATION_MS = 1800;
const CORRIDOR_DURATION_MS = 1800;
const TRAVEL_THRESHOLD = 1100;
const TRAVEL_DECAY = 0.0035;
const WHEEL_DELTA_CAP = 180;
const TRAVEL_SESSION_KEY = 'jarowe_archive_travel';
const WHEEL_BLOCK_SELECTOR = 'a, button, input, textarea, [role="slider"], .global-player';

function resolveAsset(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

function isArchiveSceneId(sceneId) {
  return getArchiveScenes().some((scene) => scene.id === sceneId);
}

function getNarrationForPhase(scene, phase) {
  const narration = scene.archiveNode?.narration;
  if (!narration) return null;

  if (phase === 'arrive') return narration.arrival;
  if (phase === 'depart') return narration.departure;
  if (phase === 'corridor') return narration.connective;
  return narration.explore;
}

function readArchiveTravel() {
  try {
    const raw = window.sessionStorage.getItem(TRAVEL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeArchiveTravel(travel) {
  try {
    window.sessionStorage.setItem(TRAVEL_SESSION_KEY, JSON.stringify(travel));
  } catch {
    // Ignore storage failures in privacy-restricted contexts.
  }
}

function clearArchiveTravel() {
  try {
    window.sessionStorage.removeItem(TRAVEL_SESSION_KEY);
  } catch {
    // Ignore storage failures in privacy-restricted contexts.
  }
}

function ArchiveFallback({ scene }) {
  const previewUrl = resolveAsset(scene.previewImage || scene.photoUrl);

  return (
    <div
      className="memory-archive__fallback"
      style={previewUrl ? {
        background: `linear-gradient(rgba(5, 5, 10, 0.7), rgba(5, 5, 10, 0.86)), url(${previewUrl}) center / cover no-repeat`,
      } : undefined}
    >
      <div className="memory-archive__fallback-copy">
        <span>Preparing the archive...</span>
      </div>
    </div>
  );
}

export default function MemoryArchiveScene() {
  const { sceneId } = useParams();
  const navigate = useNavigate();
  const audio = useAudio();

  const initialSceneId = useMemo(() => {
    if (sceneId && isArchiveSceneId(sceneId)) return sceneId;
    return getDefaultArchiveSceneId();
  }, [sceneId]);

  const [activeSceneId, setActiveSceneId] = useState(initialSceneId);
  const [tier, setTier] = useState(null);
  const [phase, setPhase] = useState('arrive');
  const [travelDepth, setTravelDepth] = useState(0);
  const [threadCharge, setThreadCharge] = useState(0);
  const [corridorProgress, setCorridorProgress] = useState(0);
  const [pendingSceneId, setPendingSceneId] = useState(null);
  const [pendingDirection, setPendingDirection] = useState('next');
  const [sceneProgress, setSceneProgress] = useState(0);
  const [pointerState, setPointerState] = useState({ x: 0, y: 0, activity: 0 });
  const arrivalTimerRef = useRef(null);
  const corridorTimerRef = useRef(null);
  const corridorStartRef = useRef(0);
  const pointerDecayRef = useRef(0);
  const lastTravelInputRef = useRef(0);

  useEffect(() => {
    setTier(getGpuTier());
  }, []);

  useEffect(() => {
    setActiveSceneId((current) => (current === initialSceneId ? current : initialSceneId));
  }, [initialSceneId]);

  useEffect(() => {
    if (!audio) return undefined;
    audio.duckForCapsule();
    return () => {
      audio.restoreFromCapsule();
    };
  }, [audio]);

  useEffect(() => {
    const persistedTravel = readArchiveTravel();
    if (!persistedTravel) return;

    if (persistedTravel.targetSceneId === initialSceneId) {
      clearArchiveTravel();
      return;
    }

    if (persistedTravel.sourceSceneId !== initialSceneId) {
      return;
    }

    const elapsed = Date.now() - persistedTravel.startedAt;
    if (elapsed >= CORRIDOR_DURATION_MS) {
      clearArchiveTravel();
      navigate(`/archive/${persistedTravel.targetSceneId}`, { replace: true });
      return;
    }

    clearTimeout(arrivalTimerRef.current);
    window.clearTimeout(corridorTimerRef.current);
    setPendingSceneId(persistedTravel.targetSceneId);
    setPendingDirection(persistedTravel.direction || 'next');
    setThreadCharge(1);
    setCorridorProgress(elapsed / CORRIDOR_DURATION_MS);
    setPhase('corridor');
    corridorStartRef.current = performance.now() - elapsed;
    corridorTimerRef.current = window.setTimeout(() => {
      navigate(`/archive/${persistedTravel.targetSceneId}`);
    }, CORRIDOR_DURATION_MS - elapsed);
  }, [initialSceneId, navigate]);

  useEffect(() => {
    const persistedTravel = readArchiveTravel();
    const shouldResumeCorridor = persistedTravel
      && persistedTravel.sourceSceneId === activeSceneId
      && persistedTravel.targetSceneId !== activeSceneId
      && (Date.now() - persistedTravel.startedAt) < CORRIDOR_DURATION_MS;

    if (shouldResumeCorridor) {
      return undefined;
    }

    window.clearTimeout(corridorTimerRef.current);
    setPhase('arrive');
    setTravelDepth(0);
    setThreadCharge(0);
    setCorridorProgress(0);
    setPendingSceneId(null);
    setSceneProgress(0);

    clearTimeout(arrivalTimerRef.current);
    arrivalTimerRef.current = setTimeout(() => {
      setPhase('explore');
    }, ARRIVAL_DURATION_MS);

    return () => {
      clearTimeout(arrivalTimerRef.current);
    };
  }, [activeSceneId]);

  useEffect(() => {
    if (phase !== 'depart') return undefined;

    const decayTimer = window.setInterval(() => {
      if (Date.now() - lastTravelInputRef.current < 240) return;
      setThreadCharge((value) => {
        const nextValue = Math.max(0, value - TRAVEL_DECAY);
        if (nextValue === 0) {
          setPendingSceneId(null);
          setPhase('explore');
        }
        return nextValue;
      });
    }, 16);

    return () => window.clearInterval(decayTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'corridor') return undefined;

    let frameId = 0;
    corridorStartRef.current = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - corridorStartRef.current) / CORRIDOR_DURATION_MS, 1);
      setCorridorProgress(progress);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [phase]);

  useEffect(() => () => {
    clearTimeout(arrivalTimerRef.current);
    window.clearTimeout(corridorTimerRef.current);
    cancelAnimationFrame(pointerDecayRef.current);
  }, []);

  const scene = getSceneById(activeSceneId);
  const neighbors = useMemo(() => getSceneNeighbors(activeSceneId), [activeSceneId]);
  const nextSceneId = pendingSceneId || getPreferredNeighborSceneId(activeSceneId, 'next');
  const previousSceneId = getPreferredNeighborSceneId(activeSceneId, 'previous');
  const nextScene = nextSceneId ? getSceneById(nextSceneId) : null;
  const previousScene = previousSceneId ? getSceneById(previousSceneId) : null;
  const narrationText = getNarrationForPhase(scene, phase);

  const beginTravel = useCallback((targetSceneId, direction) => {
    if (!targetSceneId || phase === 'corridor') return;
    setPendingSceneId(targetSceneId);
    setPendingDirection(direction);
    setPhase((current) => (current === 'explore' || current === 'arrive' ? 'depart' : current));
  }, [phase]);

  const startCorridorTravel = useCallback((targetSceneId, direction) => {
    if (!targetSceneId || phase === 'corridor') return;
    clearTimeout(arrivalTimerRef.current);
    window.clearTimeout(corridorTimerRef.current);
    writeArchiveTravel({
      sourceSceneId: activeSceneId,
      targetSceneId,
      direction,
      startedAt: Date.now(),
    });
    setPendingSceneId(targetSceneId);
    setPendingDirection(direction);
    setThreadCharge(1);
    setCorridorProgress(0);
    setPhase('corridor');
    corridorTimerRef.current = window.setTimeout(() => {
      navigate(`/archive/${targetSceneId}`);
    }, CORRIDOR_DURATION_MS);
  }, [activeSceneId, navigate, phase]);

  const handleTravelWheel = useCallback((event) => {
    if (phase === 'corridor') return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(WHEEL_BLOCK_SELECTOR)) {
      return;
    }

    const normalizedDelta = Math.min(Math.abs(event.deltaY), WHEEL_DELTA_CAP) / TRAVEL_THRESHOLD;
    if (normalizedDelta <= 0.001) return;
    lastTravelInputRef.current = Date.now();
    event.stopPropagation();
    event.preventDefault();

    if (event.deltaY >= 0) {
      if (threadCharge > 0 && pendingDirection === 'previous') {
        setThreadCharge((value) => Math.max(0, value - normalizedDelta * 1.1));
        return;
      }

      if (travelDepth < 0.995) {
        setPendingDirection('next');
        setPendingSceneId(nextSceneId);
        setThreadCharge(0);
        setPhase((current) => (current === 'arrive' ? 'explore' : current));
        setTravelDepth((value) => Math.min(1, value + normalizedDelta));
        return;
      }

      if (!nextSceneId) return;
      beginTravel(nextSceneId, 'next');
      setPendingDirection('next');
      setPendingSceneId(nextSceneId);
      setPhase('depart');
      setThreadCharge((value) => {
        const nextValue = Math.min(1, value + normalizedDelta * 0.95);
        if (nextValue >= 1) {
          window.setTimeout(() => {
            startCorridorTravel(nextSceneId, 'next');
          }, 0);
        }
        return nextValue;
      });
      return;
    }

    if (threadCharge > 0 && pendingDirection === 'next') {
      setThreadCharge((value) => Math.max(0, value - normalizedDelta * 1.1));
      return;
    }

    if (travelDepth > 0.04) {
      setThreadCharge(0);
      setPendingSceneId(null);
      setPendingDirection('next');
      setPhase('explore');
      setTravelDepth((value) => Math.max(0, value - normalizedDelta * 1.2));
      return;
    }

    if (!previousSceneId) return;
    beginTravel(previousSceneId, 'previous');
    setPendingDirection('previous');
    setPendingSceneId(previousSceneId);
    setPhase('depart');
    setThreadCharge((value) => {
      const nextValue = Math.min(1, value + normalizedDelta * 0.95);
      if (nextValue >= 1) {
        window.setTimeout(() => {
          startCorridorTravel(previousSceneId, 'previous');
        }, 0);
      }
      return nextValue;
    });
  }, [
    beginTravel,
    nextSceneId,
    pendingDirection,
    phase,
    previousSceneId,
    startCorridorTravel,
    threadCharge,
    travelDepth,
  ]);

  const handleTravelClick = useCallback(() => {
    if (!nextScene || phase === 'corridor') return;
    beginTravel(nextScene.id, 'next');
    startCorridorTravel(nextScene.id, 'next');
  }, [beginTravel, nextScene, phase, startCorridorTravel]);

  const handleArchivePointerMove = useCallback((event) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -((event.clientY / window.innerHeight) * 2 - 1);
    setPointerState({ x, y, activity: 1 });
  }, []);

  const handleArchivePointerLeave = useCallback(() => {
    setPointerState((current) => ({ ...current, activity: 0 }));
  }, []);

  useEffect(() => {
    const tick = () => {
      setPointerState((current) => {
        if (current.activity <= 0.02) {
          return current.activity === 0 ? current : { ...current, activity: 0 };
        }
        return { ...current, activity: Math.max(0, current.activity - 0.012) };
      });
      pointerDecayRef.current = requestAnimationFrame(tick);
    };

    pointerDecayRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(pointerDecayRef.current);
  }, []);

  useEffect(() => {
    const handleWindowWheel = (event) => {
      handleTravelWheel(event);
    };

    window.addEventListener('wheel', handleWindowWheel, { capture: true, passive: false });
    return () => {
      window.removeEventListener('wheel', handleWindowWheel, { capture: true });
    };
  }, [handleTravelWheel]);

  const nextThemes = nextScene?.archiveNode?.themes?.slice(0, 3) ?? [];
  const nextPreviewUrl = nextScene ? resolveAsset(nextScene.previewImage || nextScene.photoUrl) : null;
  const travelStatus = phase === 'corridor'
    ? `thread ${Math.round(corridorProgress * 100)}% formed`
    : phase === 'depart'
      ? threadCharge < 0.58
        ? `filament ${(threadCharge * 100).toFixed(0)}% awake`
        : `drift ${(threadCharge * 100).toFixed(0)}% toward ${pendingDirection === 'previous' ? previousScene?.title ?? 'the previous memory' : nextScene?.title ?? 'the next memory'}`
      : threadCharge > 0.02
        ? `filament ${(threadCharge * 100).toFixed(0)}% awake`
        : travelDepth > 0.02
          ? `memory ${(travelDepth * 100).toFixed(0)}% traversed`
          : sceneProgress > 0.01
            ? `memory ${(sceneProgress * 100).toFixed(0)}% resolved`
            : 'archive listening';

  return (
    <div
      className="memory-archive"
      onPointerMove={handleArchivePointerMove}
      onPointerLeave={handleArchivePointerLeave}
    >
      <div className="memory-archive__world">
        {tier === null ? (
          <ArchiveFallback scene={scene} />
        ) : (
          <Suspense fallback={<ArchiveFallback scene={scene} />}>
            <WorldMemoryRenderer
              key={activeSceneId}
              scene={scene}
              tier={tier}
              directAccess
              enablePostProcessing={false}
              onAwakeningComplete={() => undefined}
              onRecessionComplete={() => undefined}
              onProgress={setSceneProgress}
              archiveMode
              archiveTravelProgress={phase === 'corridor' ? 1 : travelDepth}
              archivePointer={pointerState}
              travelDirection={pendingDirection}
            />
          </Suspense>
        )}
      </div>

      <div className="memory-archive__chrome">
        <Link className="memory-archive__back" to={`/memory/${activeSceneId}`}>
          <ArrowLeft size={18} />
          <span>Open Capsule</span>
        </Link>

        <div className="memory-archive__eyebrow">
          <Sparkles size={14} />
          <span>Memory Archive</span>
        </div>

        <div className="memory-archive__title-block">
          <div className="memory-archive__title">{scene.title}</div>
          <div className="memory-archive__subtitle">{scene.location}</div>
        </div>

        <div className="memory-archive__network">
          <span>{neighbors.previousScenes.length} previous</span>
          <span>{neighbors.nextScenes.length} next</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeSceneId}-${phase}`}
          className="memory-archive__monologue"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="memory-archive__monologue-label">
            <Wind size={14} />
            <span>{scene.archiveNode?.voiceProfile || 'archive-voice'}</span>
          </div>
          <p>{narrationText}</p>
        </motion.div>
      </AnimatePresence>

      <div className="memory-archive__travel">
        <div className="memory-archive__travel-copy">
          <div className="memory-archive__travel-label">
            {phase === 'corridor'
              ? 'Crossing the thread'
              : nextScene
                ? threadCharge > 0.02
                  ? 'Keep scrolling and the next filament will take hold.'
                  : travelDepth < 0.92
                    ? 'Scroll through the memory. Move your cursor to wake the hidden threads.'
                    : 'You are inside the memory. Keep scrolling to open the next filament.'
                : pendingDirection === 'previous'
                  ? 'Look back through the previous filament'
                  : 'No linked memories yet'}
          </div>
          <div className="memory-archive__travel-destination">
            {nextScene ? (
              <>
                <span>Thread opens toward</span>
                <MoveRight size={14} />
                <strong>{nextScene.title}</strong>
              </>
            ) : previousScene ? (
              <>
                <span>Previous memory</span>
                <MoveRight size={14} />
                <strong>{previousScene.title}</strong>
              </>
            ) : (
              <span>No linked memories yet</span>
            )}
          </div>
        </div>

        <div className="memory-archive__travel-meter">
          <motion.div
            className="memory-archive__travel-meter-fill"
            animate={{ scaleX: phase === 'corridor' ? corridorProgress : (threadCharge > 0.02 ? threadCharge : travelDepth) }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
        </div>

        <div className="memory-archive__travel-actions">
          {nextScene && (
            <div className="memory-archive__travel-destination-card">
              <div
                className="memory-archive__travel-preview"
                style={nextPreviewUrl ? { backgroundImage: `url(${nextPreviewUrl})` } : undefined}
              />
              <div className="memory-archive__travel-meta">
                <span className="memory-archive__travel-meta-label">Thread destination</span>
                <strong>{nextScene.title}</strong>
                <span>{nextScene.location}</span>
                {nextThemes.length > 0 && (
                  <div className="memory-archive__travel-tags">
                    {nextThemes.map((theme) => (
                      <span key={theme} className="memory-archive__travel-tag">
                        {theme}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="memory-archive__travel-button"
                style={{ '--travel-progress': `${Math.round((phase === 'corridor' ? corridorProgress : threadCharge) * 360)}deg` }}
                onClick={handleTravelClick}
              >
                <span className="memory-archive__travel-button-inner">
                  <span className="memory-archive__travel-button-label">
                    {phase === 'corridor' ? 'Crossing the thread' : 'Skip'}
                  </span>
                  <span className="memory-archive__travel-button-caption">secondary</span>
                </span>
              </button>
            </div>
          )}
          <span className="memory-archive__travel-progress">
            {travelStatus}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {phase === 'corridor' && (
          <motion.div
            className="memory-archive__corridor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {nextScene && (
              <MemoryCorridorTransition
                currentScene={scene}
                nextScene={nextScene}
                progress={corridorProgress}
                direction={pendingDirection}
              />
            )}
            <div className="memory-archive__corridor-wash" />
            <motion.div
              className="memory-archive__corridor-copy"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <span>Traveling through the archive</span>
              <strong>{scene.title}</strong>
              <MoveRight size={16} />
              <strong>{nextScene?.title || 'the next memory'}</strong>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
