import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, DepthOfField, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { HalfFloatType, Color } from 'three';
import { BlendFunction } from 'postprocessing';
import gsap from 'gsap';
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
import NebulaFog from './NebulaFog';
import AmbientShootingStars from './AmbientShootingStars';

/**
 * Scene fog that fades distant objects into darkness for atmospheric depth.
 * Reads config every frame so the editor can tune near/far in real-time.
 */
function SceneFog() {
  const { scene } = useThree();
  const fogRef = useRef(null);

  useFrame(() => {
    const enabled = getCfg('fogEnabled');
    if (!enabled) {
      if (scene.fog) scene.fog = null;
      fogRef.current = null;
      return;
    }
    const near = getCfg('fogNear');
    const far = getCfg('fogFar');
    const color = getCfg('fogColor');

    if (!fogRef.current) {
      fogRef.current = new THREE.Fog(color, near, far);
      scene.fog = fogRef.current;
    }
    fogRef.current.color.set(color);
    fogRef.current.near = near;
    fogRef.current.far = far;
  });

  return null;
}

/**
 * Cinematic depth-of-field that intensifies when a node is focused.
 * Smoothly lerps DOF parameters each frame for a seamless transition.
 */
function CinematicDOF() {
  const dofRef = useRef();
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const nodes = useConstellationStore((s) => s.nodes);
  const { camera } = useThree();
  const chromaticOffset = useMemo(() => new THREE.Vector2(getCfg('chromaticOffset'), getCfg('chromaticOffset')), []);

  // Track current animated values for smooth lerping (world units)
  const current = useRef({ bokeh: 1, focusDist: 120, focusRange: 80 });

  useFrame(() => {
    if (!dofRef.current) return;

    let targetBokeh, targetFocusDist, targetFocusRange;

    if (focusedNodeId) {
      // Find the focused node to calculate distance from camera
      const node = nodes.find((n) => n.id === focusedNodeId);
      if (node) {
        const dx = camera.position.x - node.x;
        const dy = camera.position.y - node.y;
        const dz = camera.position.z - node.z;
        targetFocusDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      } else {
        targetFocusDist = 50;
      }
      // Cinematic close-up: strong bokeh, narrow focus range
      targetBokeh = getCfg('focusedBokehScale');
      targetFocusRange = getCfg('focusedFocusRange');
    } else {
      // Unfocused: very subtle DOF for atmosphere
      targetFocusDist = getCfg('unfocusedFocusDist');
      targetBokeh = getCfg('unfocusedBokehScale');
      targetFocusRange = getCfg('unfocusedFocusRange');
    }

    // Smooth lerp toward targets
    const speed = getCfg('dofLerpSpeed');
    current.current.bokeh += (targetBokeh - current.current.bokeh) * speed;
    current.current.focusDist += (targetFocusDist - current.current.focusDist) * speed;
    current.current.focusRange += (targetFocusRange - current.current.focusRange) * speed;

    // Update the effect properties via postprocessing API
    const effect = dofRef.current;
    effect.bokehScale = current.current.bokeh;
    const coc = effect.cocMaterial;
    if (coc) {
      coc.focusDistance = current.current.focusDist;
      coc.focusRange = current.current.focusRange;
    }

    const chromatic = getCfg('chromaticEnabled') ? getCfg('chromaticOffset') : 0;
    chromaticOffset.set(chromatic, chromatic);
  });

  return (
    <EffectComposer frameBufferType={HalfFloatType} disableNormalPass>
      {getCfg('bloomEnabled') && (
        <Bloom
          intensity={getCfg('bloomIntensity')}
          luminanceThreshold={getCfg('bloomThreshold')}
          luminanceSmoothing={getCfg('bloomSmoothing')}
          radius={getCfg('bloomRadius')}
          mipmapBlur
        />
      )}
      <DepthOfField
        ref={dofRef}
        focusDistance={120}
        focalLength={80}
        bokehScale={1}
      />
      {getCfg('chromaticEnabled') && (
        <ChromaticAberration offset={chromaticOffset} />
      )}
      <Vignette eskil={false} offset={getCfg('vignetteOffset')} darkness={getCfg('vignetteDarkness')} />
      {getCfg('grainEnabled') && (
        <Noise
          blendFunction={BlendFunction.OVERLAY}
          opacity={getCfg('grainOpacity')}
        />
      )}
    </EffectComposer>
  );
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
export default function ConstellationCanvas({
  introEnabled = false,
  onIntroComplete = null,
  reducedMotion = false,
}) {
  const rendererRef = useRef();
  const controlsRef = useRef();
  const introRef = useRef({ active: false, progress: 1 });
  const setGpuTier = useConstellationStore((s) => s.setGpuTier);
  const clearFocus = useConstellationStore((s) => s.clearFocus);
  const storeNodes = useConstellationStore((s) => s.nodes);
  const cameraMode = useConstellationStore((s) => s.cameraMode);
  const [gpuConfig] = useState(() => {
    const tier = detectGPUTier();
    return getGPUConfig(tier);
  });

  // Set GPU tier in store after render (avoids setState-during-render warning)
  useEffect(() => {
    setGpuTier(gpuConfig.bloom ? 2 : 1);
  }, [setGpuTier, gpuConfig]);

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

  // Compute epoch cluster centers for nebula fog
  const epochCenters = useMemo(() => {
    if (!helixNodes.length) return [];
    // Group nodes by epoch (use date year as epoch)
    const epochMap = new Map();
    const epochColors = [
      '#4d99ff', '#a78bfa', '#34d399', '#f472b6',
      '#fbbf24', '#2dd4bf', '#fb923c', '#60a5fa',
    ];
    for (const node of helixNodes) {
      const year = node.date ? new Date(node.date).getFullYear() : 2000;
      // Group into 5-year epochs
      const epochKey = Math.floor(year / 5) * 5;
      if (!epochMap.has(epochKey)) {
        epochMap.set(epochKey, { x: 0, y: 0, z: 0, count: 0, epoch: epochKey });
      }
      const ep = epochMap.get(epochKey);
      ep.x += node.x || 0;
      ep.y += node.y || 0;
      ep.z += node.z || 0;
      ep.count++;
    }
    const centers = [];
    let colorIdx = 0;
    for (const [, ep] of epochMap) {
      if (ep.count < 3) continue; // Skip sparse epochs
      centers.push({
        epoch: ep.epoch,
        x: ep.x / ep.count,
        y: ep.y / ep.count,
        z: ep.z / ep.count,
        color: epochColors[colorIdx % epochColors.length],
      });
      colorIdx++;
    }
    return centers;
  }, [helixNodes]);

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

  useEffect(() => {
    if (!introEnabled) {
      introRef.current.active = false;
      introRef.current.progress = 1;
      return undefined;
    }

    const introProxy = { progress: 0 };
    introRef.current.active = true;
    introRef.current.progress = 0;

    const tween = gsap.to(introProxy, {
      progress: 1,
      duration: 3.6,
      ease: 'power2.inOut',
      onUpdate: () => {
        introRef.current.progress = introProxy.progress;
      },
      onComplete: () => {
        introRef.current.active = false;
        introRef.current.progress = 1;
        onIntroComplete?.();
      },
    });

    return () => tween.kill();
  }, [introEnabled, onIntroComplete]);

  return (
    <Canvas
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{
        position: [0, center.y + 10, cameraFit.z],
        fov: 60,
      }}
      dpr={gpuConfig.dpr}
      onPointerMissed={() => clearFocus()}
      onCreated={({ gl, scene }) => {
        rendererRef.current = gl;
        // Set scene background to match page — prevents black flash during
        // EffectComposer initialization (first frame has empty framebuffer)
        scene.background = new Color(0x080810);
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
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.04}
        enablePan={false}
        minPolarAngle={Math.PI * (15 / 180)}
        maxPolarAngle={Math.PI * (165 / 180)}
        minDistance={cameraFit.minDistance}
        maxDistance={cameraFit.maxDistance}
        target={[center.x, center.y, center.z]}
      />

      <CameraController
        controlsRef={controlsRef}
        positions={layoutNodes}
        helixBounds={helixBounds}
        introEnabled={introEnabled}
        introRef={introRef}
      />

      <HoverLabel nodes={layoutNodes} />

      {/* Scene fog for atmospheric depth falloff */}
      <SceneFog />

      <ambientLight intensity={getCfg('ambientLightIntensity')} />
      {/* Point light at center for MeshStandardMaterial node illumination */}
      <pointLight
        position={[center.x, center.y, center.z]}
        intensity={1.2}
        distance={300}
        decay={1.5}
        color="#c8d8ff"
      />

      <HelixBackbone
        positions={helixNodes.length > 0 ? helixNodes : layoutNodes}
        disabled={gpuConfig.starParticles === 0}
        introRef={introRef}
        reducedMotion={reducedMotion}
      />

      <ConnectionLines positions={layoutNodes} introRef={introRef} reducedMotion={reducedMotion} />

      {helixNodes.length > 0 && (
        <NodeCloud
          nodes={helixNodes}
          gpuConfig={gpuConfig}
          introRef={introRef}
        />
      )}

      {particleNodes.length > 0 && (
        <ParticleCloud
          nodes={particleNodes}
          tunnelMode={cameraMode === 'tunnel'}
          introRef={introRef}
        />
      )}

      {/* Nebula fog near epoch cluster centers */}
      <NebulaFog
        epochCenters={epochCenters}
        enabled={getCfg('nebulaEnabled') && gpuConfig.bloom}
      />

      <Starfield starCount={gpuConfig.starParticles} reducedMotion={reducedMotion} />
      <AmbientShootingStars introRef={introRef} reducedMotion={reducedMotion} />

      {gpuConfig.bloom && <CinematicDOF />}
    </Canvas>
  );
}
