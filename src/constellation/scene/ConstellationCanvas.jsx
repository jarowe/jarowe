import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  EffectComposer,
  DepthOfField,
  Vignette,
  Bloom,
  ChromaticAberration,
  Noise,
  ToneMapping,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { HalfFloatType, Vector2 } from 'three';
import { useConstellationStore } from '../store';
import { computeHelixLayout, getHelixCenter, getHelixBounds } from '../layout/helixLayout';
import { getCfg } from '../constellationDefaults';
import NodeCloud from './NodeCloud';
import ParticleCloud from './ParticleCloud';
import ConnectionLines from './ConnectionLines';
import HoverLabel from './HoverLabel';
import CameraController from './CameraController';
import Starfield from './Starfield';
import HelixBackbone from './HelixBackbone';

/**
 * Cinematic post-processing pipeline — Interstellar meets Blade Runner.
 *
 * Effects (all tier 2+ only, individually toggleable):
 *   1. Depth of Field — bokeh with smooth lerping on focus
 *   2. Bloom — soft glow on bright nodes
 *   3. Chromatic Aberration — subtle RGB fringing
 *   4. Film Grain (Noise) — barely-visible grain for cinema texture
 *   5. Vignette — darkened edges
 *   6. Tone Mapping — ACES Filmic color grading
 *
 * Every parameter is live-tunable via getCfg() (editor + localStorage).
 */
function CinematicDOF() {
  const dofRef = useRef();
  const bloomRef = useRef();
  const caRef = useRef();
  const noiseRef = useRef();
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const nodes = useConstellationStore((s) => s.nodes);
  const { camera } = useThree();

  // Track current animated values for smooth lerping (world units)
  const current = useRef({ bokeh: 1, focusDist: 120, focusRange: 80 });

  // Reusable Vector2 for chromatic aberration offset (avoid GC)
  const caOffset = useMemo(() => new Vector2(0.0005, 0.0005), []);

  // Toggle state — polled every frame, forces re-mount of EffectComposer when changed.
  // This is necessary because getCfg() reads window.__constellationConfig which doesn't
  // trigger React re-renders. We check every frame (cheap string compare) and setState
  // only when a toggle actually changes.
  const [toggleKey, setToggleKey] = useState(() => buildToggleKey());

  useFrame(() => {
    // ── DOF lerp ──
    if (dofRef.current) {
      let targetBokeh, targetFocusDist, targetFocusRange;

      if (focusedNodeId) {
        const node = nodes.find((n) => n.id === focusedNodeId);
        if (node) {
          const dx = camera.position.x - node.x;
          const dy = camera.position.y - node.y;
          const dz = camera.position.z - node.z;
          targetFocusDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        } else {
          targetFocusDist = 50;
        }
        targetBokeh = getCfg('focusedBokehScale');
        targetFocusRange = getCfg('focusedFocusRange');
      } else {
        targetFocusDist = getCfg('unfocusedFocusDist');
        targetBokeh = getCfg('unfocusedBokehScale');
        targetFocusRange = getCfg('unfocusedFocusRange');
      }

      const speed = getCfg('dofLerpSpeed');
      current.current.bokeh += (targetBokeh - current.current.bokeh) * speed;
      current.current.focusDist += (targetFocusDist - current.current.focusDist) * speed;
      current.current.focusRange += (targetFocusRange - current.current.focusRange) * speed;

      const effect = dofRef.current;
      effect.bokehScale = current.current.bokeh;
      const coc = effect.cocMaterial;
      if (coc) {
        coc.focusDistance = current.current.focusDist;
        coc.focusRange = current.current.focusRange;
      }
    }

    // ── Bloom live params ──
    if (bloomRef.current) {
      bloomRef.current.intensity = getCfg('bloomIntensity');
    }

    // ── Chromatic Aberration live offset ──
    if (caRef.current) {
      const off = getCfg('chromaticOffset');
      caOffset.set(off, off);
      caRef.current.offset = caOffset;
    }

    // ── Film Grain live opacity ──
    if (noiseRef.current) {
      noiseRef.current.blendMode.opacity.value = getCfg('grainOpacity');
    }

    // ── Poll toggle changes — cheap string compare, setState only on diff ──
    const nextKey = buildToggleKey();
    if (nextKey !== toggleKey) setToggleKey(nextKey);
  });

  // Parse current toggles from the key
  const bloomOn = toggleKey.includes('b1');
  const chromaOn = toggleKey.includes('c1');
  const grainOn = toggleKey.includes('g1');
  const toneOn = toggleKey.includes('t1');

  return (
    <EffectComposer key={toggleKey} frameBufferType={HalfFloatType} disableNormalPass>
      <DepthOfField
        ref={dofRef}
        focusDistance={getCfg('unfocusedFocusDist')}
        focalLength={getCfg('unfocusedFocusRange')}
        bokehScale={getCfg('unfocusedBokehScale')}
      />

      {bloomOn && (
        <Bloom
          ref={bloomRef}
          intensity={getCfg('bloomIntensity')}
          luminanceThreshold={getCfg('bloomThreshold')}
          luminanceSmoothing={getCfg('bloomSmoothing')}
          radius={getCfg('bloomRadius')}
          mipmapBlur
        />
      )}

      {chromaOn && (
        <ChromaticAberration
          ref={caRef}
          offset={caOffset}
          radialModulation
          modulationOffset={0.2}
        />
      )}

      {grainOn && (
        <Noise
          ref={noiseRef}
          premultiply
          blendFunction={BlendFunction.SOFT_LIGHT}
        />
      )}

      <Vignette
        eskil={false}
        offset={getCfg('vignetteOffset')}
        darkness={getCfg('vignetteDarkness')}
      />

      {toneOn && (
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      )}
    </EffectComposer>
  );
}

/** Build a toggle key string from current config state */
function buildToggleKey() {
  return [
    getCfg('bloomEnabled') ? 'b1' : 'b0',
    getCfg('chromaticEnabled') ? 'c1' : 'c0',
    getCfg('grainEnabled') ? 'g1' : 'g0',
    getCfg('toneMappingEnabled') ? 't1' : 't0',
  ].join('-');
}

/**
 * GPU tier-based configuration.
 * Capped at tier 2 to keep texture/geometry count low and avoid WebGL context loss.
 */
function getGPUConfig(tier) {
  if (tier <= 1) {
    return {
      bloom: false,
      pulseAnimation: false,
      starParticles: 0,
      dpr: 1,
      sphereSegments: 8,
    };
  }
  // Tier 2+ — bloom, stars, pulse (no nebula fog — it renders as ugly rectangles)
  return {
    bloom: true,
    pulseAnimation: true,
    starParticles: 2200,
    dpr: Math.min(1.5, window.devicePixelRatio),
    sphereSegments: 16,
  };
}

/**
 * Detect GPU tier synchronously before Canvas mounts.
 */
function detectGPUTier() {
  const cores = navigator.hardwareConcurrency || 2;
  const mobile = /Mobi|Android/i.test(navigator.userAgent);
  if (mobile || cores <= 2) return 1;
  return 2; // cap at 2 — tier 3 creates too many resources for StrictMode double-mount
}

/**
 * Main R3F Canvas for the constellation scene.
 */
export default function ConstellationCanvas() {
  const rendererRef = useRef();
  const controlsRef = useRef();
  const setGpuTier = useConstellationStore((s) => s.setGpuTier);
  const clearFocus = useConstellationStore((s) => s.clearFocus);
  const storeNodes = useConstellationStore((s) => s.nodes);
  const cameraMode = useConstellationStore((s) => s.cameraMode);
  const [gpuConfig] = useState(() => {
    const tier = detectGPUTier();
    setGpuTier(tier);
    return getGPUConfig(tier);
  });

  // Hybrid layout: use pipeline x/y/z when present, compute fallback for missing
  const layoutNodes = useMemo(() => {
    if (!storeNodes.length) return [];
    const allHaveCoords = storeNodes.every(
      (n) => typeof n.x === 'number' && typeof n.y === 'number' && typeof n.z === 'number'
    );
    if (allHaveCoords) return storeNodes;

    // Compute fallback positions, fill only missing coords
    const fallback = computeHelixLayout(storeNodes);
    const fallbackMap = new Map(fallback.map((n) => [n.id, n]));
    return storeNodes.map((node) => {
      if (typeof node.x === 'number' && typeof node.y === 'number' && typeof node.z === 'number') {
        return node;
      }
      const fb = fallbackMap.get(node.id);
      return fb || { ...node, x: 0, y: 0, z: 0 };
    });
  }, [storeNodes]);

  // Split nodes by tier for two-mesh rendering
  const { helixNodes, particleNodes } = useMemo(() => {
    const helix = [];
    const particle = [];
    for (const node of layoutNodes) {
      if (node.tier === 'particle') {
        particle.push(node);
      } else {
        helix.push(node);
      }
    }
    return { helixNodes: helix, particleNodes: particle };
  }, [layoutNodes]);

  // Helix center for camera target (based on helix nodes only)
  const center = useMemo(() => getHelixCenter(helixNodes.length > 0 ? helixNodes : layoutNodes), [helixNodes, layoutNodes]);

  // Helix vertical bounds for timeline scrubber (from helix nodes only)
  const helixBounds = useMemo(
    () => getHelixBounds(helixNodes.length > 0 ? helixNodes : layoutNodes),
    [helixNodes, layoutNodes]
  );

  // Adaptive camera distance based on helix extent
  const cameraFit = useMemo(() => {
    const helixHeight = (helixBounds.maxY - helixBounds.minY) || 100;
    const helixWidth = 68; // 2 * helix radius (34)
    const maxExtent = Math.max(helixHeight, helixWidth);
    // At 60° FOV, visible height at distance D ≈ 1.155 * D
    // Fill ~65% of viewport: D = maxExtent / (0.65 * 1.155)
    const idealZ = maxExtent / 0.75;
    // With particle cloud, allow more zoom out to see the full scene
    const z = Math.max(65, Math.min(350, idealZ));
    return {
      z,
      minDistance: Math.max(30, z * 0.35),
      maxDistance: Math.min(500, z * 2.5),
    };
  }, [helixBounds]);

  // Disposal verification on unmount
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        const info = rendererRef.current.info.memory;
        console.log(
          'Constellation unmount - geometries:',
          info.geometries,
          'textures:',
          info.textures
        );
      }
    };
  }, []);

  return (
    <Canvas
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{
        position: [0, center.y + 10, cameraFit.z],
        fov: 60,
      }}
      dpr={gpuConfig.dpr}
      onPointerMissed={() => clearFocus()}
      onCreated={({ gl }) => {
        rendererRef.current = gl;
        const canvas = gl.domElement;
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn('Constellation: WebGL context lost, will restore');
        });
        canvas.addEventListener('webglcontextrestored', () => {
          console.log('Constellation: WebGL context restored');
        });
      }}
    >
      <OrbitControls
        ref={controlsRef}
        autoRotate
        autoRotateSpeed={getCfg('autoRotateSpeed')}
        enableDamping
        dampingFactor={getCfg('dampingFactor')}
        enablePan={false}
        minPolarAngle={Math.PI * (15 / 180)}
        maxPolarAngle={Math.PI * (165 / 180)}
        minDistance={cameraFit.minDistance}
        maxDistance={cameraFit.maxDistance}
        target={[center.x, center.y, center.z]}
      />

      <CameraController
        controlsRef={controlsRef}
        positions={helixNodes.length > 0 ? helixNodes : layoutNodes}
        helixBounds={helixBounds}
      />

      <HoverLabel nodes={helixNodes.length > 0 ? helixNodes : layoutNodes} />

      <ambientLight intensity={getCfg('ambientLightIntensity')} />

      <HelixBackbone
        positions={helixNodes.length > 0 ? helixNodes : layoutNodes}
        disabled={gpuConfig.starParticles === 0}
      />

      <ConnectionLines positions={layoutNodes} />

      {helixNodes.length > 0 && (
        <NodeCloud
          nodes={helixNodes}
          gpuConfig={gpuConfig}
        />
      )}

      {particleNodes.length > 0 && (
        <ParticleCloud nodes={particleNodes} tunnelMode={cameraMode === 'tunnel'} />
      )}

      <Starfield starCount={gpuConfig.starParticles} />

      {gpuConfig.bloom && <CinematicDOF />}
    </Canvas>
  );
}
