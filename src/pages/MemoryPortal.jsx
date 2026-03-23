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
  const soundRef = useRef(null);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    setCapable(canRenderSplat());
  }, []);

  // --- Splat viewer lifecycle with retry ---
  useEffect(() => {
    if (capable !== true || !containerRef.current) return;

    let disposed = false;
    let retryCount = 0;
    const maxRetries = 2;

    async function initSplatViewer() {
      if (disposed || !containerRef.current) return;

      try {
        const GaussianSplats3D = await import('@mkkellogg/gaussian-splats-3d');
        if (disposed) return;

        // Dispose any previous viewer
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
          sharedMemoryForWorkers: false,
          progressiveLoad: true,
        });
        viewerRef.current = viewer;

        const splatPath = resolveAsset(scene.splatUrl, scene.splatIsRemote);
        await viewer.addSplatScene(splatPath, {
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: true,
        });

        if (!disposed) setLoaded(true);
      } catch (err) {
        console.error(`[MemoryPortal] Attempt ${retryCount + 1} failed:`, err);

        if (retryCount < maxRetries && !disposed) {
          retryCount++;
          if (viewerRef.current) {
            try { viewerRef.current.dispose(); } catch {}
            viewerRef.current = null;
          }
          if (containerRef.current) containerRef.current.innerHTML = '';
          await new Promise(r => setTimeout(r, 1000));
          return initSplatViewer();
        }

        if (!disposed) {
          setLoadError(err.message || 'Failed to load 3D scene');
          setCapable(false);
        }
      }
    }

    // 500ms delay to let previous WebGL context (globe) fully release
    const initDelay = setTimeout(initSplatViewer, 500);

    return () => {
      disposed = true;
      clearTimeout(initDelay);
      if (viewerRef.current) {
        try { viewerRef.current.dispose(); } catch {}
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
    sound.play();

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

  const loadingIndicator = capable && !loaded && !loadError && (
    <div className="memory-loading">
      <div className="memory-loading-spinner" />
      <span>Loading memory...</span>
    </div>
  );

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
      <div className="memory-back">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>
      </div>

      <div className="memory-title">
        <span>{scene.location}</span>
      </div>

      {capable === true && (
        <div
          ref={containerRef}
          className="memory-splat-container"
        />
      )}

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
