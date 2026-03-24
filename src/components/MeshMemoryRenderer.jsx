/**
 * MeshMemoryRenderer — Amina-powered GPU particle memory world
 *
 * Replaces ParticleFieldRenderer for mesh-source particle scenes.
 * Pipeline: depth-to-mesh → mesh-to-points → FBO GPU simulation → volumetric point sprites
 *
 * Layers:
 *   1. depthToMesh: photo.webp + depth.png → displaced BufferGeometry
 *   2. meshToPoints: surface-sample 300K colored points from geometry
 *   3. FBOCore: GPU ping-pong simulation (curl noise, drift, mouse repulsion, scroll cohesion)
 *   4. FBOInstancedParticles: volumetric point sprite rendering from FBO textures
 *   5. FBOPlexusLines: optional plexus connections (full tier only)
 *   6. FlightCamera: scroll-driven spline camera
 *   7. Postprocessing: bloom + DOF + vignette
 *
 * Props match ParticleFieldRenderer so CapsuleShell can swap without changes.
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

import { buildMeshFromDepth } from './particleMemory/depthToMesh';
import { samplePointsFromMesh } from './particleMemory/meshToPoints';
import FBOCore from './particleMemory/fboCore';
import FBOInstancedParticles from './particleMemory/FBOInstancedParticles';
import FBOPlexusLines from './particleMemory/FBOPlexusLines';
import FlightCamera from './particleMemory/FlightCamera';
import { CinematicCamera } from '../pages/CapsuleShell';

const BASE = import.meta.env.BASE_URL;

function resolveAsset(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

// ---------------------------------------------------------------------------
// Default FBO simulation parameters
// ---------------------------------------------------------------------------
const DEFAULT_SIM_PARAMS = {
  // Turbulence (curl noise drift)
  turbulenceScale: 1.5,
  turbulenceStrength: 0.3,
  turbulenceSpeed: 0.4,
  turbulenceOctaves: 3,

  // Target attraction (spring-damper)
  sdfAttractStrength: 2.0,
  sdfAttractSmooth: 0.5,
  sdfSpring: 0.1,
  sdfNoiseDisturb: 0.15,
  convergence: 0.5,

  // Mouse repulsion
  mouseRepulsion: 1.5,
  mouseRadius: 0.5,

  // Breathing z-wave
  breathingWave: 0.15,

  // Drag (air resistance)
  drag: 0.02,

  // Life (keep particles alive long)
  lifeMin: 100,
  lifeMax: 200,

  // Scatter radius for respawned particles
  scatterRadius: 6.0,

  // Physics
  gravity: 0.0,
  windX: 0, windY: 0, windZ: 0,
  attractorStrength: 0.0,
  attractorRadius: 3.0,
  attractorFalloff: 2.0,
  vortexStrength: 0.0,
  curlScale: 1.5,
  curlStrength: 0.0,
  curlSpeed: 1.0,

  // Bounce (disabled)
  bounceFloorY: -10,
  bounceEnabled: 0,
  bounceStrength: 0.6,
  bounceFriction: 0.3,
  bounceAbsorb: 0.2,

  // Emitter (default sphere scatter)
  emitterShape: 0,
  emitterRadius: 5.0,
  emitterSpread: 1.0,
  emitterVelocity: 0.0,
  emitterDirectionX: 0,
  emitterDirectionY: 1,
  emitterDirectionZ: 0,
};

// ---------------------------------------------------------------------------
// Particle count by tier
// ---------------------------------------------------------------------------
function getParticleCount(tier) {
  if (tier === 'full') return 300000;
  if (tier === 'simplified') return 120000;
  return 80000; // parallax fallback (shouldn't get here)
}

// ---------------------------------------------------------------------------
// MeshMemoryScene — inner R3F component (runs inside Canvas context)
// ---------------------------------------------------------------------------
function MeshMemoryScene({
  meshData,
  scene,
  tier,
  flightCameraRef,
  onProgress,
}) {
  const { gl } = useThree();
  const fboRef = useRef(null);
  const colorTextureRef = useRef(null);
  const mouseWorld = useRef(new THREE.Vector3(0, 999, 0));
  const flightProgressLocal = useRef(0);

  const isFullTier = tier === 'full';
  const particleCount = getParticleCount(tier);
  const hasFlightPath = !!scene.flightPath;

  const { targetPositions, colors, colorTexture: colorTex } = meshData;

  // Initialize FBO on mount
  useEffect(() => {
    const fbo = new FBOCore(gl, particleCount, targetPositions);
    fboRef.current = fbo;

    // Build color DataTexture for FBOInstancedParticles
    const side = fbo.textureWidth;
    const colorData = new Float32Array(side * side * 4);
    const numPoints = Math.floor(colors.length / 3);
    for (let i = 0; i < side * side; i++) {
      const i4 = i * 4;
      if (i < numPoints) {
        colorData[i4]     = colors[i * 3];
        colorData[i4 + 1] = colors[i * 3 + 1];
        colorData[i4 + 2] = colors[i * 3 + 2];
        colorData[i4 + 3] = 1.0;
      } else {
        colorData[i4]     = 0;
        colorData[i4 + 1] = 0;
        colorData[i4 + 2] = 0;
        colorData[i4 + 3] = 0;
      }
    }
    const dataTex = new THREE.DataTexture(
      colorData, side, side, THREE.RGBAFormat, THREE.FloatType,
    );
    dataTex.needsUpdate = true;
    colorTextureRef.current = dataTex;

    return () => {
      fbo.dispose();
      dataTex.dispose();
      fboRef.current = null;
      colorTextureRef.current = null;
    };
  }, [gl, particleCount, targetPositions, colors]);

  // Track mouse in 3D space via pointer events on the canvas
  useEffect(() => {
    const dom = gl.domElement;
    const handlePointer = (e) => {
      // Convert screen coordinates to NDC, project onto a plane at z=0
      const rect = dom.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      // Approximate: map NDC to world-space at z~2 (where particles live)
      mouseWorld.current.set(nx * 3.0, ny * 2.0, 2.0);
    };
    dom.addEventListener('pointermove', handlePointer);
    return () => dom.removeEventListener('pointermove', handlePointer);
  }, [gl]);

  // Handle progress callback from FlightCamera
  const handleProgress = useCallback((p) => {
    flightProgressLocal.current = p;
    if (onProgress) onProgress(p);
  }, [onProgress]);

  // Per-frame: update FBO simulation
  useFrame((state, delta) => {
    const fbo = fboRef.current;
    if (!fbo) return;

    const dt = Math.min(delta, 0.05);
    const time = state.clock.getElapsedTime();

    // Scroll-driven cohesion: 0 at start (scattered), ramps to 1 as you scroll
    const progress = flightProgressLocal.current;
    // Ease in: particles start free and tighten as user scrolls deeper
    const scrollCohesion = Math.pow(Math.min(progress * 1.5, 1.0), 0.7);

    // Dynamic convergence based on scroll
    const convergence = 0.2 + scrollCohesion * 0.8;

    fbo.update({
      deltaTime: dt,
      time,

      ...DEFAULT_SIM_PARAMS,

      // Override with scroll-driven values
      scrollCohesion,
      convergence,

      // Mouse repulsion
      mouseX: mouseWorld.current.x,
      mouseY: mouseWorld.current.y,
      mouseZ: mouseWorld.current.z,
      mouseRepulsion: DEFAULT_SIM_PARAMS.mouseRepulsion,
      mouseRadius: DEFAULT_SIM_PARAMS.mouseRadius,

      // Breathing wave
      breathingWave: DEFAULT_SIM_PARAMS.breathingWave,

      // Turbulence decreases as cohesion increases (particles calm down when formed)
      turbulenceStrength: DEFAULT_SIM_PARAMS.turbulenceStrength * (1.0 - scrollCohesion * 0.7),
    });
  });

  // Render
  const fbo = fboRef.current;
  const posTexture = fbo?.getPositionTexture() ?? null;
  const colorDataTex = colorTextureRef.current;

  return (
    <>
      {/* Particle rendering layer */}
      {posTexture && colorDataTex && (
        <FBOInstancedParticles
          positionTexture={posTexture}
          colorTexture={colorDataTex}
          particleCount={particleCount}
          pointScale={isFullTier ? 1.2 : 0.9}
          focusDistance={3.0}
          dofStrength={isFullTier ? 0.8 : 0.0}
          opacity={0.85}
          additiveBlending
        />
      )}

      {/* Plexus connections — full tier only */}
      {isFullTier && posTexture && (
        <FBOPlexusLines
          positionTexture={posTexture}
          particleCount={particleCount}
          distance={0.35}
          opacity={0.25}
        />
      )}

      {/* Camera */}
      {hasFlightPath ? (
        <FlightCamera
          ref={flightCameraRef}
          flightPath={scene.flightPath}
          onProgress={handleProgress}
        />
      ) : (
        <CinematicCamera
          keyframes={scene.cameraKeyframes}
          fallbackTarget={[
            scene.cameraTarget.x,
            scene.cameraTarget.y,
            scene.cameraTarget.z,
          ]}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// MeshMemoryPostProcessing — Bloom + DOF + Vignette
// ---------------------------------------------------------------------------
function MeshMemoryPostProcessing() {
  return (
    <EffectComposer
      disableNormalPass
      frameBufferType={HalfFloatType}
    >
      <Bloom
        intensity={1.2}
        luminanceThreshold={0.3}
        luminanceSmoothing={0.7}
        radius={0.5}
        mipmapBlur
      />
      <DepthOfField
        focusDistance={0.03}
        focalLength={0.06}
        bokehScale={3.0}
      />
      <Vignette
        eskil={false}
        offset={0.2}
        darkness={0.65}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

// ---------------------------------------------------------------------------
// MeshMemoryRenderer — main export (matches ParticleFieldRenderer props)
// ---------------------------------------------------------------------------
const MeshMemoryRenderer = forwardRef(function MeshMemoryRenderer(
  { scene, tier, onRecessionComplete, onAwakeningComplete, directAccess, onProgress },
  ref,
) {
  const [meshData, setMeshData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const flightCameraRef = useRef(null);

  const isFullTier = tier === 'full';
  const hasFlightPath = !!scene.flightPath;

  // Expose same interface as ParticleFieldRenderer
  useImperativeHandle(ref, () => ({
    getProgress: () => flightCameraRef.current?.getProgress?.() ?? 0,
    flightCameraRef,
    fieldRef: { current: null },
    getCamera: () => flightCameraRef.current?.getCamera?.() ?? null,
    setTunnelMode: (enabled, speed) => flightCameraRef.current?.setTunnelMode?.(enabled, speed),
    getUniforms: () => null,
    getWireUniforms: () => null,
  }));

  // Load mesh data on mount: depth-to-mesh → mesh-to-points
  useEffect(() => {
    let cancelled = false;
    const particleCount = getParticleCount(tier);

    async function loadMeshData() {
      try {
        // Step 1: Build 3D geometry from photo + depth map
        const { geometry, photoTexture } = await buildMeshFromDepth(
          scene.photoUrl,
          scene.depthMapUrl,
          {
            maxSegments: isFullTier ? 512 : 256,
            depthScale: scene.depthConfig?.depthScale ?? 2.0,
            planeWidth: 6.0,
          },
        );

        if (cancelled) {
          geometry.dispose();
          photoTexture.dispose();
          return;
        }

        // Step 2: Sample mesh surface into particles
        // Use vertex colors from the depth-displaced geometry (set by depthToMesh)
        // OR sample from the photo texture via UVs
        const sampleResult = samplePointsFromMesh(geometry, {
          count: particleCount,
          radius: 3.0,
          mode: 'surface',
          seed: 42,
          colorTexture: photoTexture,
        });

        if (cancelled) {
          geometry.dispose();
          photoTexture.dispose();
          return;
        }

        setMeshData({
          targetPositions: sampleResult.positions,
          colors: sampleResult.colors,
          colorTexture: photoTexture,
          geometry,
        });

      } catch (err) {
        console.error('[MeshMemoryRenderer] Failed to load mesh data:', err);
        if (!cancelled) setLoadError(err.message);
      }
    }

    loadMeshData();
    return () => { cancelled = true; };
  }, [scene, tier, isFullTier]);

  // Awakening callback — trigger after mesh data loads
  useEffect(() => {
    if (!meshData) return;
    const timer = setTimeout(() => {
      if (onAwakeningComplete) onAwakeningComplete();
    }, directAccess ? 500 : 2000);
    return () => clearTimeout(timer);
  }, [meshData, onAwakeningComplete, directAccess]);

  // Progress passthrough
  const handleProgress = useCallback((p) => {
    if (onProgress) onProgress(p);
  }, [onProgress]);

  // DPR and Canvas config (tier-adaptive)
  const dpr = isFullTier ? [1, 2] : [1, 1];

  return (
    <div
      className="memory-splat-container"
      style={hasFlightPath ? { touchAction: 'none' } : undefined}
    >
      {meshData && (
        <Canvas
          dpr={dpr}
          camera={{
            position: [
              scene.cameraPosition.x,
              scene.cameraPosition.y,
              scene.cameraPosition.z,
            ],
            fov: scene.flightPath?.fovRange?.[0] ?? 50,
            near: 0.1,
            far: 100,
          }}
          gl={{
            antialias: isFullTier,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => { gl.setClearColor('#000000'); }}
        >
          <MeshMemoryScene
            meshData={meshData}
            scene={scene}
            tier={tier}
            flightCameraRef={flightCameraRef}
            onProgress={handleProgress}
          />
          {isFullTier && <MeshMemoryPostProcessing />}
        </Canvas>
      )}
      {!meshData && !loadError && (
        <div className="memory-loading">
          <div className="memory-loading-spinner" />
          <span>Forming memory...</span>
        </div>
      )}
      {loadError && (
        <div className="memory-loading">
          <span>Could not form this memory.</span>
        </div>
      )}
      {!isFullTier && meshData && <div className="capsule-vignette" />}
    </div>
  );
});

export default MeshMemoryRenderer;
