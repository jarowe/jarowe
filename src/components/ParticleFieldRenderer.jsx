/**
 * ParticleFieldRenderer — Top-level R3F renderer for particle-memory scenes
 *
 * Rendered by CapsuleShell when renderMode === 'particle-memory'.
 * Mirrors the structure of DisplacedMeshRenderer: creates Canvas with
 * tier-adapted DPR, loads particle data via CPU sampler, renders
 * ParticleMemoryField + camera + postprocessing (full tier).
 *
 * Camera selection:
 *   - FlightCamera (scroll-driven spline) when scene.flightPath is present
 *   - CinematicCamera (GSAP keyframes) as fallback
 *
 * Tier adaptation:
 *   full:       150K particles + wire connections + bloom + DPR 2.0
 *   simplified: 55K particles, NO wires, NO bloom, DPR 1.0, CSS vignette
 *   parallax:   handled by CapsuleShell (ParallaxFallback + CSS dots)
 */

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { HalfFloatType } from 'three';
import { sampleParticles } from './particleMemory/particleSampler';
import { computeWireConnections } from './particleMemory/wireConnections';
import ParticleMemoryField from './particleMemory/ParticleMemoryField';
import FlightCamera from './particleMemory/FlightCamera';
import { CinematicCamera } from '../pages/CapsuleShell';

const BASE = import.meta.env.BASE_URL;

function resolveAsset(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

// ---------------------------------------------------------------------------
// ParticlePostProcessing — Bloom + Vignette for full tier only
// ---------------------------------------------------------------------------
function ParticlePostProcessing() {
  return (
    <EffectComposer
      disableNormalPass
      frameBufferType={HalfFloatType}
    >
      <Bloom
        intensity={1.4}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.7}
        radius={0.6}
        mipmapBlur
      />
      <Vignette
        eskil={false}
        offset={0.2}
        darkness={0.6}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

// ---------------------------------------------------------------------------
// ParticleFieldRenderer — main export
// ---------------------------------------------------------------------------
const ParticleFieldRenderer = forwardRef(function ParticleFieldRenderer(
  { scene, tier, onRecessionComplete, onAwakeningComplete, directAccess, onProgress },
  ref,
) {
  const [particleData, setParticleData] = useState(null);
  const [wireData, setWireData] = useState(null);
  const fieldRef = useRef(null);
  const flightCameraRef = useRef(null);

  const isFullTier = tier === 'full';
  const hasFlightPath = !!scene.flightPath;

  // Expose flight camera progress to parent (CapsuleShell)
  useImperativeHandle(ref, () => ({
    getProgress: () => flightCameraRef.current?.getProgress?.() ?? 0,
    flightCameraRef,
    fieldRef,
  }));

  // Load + sample on mount, compute wires for full tier
  useEffect(() => {
    let cancelled = false;
    const config = {
      ...scene.particleConfig,
      // Tier adaptation (D-11, D-12): simplified tier gets grid only
      ...(tier === 'simplified' ? {
        gridParticleCount: 55000,
        edgeBoostEnabled: false,
        edgeBoostCount: 0,
      } : {}),
    };
    sampleParticles(
      resolveAsset(scene.photoUrl),
      resolveAsset(scene.depthMapUrl),
      config,
    ).then((data) => {
      if (cancelled) return;
      setParticleData(data);

      // Compute wire connections for full tier only (D-11: simplified has no wires)
      if (isFullTier && data.isEdgeFlags) {
        const wires = computeWireConnections(
          data.photoPositions,
          data.colors,
          data.isEdgeFlags,
          data.count,
          { maxConnections: 10000 },
        );
        if (!cancelled) setWireData(wires);
      }
    }).catch((err) => {
      console.error('[ParticleFieldRenderer] Sampling failed:', err);
    });
    return () => { cancelled = true; };
  }, [scene, tier, isFullTier]);

  // DPR and Canvas config (tier-adaptive)
  const dpr = isFullTier ? [1, 2] : [1, 1];

  // Awakening callback — trigger after particle data loads
  useEffect(() => {
    if (!particleData) return;
    const timer = setTimeout(() => {
      if (onAwakeningComplete) onAwakeningComplete();
    }, directAccess ? 500 : 2000);
    return () => clearTimeout(timer);
  }, [particleData, onAwakeningComplete, directAccess]);

  // Progress callback passthrough for narrative card integration
  const handleProgress = useCallback((p) => {
    if (onProgress) onProgress(p);
  }, [onProgress]);

  return (
    <div
      className="memory-splat-container"
      style={hasFlightPath ? { touchAction: 'none' } : undefined}
    >
      {particleData && (
        <Canvas
          dpr={dpr}
          camera={{
            position: [scene.cameraPosition.x, scene.cameraPosition.y, scene.cameraPosition.z],
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
          <ParticleMemoryField
            ref={fieldRef}
            particleData={particleData}
            config={scene.particleConfig}
            wireData={wireData}
          />
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
          {isFullTier && <ParticlePostProcessing />}
        </Canvas>
      )}
      {!particleData && (
        <div className="memory-loading">
          <div className="memory-loading-spinner" />
          <span>Forming memory...</span>
        </div>
      )}
      {!isFullTier && particleData && <div className="capsule-vignette" />}
    </div>
  );
});

export default ParticleFieldRenderer;
