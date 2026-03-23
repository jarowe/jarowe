import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Howl } from 'howler';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
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
// CinematicCamera — GSAP-driven multi-beat keyframe choreography
// No OrbitControls. Visitor is guided through the memory.
// ---------------------------------------------------------------------------
function CinematicCamera({ keyframes, fallbackTarget }) {
  const { camera } = useThree();
  const tlRef = useRef(null);
  const mouseOffset = useRef({ x: 0, y: 0 });
  const basePos = useRef({ x: 0, y: 0, z: 0 });
  const baseTarget = useRef({ x: 0, y: 0, z: 0 });

  // Mouse/gyro parallax response (subtle)
  useEffect(() => {
    const PARALLAX_STRENGTH = 0.05;
    const handleMouse = (e) => {
      mouseOffset.current.x = (e.clientX / window.innerWidth - 0.5) * PARALLAX_STRENGTH;
      mouseOffset.current.y = (e.clientY / window.innerHeight - 0.5) * PARALLAX_STRENGTH;
    };
    const handleGyro = (e) => {
      if (e.gamma != null && e.beta != null) {
        mouseOffset.current.x = (e.gamma / 90) * PARALLAX_STRENGTH;
        mouseOffset.current.y = ((e.beta - 45) / 90) * PARALLAX_STRENGTH;
      }
    };
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('deviceorientation', handleGyro);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('deviceorientation', handleGyro);
    };
  }, []);

  // Build GSAP timeline from keyframes
  useEffect(() => {
    if (!keyframes || keyframes.length === 0) return;

    // Initialize from first keyframe
    const first = keyframes[0];
    basePos.current = { ...first.position };
    baseTarget.current = { ...first.target };
    camera.position.set(first.position.x, first.position.y, first.position.z);
    camera.lookAt(first.target.x, first.target.y, first.target.z);

    const tl = gsap.timeline({ repeat: -1 });
    tlRef.current = tl;

    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      const nextIdx = (i + 1) % keyframes.length;
      const next = keyframes[nextIdx];

      // Hold at current beat
      if (kf.hold > 0) {
        tl.to({}, { duration: kf.hold });
      }

      // Transition to next beat
      const posProxy = { x: kf.position.x, y: kf.position.y, z: kf.position.z };
      const targetProxy = { x: kf.target.x, y: kf.target.y, z: kf.target.z };

      tl.to(posProxy, {
        x: next.position.x,
        y: next.position.y,
        z: next.position.z,
        duration: next.duration,
        ease: next.ease,
        onUpdate: () => {
          basePos.current = { ...posProxy };
        },
      }, '>');

      tl.to(targetProxy, {
        x: next.target.x,
        y: next.target.y,
        z: next.target.z,
        duration: next.duration,
        ease: next.ease,
        onUpdate: () => {
          baseTarget.current = { ...targetProxy };
        },
      }, '<'); // sync with position
    }

    return () => {
      tl.kill();
      tlRef.current = null;
    };
  }, [keyframes, camera]);

  // Apply base + mouse offset every frame
  useFrame(() => {
    const bx = basePos.current.x + mouseOffset.current.x;
    const by = basePos.current.y - mouseOffset.current.y;
    const bz = basePos.current.z;
    camera.position.set(bx, by, bz);

    camera.lookAt(
      baseTarget.current.x + mouseOffset.current.x * 0.3,
      baseTarget.current.y - mouseOffset.current.y * 0.3,
      baseTarget.current.z,
    );
  });

  return null;
}

// ---------------------------------------------------------------------------
// Atmospheric Particle Shaders
// ---------------------------------------------------------------------------
const PARTICLE_VERT = /* glsl */ `
uniform float uTime;
uniform float uDriftSpeed;
uniform float uSize;
attribute float aRandom;

varying float vAlpha;

void main() {
  vec3 pos = position;

  // Gentle drift: each particle has unique phase from aRandom
  pos.x += sin(uTime * uDriftSpeed + aRandom * 6.28) * 0.15;
  pos.y += cos(uTime * uDriftSpeed * 0.7 + aRandom * 3.14) * 0.1;
  pos.z += sin(uTime * uDriftSpeed * 0.5 + aRandom * 1.57) * 0.05;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

  // Size attenuation
  gl_PointSize = uSize * (300.0 / -mvPos.z);

  // Depth-based alpha: farther particles are dimmer
  float dist = length(mvPos.xyz);
  vAlpha = smoothstep(8.0, 1.0, dist) * (0.3 + aRandom * 0.4);

  gl_Position = projectionMatrix * mvPos;
}
`;

const PARTICLE_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  // Soft circle falloff
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float circle = 1.0 - smoothstep(0.4, 1.0, d);
  if (circle < 0.01) discard;

  gl_FragColor = vec4(uColor, circle * vAlpha);
}
`;

// ---------------------------------------------------------------------------
// AtmosphericParticles — dust motes, bokeh specks, light streaks
// ---------------------------------------------------------------------------
function AtmosphericParticles({ tier }) {
  // Particle counts adapt to tier
  const counts = tier === 'full'
    ? { dust: 120, bokeh: 40, streaks: 15 }
    : { dust: 60, bokeh: 20, streaks: 8 }; // simplified

  const dustData = useMemo(() => {
    const positions = new Float32Array(counts.dust * 3);
    const randoms = new Float32Array(counts.dust);
    for (let i = 0; i < counts.dust; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3 + 1;
      randoms[i] = Math.random();
    }
    return { positions, randoms };
  }, [counts.dust]);

  const bokehData = useMemo(() => {
    const positions = new Float32Array(counts.bokeh * 3);
    const randoms = new Float32Array(counts.bokeh);
    for (let i = 0; i < counts.bokeh; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 2] = Math.random() * 2 + 0.5;
      randoms[i] = Math.random();
    }
    return { positions, randoms };
  }, [counts.bokeh]);

  const streakData = useMemo(() => {
    const positions = new Float32Array(counts.streaks * 3);
    const randoms = new Float32Array(counts.streaks);
    for (let i = 0; i < counts.streaks; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3 + 1;
      positions[i * 3 + 2] = Math.random() * 1.5 + 1.5;
      randoms[i] = Math.random();
    }
    return { positions, randoms };
  }, [counts.streaks]);

  const dustUniforms = useRef({
    uTime: { value: 0 },
    uDriftSpeed: { value: 0.15 },
    uSize: { value: 3.0 },
    uColor: { value: new THREE.Color(1.0, 0.97, 0.9) },
  });
  const bokehUniforms = useRef({
    uTime: { value: 0 },
    uDriftSpeed: { value: 0.08 },
    uSize: { value: 8.0 },
    uColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
  });
  const streakUniforms = useRef({
    uTime: { value: 0 },
    uDriftSpeed: { value: 0.25 },
    uSize: { value: 2.0 },
    uColor: { value: new THREE.Color(1.0, 1.0, 0.95) },
  });

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    dustUniforms.current.uTime.value = t;
    bokehUniforms.current.uTime.value = t;
    streakUniforms.current.uTime.value = t;
  });

  const makeGeometry = (data) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(data.randoms, 1));
    return geo;
  };

  const makeMaterial = (uniforms) =>
    new THREE.ShaderMaterial({
      uniforms: uniforms.current,
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

  const dustGeo = useMemo(() => makeGeometry(dustData), [dustData]);
  const bokehGeo = useMemo(() => makeGeometry(bokehData), [bokehData]);
  const streakGeo = useMemo(() => makeGeometry(streakData), [streakData]);

  const dustMat = useMemo(() => makeMaterial(dustUniforms), []);
  const bokehMat = useMemo(() => makeMaterial(bokehUniforms), []);
  const streakMat = useMemo(() => makeMaterial(streakUniforms), []);

  return (
    <>
      <points geometry={dustGeo} material={dustMat} />
      <points geometry={bokehGeo} material={bokehMat} />
      <points geometry={streakGeo} material={streakMat} />
    </>
  );
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
        <CinematicCamera
          keyframes={scene.cameraKeyframes}
          fallbackTarget={[
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
