import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Howl } from 'howler';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { getSceneById } from '../data/memoryScenes';
import { canRenderSplat } from '../utils/gpuCapability';
import './MemoryPortal.css';

const BASE = import.meta.env.BASE_URL;

function resolveAsset(path, isRemote) {
  if (!path) return null;
  if (isRemote || path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

export default function MemoryPortal() {
  const { sceneId } = useParams();
  const scene = getSceneById(sceneId);

  const [capable, setCapable] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [visibleCards, setVisibleCards] = useState([]);
  const [muted, setMuted] = useState(true);
  const [soundReady, setSoundReady] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const soundRef = useRef(null);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  // Parallax for fallback mode
  const handleMouseMove = useCallback((e) => {
    setMousePos({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // GPU capability check
  useEffect(() => {
    setCapable(canRenderSplat());
  }, []);

  // --- Gaussian Splat Viewer ---
  useEffect(() => {
    if (capable !== true || !containerRef.current) return;

    let disposed = false;

    async function initViewer() {
      if (disposed || !containerRef.current) return;

      try {
        const GaussianSplats3D = await import('@mkkellogg/gaussian-splats-3d');
        if (disposed) return;

        // Clean up any previous viewer
        if (viewerRef.current) {
          try { viewerRef.current.dispose(); } catch {}
          viewerRef.current = null;
        }

        const viewer = new GaussianSplats3D.Viewer({
          cameraUp: [0, 1, 0],
          initialCameraPosition: [
            scene.cameraPosition.x,
            scene.cameraPosition.y,
            scene.cameraPosition.z,
          ],
          initialCameraLookAt: [
            scene.cameraTarget.x,
            scene.cameraTarget.y,
            scene.cameraTarget.z,
          ],
          rootElement: containerRef.current,
          selfDrivenMode: true,
          useBuiltInControls: true,
          dynamicScene: false,
          // Avoid SharedArrayBuffer requirement (needs COOP/COEP headers)
          sharedMemoryForWorkers: false,
          progressiveLoad: true,
        });
        viewerRef.current = viewer;

        const splatPath = resolveAsset(scene.splatUrl, scene.splatIsRemote);
        console.log('[MemoryPortal] Loading splat:', splatPath);

        await viewer.addSplatScene(splatPath, {
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: true,
        });

        if (!disposed) {
          console.log('[MemoryPortal] Splat loaded successfully');
          setLoaded(true);
        }
      } catch (err) {
        console.error('[MemoryPortal] Failed:', err);
        if (!disposed) {
          setLoadError(err.message || 'Failed to load 3D scene');
          setCapable(false); // Fall through to immersive fallback
        }
      }
    }

    // 600ms delay — let any previous WebGL contexts (globe) fully release
    const timer = setTimeout(initViewer, 600);

    return () => {
      disposed = true;
      clearTimeout(timer);
      if (viewerRef.current) {
        try { viewerRef.current.dispose(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [capable, scene]);

  // --- Soundtrack ---
  useEffect(() => {
    if (!scene.soundtrack) return;
    const soundPath = resolveAsset(scene.soundtrack, false);
    if (!soundPath) return;

    const sound = new Howl({
      src: [soundPath],
      volume: 0,
      loop: true,
      onload: () => setSoundReady(true),
      onloaderror: () => {},
    });
    soundRef.current = sound;
    sound.play();

    return () => {
      sound.unload();
      soundRef.current = null;
      setSoundReady(false);
      setMuted(true);
    };
  }, [scene.soundtrack]);

  // --- Narrative cards ---
  useEffect(() => {
    if (!scene.narrative?.length) return;
    const timers = scene.narrative.map((card, i) =>
      setTimeout(() => setVisibleCards((prev) => [...prev, i]), card.delay)
    );
    return () => { timers.forEach(clearTimeout); setVisibleCards([]); };
  }, [scene.narrative]);

  const handleUnmute = useCallback(() => {
    if (!soundRef.current) return;
    if (muted) {
      soundRef.current.fade(0, 0.6, 2000);
      setMuted(false);
    } else {
      soundRef.current.fade(soundRef.current.volume(), 0, 500);
      setMuted(true);
    }
  }, [muted]);

  const previewUrl = resolveAsset(scene.previewImage, false);
  const px = (mousePos.x - 0.5) * 20;
  const py = (mousePos.y - 0.5) * 12;
  const showFallback = capable === false;
  const showSplat = capable === true;
  const showChecking = capable === null;

  return (
    <div className="memory-portal">
      {/* === 3D Splat Viewer === */}
      {showSplat && (
        <div ref={containerRef} className="memory-splat-container" />
      )}

      {/* === Immersive Fallback (parallax image) === */}
      {showFallback && (
        <div className="memory-portal__bg">
          {previewUrl && (
            <motion.div
              className="memory-portal__hero-image"
              style={{ backgroundImage: `url(${previewUrl})`, x: px, y: py }}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              transition={{ duration: 3, ease: 'easeOut' }}
            />
          )}
          <div className="memory-portal__vignette" />
          <motion.div
            className="memory-portal__grain"
            animate={{ opacity: [0.03, 0.06, 0.03] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="memory-portal__light-leak"
            style={{ x: px * 2, y: py * 2 }}
          />

          {/* Fallback info */}
          <motion.div
            className="memory-portal__center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1.2 }}
          >
            <h1 className="memory-portal__scene-title">{scene.title}</h1>
            <p className="memory-portal__scene-location">{scene.location}</p>
            {loadError && (
              <p className="memory-portal__error-hint">
                3D scene unavailable — enjoying the cinematic view instead
              </p>
            )}
          </motion.div>
        </div>
      )}

      {/* === Loading states === */}
      {showChecking && (
        <div className="memory-loading">
          <span>Checking device capabilities...</span>
        </div>
      )}
      {showSplat && !loaded && !loadError && (
        <div className="memory-loading">
          <div className="memory-loading-spinner" />
          <span>Loading memory...</span>
        </div>
      )}

      {/* === Chrome (always visible) === */}
      <div className="memory-back">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>
      </div>

      <motion.div
        className="memory-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <span>MEMORY LANE</span>
      </motion.div>

      {/* Narrative */}
      <div className="memory-narrative">
        <AnimatePresence>
          {scene.narrative
            .filter((_, i) => visibleCards.includes(i))
            .map((card, idx) => (
              <motion.div
                key={idx}
                className="memory-narrative-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                {card.text}
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {scene.soundtrack && soundReady && (
        <button
          className="memory-unmute"
          onClick={handleUnmute}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      )}
    </div>
  );
}
