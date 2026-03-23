import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Howl } from 'howler';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getSceneById } from '../data/memoryScenes';
import { getGpuTier } from '../utils/gpuCapability';
import './MemoryPortal.css';

const BASE = import.meta.env.BASE_URL;

function resolveAsset(path, isRemote) {
  if (!path) return null;
  if (isRemote || path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

// ---------------------------------------------------------------------------
// SplatRenderer — Gaussian splat viewer (extracted from MemoryPortal)
// ---------------------------------------------------------------------------
function SplatRenderer({ scene, onLoaded, onError }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    async function initViewer() {
      if (disposed || !containerRef.current) return;

      try {
        const GaussianSplats3D = await import(
          '@mkkellogg/gaussian-splats-3d'
        );
        if (disposed) return;

        // Clean up any previous viewer
        if (viewerRef.current) {
          try {
            viewerRef.current.dispose();
          } catch {}
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
        console.log('[CapsuleShell] Loading splat:', splatPath);

        await viewer.addSplatScene(splatPath, {
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: true,
        });

        if (!disposed) {
          console.log('[CapsuleShell] Splat loaded successfully');
          onLoaded();
        }
      } catch (err) {
        console.error('[CapsuleShell] Splat failed:', err);
        if (!disposed) {
          onError(err.message || 'Failed to load 3D scene');
        }
      }
    }

    // 600ms delay — let any previous WebGL contexts (globe) fully release
    const timer = setTimeout(initViewer, 600);

    return () => {
      disposed = true;
      clearTimeout(timer);
      if (viewerRef.current) {
        try {
          viewerRef.current.dispose();
        } catch {}
        viewerRef.current = null;
      }
    };
  }, [scene, onLoaded, onError]);

  return <div ref={containerRef} className="memory-splat-container" />;
}

// ---------------------------------------------------------------------------
// Displaced Mesh Shaders
// ---------------------------------------------------------------------------
const DISPLACED_VERT = /* glsl */ `
uniform sampler2D uDepth;
uniform float uDepthScale;
uniform float uDepthBias;
uniform float uDepthContrast;

varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;

  // Sample depth and apply contrast + bias
  float d = texture2D(uDepth, uv).r;
  d = pow(d, uDepthContrast); // contrast adjustment
  d = d + uDepthBias;          // bias shift
  vDepth = d;

  // Displace along Z
  vec3 displaced = position;
  displaced.z += d * uDepthScale;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

const DISPLACED_FRAG = /* glsl */ `
uniform sampler2D uPhoto;
uniform sampler2D uDepth;
uniform float uDiscardThreshold;

varying vec2 vUv;
varying float vDepth;

void main() {
  // Depth discontinuity detection via screen-space derivatives
  float ddx = abs(dFdx(vDepth));
  float ddy = abs(dFdy(vDepth));
  float depthEdge = max(ddx, ddy);

  // Discard fragments at depth discontinuities (rubber-sheet edges)
  if (depthEdge > uDiscardThreshold) {
    discard;
  }

  // Soft alpha fade near threshold for anti-aliasing
  float edgeAlpha = 1.0 - smoothstep(uDiscardThreshold * 0.5, uDiscardThreshold, depthEdge);

  vec4 color = texture2D(uPhoto, vUv);
  gl_FragColor = vec4(color.rgb, color.a * edgeAlpha);
}
`;

// ---------------------------------------------------------------------------
// SlowDrift — gentle camera animation for visual validation of 3D parallax
// ---------------------------------------------------------------------------
function SlowDrift({ target }) {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Gentle sinusoidal drift — validates 3D parallax is visible
    camera.position.x += Math.sin(t * 0.1) * 0.0005;
    camera.position.y += Math.cos(t * 0.15) * 0.0003;
    camera.lookAt(target[0], target[1], target[2]);
  });
  return null;
}

// ---------------------------------------------------------------------------
// DisplacedPlane — subdivided plane with depth displacement shader
// ---------------------------------------------------------------------------
function DisplacedPlane({ scene, subdivisions }) {
  const meshRef = useRef();
  const photoUrl = resolveAsset(scene.photoUrl);
  const depthUrl = resolveAsset(scene.depthMapUrl);

  const {
    depthScale = 2.0,
    depthBias = 0.0,
    depthContrast = 1.0,
    discardThreshold = 0.15,
  } = scene.depthConfig || {};

  const [photoTex, depthTex] = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const photo = loader.load(photoUrl);
    const depth = loader.load(depthUrl);
    photo.colorSpace = THREE.SRGBColorSpace;
    depth.colorSpace = THREE.LinearSRGBColorSpace;
    // Depth needs linear filtering to avoid interpolation artifacts at edges
    depth.minFilter = THREE.LinearFilter;
    depth.magFilter = THREE.LinearFilter;
    return [photo, depth];
  }, [photoUrl, depthUrl]);

  const uniforms = useRef({
    uPhoto: { value: null },
    uDepth: { value: null },
    uDepthScale: { value: depthScale },
    uDepthBias: { value: depthBias },
    uDepthContrast: { value: depthContrast },
    uDiscardThreshold: { value: discardThreshold },
  });

  useEffect(() => {
    uniforms.current.uPhoto.value = photoTex;
    uniforms.current.uDepth.value = depthTex;
  }, [photoTex, depthTex]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: uniforms.current,
        vertexShader: DISPLACED_VERT,
        fragmentShader: DISPLACED_FRAG,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    [],
  );

  // Geometry: PlaneGeometry with subdivisions, aspect ratio from photo
  const geometry = useMemo(() => {
    const aspect = 16 / 9;
    const height = 2.0;
    const width = height * aspect;
    return new THREE.PlaneGeometry(
      width,
      height,
      subdivisions,
      Math.floor(subdivisions / aspect),
    );
  }, [subdivisions]);

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

// ---------------------------------------------------------------------------
// DisplacedMeshRenderer — depth-displaced 3D mesh from photo+depth pair
// ---------------------------------------------------------------------------
function DisplacedMeshRenderer({ scene, tier }) {
  const subdivisions = tier === 'full' ? 256 : 128;
  const dpr = tier === 'full' ? [1, 2] : [1, 1];

  return (
    <div className="memory-splat-container">
      <Canvas
        dpr={dpr}
        camera={{
          position: [
            scene.cameraPosition.x,
            scene.cameraPosition.y,
            scene.cameraPosition.z,
          ],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: tier === 'full',
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000');
        }}
      >
        <DisplacedPlane scene={scene} subdivisions={subdivisions} />
        <SlowDrift
          target={[
            scene.cameraTarget.x,
            scene.cameraTarget.y,
            scene.cameraTarget.z,
          ]}
        />
      </Canvas>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ParallaxFallback — multi-layer Ken Burns with depth-based separation
// ---------------------------------------------------------------------------
function ParallaxFallback({ scene, loadError }) {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef(null);

  // Mouse/touch parallax
  const handleMouseMove = useCallback((e) => {
    setMousePos({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  }, []);

  // Gyroscope parallax for mobile
  useEffect(() => {
    const handleOrientation = (e) => {
      if (e.gamma != null && e.beta != null) {
        setMousePos({
          x: 0.5 + (e.gamma / 90) * 0.3, // -90..90 → 0.2..0.8
          y: 0.5 + ((e.beta - 45) / 90) * 0.3, // centered around 45deg tilt
        });
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  const previewUrl = resolveAsset(scene.previewImage);
  const photoUrl = resolveAsset(scene.photoUrl || scene.previewImage);

  // Parallax offsets: foreground moves more than background
  const bgX = (mousePos.x - 0.5) * 12;
  const bgY = (mousePos.y - 0.5) * 8;
  const fgX = (mousePos.x - 0.5) * 28;
  const fgY = (mousePos.y - 0.5) * 18;

  return (
    <div className="memory-portal__bg" ref={containerRef}>
      {/* Background layer — slower parallax */}
      {(photoUrl || previewUrl) && (
        <motion.div
          className="memory-portal__hero-image memory-portal__layer-bg"
          style={{
            backgroundImage: `url(${photoUrl || previewUrl})`,
            x: bgX,
            y: bgY,
          }}
          initial={{ scale: 1.0, opacity: 0 }}
          animate={{ scale: [1.0, 1.05, 1.0], opacity: 1 }}
          transition={{
            scale: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
            opacity: { duration: 2, ease: 'easeOut' },
          }}
        />
      )}

      {/* Foreground layer — faster parallax (same image with brightness/blur separation) */}
      {(photoUrl || previewUrl) && (
        <motion.div
          className="memory-portal__hero-image memory-portal__layer-fg"
          style={{
            backgroundImage: `url(${photoUrl || previewUrl})`,
            x: fgX,
            y: fgY,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 3, delay: 1 }}
        />
      )}

      {/* Atmospheric overlays */}
      <div className="memory-portal__vignette" />
      <motion.div
        className="memory-portal__grain"
        animate={{ opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="memory-portal__light-leak"
        style={{ x: fgX * 1.5, y: fgY * 1.5 }}
      />

      {/* Center content */}
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
  );
}

// ---------------------------------------------------------------------------
// CapsuleShell — renderer-agnostic memory capsule shell
// ---------------------------------------------------------------------------
export default function CapsuleShell() {
  const { sceneId } = useParams();
  const scene = getSceneById(sceneId);

  const [tier, setTier] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [visibleCards, setVisibleCards] = useState([]);
  const [muted, setMuted] = useState(true);
  const [soundReady, setSoundReady] = useState(false);
  const soundRef = useRef(null);

  // GPU capability check
  useEffect(() => {
    setTier(getGpuTier());
  }, []);

  // Soundtrack
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

  // Narrative cards
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

  const handleSplatLoaded = useCallback(() => setLoaded(true), []);
  const handleSplatError = useCallback((msg) => {
    setLoadError(msg);
    setTier('parallax'); // Fall through to immersive fallback
  }, []);

  // Determine renderer based on scene.renderMode x GPU tier
  const renderMode = scene.renderMode || 'splat';
  let showSplat = false;
  let showDisplaced = false;
  let showFallback = false;

  if (tier === null) {
    // Still checking capabilities — show loading state
  } else if (tier === 'parallax') {
    showFallback = true;
  } else if (renderMode === 'displaced-mesh') {
    showDisplaced = true;
  } else if (renderMode === 'splat') {
    showSplat = true;
  } else {
    // Unknown renderMode — graceful fallback
    showFallback = true;
  }

  return (
    <div className="memory-portal">
      {/* === Renderer === */}
      {showSplat && (
        <SplatRenderer
          scene={scene}
          onLoaded={handleSplatLoaded}
          onError={handleSplatError}
        />
      )}

      {showDisplaced && <DisplacedMeshRenderer scene={scene} tier={tier} />}

      {showFallback && (
        <ParallaxFallback scene={scene} loadError={loadError} />
      )}

      {/* === Loading states === */}
      {tier === null && (
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
