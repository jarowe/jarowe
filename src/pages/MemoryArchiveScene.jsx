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
const TRAVEL_THRESHOLD = 1100;
const TRAVEL_DECAY = 0.0035;
const WHEEL_DELTA_CAP = 180;
const DEPART_CHARGE_RATE = 0.72;
const CORRIDOR_SCROLL_RATE = 0.68;
const CORRIDOR_REVERSE_RATE = 0.92;
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
  const pointerDecayRef = useRef(0);
  const lastTravelInputRef = useRef(0);
  const phaseRef = useRef('arrive');
  const travelDepthRef = useRef(0);
  const threadChargeRef = useRef(0);
  const corridorProgressRef = useRef(0);
  const pendingSceneIdRef = useRef(null);
  const pendingDirectionRef = useRef('next');

  useEffect(() => {
    setTier(getGpuTier());
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
    travelDepthRef.current = travelDepth;
    threadChargeRef.current = threadCharge;
    corridorProgressRef.current = corridorProgress;
    pendingSceneIdRef.current = pendingSceneId;
    pendingDirectionRef.current = pendingDirection;
  }, [corridorProgress, pendingDirection, pendingSceneId, phase, threadCharge, travelDepth]);

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
    setPhase('arrive');
    setTravelDepth(0);
    setThreadCharge(0);
    setCorridorProgress(0);
    setPendingSceneId(null);
    setSceneProgress(0);
    phaseRef.current = 'arrive';
    travelDepthRef.current = 0;
    threadChargeRef.current = 0;
    corridorProgressRef.current = 0;
    pendingSceneIdRef.current = null;
    pendingDirectionRef.current = 'next';

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

  useEffect(() => () => {
    clearTimeout(arrivalTimerRef.current);
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
    if (!targetSceneId || phaseRef.current === 'corridor') return;
    setPendingSceneId(targetSceneId);
    setPendingDirection(direction);
    setPhase((current) => (current === 'explore' || current === 'arrive' ? 'depart' : current));
    pendingSceneIdRef.current = targetSceneId;
    pendingDirectionRef.current = direction;
  }, []);

  const completeCorridorTravel = useCallback((targetSceneId) => {
    if (!targetSceneId) return;
    setCorridorProgress(1);
    setThreadCharge(0);
    setTravelDepth(0);
    setPendingSceneId(null);
    setPendingDirection('next');
    setSceneProgress(0);
    corridorProgressRef.current = 1;
    threadChargeRef.current = 0;
    travelDepthRef.current = 0;
    pendingSceneIdRef.current = null;
    pendingDirectionRef.current = 'next';
    navigate(`/archive/${targetSceneId}`);
  }, [navigate]);

  const enterCorridor = useCallback((targetSceneId, direction, initialProgress = 0) => {
    if (!targetSceneId) return;
    clearTimeout(arrivalTimerRef.current);
    const startingProgress = Math.min(0.32, Math.max(0, initialProgress));
    setPendingSceneId(targetSceneId);
    setPendingDirection(direction);
    setThreadCharge(1);
    setCorridorProgress(startingProgress);
    setPhase('corridor');
    pendingSceneIdRef.current = targetSceneId;
    pendingDirectionRef.current = direction;
    threadChargeRef.current = 1;
    corridorProgressRef.current = startingProgress;
    phaseRef.current = 'corridor';
  }, []);

  const handleTravelWheel = useCallback((event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(WHEEL_BLOCK_SELECTOR)) {
      return;
    }

    const normalizedDelta = Math.min(Math.abs(event.deltaY), WHEEL_DELTA_CAP) / TRAVEL_THRESHOLD;
    if (normalizedDelta <= 0.001) return;
    lastTravelInputRef.current = Date.now();
    event.stopPropagation();
    event.preventDefault();

    if (phaseRef.current === 'corridor') {
      const targetSceneId = pendingSceneIdRef.current;
      if (!targetSceneId) return;
      if (event.deltaY >= 0) {
        const nextValue = Math.min(1, corridorProgressRef.current + normalizedDelta * CORRIDOR_SCROLL_RATE);
        corridorProgressRef.current = nextValue;
        setCorridorProgress(nextValue);
        if (nextValue >= 1) {
          completeCorridorTravel(targetSceneId);
        }
        return;
      }

      const nextValue = Math.max(0, corridorProgressRef.current - normalizedDelta * CORRIDOR_REVERSE_RATE);
      corridorProgressRef.current = nextValue;
      setCorridorProgress(nextValue);
      if (nextValue <= 0.001) {
        phaseRef.current = 'depart';
        setPhase('depart');
      }
      return;
    }

    if (event.deltaY >= 0) {
      if (threadChargeRef.current > 0 && pendingDirectionRef.current === 'previous') {
        const nextValue = Math.max(0, threadChargeRef.current - normalizedDelta * 1.1);
        threadChargeRef.current = nextValue;
        setThreadCharge(nextValue);
        return;
      }

      if (travelDepthRef.current < 0.995) {
        setPendingDirection('next');
        setPendingSceneId(nextSceneId);
        setThreadCharge(0);
        setPhase((current) => (current === 'arrive' ? 'explore' : current));
        pendingDirectionRef.current = 'next';
        pendingSceneIdRef.current = nextSceneId;
        threadChargeRef.current = 0;
        const nextValue = Math.min(1, travelDepthRef.current + normalizedDelta);
        travelDepthRef.current = nextValue;
        setTravelDepth(nextValue);
        return;
      }

      if (!nextSceneId) return;
      beginTravel(nextSceneId, 'next');
      setPendingDirection('next');
      setPendingSceneId(nextSceneId);
      setPhase('depart');
      const rawCharge = threadChargeRef.current + normalizedDelta * DEPART_CHARGE_RATE;
      const nextValue = Math.min(1, rawCharge);
      threadChargeRef.current = nextValue;
      setThreadCharge(nextValue);
      if (nextValue >= 1) {
        enterCorridor(nextSceneId, 'next', Math.max(0, rawCharge - 1) * 0.45);
      }
      return;
    }

    if (threadChargeRef.current > 0 && pendingDirectionRef.current === 'next') {
      const nextValue = Math.max(0, threadChargeRef.current - normalizedDelta * 1.1);
      threadChargeRef.current = nextValue;
      setThreadCharge(nextValue);
      return;
    }

    if (travelDepthRef.current > 0.04) {
      setThreadCharge(0);
      setPendingSceneId(null);
      setPendingDirection('next');
      setPhase('explore');
      threadChargeRef.current = 0;
      pendingSceneIdRef.current = null;
      pendingDirectionRef.current = 'next';
      phaseRef.current = 'explore';
      const nextValue = Math.max(0, travelDepthRef.current - normalizedDelta * 1.2);
      travelDepthRef.current = nextValue;
      setTravelDepth(nextValue);
      return;
    }

    if (!previousSceneId) return;
    beginTravel(previousSceneId, 'previous');
    setPendingDirection('previous');
    setPendingSceneId(previousSceneId);
    setPhase('depart');
    const rawCharge = threadChargeRef.current + normalizedDelta * DEPART_CHARGE_RATE;
    const nextValue = Math.min(1, rawCharge);
    threadChargeRef.current = nextValue;
    setThreadCharge(nextValue);
    if (nextValue >= 1) {
      enterCorridor(previousSceneId, 'previous', Math.max(0, rawCharge - 1) * 0.45);
    }
  }, [
    beginTravel,
    completeCorridorTravel,
    enterCorridor,
    nextSceneId,
    previousSceneId,
  ]);

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
  const travelStatus = phase === 'corridor'
    ? `corridor ${Math.round(corridorProgress * 100)}% traversed`
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
      className={`memory-archive ${phase === 'corridor' ? 'memory-archive--corridor' : ''}`}
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
              archiveTravelProgress={phase === 'corridor'
                ? Math.min(1, 0.74 + corridorProgress * 0.26)
                : Math.min(1, travelDepth + threadCharge * 0.18)}
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
              ? 'Keep scrolling. The thread only opens as you move through it.'
              : nextScene
                ? threadCharge > 0.02
                  ? 'Keep scrolling and the next filament will gather around you.'
                  : travelDepth < 0.92
                    ? 'Scroll through the memory. Move your cursor to wake the hidden threads.'
                    : 'You are inside the memory. Keep scrolling to let the next filament take form.'
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
            <div className="memory-archive__travel-route">
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
              <span>Scroll to cross the archive thread</span>
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
