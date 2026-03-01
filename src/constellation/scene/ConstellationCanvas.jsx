import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
// Bloom disabled — EffectComposer creates ~15 render target textures which
// causes WebGL context loss during React StrictMode double-mount.
// TODO: Re-enable after adding production-only bloom or custom glow shader.
import { useConstellationStore } from '../store';
import { computeHelixLayout, getHelixCenter, getHelixBounds } from '../layout/helixLayout';
import NodeCloud from './NodeCloud';
import ConnectionLines from './ConnectionLines';
import HoverLabel from './HoverLabel';
import CameraController from './CameraController';
import Starfield from './Starfield';
import HelixBackbone from './HelixBackbone';

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
    sphereSegments: 12,
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

  // Helix center for camera target
  const center = useMemo(() => getHelixCenter(layoutNodes), [layoutNodes]);

  // Helix vertical bounds for timeline scrubber
  const helixBounds = useMemo(() => getHelixBounds(layoutNodes), [layoutNodes]);

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
        position: [0, center.y + 10, 110],
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
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.05}
        enablePan={false}
        minPolarAngle={Math.PI * (15 / 180)}
        maxPolarAngle={Math.PI * (165 / 180)}
        minDistance={55}
        maxDistance={170}
        target={[center.x, center.y, center.z]}
      />

      <CameraController
        controlsRef={controlsRef}
        positions={layoutNodes}
        helixBounds={helixBounds}
      />

      <HoverLabel nodes={layoutNodes} />

      <ambientLight intensity={0.15} />

      <HelixBackbone
        positions={layoutNodes}
        disabled={gpuConfig.starParticles === 0}
      />

      <ConnectionLines positions={layoutNodes} />

      <NodeCloud
        nodes={layoutNodes}
        gpuConfig={gpuConfig}
      />

      <Starfield starCount={gpuConfig.starParticles} />

      {/* Bloom disabled — see import comment. Nodes use emissive glow instead. */}
    </Canvas>
  );
}
