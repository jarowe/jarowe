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

import { OrbitControls } from '@react-three/drei';
import FlightCamera from './particleMemory/FlightCamera';
import { CinematicCamera } from '../pages/CapsuleShell';

const BASE = import.meta.env.BASE_URL;
const MEMORY_WORLD_EDITOR_VERSION = 5;

function resolveAsset(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

function resolveMemoryWorldPath(sceneId, assetPath) {
  if (!assetPath) return null;
  if (assetPath.startsWith('http')) return assetPath;
  // Absolute paths (start with /) are relative to public root
  if (assetPath.startsWith('/')) return assetPath.slice(1);
  const normalized = assetPath.includes('/') ? assetPath : `world/${assetPath}`;
  return `memory/${sceneId}/${normalized}`;
}

function sampleGlobalAudioBands(targetArray) {
  const analyser = window.globalAnalyser;
  if (!analyser) {
    return { low: 0, mid: 0, high: 0, energy: 0 };
  }

  analyser.getByteFrequencyData(targetArray);
  const ranges = [
    [0, 12],
    [12, 42],
    [42, 96],
  ];

  const values = ranges.map(([from, to]) => {
    let sum = 0;
    for (let index = from; index < Math.min(to, targetArray.length); index += 1) {
      sum += targetArray[index];
    }
    const count = Math.max(1, Math.min(to, targetArray.length) - from);
    return sum / count / 255;
  });

  return {
    low: values[0],
    mid: values[1],
    high: values[2],
    energy: (values[0] + values[1] + values[2]) / 3,
  };
}

function createSuperSplatSettingsDataUrl({ position, target, fov }) {
  const settings = {
    background: { color: [0, 0, 0] },
    camera: {
      fov,
      position,
      target,
      startAnim: 'none',
      animTrack: '',
    },
    animTracks: [],
  };
  return `data:application/json,${encodeURIComponent(JSON.stringify(settings))}`;
}

function normalizeWorldTransform(transform) {
  if (!transform) return null;
  const position = Array.isArray(transform.position) && transform.position.length === 3
    ? transform.position
    : [0, 0, 0];
  const scale = Array.isArray(transform.scale) && transform.scale.length === 3
    ? transform.scale
    : [1, 1, 1];
  const rotation = Array.isArray(transform.rotation)
    ? (transform.rotation.length === 4 ? transform.rotation : [0, 0, 0, 1])
    : [0, 0, 0, 1];
  return { position, scale, rotation };
}

function quaternionToEulerDegrees(rotation = [0, 0, 0, 1]) {
  const quaternion = new THREE.Quaternion(
    rotation[0] ?? 0,
    rotation[1] ?? 0,
    rotation[2] ?? 0,
    rotation[3] ?? 1,
  );
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
  return [
    THREE.MathUtils.radToDeg(euler.x),
    THREE.MathUtils.radToDeg(euler.y),
    THREE.MathUtils.radToDeg(euler.z),
  ];
}

function eulerDegreesToQuaternion(rotation = [0, 0, 0]) {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(rotation[0] ?? 0),
    THREE.MathUtils.degToRad(rotation[1] ?? 0),
    THREE.MathUtils.degToRad(rotation[2] ?? 0),
    'XYZ',
  );
  const quaternion = new THREE.Quaternion().setFromEuler(euler);
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

function cloneVec3(value, fallback = [0, 0, 0]) {
  if (Array.isArray(value) && value.length === 3) {
    return [...value];
  }
  if (value && typeof value === 'object') {
    const x = Number.isFinite(value.x) ? value.x : fallback[0];
    const y = Number.isFinite(value.y) ? value.y : fallback[1];
    const z = Number.isFinite(value.z) ? value.z : fallback[2];
    return [x, y, z];
  }
  return [...fallback];
}

function getAlphaRemovalThreshold(splatUrl) {
  if (!splatUrl) return 1;
  const normalized = splatUrl.split('?')[0];
  return normalized.endsWith('.ply') ? 1 : 5;
}

function SuperSplatWorldFrame({
  splatUrl,
  cameraPosition,
  cameraTarget,
  cameraFov,
  onLoaded,
}) {
  const src = useMemo(() => {
    const viewerBase = `${BASE}vendor/supersplat-viewer/index.html`;
    const params = new URLSearchParams();
    params.set('content', resolveAsset(splatUrl));
    params.set(
      'settings',
      createSuperSplatSettingsDataUrl({
        position: cameraPosition,
        target: cameraTarget,
        fov: cameraFov,
      }),
    );
    params.set('aa', '1');
    params.set('gpusort', '1');
    return `${viewerBase}?${params.toString()}`;
  }, [cameraFov, cameraPosition, cameraTarget, splatUrl]);

  return (
    <iframe
      title="Memory world"
      src={src}
      className="memory-splat-frame"
      allow="fullscreen; xr-spatial-tracking"
      onLoad={onLoaded}
      style={{
        width: '100%',
        height: '100%',
        border: 0,
        display: 'block',
        background: '#000',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// SplatWorld — loads a gaussian splat via DropInViewer (THREE.Group)
// ---------------------------------------------------------------------------
function SplatWorld({ splatUrl, transform, onLoaded, onError }) {
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
          splatAlphaRemovalThreshold: getAlphaRemovalThreshold(resolvedUrl),
          showLoadingUI: false,
          position: transform?.position,
          rotation: transform?.rotation,
          scale: transform?.scale,
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

function StandaloneWorldViewer({
  splatUrl,
  cameraPosition,
  cameraTarget,
  transform,
  onLoaded,
  onError,
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !splatUrl) return;

    let disposed = false;

    async function initViewer() {
      try {
        const GaussianSplats3D = await import('@mkkellogg/gaussian-splats-3d');
        if (disposed || !containerRef.current) return;

        if (viewerRef.current) {
          try {
            viewerRef.current.dispose();
          } catch {
            // ignore viewer cleanup issues on hot reload
          }
          viewerRef.current = null;
        }

        const viewer = new GaussianSplats3D.Viewer({
          cameraUp: [0, 1, 0],
          initialCameraPosition: cameraPosition,
          initialCameraLookAt: cameraTarget,
          rootElement: containerRef.current,
          selfDrivenMode: true,
          useBuiltInControls: true,
          dynamicScene: false,
          sharedMemoryForWorkers: false,
          progressiveLoad: true,
        });
        viewerRef.current = viewer;

        const resolvedUrl = resolveAsset(splatUrl);
        console.log('[WorldMemoryRenderer] Loading splat:', resolvedUrl);

        await viewer.addSplatScene(resolvedUrl, {
          splatAlphaRemovalThreshold: getAlphaRemovalThreshold(resolvedUrl),
          showLoadingUI: false,
          position: transform?.position,
          rotation: transform?.rotation,
          scale: transform?.scale,
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

    const timer = setTimeout(initViewer, 300);
    return () => {
      disposed = true;
      clearTimeout(timer);
      if (viewerRef.current) {
        try {
          viewerRef.current.dispose();
        } catch {
          // ignore viewer cleanup issues on hot reload
        }
        viewerRef.current = null;
      }
    };
  }, [cameraPosition, cameraTarget, onError, onLoaded, splatUrl, transform]);

  return <div ref={containerRef} className="memory-splat-container" />;
}

// ---------------------------------------------------------------------------
// DreamParticles — ambient luminous particles floating in the world
// ---------------------------------------------------------------------------
const DREAM_VERT = /* glsl */ `
uniform float uTime;
uniform float uTravel;
uniform float uAudioLow;
uniform float uAudioMid;
uniform float uAudioHigh;
uniform float uMouseActivity;
uniform vec2 uPointer;
attribute float aPhase;
attribute float aSpeed;
attribute float aScale;
varying float vAlpha;
varying float vScale;
varying float vReveal;

void main() {
  vec3 pos = position;

  // Sine-wave drift on all axes — each particle has unique phase
  float t = uTime * aSpeed;
  pos.x += sin(t + aPhase * 6.2831) * 0.18;
  pos.y += cos(t * 0.7 + aPhase * 3.1416) * 0.14;
  pos.z += sin(t * 0.5 + aPhase * 1.5708) * 0.1;
  pos.z += uTravel * (1.18 + aScale * 0.36);
  pos.y += sin(t * 1.6 + aPhase * 9.0) * uAudioLow * 0.42;
  pos.x += cos(t * 1.3 + aPhase * 7.0) * uAudioMid * 0.24;
  pos.z += sin(t * 2.2 + aPhase * 11.0) * uAudioHigh * 0.26;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  vec4 clipPos = projectionMatrix * mvPos;
  vec2 ndc = clipPos.xy / max(clipPos.w, 0.0001);
  float cursorDist = distance(ndc, uPointer);
  float cursorReveal = smoothstep(0.92, 0.0, cursorDist) * uMouseActivity;

  // Size attenuation — closer particles are larger
  float sizeFactor = aScale * (62.0 / max(-mvPos.z, 0.9));
  gl_PointSize = clamp(sizeFactor * (0.95 + uAudioHigh * 0.4 + cursorReveal * 0.65 + uTravel * 0.3), 0.4, 8.4);

  // Depth-based alpha: farther = dimmer
  float dist = length(mvPos.xyz);
  vAlpha = smoothstep(25.0, 2.4, dist) * (0.28 + aPhase * 0.38) * (1.0 + uAudioMid * 0.38 + cursorReveal * 0.82);
  vReveal = cursorReveal;
  vScale = aScale;

  gl_Position = clipPos;
}
`;

const DREAM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying float vScale;
varying float vReveal;

void main() {
  // Soft circular point sprite
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float circle = 1.0 - smoothstep(0.3, 1.0, d);
  if (circle < 0.01) discard;

  vec3 color = mix(uColor, vec3(0.82, 0.9, 1.0), clamp(vReveal * 0.9, 0.0, 1.0));
  gl_FragColor = vec4(color, circle * vAlpha * uOpacity);
}
`;

function DreamParticles({
  count = 8000,
  radius = 15.0,
  color = '#FFE4B5',
  travelProgress = 0,
  pointer = { x: 0, y: 0, activity: 0 },
}) {
  const meshRef = useRef();
  const audioDataRef = useRef(new Uint8Array(128));
  const uniformsRef = useRef({
    uTime: { value: 0 },
    uTravel: { value: 0 },
    uAudioLow: { value: 0 },
    uAudioMid: { value: 0 },
    uAudioHigh: { value: 0 },
    uMouseActivity: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: 0.48 },
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
      scales[i] = 0.48 + Math.random() * 1.15;
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
    const audioBands = sampleGlobalAudioBands(audioDataRef.current);
    uniformsRef.current.uTime.value = clock.getElapsedTime();
    uniformsRef.current.uTravel.value = THREE.MathUtils.lerp(
      uniformsRef.current.uTravel.value,
      travelProgress,
      0.08,
    );
    uniformsRef.current.uAudioLow.value = THREE.MathUtils.lerp(
      uniformsRef.current.uAudioLow.value,
      audioBands.low,
      0.14,
    );
    uniformsRef.current.uAudioMid.value = THREE.MathUtils.lerp(
      uniformsRef.current.uAudioMid.value,
      audioBands.mid,
      0.14,
    );
    uniformsRef.current.uAudioHigh.value = THREE.MathUtils.lerp(
      uniformsRef.current.uAudioHigh.value,
      audioBands.high,
      0.14,
    );
    uniformsRef.current.uMouseActivity.value = THREE.MathUtils.lerp(
      uniformsRef.current.uMouseActivity.value,
      pointer.activity,
      0.16,
    );
    uniformsRef.current.uPointer.value.lerp(
      new THREE.Vector2(pointer.x, pointer.y),
      0.16,
    );
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <points ref={meshRef} geometry={geometry} material={material} />;
}

function ArchiveWorldController({
  target = [0, 0, 0],
  startPosition = [0, 0, 5],
  focusAnchor = [0, 0, 0],
  departAnchor = [0, 0, -1.8],
  fov = 50,
  phase = 'explore',
  travelDepth = 0,
  threadCharge = 0,
  pointer = { x: 0, y: 0, activity: 0 },
  direction = 'next',
}) {
  const { camera } = useThree();
  const targetVector = useMemo(() => new THREE.Vector3(...target), [target]);
  const startVector = useMemo(() => new THREE.Vector3(...startPosition), [startPosition]);
  const focusVector = useMemo(() => new THREE.Vector3(...focusAnchor), [focusAnchor]);
  const departVector = useMemo(() => new THREE.Vector3(...departAnchor), [departAnchor]);
  const lookDirection = useMemo(
    () => targetVector.clone().sub(startVector).normalize(),
    [startVector, targetVector],
  );
  const approachVector = useMemo(
    () => startVector.clone().sub(targetVector).normalize(),
    [startVector, targetVector],
  );
  const upVector = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const rightVector = useMemo(
    () => new THREE.Vector3().crossVectors(lookDirection, upVector).normalize(),
    [lookDirection, upVector],
  );
  const cameraDistance = useMemo(
    () => Math.max(startVector.distanceTo(targetVector), 2),
    [startVector, targetVector],
  );
  const audioDataRef = useRef(new Uint8Array(128));

  useFrame(({ clock }) => {
    const easedDepth = THREE.MathUtils.smoothstep(travelDepth, 0, 1);
    const easedThread = THREE.MathUtils.smoothstep(threadCharge, 0, 1);
    const activeThread = phase === 'depart' || phase === 'corridor' ? easedThread : 0;
    const directionSign = direction === 'previous' ? -0.35 : 1;
    const audioBands = sampleGlobalAudioBands(audioDataRef.current);
    const time = clock.getElapsedTime();
    const spiralAngle = (easedDepth * 1.18 + activeThread * 0.64) * directionSign + time * 0.08;
    const orbitRadius = 0.05 + easedDepth * 0.42 + activeThread * 0.18;
    const orbitOffset = rightVector.clone().multiplyScalar(Math.sin(spiralAngle) * orbitRadius);
    orbitOffset.add(
      upVector.clone().multiplyScalar(
        Math.cos(spiralAngle * 0.82) * (0.05 + easedDepth * 0.12 + activeThread * 0.08),
      ),
    );

    const focusPosition = startVector.clone().lerp(
      focusVector.clone().add(approachVector.clone().multiplyScalar(Math.max(cameraDistance * 0.18, 1.15))),
      easedDepth,
    );
    const departurePosition = focusPosition.clone().lerp(
      departVector.clone()
        .add(approachVector.clone().multiplyScalar(Math.max(cameraDistance * 0.1, 0.72)))
        .add(rightVector.clone().multiplyScalar(direction === 'previous' ? -0.28 : 0.28)),
      activeThread,
    );
    const basePosition = departurePosition.clone();
    basePosition.add(orbitOffset);
    const pointerOffset = rightVector.clone().multiplyScalar(
      pointer.x * (0.14 + easedDepth * 0.28 + activeThread * 0.1),
    );
    pointerOffset.add(upVector.clone().multiplyScalar(pointer.y * (0.08 + pointer.activity * 0.18)));
    basePosition.add(pointerOffset);
    basePosition.y += Math.sin(time * 0.35 + easedDepth * 2.1) * (0.03 + easedDepth * 0.04) + audioBands.low * 0.1;
    basePosition.add(lookDirection.clone().multiplyScalar(audioBands.mid * 0.06 + Math.sin(time * 0.82 + easedDepth * 4.4) * 0.04));

    camera.position.lerp(basePosition, phase === 'depart' ? 0.09 : 0.07);

    const lookBase = targetVector.clone()
      .lerp(focusVector, Math.min(1, easedDepth * 0.72))
      .lerp(departVector, activeThread * 0.42);
    const lookTarget = lookBase
      .add(rightVector.clone().multiplyScalar(pointer.x * (0.1 + easedDepth * 0.16)))
      .add(upVector.clone().multiplyScalar(pointer.y * 0.12))
      .add(lookDirection.clone().multiplyScalar(easedDepth * 0.14 + activeThread * 0.32));

    camera.lookAt(lookTarget);
    camera.fov = THREE.MathUtils.lerp(
      camera.fov,
      fov - easedDepth * 8.5 - activeThread * 3.2 - audioBands.high * 1.6,
      0.08,
    );
    camera.updateProjectionMatrix();
  });

  return null;
}

function SynapseField({
  pointer = { x: 0, y: 0, activity: 0 },
  travelProgress = 0,
}) {
  const groupRef = useRef(null);
  const lineRef = useRef(null);
  const pointRef = useRef(null);
  const audioDataRef = useRef(new Uint8Array(128));

  const data = useMemo(() => {
    const nodeCount = 18;
    const positions = new Float32Array(nodeCount * 3);
    const linePositions = [];

    for (let index = 0; index < nodeCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 2.4;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 1.5;
      positions[index * 3 + 2] = -Math.random() * 1.25;
    }

    for (let index = 0; index < nodeCount; index += 1) {
      const next = (index + 1) % nodeCount;
      linePositions.push(
        positions[index * 3],
        positions[index * 3 + 1],
        positions[index * 3 + 2],
        positions[next * 3],
        positions[next * 3 + 1],
        positions[next * 3 + 2],
      );
      if (index % 3 === 0) {
        const skip = (index + 5) % nodeCount;
        linePositions.push(
          positions[index * 3],
          positions[index * 3 + 1],
          positions[index * 3 + 2],
          positions[skip * 3],
          positions[skip * 3 + 1],
          positions[skip * 3 + 2],
        );
      }
    }

    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

    return { nodeGeometry, lineGeometry };
  }, []);

  useFrame(({ clock }) => {
    const audioBands = sampleGlobalAudioBands(audioDataRef.current);
    const reveal = THREE.MathUtils.clamp(
      pointer.activity * 1.05 + Math.max(0, travelProgress - 0.15) * 0.35 + audioBands.high * 0.28,
      0,
      1,
    );
    const drift = clock.getElapsedTime() * 0.08;
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        pointer.x * 1.85,
        0.14,
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        pointer.y * 1.1,
        0.14,
      );
      groupRef.current.position.z = THREE.MathUtils.lerp(
        groupRef.current.position.z,
        -2.1 - travelProgress * 1.25,
        0.08,
      );
    }

    if (lineRef.current) {
      lineRef.current.rotation.y = drift + pointer.x * 0.14;
      lineRef.current.rotation.x = pointer.y * 0.08;
      lineRef.current.material.opacity = reveal * 0.48;
      lineRef.current.material.color.setRGB(
        0.42 + audioBands.high * 0.22,
        0.62 + pointer.activity * 0.26,
        1,
      );
    }

    if (pointRef.current) {
      pointRef.current.rotation.y = -drift * 1.15;
      pointRef.current.material.opacity = reveal;
      pointRef.current.material.size = 0.06 + reveal * 0.08 + audioBands.high * 0.05;
    }
  });

  useEffect(() => () => {
    data.nodeGeometry.dispose();
    data.lineGeometry.dispose();
  }, [data]);

  return (
    <group ref={groupRef} position={[0, 0.2, -2.4]}>
      <lineSegments ref={lineRef} geometry={data.lineGeometry}>
        <lineBasicMaterial transparent opacity={0} color="#79c7ff" depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <points ref={pointRef} geometry={data.nodeGeometry}>
        <pointsMaterial
          transparent
          opacity={0}
          color="#e6f4ff"
          size={0.1}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
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

function WorldExploreControls({ target = [0, 0, 0], startPosition = [0, 0, 5] }) {
  const controlsRef = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(startPosition[0], startPosition[1], startPosition[2]);
    if (controlsRef.current) {
      controlsRef.current.target.set(target[0], target[1], target[2]);
      controlsRef.current.update();
    }
  }, [camera, startPosition, target]);

  const startDistance = useMemo(() => {
    const cam = new THREE.Vector3(startPosition[0], startPosition[1], startPosition[2]);
    const look = new THREE.Vector3(target[0], target[1], target[2]);
    return Math.max(cam.distanceTo(look), 1.5);
  }, [startPosition, target]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.45}
      zoomSpeed={0.8}
      panSpeed={0.55}
      minDistance={Math.max(0.35, startDistance * 0.15)}
      maxDistance={Math.max(14, startDistance * 6)}
      maxPolarAngle={Math.PI * 0.92}
      minPolarAngle={0.08}
      screenSpacePanning={false}
    />
  );
}

function ArchiveEditorPanel({
  sceneId,
  value,
  onChange,
  onReset,
}) {
  const [copied, setCopied] = useState(false);

  const updateVec3 = useCallback((field, index, nextValue) => {
    const parsed = Number.parseFloat(nextValue);
    onChange((current) => {
      const next = { ...current, [field]: [...current[field]] };
      next[field][index] = Number.isFinite(parsed) ? parsed : 0;
      return next;
    });
  }, [onChange]);

  const updateScalar = useCallback((field, nextValue) => {
    const parsed = Number.parseFloat(nextValue);
    onChange((current) => ({
      ...current,
      [field]: Number.isFinite(parsed) ? parsed : 0,
    }));
  }, [onChange]);

  const exportJson = useMemo(() => ({
    version: MEMORY_WORLD_EDITOR_VERSION,
    camera: {
      startPosition: value.cameraPosition,
      startTarget: value.cameraTarget,
      fov: value.fov,
    },
    world: {
      transform: {
        position: value.worldPosition,
        scale: value.worldScale,
        rotation: eulerDegreesToQuaternion(value.worldRotation),
      },
    },
    archiveNode: {
      travelAnchors: {
        focus: value.focusAnchor,
        depart: value.departAnchor,
      },
    },
  }), [value]);

  const copyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportJson, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }, [exportJson]);

  const fieldStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '0.3rem',
  };

  const inputStyle = {
    width: '100%',
    minWidth: 0,
    padding: '0.36rem 0.42rem',
    borderRadius: '0.55rem',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(9, 10, 16, 0.72)',
    color: 'rgba(255,255,255,0.92)',
    fontSize: '0.72rem',
  };

  const renderVec3 = (label, field) => (
    <label style={{ display: 'grid', gap: '0.28rem' }}>
      <span style={{ fontSize: '0.66rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.56)' }}>
        {label}
      </span>
      <div style={fieldStyle}>
        {value[field].map((entry, index) => (
          <input
            // eslint-disable-next-line react/no-array-index-key
            key={`${field}-${index}`}
            type="number"
            step="0.01"
            value={Number(entry).toFixed(2)}
            onChange={(event) => updateVec3(field, index, event.target.value)}
            style={inputStyle}
          />
        ))}
      </div>
    </label>
  );

  return (
    <div
      className="memory-world-editor"
      style={{
        position: 'absolute',
        top: '5.3rem',
        right: '1rem',
        zIndex: 32,
        width: 'min(24rem, calc(100vw - 2rem))',
        display: 'grid',
        gap: '0.55rem',
        padding: '0.78rem',
        borderRadius: '1rem',
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(7, 8, 14, 0.78)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 18px 54px rgba(0,0,0,0.24)',
        color: '#f7f3ea',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'grid', gap: '0.12rem' }}>
          <strong style={{ fontSize: '0.88rem', letterSpacing: '0.02em' }}>Memory World Editor</strong>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.64)' }}>{sceneId}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.42rem' }}>
          <button
            type="button"
            onClick={copyJson}
            style={{
              padding: '0.42rem 0.65rem',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.88)',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
          <button
            type="button"
            onClick={onReset}
            style={{
              padding: '0.42rem 0.65rem',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.74)',
              fontSize: '0.72rem',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {renderVec3('Camera Position', 'cameraPosition')}
      {renderVec3('Camera Target', 'cameraTarget')}
      {renderVec3('World Position', 'worldPosition')}
      {renderVec3('World Scale', 'worldScale')}
      {renderVec3('World Rotation', 'worldRotation')}
      {renderVec3('Focus Anchor', 'focusAnchor')}
      {renderVec3('Depart Anchor', 'departAnchor')}

      <label style={{ display: 'grid', gap: '0.28rem' }}>
        <span style={{ fontSize: '0.66rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.56)' }}>
          FOV
        </span>
        <input
          type="number"
          step="0.5"
          value={Number(value.fov).toFixed(1)}
          onChange={(event) => updateScalar('fov', event.target.value)}
          style={inputStyle}
        />
      </label>
    </div>
  );
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
  cameraTarget,
  cameraPosition,
  worldTransform,
  enablePostProcessing = true,
  archiveMode = false,
  archiveTravelProgress = 0,
  archivePhase = 'explore',
  archiveTravelDepth = 0,
  archiveThreadCharge = 0,
  archivePointer = { x: 0, y: 0, activity: 0 },
  travelDirection = 'next',
  archiveTravelAnchors = null,
}) {
  const isFullTier = tier === 'full';
  const hasFlightPath = !!scene.flightPath;
  const hasRealWorld = !!splatUrl;

  const handleProgress = useCallback(
    (p) => {
      if (onProgress) onProgress(p);
    },
    [onProgress],
  );

  const dreamCount = isFullTier ? 9000 : 4200;

  return (
    <>
      {/* Layer 1: Gaussian splat world */}
      {splatUrl && (
        <SplatWorld
          splatUrl={splatUrl}
          transform={worldTransform}
          onLoaded={onSplatLoaded}
          onError={onSplatError}
        />
      )}

      {/* Layer 2: Dream particles */}
      <DreamParticles
        count={dreamCount}
        radius={isFullTier ? 12.5 : 8.5}
        color="#FFE4B5"
        travelProgress={archiveTravelProgress}
        pointer={archivePointer}
      />

      {archiveMode && (
        <SynapseField
          pointer={archivePointer}
          travelProgress={archiveTravelProgress}
        />
      )}

      {/* Layer 3: Atmosphere */}
      <WorldAtmosphere
        fogColor="#0a0a12"
        radius={isFullTier ? 35.0 : 25.0}
      />

      {/* Layer 4: Camera */}
      {hasRealWorld && archiveMode ? (
        <ArchiveWorldController
          target={cameraTarget}
          startPosition={cameraPosition}
          focusAnchor={archiveTravelAnchors?.focus ?? cameraTarget}
          departAnchor={archiveTravelAnchors?.depart ?? cameraTarget}
          fov={scene.flightPath?.fovRange?.[0] ?? 50}
          phase={archivePhase}
          travelDepth={archiveTravelDepth}
          threadCharge={archiveThreadCharge}
          pointer={archivePointer}
          direction={travelDirection}
        />
      ) : hasRealWorld ? (
        <WorldExploreControls
          target={cameraTarget}
          startPosition={cameraPosition}
        />
      ) : hasFlightPath ? (
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
      {isFullTier && enablePostProcessing && <WorldPostProcessing />}
    </>
  );
}

// ---------------------------------------------------------------------------
// WorldMemoryRenderer — main export (matches ParticleFieldRenderer props)
// ---------------------------------------------------------------------------
const WorldMemoryRenderer = forwardRef(function WorldMemoryRenderer(
  {
    scene,
    tier,
    onRecessionComplete,
    onAwakeningComplete,
    directAccess,
    onProgress,
    enablePostProcessing = true,
    archiveMode = false,
    archiveTravelProgress = 0,
    archivePhase = 'explore',
    archiveTravelDepth = 0,
    archiveThreadCharge = 0,
    archivePointer = { x: 0, y: 0, activity: 0 },
    travelDirection = 'next',
    archiveEditorEnabled = false,
  },
  ref,
) {
  const [splatLoaded, setSplatLoaded] = useState(false);
  const [splatError, setSplatError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [editorState, setEditorState] = useState(null);
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
        const res = await fetch(metaUrl, { cache: 'no-store' });
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
      // meta.json splat paths are relative to the memory directory.
      // Support both the current world/scene.ply contract and legacy scene.ply values.
      return resolveMemoryWorldPath(scene.id, meta.world.splat);
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
  const camPos = useMemo(() => meta?.camera?.startPosition ?? [
    scene.cameraPosition?.x ?? 0,
    scene.cameraPosition?.y ?? 0.5,
    scene.cameraPosition?.z ?? 5,
  ], [meta?.camera?.startPosition, scene.cameraPosition?.x, scene.cameraPosition?.y, scene.cameraPosition?.z]);
  const camTarget = useMemo(() => meta?.camera?.startTarget ?? [
    scene.cameraTarget?.x ?? 0,
    scene.cameraTarget?.y ?? 0,
    scene.cameraTarget?.z ?? 0,
  ], [meta?.camera?.startTarget, scene.cameraTarget?.x, scene.cameraTarget?.y, scene.cameraTarget?.z]);
  const camFov = meta?.camera?.fov ?? scene.flightPath?.fovRange?.[0] ?? 50;
  const camNear = meta?.camera?.near ?? 0.1;
  const camFar = meta?.camera?.far ?? 200;
  const previewUrl = resolveAsset(scene.previewImage ?? scene.photoUrl);
  const defaultWorldTransform = useMemo(() => (
    normalizeWorldTransform(meta?.world?.transform) ?? {
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0, 1],
    }
  ), [meta?.world?.transform]);
  const baseTravelAnchors = useMemo(() => ({
    focus: cloneVec3(scene.archiveNode?.travelAnchors?.focus, camTarget),
    depart: cloneVec3(scene.archiveNode?.travelAnchors?.depart, [camTarget[0], camTarget[1], camTarget[2] - 1.8]),
  }), [camTarget, scene.archiveNode?.travelAnchors?.depart, scene.archiveNode?.travelAnchors?.focus]);

  useEffect(() => {
    if (!archiveMode || !metaLoaded) return;

    const storageKey = `memory-world-editor:${scene.id}`;
    const parsed = (() => {
      try {
        return JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      } catch {
        return null;
      }
    })();

    const isCurrentEditorState = parsed?.version === MEMORY_WORLD_EDITOR_VERSION;

    setEditorState({
      cameraPosition: cloneVec3(
        isCurrentEditorState ? parsed?.cameraPosition : null,
        camPos,
      ),
      cameraTarget: cloneVec3(
        isCurrentEditorState ? parsed?.cameraTarget : null,
        camTarget,
      ),
      fov: isCurrentEditorState && typeof parsed?.fov === 'number' ? parsed.fov : camFov,
      worldPosition: cloneVec3(
        isCurrentEditorState ? parsed?.worldPosition : null,
        defaultWorldTransform.position,
      ),
      worldScale: cloneVec3(
        isCurrentEditorState ? parsed?.worldScale : null,
        defaultWorldTransform.scale,
      ),
      worldRotation: cloneVec3(
        isCurrentEditorState ? parsed?.worldRotation : null,
        quaternionToEulerDegrees(defaultWorldTransform.rotation),
      ),
      focusAnchor: cloneVec3(
        isCurrentEditorState ? parsed?.focusAnchor : null,
        baseTravelAnchors.focus,
      ),
      departAnchor: cloneVec3(
        isCurrentEditorState ? parsed?.departAnchor : null,
        baseTravelAnchors.depart,
      ),
    });
  }, [
    archiveMode,
    baseTravelAnchors.depart,
    baseTravelAnchors.focus,
    camFov,
    camPos,
    camTarget,
    defaultWorldTransform.position,
    defaultWorldTransform.rotation,
    defaultWorldTransform.scale,
    metaLoaded,
    scene.id,
  ]);

  useEffect(() => {
    if (!archiveMode || !archiveEditorEnabled || !editorState) return;
    const storageKey = `memory-world-editor:${scene.id}`;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...editorState,
        version: MEMORY_WORLD_EDITOR_VERSION,
      }),
    );
  }, [archiveEditorEnabled, archiveMode, editorState, scene.id]);

  const effectiveCamPos = editorState?.cameraPosition ?? camPos;
  const effectiveCamTarget = editorState?.cameraTarget ?? camTarget;
  const effectiveCamFov = editorState?.fov ?? camFov;
  const effectiveWorldTransform = editorState ? {
    position: cloneVec3(editorState.worldPosition, defaultWorldTransform.position),
    scale: cloneVec3(editorState.worldScale, defaultWorldTransform.scale),
    rotation: eulerDegreesToQuaternion(editorState.worldRotation),
  } : defaultWorldTransform;
  const effectiveTravelAnchors = editorState ? {
    focus: cloneVec3(editorState.focusAnchor, baseTravelAnchors.focus),
    depart: cloneVec3(editorState.departAnchor, baseTravelAnchors.depart),
  } : baseTravelAnchors;

  // Show loading until meta is resolved
  if (!metaLoaded) {
    return (
      <div
        className="memory-splat-container"
        style={previewUrl ? {
          background: `linear-gradient(rgba(4,4,10,0.68), rgba(4,4,10,0.84)), url(${previewUrl}) center / cover no-repeat`,
        } : undefined}
      >
        <div className="memory-loading">
          <div className="memory-loading-spinner" />
          <span>Preparing world...</span>
        </div>
      </div>
    );
  }

  if (hasSplat) {
    return (
      <div
        className="memory-splat-container"
        style={{ touchAction: 'none' }}
      >
        {/* Single R3F Canvas — splat world + dream particles + atmosphere in one scene */}
        <Canvas
          dpr={isFullTier ? [1, 2] : [1, 1]}
          camera={{
            position: effectiveCamPos,
            fov: effectiveCamFov,
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
          {/* Layer 1: Gaussian splat world via DropInViewer */}
          <SplatWorld
            splatUrl={splatUrl}
            transform={effectiveWorldTransform}
            onLoaded={handleSplatLoaded}
            onError={handleSplatError}
          />

          {/* Layer 2: Dream particles — luminous dust motes */}
          <DreamParticles
            count={isFullTier ? 9000 : 4200}
            radius={isFullTier ? 12.5 : 8.5}
            color="#FFE4B5"
            travelProgress={archiveTravelProgress}
            pointer={archivePointer}
          />

          {archiveMode && (
            <SynapseField
              pointer={archivePointer}
              travelProgress={archiveTravelProgress}
            />
          )}

          {/* Layer 3: Atmosphere fog */}
          <WorldAtmosphere
            fogColor="#0a0a12"
            radius={isFullTier ? 30.0 : 20.0}
          />

          {/* Layer 4: Camera controls */}
          {archiveMode ? (
            <ArchiveWorldController
              target={effectiveCamTarget}
              startPosition={effectiveCamPos}
              focusAnchor={effectiveTravelAnchors.focus}
              departAnchor={effectiveTravelAnchors.depart}
              fov={effectiveCamFov}
              phase={archivePhase}
              travelDepth={archiveTravelDepth}
              threadCharge={archiveThreadCharge}
              pointer={archivePointer}
              direction={travelDirection}
            />
          ) : (
            <WorldExploreControls
              target={effectiveCamTarget}
              startPosition={effectiveCamPos}
            />
          )}

          {/* Layer 5: Post-processing (full tier) */}
          {isFullTier && enablePostProcessing && <WorldPostProcessing />}
        </Canvas>

        {!splatLoaded && (
          <>
            {previewUrl && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(rgba(4,4,10,0.38), rgba(4,4,10,0.72)), url(${previewUrl}) center / cover no-repeat`,
                  opacity: 0.9,
                }}
              />
            )}
            <div className="memory-loading">
              <div className="memory-loading-spinner" />
              <span>Loading world...</span>
            </div>
          </>
        )}

        {splatLoaded && !archiveMode && (
          <div
            style={{
              position: 'absolute',
              right: '1.25rem',
              bottom: '1.25rem',
              zIndex: 12,
              padding: '0.55rem 0.75rem',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(10, 10, 16, 0.55)',
              backdropFilter: 'blur(10px)',
              color: 'rgba(255,255,255,0.72)',
              fontSize: '0.82rem',
              letterSpacing: '0.02em',
              pointerEvents: 'none',
            }}
          >
            Drag to orbit / Scroll to zoom
          </div>
        )}

        {archiveMode && archiveEditorEnabled && editorState && (
          <ArchiveEditorPanel
            sceneId={scene.id}
            value={editorState}
            onChange={setEditorState}
            onReset={() => {
              const storageKey = `memory-world-editor:${scene.id}`;
              window.localStorage.removeItem(storageKey);
              setEditorState({
                cameraPosition: cloneVec3(camPos),
                cameraTarget: cloneVec3(camTarget),
                fov: camFov,
                worldPosition: cloneVec3(defaultWorldTransform.position),
                worldScale: cloneVec3(defaultWorldTransform.scale),
                worldRotation: quaternionToEulerDegrees(defaultWorldTransform.rotation),
                focusAnchor: cloneVec3(baseTravelAnchors.focus),
                departAnchor: cloneVec3(baseTravelAnchors.depart),
              });
            }}
          />
        )}

        <div className="capsule-vignette" />
      </div>
    );
  }

  return (
    <div
      className="memory-splat-container"
      style={hasSplat || hasFlightPath ? { touchAction: 'none' } : undefined}
    >
      <Canvas
        dpr={dpr}
        camera={{
          position: effectiveCamPos,
          fov: effectiveCamFov,
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
          cameraTarget={effectiveCamTarget}
          cameraPosition={effectiveCamPos}
          worldTransform={effectiveWorldTransform}
          enablePostProcessing={enablePostProcessing}
          archiveMode={archiveMode}
          archiveTravelProgress={archiveTravelProgress}
          archivePhase={archivePhase}
          archiveTravelDepth={archiveTravelDepth}
          archiveThreadCharge={archiveThreadCharge}
          archivePointer={archivePointer}
          travelDirection={travelDirection}
          archiveTravelAnchors={effectiveTravelAnchors}
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

      {archiveMode && archiveEditorEnabled && editorState && (
        <ArchiveEditorPanel
          sceneId={scene.id}
          value={editorState}
          onChange={setEditorState}
          onReset={() => {
            const storageKey = `memory-world-editor:${scene.id}`;
            window.localStorage.removeItem(storageKey);
            setEditorState({
              cameraPosition: cloneVec3(camPos),
              cameraTarget: cloneVec3(camTarget),
              fov: camFov,
              worldPosition: cloneVec3(defaultWorldTransform.position),
              worldScale: cloneVec3(defaultWorldTransform.scale),
              worldRotation: quaternionToEulerDegrees(defaultWorldTransform.rotation),
              focusAnchor: cloneVec3(baseTravelAnchors.focus),
              departAnchor: cloneVec3(baseTravelAnchors.depart),
            });
          }}
        />
      )}
    </div>
  );
});

export default WorldMemoryRenderer;
