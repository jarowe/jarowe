import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Howl } from 'howler';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { getSceneById } from '../data/memoryScenes';
import { canRenderSplat } from '../utils/gpuCapability';
import './MemoryPortal.css';

const BASE = import.meta.env.BASE_URL;

/**
 * Resolve an asset path — remote URLs pass through, local paths get
 * the BASE_URL prefix for Vercel / GitHub Pages compatibility.
 */
function resolveAsset(path, isRemote) {
  if (!path) return null;
  if (isRemote || path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

/**
 * MemoryPortal — Immersive gaussian splat memory capsule.
 *
 * Renders a volumetric 3D scene on capable devices with sequential
 * narrative text cards and ambient soundtrack. Falls back to a static
 * preview image with narrative on mobile / low-end devices.
 */
export default function MemoryPortal() {
  const { sceneId } = useParams();
  const scene = getSceneById(sceneId);

  // --- Capability & loading state ---
  const [capable, setCapable] = useState(null); // null = checking
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // --- Narrative ---
  const [visibleCards, setVisibleCards] = useState([]);

  // --- Soundtrack ---
  const [muted, setMuted] = useState(true);
  const [soundReady, setSoundReady] = useState(false);
  const soundRef = useRef(null);

  // --- Splat viewer ---
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  // Capability check on mount
  useEffect(() => {
    setCapable(canRenderSplat());
  }, []);

  // --- Splat viewer lifecycle ---
  useEffect(() => {
    if (capable !== true || !containerRef.current) return;

    let disposed = false;

    // Small delay to let previous page's WebGL context (globe) fully dispose
    // before creating the splat viewer's context — prevents Context Lost
    const initDelay = setTimeout(() => {
    // Dynamic import to avoid bundling the heavy library for fallback users
    import('@mkkellogg/gaussian-splats-3d').then((GaussianSplats3D) => {
      if (disposed) return;

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
        // Disable SharedArrayBuffer — requires COOP/COEP headers that
        // Vercel doesn't set. Falls back to ArrayBuffer postMessage.
        sharedMemoryForWorkers: false,
      });
      viewerRef.current = viewer;

      const splatPath = resolveAsset(scene.splatUrl, scene.splatIsRemote);
      viewer
        .addSplatScene(splatPath, { splatAlphaRemovalThreshold: 5 })
        .then(() => {
          if (!disposed) setLoaded(true);
        })
        .catch((err) => {
          console.error('[MemoryPortal] Splat load error:', err);
          if (!disposed) {
            setLoadError(err.message || 'Failed to load 3D scene');
            setCapable(false);
          }
        });
    }).catch((err) => {
      console.error('[MemoryPortal] Library load error:', err);
      if (!disposed) {
        setLoadError(err.message || 'Failed to load viewer library');
        setCapable(false);
      }
    });

    }, 200); // 200ms delay for WebGL context cleanup

    return () => {
      disposed = true;
      clearTimeout(initDelay);
      if (viewerRef.current) {
        try {
          viewerRef.current.dispose();
        } catch {
          // viewer may already be cleaned up
        }
        viewerRef.current = null;
      }
    };
  }, [capable, scene]);

  // --- Soundtrack lifecycle ---
  useEffect(() => {
    if (!scene.soundtrack) return;

    const soundPath = resolveAsset(scene.soundtrack, false);
    if (!soundPath) return;

    const sound = new Howl({
      src: [soundPath],
      volume: 0,
      loop: true,
      onload: () => setSoundReady(true),
      onloaderror: (_, err) => {
        console.warn('[MemoryPortal] Soundtrack load error:', err);
      },
    });
    soundRef.current = sound;
    sound.play(); // starts muted (volume 0)

    return () => {
      sound.unload();
      soundRef.current = null;
      setSoundReady(false);
      setMuted(true);
    };
  }, [scene.soundtrack]);

  // --- Narrative card sequencing ---
  useEffect(() => {
    if (!scene.narrative?.length) return;

    const timers = scene.narrative.map((card, i) =>
      setTimeout(() => setVisibleCards((prev) => [...prev, i]), card.delay)
    );
    return () => {
      timers.forEach(clearTimeout);
      setVisibleCards([]);
    };
  }, [scene.narrative]);

  // --- Unmute handler ---
  const handleUnmute = useCallback(() => {
    if (!soundRef.current) return;
    if (muted) {
      soundRef.current.fade(0, 0.6, 2000); // fade in over 2s
      setMuted(false);
    } else {
      soundRef.current.fade(soundRef.current.volume(), 0, 500);
      setMuted(true);
    }
  }, [muted]);

  // --- Narrative cards overlay ---
  const narrativeOverlay = (
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
  );

  // --- Loading indicator ---
  const loadingIndicator = capable && !loaded && !loadError && (
    <div className="memory-loading">
      <div className="memory-loading-spinner" />
      <span>Loading memory...</span>
    </div>
  );

  // --- Unmute button ---
  const unmuteButton = scene.soundtrack && soundReady && (
    <button
      className="memory-unmute"
      onClick={handleUnmute}
      aria-label={muted ? 'Unmute soundtrack' : 'Mute soundtrack'}
      title={muted ? 'Unmute soundtrack' : 'Mute soundtrack'}
    >
      {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
    </button>
  );

  return (
    <div className="memory-portal">
      {/* Back button */}
      <div className="memory-back">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>
      </div>

      {/* Scene title */}
      <div className="memory-title">
        <span>{scene.location}</span>
      </div>

      {/* Capable: 3D splat viewer */}
      {capable === true && (
        <div
          ref={containerRef}
          className="memory-splat-container"
        />
      )}

      {/* Not capable or errored: static fallback */}
      {capable === false && (
        <div
          className="memory-fallback"
          style={{
            backgroundImage: `url(${resolveAsset(scene.previewImage, false)})`,
          }}
        >
          <div className="memory-fallback-prompt">
            <h2>{scene.title}</h2>
            <p>
              This memory is best experienced in 3D. Visit on a desktop browser
              with a dedicated GPU for the full volumetric experience.
            </p>
            {loadError && (
              <p className="memory-fallback-error">
                The 3D scene is temporarily unavailable. Check back soon.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Checking state */}
      {capable === null && (
        <div className="memory-loading">
          <span>Checking device capabilities...</span>
        </div>
      )}

      {loadingIndicator}
      {narrativeOverlay}
      {unmuteButton}
    </div>
  );
}
