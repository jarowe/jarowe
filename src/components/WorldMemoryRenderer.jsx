/**
 * WorldMemoryRenderer — Gaussian splat world + dream particle overlay
 *
 * Combines a DropInViewer (from @mkkellogg/gaussian-splats-3d) as the base
 * layer with ambient dream particles, atmospheric fog, and postprocessing.
 *
 * The DropInViewer is a THREE.Group that hooks into R3F's render loop via
 * onBeforeRender, so it shares the same WebGLRenderer and Scene — no
 * extra canvas or context needed.
 *
 * Falls back to MeshMemoryRenderer when no splat URL is available.
 *
 * Props match ParticleFieldRenderer / MeshMemoryRenderer so CapsuleShell
 * can swap renderers without changes.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { HalfFloatType } from 'three';
import * as THREE from 'three';

import FlightCamera from './particleMemory/FlightCamera';
import { CinematicCamera } from '../pages/CapsuleShell';

const BASE = import.meta.env.BASE_URL;

function resolveAsset(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

// ---------------------------------------------------------------------------
// SplatWorld — loads a gaussian splat via DropInViewer (THREE.Group)
// ---------------------------------------------------------------------------
function SplatWorld({ splatUrl, onLoaded, onError }) {
  const { scene } = useThree();
  const viewerRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    let dropIn = null;

    async function init() {
      try {
        const GaussianSplats3D = await import('@mkkellogg/gaussian-splats-3d');
        if (disposed) return;

        dropIn = new GaussianSplats3D.DropInViewer({
          dynamicScene: false,
          sharedMemoryForWorkers: false,
          progressiveLoad: true,
        });

        viewerRef.current = dropIn;
        scene.add(dropIn);

        const resolvedUrl = resolveAsset(splatUrl);
        console.log('[WorldMemoryRenderer] Loading splat:', resolvedUrl);

        await dropIn.addSplatScene(resolvedUrl, {
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: false,
        });

        if (!disposed) {
          console.log('[WorldMemoryRenderer] Splat loaded');
          onLoaded?.();
        }
      } catch (err) {
        console.error('[WorldMemoryRenderer] Splat load failed:', err);
        if (!disposed) {
          onError?.(err.message || 'Failed to load splat');
        }
      }
    }

    // Small delay to let the R3F canvas fully initialize
    const timer = setTimeout(init, 300);

    return () => {
      disposed = true;
      clearTimeout(timer);
      if (dropIn) {
        scene.remove(dropIn);
        try {
          dropIn.viewer?.dispose();
        } catch { /* ignore */ }
        viewerRef.current = null;
      }
    };
  }, [splatUrl, scene, onLoaded, onError]);

  return null;
}

// ---------------------------------------------------------------------------
// DreamParticles — ambient luminous particles floating in the world
// ---------------------------------------------------------------------------
const DREAM_VERT = /* glsl */ `
uniform float uTime;
attribute float aPhase;
attribute float aSpeed;
attribute float aScale;
varying float vAlpha;
varying float vScale;

void main() {
  vec3 pos = position;

  // Sine-wave drift on all axes — each particle has unique phase
  float t = uTime * aSpeed;
  pos.x += sin(t + aPhase * 6.2831) * 0.3;
  pos.y += cos(t * 0.7 + aPhase * 3.1416) * 0.25;
  pos.z += sin(t * 0.5 + aPhase * 1.5708) * 0.15;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);

  // Size attenuation — closer particles are larger
  float sizeFactor = aScale * (120.0 / max(-mvPos.z, 0.8));
  gl_PointSize = clamp(sizeFactor, 0.5, 12.0);

  // Depth-based alpha: farther = dimmer
  float dist = length(mvPos.xyz);
  vAlpha = smoothstep(25.0, 2.0, dist) * (0.3 + aPhase * 0.5);
  vScale = aScale;

  gl_Position = projectionMatrix * mvPos;
}
`;

const DREAM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying float vScale;

void main() {
  // Soft circular point sprite
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float circle = 1.0 - smoothstep(0.3, 1.0, d);
  if (circle < 0.01) discard;

  gl_FragColor = vec4(uColor, circle * vAlpha * uOpacity);
}
`;

function DreamParticles({ count = 8000, radius = 15.0, color = '#FFE4B5' }) {
  const meshRef = useRef();
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: 0.6 },
  });

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.cbrt(Math.random()) * radius;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      phases[i] = Math.random();
      speeds[i] = 0.1 + Math.random() * 0.25;
      scales[i] = 1.0 + Math.random() * 2.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: uniformsRef.current,
      vertexShader: DREAM_VERT,
      fragmentShader: DREAM_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [count, radius, color]);

  useFrame(({ clock }) => {
    uniformsRef.current.uTime.value = clock.getElapsedTime();
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <points ref={meshRef} geometry={geometry} material={material} />;
}

// ---------------------------------------------------------------------------
// WorldAtmosphere — inverted sphere with gradient fog shader
// ---------------------------------------------------------------------------
const ATMO_VERT = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogEnd;

varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  // Distance-based fog density
  float dist = length(vWorldPos);
  float fog = smoothstep(uFogStart, uFogEnd, dist) * uFogDensity;

  // Darken edges — facing-ratio fade
  float facing = abs(dot(normalize(vNormal), normalize(-vWorldPos)));
  float edgeDarken = 1.0 - smoothstep(0.0, 0.4, facing);
  fog *= (0.5 + edgeDarken * 0.5);

  gl_FragColor = vec4(uFogColor, fog);
}
`;

function WorldAtmosphere({ fogColor = '#0a0a12', radius = 30.0 }) {
  const uniformsRef = useRef({
    uFogColor: { value: new THREE.Color(fogColor) },
    uFogDensity: { value: 0.35 },
    uFogStart: { value: 5.0 },
    uFogEnd: { value: radius * 0.9 },
  });

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: uniformsRef.current,
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
    });
  }, []);

  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(radius, 32, 24);
  }, [radius]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <mesh geometry={geometry} material={material} />;
}

// ---------------------------------------------------------------------------
// WorldPostProcessing — Bloom + DOF + Vignette
// ---------------------------------------------------------------------------
function WorldPostProcessing() {
  return (
    <EffectComposer disableNormalPass frameBufferType={HalfFloatType}>
      <Bloom
        intensity={0.35}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.4}
        radius={0.35}
        mipmapBlur
      />
      <DepthOfField
        focusDistance={0.02}
        focalLength={0.04}
        bokehScale={1.5}
      />
      <Vignette
        eskil={false}
        offset={0.25}
        darkness={0.6}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

// ---------------------------------------------------------------------------
// SlowAutoOrbit — gentle auto-rotating camera when no flightPath is defined
// ---------------------------------------------------------------------------
function SlowAutoOrbit({ target = [0, 0, 0], radius = 5, speed = 0.08, height = 1.5 }) {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    camera.position.x = Math.cos(t) * radius;
    camera.position.z = Math.sin(t) * radius;
    camera.position.y = height + Math.sin(t * 0.3) * 0.3;
    camera.lookAt(target[0], target[1], target[2]);
  });

  return null;
}

// ---------------------------------------------------------------------------
// WorldScene — inner R3F component that composes all layers
// ---------------------------------------------------------------------------
function WorldScene({
  scene,
  tier,
  splatUrl,
  flightCameraRef,
  onProgress,
  onSplatLoaded,
  onSplatError,
}) {
  const isFullTier = tier === 'full';
  const hasFlightPath = !!scene.flightPath;

  const handleProgress = useCallback(
    (p) => {
      if (onProgress) onProgress(p);
    },
    [onProgress],
  );

  const dreamCount = isFullTier ? 8000 : 4000;

  return (
    <>
      {/* Layer 1: Gaussian splat world */}
      {splatUrl && (
        <SplatWorld
          splatUrl={splatUrl}
          onLoaded={onSplatLoaded}
          onError={onSplatError}
        />
      )}

      {/* Layer 2: Dream particles */}
      <DreamParticles
        count={dreamCount}
        radius={isFullTier ? 18.0 : 12.0}
        color="#FFE4B5"
      />

      {/* Layer 3: Atmosphere */}
      <WorldAtmosphere
        fogColor="#0a0a12"
        radius={isFullTier ? 35.0 : 25.0}
      />

      {/* Layer 4: Camera */}
      {hasFlightPath ? (
        <FlightCamera
          ref={flightCameraRef}
          flightPath={scene.flightPath}
          onProgress={handleProgress}
        />
      ) : scene.cameraKeyframes ? (
        <CinematicCamera
          keyframes={scene.cameraKeyframes}
          fallbackTarget={[
            scene.cameraTarget?.x ?? 0,
            scene.cameraTarget?.y ?? 0,
            scene.cameraTarget?.z ?? 0,
          ]}
        />
      ) : (
        <SlowAutoOrbit
          target={[
            scene.cameraTarget?.x ?? 0,
            scene.cameraTarget?.y ?? 0,
            scene.cameraTarget?.z ?? 0,
          ]}
          radius={scene.cameraPosition?.z ?? 5}
          height={scene.cameraPosition?.y ?? 1.5}
        />
      )}

      {/* Layer 5: Post-processing (full tier only) */}
      {isFullTier && <WorldPostProcessing />}
    </>
  );
}

// ---------------------------------------------------------------------------
// WorldMemoryRenderer — main export (matches ParticleFieldRenderer props)
// ---------------------------------------------------------------------------
const WorldMemoryRenderer = forwardRef(function WorldMemoryRenderer(
  { scene, tier, onRecessionComplete, onAwakeningComplete, directAccess, onProgress },
  ref,
) {
  const [splatLoaded, setSplatLoaded] = useState(false);
  const [splatError, setSplatError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const flightCameraRef = useRef(null);

  const isFullTier = tier === 'full';
  const hasFlightPath = !!scene.flightPath;

  // Expose same interface as ParticleFieldRenderer / MeshMemoryRenderer
  useImperativeHandle(ref, () => ({
    getProgress: () => flightCameraRef.current?.getProgress?.() ?? 0,
    flightCameraRef,
    fieldRef: { current: null },
    getCamera: () => flightCameraRef.current?.getCamera?.() ?? null,
    setTunnelMode: (enabled, speed) =>
      flightCameraRef.current?.setTunnelMode?.(enabled, speed),
    getUniforms: () => null,
    getWireUniforms: () => null,
  }));

  // Load meta.json if available
  useEffect(() => {
    let cancelled = false;
    const metaUrl = resolveAsset(`memory/${scene.id}/meta.json`);

    async function loadMeta() {
      try {
        const res = await fetch(metaUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setMeta(data);
          setMetaLoaded(true);
        }
      } catch {
        // No meta.json — that is fine, fall back to scene config
        if (!cancelled) {
          setMeta(null);
          setMetaLoaded(true);
        }
      }
    }

    loadMeta();
    return () => { cancelled = true; };
  }, [scene.id]);

  // Determine splat URL: meta.json world.splat takes priority, then scene.splatUrl
  const splatUrl = useMemo(() => {
    if (meta?.world?.splat) {
      // meta.json splat paths are relative to the memory directory
      return `memory/${scene.id}/${meta.world.splat}`;
    }
    return scene.splatUrl || null;
  }, [meta, scene.id, scene.splatUrl]);

  // If no splat is available after meta loads, signal that we should fall back.
  // The parent (CapsuleShell) handles actual fallback; we just render what we can.
  const hasSplat = metaLoaded && !!splatUrl;

  // Awakening callback: fire after splat loads (or immediately if no splat)
  useEffect(() => {
    if (!metaLoaded) return;

    // If there is no splat, fire awakening immediately so the shell transitions
    if (!hasSplat) {
      const timer = setTimeout(() => {
        onAwakeningComplete?.();
      }, directAccess ? 300 : 1000);
      return () => clearTimeout(timer);
    }

    if (splatLoaded) {
      const timer = setTimeout(() => {
        onAwakeningComplete?.();
      }, directAccess ? 500 : 2000);
      return () => clearTimeout(timer);
    }
  }, [metaLoaded, hasSplat, splatLoaded, onAwakeningComplete, directAccess]);

  // Handle splat load callbacks
  const handleSplatLoaded = useCallback(() => setSplatLoaded(true), []);
  const handleSplatError = useCallback((msg) => {
    console.warn('[WorldMemoryRenderer] Splat error, continuing with particles only:', msg);
    setSplatError(msg);
    // Mark as "loaded" so awakening fires — we still show dream particles
    setSplatLoaded(true);
  }, []);

  // Progress passthrough
  const handleProgress = useCallback(
    (p) => {
      if (onProgress) onProgress(p);
    },
    [onProgress],
  );

  // DPR and Canvas config
  const dpr = isFullTier ? [1, 2] : [1, 1];

  // Camera defaults from meta.json or scene config
  const camPos = meta?.camera?.startPosition ?? [
    scene.cameraPosition?.x ?? 0,
    scene.cameraPosition?.y ?? 0.5,
    scene.cameraPosition?.z ?? 5,
  ];
  const camFov = meta?.camera?.fov ?? scene.flightPath?.fovRange?.[0] ?? 50;
  const camNear = meta?.camera?.near ?? 0.1;
  const camFar = meta?.camera?.far ?? 200;

  // Show loading until meta is resolved
  if (!metaLoaded) {
    return (
      <div className="memory-splat-container">
        <div className="memory-loading">
          <div className="memory-loading-spinner" />
          <span>Preparing world...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="memory-splat-container"
      style={hasFlightPath ? { touchAction: 'none' } : undefined}
    >
      <Canvas
        dpr={dpr}
        camera={{
          position: camPos,
          fov: camFov,
          near: camNear,
          far: camFar,
        }}
        gl={{
          antialias: isFullTier,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000');
        }}
      >
        <WorldScene
          scene={scene}
          tier={tier}
          splatUrl={splatUrl}
          flightCameraRef={flightCameraRef}
          onProgress={handleProgress}
          onSplatLoaded={handleSplatLoaded}
          onSplatError={handleSplatError}
        />
      </Canvas>

      {/* Loading state while splat loads (dream particles are already visible) */}
      {hasSplat && !splatLoaded && (
        <div className="memory-loading">
          <div className="memory-loading-spinner" />
          <span>Loading world...</span>
        </div>
      )}

      {/* Simplified tier: CSS vignette overlay */}
      {!isFullTier && <div className="capsule-vignette" />}
    </div>
  );
});

export default WorldMemoryRenderer;
