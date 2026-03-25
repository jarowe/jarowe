import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, MoveRight, Sparkles, Wind } from 'lucide-react';

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
const TRAVEL_THRESHOLD = 1400;
const TRAVEL_DECAY = 0.018;

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
  const [travelCharge, setTravelCharge] = useState(0);
  const [corridorProgress, setCorridorProgress] = useState(0);
  const [pendingSceneId, setPendingSceneId] = useState(null);
  const [pendingDirection, setPendingDirection] = useState('next');
  const [sceneProgress, setSceneProgress] = useState(0);
  const arrivalTimerRef = useRef(null);

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
    setPhase('arrive');
    setTravelCharge(0);
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
      setTravelCharge((value) => {
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
    if (phase !== 'corridor' || !pendingSceneId) return undefined;

    let frameId = 0;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / CORRIDOR_DURATION_MS, 1);
      setCorridorProgress(progress);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const targetSceneId = pendingSceneId;
      setPendingSceneId(null);
      setTravelCharge(0);
      setCorridorProgress(0);
      setPhase('arrive');
      navigate(`/archive/${targetSceneId}`);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [navigate, pendingSceneId, phase]);

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

  const handleWheel = useCallback((event) => {
    if (phase === 'corridor') return;

    const direction = event.deltaY >= 0 ? 'next' : 'previous';
    const targetSceneId = getPreferredNeighborSceneId(activeSceneId, direction);
    if (!targetSceneId) return;

    beginTravel(targetSceneId, direction);

    const normalizedDelta = Math.min(Math.abs(event.deltaY), 240) / TRAVEL_THRESHOLD;
    setTravelCharge((value) => {
      const nextValue = Math.min(1, value + normalizedDelta);
      if (nextValue >= 1 && targetSceneId) {
        setPendingSceneId(targetSceneId);
        setPendingDirection(direction);
        setPhase('corridor');
      }
      return nextValue;
    });
  }, [activeSceneId, beginTravel, phase]);

  const corridorNodes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        left: `${6 + ((index * 11) % 84)}%`,
        top: `${8 + ((index * 17) % 78)}%`,
        delay: `${(index % 6) * 0.14}s`,
      })),
    [],
  );

  return (
    <div className="memory-archive" onWheel={handleWheel}>
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
              onAwakeningComplete={() => undefined}
              onRecessionComplete={() => undefined}
              onProgress={setSceneProgress}
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
              : pendingDirection === 'previous'
                ? 'Scroll back to return through the previous filament'
                : 'Scroll forward to follow the next filament'}
          </div>
          <div className="memory-archive__travel-destination">
            {nextScene ? (
              <>
                <span>Next memory</span>
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
            animate={{ scaleX: phase === 'corridor' ? corridorProgress : travelCharge }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
        </div>

        <div className="memory-archive__travel-actions">
          {nextScene && (
            <button
              type="button"
              className="memory-archive__travel-button"
              onClick={() => {
                beginTravel(nextScene.id, 'next');
                setTravelCharge(1);
                setPhase('corridor');
              }}
            >
              Follow {nextScene.title}
            </button>
          )}
          <span className="memory-archive__travel-progress">
            world progress {Math.round(sceneProgress * 100)}%
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
            <div className="memory-archive__corridor-wash" />
            <div className="memory-archive__corridor-grid">
              {corridorNodes.map((node) => (
                <span
                  key={node.id}
                  className="memory-archive__corridor-node"
                  style={{ left: node.left, top: node.top, animationDelay: node.delay }}
                />
              ))}
            </div>
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
