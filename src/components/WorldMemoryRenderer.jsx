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
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useLocation } from 'react-router-dom';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { HalfFloatType } from 'three';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { OrbitControls } from '@react-three/drei';
import FlightCamera from './particleMemory/FlightCamera';
import { CinematicCamera } from '../pages/CapsuleShell';

const BASE = import.meta.env.BASE_URL;
const MEMORY_WORLD_EDITOR_VERSION = 6;

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

function resolveMemoryAssetPath(sceneId, assetPath) {
  if (!assetPath) return null;
  if (assetPath.startsWith('http')) return assetPath;
  if (assetPath.startsWith('/')) return assetPath.slice(1);
  return `memory/${sceneId}/${assetPath}`;
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function computeSubjectFocusIntensity({
  pointer = { x: 0, y: 0, activity: 0 },
  travelProgress = 0,
  subjectCrop = null,
  presentation = 'ambient',
}) {
  if (!Array.isArray(subjectCrop) || subjectCrop.length < 4) return 0;

  const cropX = Number(subjectCrop[0]) || 0;
  const cropY = Number(subjectCrop[1]) || 0;
  const cropWidth = Number(subjectCrop[2]) || 0;
  const cropHeight = Number(subjectCrop[3]) || 0;
  const focusTargetX = ((cropX + cropWidth * 0.5) - 0.5) * 1.1;
  const focusTargetY = (0.5 - (cropY + cropHeight * 0.5)) * 1.15;
  const distance = Math.hypot(
    (pointer.x - focusTargetX) * 1.2,
    (pointer.y - focusTargetY) * 1.45,
  );
  const proximity = 1 - smoothstep(0.14, 0.82, distance);
  const intent = smoothstep(0.05, 0.45, pointer.activity ?? 0);
  const travelReady = presentation === 'chapter'
    ? smoothstep(0.04, 0.24, travelProgress)
    : smoothstep(0.02, 0.16, travelProgress);

  return THREE.MathUtils.clamp(
    proximity * (0.18 + intent * 0.82) * Math.max(0.35, travelReady),
    0,
    1,
  );
}

function buildProjectedSubjectMeshParts(subjectScene) {
  if (!subjectScene) return null;

  const bakedGeometries = [];
  const worldBounds = new THREE.Box3().makeEmpty();

  subjectScene.updateMatrixWorld(true);
  subjectScene.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    if (!geometry.boundingBox) {
      geometry.dispose();
      return;
    }

    worldBounds.union(geometry.boundingBox);
    bakedGeometries.push(geometry);
  });

  if (!bakedGeometries.length || worldBounds.isEmpty()) {
    bakedGeometries.forEach(geometry => geometry.dispose());
    return null;
  }

  const center = worldBounds.getCenter(new THREE.Vector3());
  const size = worldBounds.getSize(new THREE.Vector3());
  const invHeight = size.y > 1e-5 ? 1 / size.y : 1;

  return bakedGeometries.map((geometry, index) => {
    const position = geometry.attributes.position;
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      position.setXYZ(
        vertex,
        (position.getX(vertex) - center.x) * invHeight,
        (position.getY(vertex) - center.y) * invHeight,
        (position.getZ(vertex) - center.z) * invHeight,
      );
    }
    position.needsUpdate = true;
    geometry.computeBoundingBox();

    const bounds = geometry.boundingBox ?? new THREE.Box3();
    const boundsSize = bounds.getSize(new THREE.Vector3());
    const uvArray = new Float32Array(position.count * 2);

    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const x = position.getX(vertex);
      const y = position.getY(vertex);
      const u = (x - bounds.min.x) / Math.max(boundsSize.x, 1e-5);
      const v = (y - bounds.min.y) / Math.max(boundsSize.y, 1e-5);
      uvArray[vertex * 2] = THREE.MathUtils.clamp(u, 0, 1);
      uvArray[vertex * 2 + 1] = THREE.MathUtils.clamp(v, 0, 1);
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    geometry.computeVertexNormals();

    return {
      key: `subject-mesh-${index}`,
      geometry,
    };
  });
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

function cloneVec4(value, fallback = [0, 0, 1, 1]) {
  if (Array.isArray(value) && value.length === 4) {
    return [...value];
  }
  if (value && typeof value === 'object') {
    const x = Number.isFinite(value.x) ? value.x : fallback[0];
    const y = Number.isFinite(value.y) ? value.y : fallback[1];
    const z = Number.isFinite(value.z) ? value.z : fallback[2];
    const w = Number.isFinite(value.w) ? value.w : fallback[3];
    return [x, y, z, w];
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
  float sizeFactor = aScale * (44.0 / max(-mvPos.z, 0.9));
  gl_PointSize = clamp(sizeFactor * (0.9 + uAudioHigh * 0.35 + cursorReveal * 0.55 + uTravel * 0.18), 0.3, 4.6);

  // Depth-based alpha: farther = dimmer
  float dist = length(mvPos.xyz);
  vAlpha = smoothstep(22.0, 1.8, dist) * (0.34 + aPhase * 0.42) * (1.0 + uAudioMid * 0.42 + cursorReveal * 0.88);
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
  count = 12000,
  radius = 11.0,
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
    uOpacity: { value: 0.58 },
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
      scales[i] = 0.24 + Math.random() * 0.58;
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
      depthTest: false,
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

function ClusterMemoryFacets({
  primaryImage = null,
  primaryAlphaImage = null,
  subjectMeshUrl = null,
  subjectMeshTransform = null,
  images = [],
  primaryCrop = null,
  pointer = { x: 0, y: 0, activity: 0 },
  travelProgress = 0,
  blend = 1,
  tint = '#f7f2e9',
  orbitOffset = 0,
  depthOffset = 0,
  radiusMultiplier = 1,
  presentation = 'ambient',
  focusIntensity = 0,
}) {
  const groupRef = useRef(null);
  const subjectRigRef = useRef(null);
  const subjectBillboardRef = useRef(null);
  const subjectFacingRef = useRef(null);
  const subjectBackgroundMaterialRef = useRef(null);
  const subjectFrontMaterialRef = useRef(null);
  const subjectGlowMaterialRef = useRef(null);
  const subjectPointMaterialRef = useRef(null);
  const subjectVolumeMaterialRefs = useRef([]);
  const subjectShellMeshMaterialRefs = useRef([]);
  const subjectHybridPointMaterialRefs = useRef([]);
  const subjectHybridShellMaterialRefs = useRef([]);
  const subjectProjectedMeshPointMaterialRefs = useRef([]);
  const subjectProjectedMeshShellMaterialRefs = useRef([]);
  const subjectProjectedSurfaceMaterialRefs = useRef([]);
  const subjectProjectedFillMaterialRefs = useRef([]);
  const subjectImageGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 1), []);
  const tempSubjectPosition = useMemo(() => new THREE.Vector3(), []);
  const tempSubjectQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const tempSubjectForward = useMemo(() => new THREE.Vector3(), []);
  const tempCameraDirection = useMemo(() => new THREE.Vector3(), []);
  const tempLocalCamera = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();
  const isChapter = presentation === 'chapter';
  const isAnchor = presentation === 'anchor';
  const subjectAnalysisResolution = isAnchor ? 384 : isChapter ? 320 : 160;
  const safeImages = useMemo(() => images.filter(Boolean).slice(0, 4), [images]);
  const primaryUrl = useMemo(
    () => (primaryImage ? resolveAsset(primaryImage) : null),
    [primaryImage],
  );
  const primaryAlphaUrl = useMemo(
    () => (primaryAlphaImage ? resolveAsset(primaryAlphaImage) : null),
    [primaryAlphaImage],
  );
  const resolvedSubjectMeshUrl = useMemo(
    () => (subjectMeshUrl ? resolveAsset(subjectMeshUrl) : null),
    [subjectMeshUrl],
  );
  const resolvedUrls = useMemo(() => {
    const urls = safeImages.map(image => resolveAsset(image));
    return primaryUrl ? urls.filter(url => url !== primaryUrl) : urls;
  }, [primaryUrl, safeImages]);
  const supportTextures = useLoader(THREE.TextureLoader, resolvedUrls);
  const primaryTextures = useLoader(
    THREE.TextureLoader,
    primaryUrl ? [primaryUrl] : [],
  );
  const primaryTexture = primaryTextures[0] ?? null;
  const externalPrimaryAlphaTextures = useLoader(
    THREE.TextureLoader,
    primaryAlphaUrl ? [primaryAlphaUrl] : [],
  );
  const externalPrimaryAlphaTexture = externalPrimaryAlphaTextures[0] ?? null;
  const subjectMeshAssets = useLoader(
    GLTFLoader,
    resolvedSubjectMeshUrl ? [resolvedSubjectMeshUrl] : [],
  );
  const subjectProjectedMeshParts = useMemo(
    () => buildProjectedSubjectMeshParts(subjectMeshAssets[0]?.scene ?? null),
    [subjectMeshAssets],
  );
  const hasProjectedSubjectMesh = Boolean(subjectProjectedMeshParts?.length);
  const generatedPrimaryAlphaTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const image = primaryTexture?.image;
    const hasImage =
      image &&
      typeof image.width === 'number' &&
      typeof image.height === 'number' &&
      image.width > 0 &&
      image.height > 0;

    if (hasImage) {
      const crop = Array.isArray(primaryCrop) && primaryCrop.length === 4
        ? primaryCrop.map(value => THREE.MathUtils.clamp(Number(value) || 0, 0, 1))
        : [0, 0, 1, 1];
      const [cropX, cropY, cropWidth, cropHeight] = crop;
      const sourceX = cropX * image.width;
      const sourceY = cropY * image.height;
      const sourceWidth = Math.max(1, cropWidth * image.width);
      const sourceHeight = Math.max(1, cropHeight * image.height);
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const sourceData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const alphaData = ctx.createImageData(canvas.width, canvas.height);
      const border = 0.12;
      let borderR = 0;
      let borderG = 0;
      let borderB = 0;
      let borderLuma = 0;
      let borderCount = 0;

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const u = x / (canvas.width - 1);
          const v = y / (canvas.height - 1);
          if (u > border && u < 1 - border && v > border && v < 1 - border) continue;
          const index = (y * canvas.width + x) * 4;
          const r = sourceData.data[index] / 255;
          const g = sourceData.data[index + 1] / 255;
          const b = sourceData.data[index + 2] / 255;
          borderR += r;
          borderG += g;
          borderB += b;
          borderLuma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
          borderCount += 1;
        }
      }

      const avgBorder = {
        r: borderR / Math.max(1, borderCount),
        g: borderG / Math.max(1, borderCount),
        b: borderB / Math.max(1, borderCount),
        luma: borderLuma / Math.max(1, borderCount),
      };

      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const u = x / (canvas.width - 1);
          const v = y / (canvas.height - 1);
          const index = (y * canvas.width + x) * 4;
          const r = sourceData.data[index] / 255;
          const g = sourceData.data[index + 1] / 255;
          const b = sourceData.data[index + 2] / 255;
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max <= 0 ? 0 : (max - min) / max;
          const colorDistance = Math.sqrt(
            ((r - avgBorder.r) ** 2) +
            ((g - avgBorder.g) ** 2) +
            ((b - avgBorder.b) ** 2),
          );
          const lumaDistance = Math.abs(luma - avgBorder.luma);
          const subjectSignal = colorDistance
            + lumaDistance * (isChapter ? 1.08 : 0.92)
            + saturation * (isChapter ? 0.34 : 0.22);
          const borderRejection = smoothstep(
            isChapter ? 0.16 : 0.12,
            isChapter ? 0.48 : 0.4,
            subjectSignal,
          );
          const edgeMask =
            smoothstep(0, isChapter ? 0.1 : 0.16, u) *
            smoothstep(0, isChapter ? 0.1 : 0.16, 1 - u) *
            smoothstep(0, isChapter ? 0.08 : 0.16, v) *
            smoothstep(0, isChapter ? 0.08 : 0.16, 1 - v);
          const dx = (u - 0.5) / 0.48;
          const dy = (v - 0.52) / 0.56;
          const radial = 1 - smoothstep(0.78, 1.08, Math.sqrt(dx * dx + dy * dy));
          let silhouette = THREE.MathUtils.clamp(borderRejection * 1.08 + radial * 0.14 - 0.06, 0, 1);
          if (isChapter) {
            const portraitDx = (u - 0.48) / 0.26;
            const portraitDy = (v - 0.44) / 0.42;
            const portraitOval = 1 - smoothstep(
              0.72,
              1.02,
              Math.sqrt(portraitDx * portraitDx + portraitDy * portraitDy),
            );
            const shoulderDx = (u - 0.46) / 0.34;
            const shoulderDy = (v - 0.74) / 0.24;
            const shoulderOval = 1 - smoothstep(
              0.76,
              1.08,
              Math.sqrt(shoulderDx * shoulderDx + shoulderDy * shoulderDy),
            );
            const portraitSupport = Math.max(portraitOval, shoulderOval * 0.88);
            silhouette = THREE.MathUtils.clamp(
              borderRejection * 0.92 + portraitSupport * 0.44 - 0.12,
              0,
              1,
            );
          }
          const alpha = Math.round(255 * THREE.MathUtils.clamp(edgeMask * silhouette, 0, 1));
          alphaData.data[index] = alpha;
          alphaData.data[index + 1] = alpha;
          alphaData.data[index + 2] = alpha;
          alphaData.data[index + 3] = 255;
        }
      }
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = canvas.width;
      alphaCanvas.height = canvas.height;
      const alphaCtx = alphaCanvas.getContext('2d');
      if (alphaCtx) {
        alphaCtx.putImageData(alphaData, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = isChapter ? 'blur(1.25px)' : 'blur(0.85px)';
        ctx.drawImage(alphaCanvas, 0, 0);
        ctx.filter = 'none';
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(alphaData, 0, 0);
      }
    } else {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const feather = 0.18;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const u = x / (canvas.width - 1);
          const v = y / (canvas.height - 1);
          const edgeMask =
            smoothstep(0, feather, u) *
            smoothstep(0, feather, 1 - u) *
            smoothstep(0, feather, v) *
            smoothstep(0, feather, 1 - v);
          const dx = (u - 0.5) / 0.46;
          const dy = (v - 0.5) / 0.5;
          const radial = 1 - smoothstep(0.82, 1.12, Math.sqrt(dx * dx + dy * dy));
          const alpha = Math.round(255 * THREE.MathUtils.clamp(edgeMask * radial, 0, 1));
          const index = (y * canvas.width + x) * 4;
          imageData.data[index] = alpha;
          imageData.data[index + 1] = alpha;
          imageData.data[index + 2] = alpha;
          imageData.data[index + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [isChapter, primaryCrop, primaryTexture]);
  const primaryAlphaTexture = externalPrimaryAlphaTexture ?? generatedPrimaryAlphaTexture;
  const normalizedPrimaryCrop = useMemo(() => (
    Array.isArray(primaryCrop) && primaryCrop.length === 4
      ? primaryCrop.map(value => THREE.MathUtils.clamp(Number(value) || 0, 0, 1))
      : null
  ), [primaryCrop]);
  const effectivePrimaryCrop = useMemo(() => {
    if (!(isAnchor || isChapter)) return normalizedPrimaryCrop;
    const alphaImage = primaryAlphaTexture?.image;
    if (
      !alphaImage
      || typeof alphaImage.width !== 'number'
      || typeof alphaImage.height !== 'number'
      || alphaImage.width <= 0
      || alphaImage.height <= 0
      || typeof document === 'undefined'
    ) {
      return normalizedPrimaryCrop;
    }

    const canvas = document.createElement('canvas');
    canvas.width = alphaImage.width;
    canvas.height = alphaImage.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return normalizedPrimaryCrop;
    ctx.drawImage(alphaImage, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (data[(y * canvas.width + x) * 4] <= 12) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) return normalizedPrimaryCrop;

    const maskBounds = [
      minX / canvas.width,
      minY / canvas.height,
      (maxX - minX + 1) / canvas.width,
      (maxY - minY + 1) / canvas.height,
    ];
    const maskArea = maskBounds[2] * maskBounds[3];
    const maskLooksUseful = maskBounds[2] < 0.9 || maskArea < 0.75;
    if (!maskLooksUseful) return normalizedPrimaryCrop;

    const padX = Math.max(0.045, maskBounds[2] * (isChapter ? 0.12 : 0.1));
    const padY = Math.max(0.04, maskBounds[3] * (isChapter ? 0.08 : 0.07));
    let x0 = Math.max(0, maskBounds[0] - padX);
    let y0 = Math.max(0, maskBounds[1] - padY);
    let x1 = Math.min(1, maskBounds[0] + maskBounds[2] + padX);
    let y1 = Math.min(1, maskBounds[1] + maskBounds[3] + padY);

    if (normalizedPrimaryCrop) {
      x0 = Math.min(x0, normalizedPrimaryCrop[0]);
      y0 = Math.min(y0, normalizedPrimaryCrop[1]);
      x1 = Math.max(x1, normalizedPrimaryCrop[0] + normalizedPrimaryCrop[2]);
      y1 = Math.max(y1, normalizedPrimaryCrop[1] + normalizedPrimaryCrop[3]);
    }

    return [x0, y0, x1 - x0, y1 - y0];
  }, [isAnchor, isChapter, normalizedPrimaryCrop, primaryAlphaTexture]);
  const croppedPrimaryTexture = useMemo(() => {
    if (!primaryTexture) return null;
    if (!effectivePrimaryCrop || effectivePrimaryCrop.length !== 4) return primaryTexture;
    const [x, y, width, height] = effectivePrimaryCrop;
    const safeWidth = THREE.MathUtils.clamp(width, 0.01, 1);
    const safeHeight = THREE.MathUtils.clamp(height, 0.01, 1);
    const texture = primaryTexture.clone();
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(safeWidth, safeHeight);
    texture.offset.set(
      THREE.MathUtils.clamp(x, 0, 1 - safeWidth),
      THREE.MathUtils.clamp(1 - y - safeHeight, 0, 1 - safeHeight),
    );
    texture.needsUpdate = true;
    return texture;
  }, [effectivePrimaryCrop, primaryTexture]);
  const croppedPrimaryAlphaTexture = useMemo(() => {
    if (!primaryAlphaTexture) return null;
    if (!effectivePrimaryCrop || effectivePrimaryCrop.length !== 4) return primaryAlphaTexture;
    const image = primaryAlphaTexture.image;
    if (
      typeof document === 'undefined'
      || !image
      || typeof image.width !== 'number'
      || typeof image.height !== 'number'
      || image.width <= 0
      || image.height <= 0
    ) {
      return primaryAlphaTexture;
    }

    const [x, y, width, height] = effectivePrimaryCrop;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return primaryAlphaTexture;

    ctx.drawImage(
      image,
      x * image.width,
      y * image.height,
      Math.max(1, width * image.width),
      Math.max(1, height * image.height),
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [effectivePrimaryCrop, primaryAlphaTexture]);
  const primaryColorCanvas = useMemo(() => {
    if (typeof document === 'undefined' || !primaryTexture?.image) return null;
    const image = primaryTexture.image;
    if (
      typeof image.width !== 'number'
      || typeof image.height !== 'number'
      || image.width <= 0
      || image.height <= 0
    ) {
      return null;
    }

    const crop = effectivePrimaryCrop?.length === 4
      ? effectivePrimaryCrop
      : [0, 0, 1, 1];
    const [cropX, cropY, cropWidth, cropHeight] = crop;
    const canvas = document.createElement('canvas');
    canvas.width = subjectAnalysisResolution;
    canvas.height = subjectAnalysisResolution;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(
      image,
      cropX * image.width,
      cropY * image.height,
      Math.max(1, cropWidth * image.width),
      Math.max(1, cropHeight * image.height),
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return canvas;
  }, [effectivePrimaryCrop, primaryTexture, subjectAnalysisResolution]);
  const primaryBackgroundTexture = useMemo(() => {
    if (!(isAnchor || isChapter) || typeof document === 'undefined' || !primaryColorCanvas || !croppedPrimaryAlphaTexture?.image) {
      return null;
    }

    const width = primaryColorCanvas.width;
    const height = primaryColorCanvas.height;
    const backgroundCanvas = document.createElement('canvas');
    backgroundCanvas.width = width;
    backgroundCanvas.height = height;
    const colorCtx = backgroundCanvas.getContext('2d', { willReadFrequently: true });
    if (!colorCtx) return null;
    const alphaCanvas = document.createElement('canvas');
    alphaCanvas.width = width;
    alphaCanvas.height = height;
    const alphaCtx = alphaCanvas.getContext('2d', { willReadFrequently: true });
    if (!alphaCtx) return null;
    alphaCtx.drawImage(croppedPrimaryAlphaTexture.image, 0, 0, width, height);

    colorCtx.drawImage(primaryColorCanvas, 0, 0);
    const colorData = colorCtx.getImageData(0, 0, width, height);
    const alphaData = alphaCtx.getImageData(0, 0, width, height).data;

    const getColor = (x, y) => {
      const index = (y * width + x) * 4;
      return [
        colorData.data[index],
        colorData.data[index + 1],
        colorData.data[index + 2],
        colorData.data[index + 3],
      ];
    };

    const setColor = (x, y, rgba) => {
      const index = (y * width + x) * 4;
      colorData.data[index] = rgba[0];
      colorData.data[index + 1] = rgba[1];
      colorData.data[index + 2] = rgba[2];
      colorData.data[index + 3] = rgba[3];
    };

    const isMasked = (x, y) => alphaData[(y * width + x) * 4] > 20;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!isMasked(x, y)) continue;

        let left = null;
        for (let searchX = x - 1; searchX >= 0; searchX -= 1) {
          if (!isMasked(searchX, y)) {
            left = getColor(searchX, y);
            break;
          }
        }

        let right = null;
        for (let searchX = x + 1; searchX < width; searchX += 1) {
          if (!isMasked(searchX, y)) {
            right = getColor(searchX, y);
            break;
          }
        }

        let up = null;
        for (let searchY = y - 1; searchY >= 0; searchY -= 1) {
          if (!isMasked(x, searchY)) {
            up = getColor(x, searchY);
            break;
          }
        }

        let down = null;
        for (let searchY = y + 1; searchY < height; searchY += 1) {
          if (!isMasked(x, searchY)) {
            down = getColor(x, searchY);
            break;
          }
        }

        const neighbors = [left, right, up, down].filter(Boolean);
        if (!neighbors.length) continue;

        const average = neighbors.reduce(
          (accumulator, rgba) => ([
            accumulator[0] + rgba[0],
            accumulator[1] + rgba[1],
            accumulator[2] + rgba[2],
            accumulator[3] + rgba[3],
          ]),
          [0, 0, 0, 0],
        ).map(value => value / neighbors.length);

        setColor(x, y, average);
      }
    }

    colorCtx.putImageData(colorData, 0, 0);
    colorCtx.putImageData(colorData, 0, 0);
    colorCtx.filter = isAnchor ? 'blur(5px)' : isChapter ? 'blur(3px)' : 'blur(4px)';
    colorCtx.drawImage(backgroundCanvas, 0, 0);
    colorCtx.filter = 'none';

    const texture = new THREE.CanvasTexture(backgroundCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [croppedPrimaryAlphaTexture, isAnchor, isChapter, primaryColorCanvas]);
  const primaryAspect = useMemo(() => {
    if (!effectivePrimaryCrop || effectivePrimaryCrop.length !== 4) return 1;
    const width = Math.max(0.01, Number(effectivePrimaryCrop[2]) || 0.01);
    const height = Math.max(0.01, Number(effectivePrimaryCrop[3]) || 0.01);
    return width / height;
  }, [effectivePrimaryCrop]);

  useEffect(() => {
    [primaryTexture, croppedPrimaryTexture, ...supportTextures].filter(Boolean).forEach(texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    });
    [externalPrimaryAlphaTexture, croppedPrimaryAlphaTexture, primaryBackgroundTexture].filter(Boolean).forEach(texture => {
      texture.needsUpdate = true;
    });
    return () => {
      if (croppedPrimaryTexture && croppedPrimaryTexture !== primaryTexture) {
        croppedPrimaryTexture.dispose();
      }
      if (croppedPrimaryAlphaTexture && croppedPrimaryAlphaTexture !== primaryAlphaTexture) {
        croppedPrimaryAlphaTexture.dispose();
      }
      if (primaryBackgroundTexture) {
        primaryBackgroundTexture.dispose();
      }
    };
  }, [
    croppedPrimaryAlphaTexture,
    croppedPrimaryTexture,
    externalPrimaryAlphaTexture,
    primaryBackgroundTexture,
    primaryAlphaTexture,
    primaryTexture,
    supportTextures,
  ]);

  useEffect(() => () => {
    generatedPrimaryAlphaTexture?.dispose?.();
  }, [generatedPrimaryAlphaTexture]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const targetRotationY = travelProgress * 0.42 + pointer.x * 0.18;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotationY,
      1 - Math.exp(-delta * 2.4),
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      pointer.y * 0.06,
      1 - Math.exp(-delta * 2.2),
    );
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      Math.sin(state.clock.elapsedTime * 0.35) * 0.08 + pointer.y * 0.12,
      1 - Math.exp(-delta * 2.0),
    );

    if (!subjectRigRef.current || !subjectFacingRef.current || !(isAnchor || isChapter)) return;

    if (subjectBillboardRef.current && isChapter) {
      subjectRigRef.current.updateWorldMatrix(true, false);
      tempLocalCamera.copy(camera.position);
      subjectRigRef.current.worldToLocal(tempLocalCamera);
      const desiredYaw = THREE.MathUtils.clamp(
        Math.atan2(tempLocalCamera.x, Math.max(0.0001, tempLocalCamera.z)) * 0.045,
        -0.038,
        0.038,
      );
      const desiredPitch = THREE.MathUtils.clamp(
        Math.atan2(-tempLocalCamera.y, Math.max(0.0001, Math.hypot(tempLocalCamera.x, tempLocalCamera.z))) * 0.012,
        -0.014,
        0.014,
      );
      subjectBillboardRef.current.rotation.y = THREE.MathUtils.lerp(
        subjectBillboardRef.current.rotation.y,
        desiredYaw,
        1 - Math.exp(-delta * 4.2),
      );
      subjectBillboardRef.current.rotation.x = THREE.MathUtils.lerp(
        subjectBillboardRef.current.rotation.x,
        desiredPitch,
        1 - Math.exp(-delta * 3.6),
      );
    }

    subjectFacingRef.current.updateWorldMatrix(true, false);
    subjectFacingRef.current.getWorldPosition(tempSubjectPosition);
    subjectFacingRef.current.getWorldQuaternion(tempSubjectQuaternion);
    tempSubjectForward.set(0, 0, 1).applyQuaternion(tempSubjectQuaternion).normalize();
    tempCameraDirection.copy(camera.position).sub(tempSubjectPosition).normalize();

    const frontFacing = THREE.MathUtils.clamp(
      tempSubjectForward.dot(tempCameraDirection),
      -1,
      1,
    );
    const frontReveal = smoothstep(
      isChapter ? 0.64 : 0.5,
      isChapter ? 0.985 : 0.96,
      frontFacing,
    );
    const sideReveal = 1 - frontReveal;
    const focusFrontReveal = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(frontReveal, 1, focusIntensity * (isChapter ? 0.82 : 0.58)),
      0,
      1,
    );
    const focusSideReveal = THREE.MathUtils.clamp(
      sideReveal * (1 - focusIntensity * (isChapter ? 0.9 : 0.72)),
      0,
      1,
    );
    const focusBlend = 1 + focusIntensity * (isChapter ? 0.7 : 0.38);

    if (subjectBackgroundMaterialRef.current) {
      subjectBackgroundMaterialRef.current.opacity =
        ((isAnchor ? 0.05 : 0.016) * blend)
        * (hasSubjectDepthSlices
          ? (isChapter ? Math.pow(focusFrontReveal, 2.2) * 0.06 : 0.02 + focusFrontReveal * 0.12)
          : (isChapter ? Math.pow(focusFrontReveal, 2.2) * 0.035 : 0.02 + focusFrontReveal * 0.3));
      subjectBackgroundMaterialRef.current.opacity *= (1 - focusIntensity * 0.72);
    }

    subjectVolumeMaterialRefs.current.forEach((material) => {
      if (!material) return;
      const baseOpacity = material.userData.baseOpacity ?? material.opacity;
      material.opacity = baseOpacity * Math.pow(focusSideReveal, isAnchor ? 3.2 : 4.8) * (isChapter ? 0.58 : 1.12) * (1 - focusIntensity * 0.58);
    });
    subjectShellMeshMaterialRefs.current.forEach((material) => {
      if (!material) return;
      const baseOpacity = material.userData.baseOpacity ?? material.opacity;
      const frontWeight = material.userData.frontWeight ?? 0.6;
      const sideWeight = material.userData.sideWeight ?? 0.18;
      material.opacity = baseOpacity * blend * (
        focusFrontReveal * frontWeight
        + focusSideReveal * sideWeight
      ) * (1 - focusIntensity * 0.5);
    });
    subjectHybridShellMaterialRefs.current.forEach((material) => {
      if (!material) return;
      const baseOpacity = material.userData.baseOpacity ?? material.opacity;
      const frontWeight = material.userData.frontWeight ?? 0.08;
      const sideWeight = material.userData.sideWeight ?? 0.72;
      material.opacity = baseOpacity * blend * (
        focusFrontReveal * frontWeight
        + focusSideReveal * sideWeight
      ) * (1 - focusIntensity * 0.62);
    });
    subjectHybridPointMaterialRefs.current.forEach((material) => {
      if (!material) return;
      const baseOpacity = material.userData.baseOpacity ?? material.opacity;
      material.opacity = baseOpacity * blend * (
        0.08
        + focusSideReveal * 0.88
        + focusFrontReveal * 0.12
      ) * (1 - focusIntensity * 0.55);
    });
    subjectProjectedMeshPointMaterialRefs.current.forEach((material) => {
      if (!material) return;
      const baseOpacity = material.userData.baseOpacity ?? material.opacity;
      const frontWeight = material.userData.frontWeight ?? 0.02;
      const sideWeight = material.userData.sideWeight ?? 0.62;
      material.opacity = baseOpacity * blend * (
        focusFrontReveal * frontWeight
        + focusSideReveal * sideWeight
      ) * (1 - focusIntensity * 0.6);
    });
    subjectProjectedMeshShellMaterialRefs.current.forEach((material) => {
      if (!material) return;
      const baseOpacity = material.userData.baseOpacity ?? material.opacity;
      const frontWeight = material.userData.frontWeight ?? 0.01;
      const sideWeight = material.userData.sideWeight ?? 0.24;
      material.opacity = baseOpacity * blend * (
        focusFrontReveal * frontWeight
        + focusSideReveal * sideWeight
      ) * (1 - focusIntensity * 0.62);
    });
    subjectProjectedFillMaterialRefs.current.forEach((material) => {
      if (!material) return;
      const baseOpacity = material.userData.baseOpacity ?? material.opacity;
      const frontWeight = material.userData.frontWeight ?? 0.2;
      const sideWeight = material.userData.sideWeight ?? 0.56;
      material.opacity = baseOpacity * blend * (
        focusFrontReveal * frontWeight
        + focusSideReveal * sideWeight
      ) * (1 - focusIntensity * 0.56);
    });
    subjectProjectedSurfaceMaterialRefs.current.forEach((material) => {
      if (!material) return;
      const baseOpacity = material.userData.baseOpacity ?? material.opacity;
      const frontWeight = material.userData.frontWeight ?? 0.88;
      const sideWeight = material.userData.sideWeight ?? 0.2;
      material.opacity = baseOpacity * blend * (
        focusFrontReveal * frontWeight
        + focusSideReveal * sideWeight
      ) * (1 + focusIntensity * 0.34);
    });

    if (subjectPointMaterialRef.current) {
      const baseOpacity = ((isAnchor ? 0.24 : 0.18) * blend);
      subjectPointMaterialRef.current.opacity = isChapter
        ? (hasSubjectDepthSlices
          ? baseOpacity * (0.16 + focusFrontReveal * 0.34 + focusSideReveal * 0.16)
          : baseOpacity * (0.18 + focusFrontReveal * 0.72))
        : (hasSubjectDepthSlices
          ? baseOpacity * (0.14 + focusFrontReveal * 0.46 + focusSideReveal * 0.12)
          : baseOpacity * (0.08 + focusFrontReveal * 0.92));
      subjectPointMaterialRef.current.opacity *= (1 - focusIntensity * 0.46);
    }

    if (subjectFrontMaterialRef.current) {
      const baseOpacity = Math.min(
        useProjectedSubjectMesh ? 0.76 : 0.62,
        subjectImageOpacity * (useProjectedSubjectMesh ? 2.0 : 1.45),
      ) * (
        useProjectedSubjectMesh
          ? (isChapter ? 0.9 : 0.84)
          : useProjectedSubjectSurface
            ? (isChapter ? 0.18 : 0.26)
            : (
              hasSubjectDepthSlices
                ? (useHybridSubjectSupport ? (isChapter ? 0.12 : 0.22) : (isChapter ? 0.18 : 0.3))
                : (subjectUsesMeshShellStrategy ? (isChapter ? 0.76 : 0.72) : 1)
            )
      );
      subjectFrontMaterialRef.current.opacity = baseOpacity * Math.pow(
        focusFrontReveal,
        useProjectedSubjectMesh ? (isChapter ? 2.1 : 1.35) : (isChapter ? 3.1 : 1.6),
      ) * focusBlend;
    }

    if (subjectGlowMaterialRef.current) {
      const baseOpacity = ((isChapter ? 0.018 : 0.028) + pointer.activity * (isChapter ? 0.026 : 0.03)) * blend;
      subjectGlowMaterialRef.current.opacity = baseOpacity * (
        useProjectedSubjectMesh
          ? (0.015 + focusFrontReveal * 0.22 + focusSideReveal * 0.01)
          : useProjectedSubjectSurface
            ? (0.03 + focusFrontReveal * 0.22 + focusSideReveal * 0.04)
          : (
            hasSubjectDepthSlices
              ? (useHybridSubjectSupport ? (0.06 + focusFrontReveal * 0.28 + focusSideReveal * 0.06) : (0.08 + focusFrontReveal * 0.42))
              : (subjectUsesMeshShellStrategy ? (0.12 + focusFrontReveal * 0.58) : (0.16 + focusFrontReveal * 0.84))
          )
      ) * (1 + focusIntensity * 1.8);
    }

    if (subjectRigRef.current && (isAnchor || isChapter)) {
      const targetScale = 1 + focusIntensity * (isChapter ? 0.045 : 0.03);
      subjectRigRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        1 - Math.exp(-delta * 3.4),
      );
    }
  });

  if (!croppedPrimaryTexture && !supportTextures.length) return null;

  const primaryHeight = isChapter
    ? 3.2 * radiusMultiplier
    : isAnchor
      ? 2.62 * radiusMultiplier
      : 2.08 * radiusMultiplier;
  const primaryScale = [
    primaryHeight * primaryAspect,
    primaryHeight,
    1,
  ];
  const primaryPosition = isChapter
    ? [pointer.x * 0.08, 0.03 + pointer.y * 0.05, -1.45 + depthOffset * 0.25]
    : isAnchor
      ? [pointer.x * 0.11, 0.03 + pointer.y * 0.06, -1.72 + depthOffset * 0.3]
    : [pointer.x * 0.16, 0.04 + pointer.y * 0.08, -2.15 + depthOffset * 0.4];
  const primaryRotation = isChapter
    ? [pointer.y * 0.02, pointer.x * -0.08 + orbitOffset * 0.15, pointer.x * -0.015]
    : isAnchor
      ? [pointer.y * 0.035, pointer.x * -0.1 + orbitOffset * 0.2, pointer.x * -0.02]
      : [pointer.y * 0.05, pointer.x * -0.16 + orbitOffset * 0.3, pointer.x * -0.03];
  const subjectLocalRotation = isChapter
    ? [pointer.y * 0.02, 0, pointer.x * -0.018]
    : isAnchor
      ? [pointer.y * 0.03, 0, pointer.x * -0.022]
      : primaryRotation;
  const subjectWorldRotation = isChapter
    ? [primaryRotation[0] * 0.28, orbitOffset * 0.08, primaryRotation[2] * 0.35]
    : isAnchor
      ? [primaryRotation[0] * 0.35, orbitOffset * 0.1, primaryRotation[2] * 0.42]
      : primaryRotation;
  const effectiveSubjectMeshTransform = useMemo(() => ({
    mode: subjectMeshTransform?.mode ?? 'projected-mesh',
    surfaceMode: subjectMeshTransform?.surfaceMode ?? 'fill-only',
    supportMode:
      subjectMeshTransform?.supportMode
      ?? (subjectMeshTransform?.mode === 'depth-volume' ? 'image-cloud' : 'mesh-fill'),
    position: cloneVec3(subjectMeshTransform?.position, [0, 0, 0]),
    scale: cloneVec3(subjectMeshTransform?.scale, [1, 1, 1]),
    rotation: cloneVec3(subjectMeshTransform?.rotation, [0, 0, 0]),
  }), [
    subjectMeshTransform?.mode,
    subjectMeshTransform?.position,
    subjectMeshTransform?.rotation,
    subjectMeshTransform?.scale,
    subjectMeshTransform?.supportMode,
    subjectMeshTransform?.surfaceMode,
  ]);
  const subjectMeshMode = effectiveSubjectMeshTransform.mode;
  const subjectSupportMode = effectiveSubjectMeshTransform.supportMode;
  const useProjectedSubjectMesh = hasProjectedSubjectMesh && subjectMeshMode === 'projected-mesh';
  const useDepthVolumeSubject = subjectMeshMode === 'depth-volume';
  const useImageCloudSubject = useDepthVolumeSubject && subjectSupportMode === 'image-cloud';
  const useImageSliceVolume = useDepthVolumeSubject && subjectSupportMode === 'image-volume';
  const useHybridSubjectSupport =
    useDepthVolumeSubject
    && hasProjectedSubjectMesh
    && subjectSupportMode !== 'image-volume'
    && subjectSupportMode !== 'image-cloud';
  const useHybridSubjectFill = useHybridSubjectSupport && subjectSupportMode !== 'mesh-points';
  const useHybridSubjectPoints = useHybridSubjectSupport && subjectSupportMode !== 'mesh-fill';
  const useProjectedSubjectSurface =
    useHybridSubjectSupport && effectiveSubjectMeshTransform.surfaceMode === 'projected-surface';
  const subjectUsesMeshShellStrategy = !useDepthVolumeSubject && (isAnchor || isChapter);
  const subjectMeshWorldPosition = [
    primaryPosition[0] + effectiveSubjectMeshTransform.position[0],
    primaryPosition[1] + effectiveSubjectMeshTransform.position[1],
    primaryPosition[2] + effectiveSubjectMeshTransform.position[2],
  ];
  const subjectMeshWorldScale = [
    primaryHeight * 0.82 * effectiveSubjectMeshTransform.scale[0],
    primaryHeight * 0.82 * effectiveSubjectMeshTransform.scale[1],
    primaryHeight * 0.82 * effectiveSubjectMeshTransform.scale[2],
  ];
  const subjectMeshWorldRotation = [
    THREE.MathUtils.degToRad(effectiveSubjectMeshTransform.rotation[0]),
    THREE.MathUtils.degToRad(effectiveSubjectMeshTransform.rotation[1]),
    THREE.MathUtils.degToRad(effectiveSubjectMeshTransform.rotation[2]),
  ];
  const primaryOpacity = isChapter
    ? (0.68 + pointer.activity * 0.06 + travelProgress * 0.035) * blend
    : isAnchor
      ? (0.76 + pointer.activity * 0.06 + travelProgress * 0.03) * blend
      : (0.16 + pointer.activity * 0.14 + travelProgress * 0.12) * blend;
  const subjectImageOpacity = isChapter
    ? (0.24 + pointer.activity * 0.03 + travelProgress * 0.025) * blend
    : isAnchor
      ? (0.28 + pointer.activity * 0.035 + travelProgress * 0.03) * blend
      : primaryOpacity;
  const primaryBlending = isChapter || isAnchor ? THREE.NormalBlending : THREE.AdditiveBlending;
  const subjectDepthMap = useMemo(() => {
    if (typeof document === 'undefined' || !primaryTexture?.image || !croppedPrimaryTexture) return null;
    const image = primaryTexture.image;
    if (
      typeof image.width !== 'number'
      || typeof image.height !== 'number'
      || image.width <= 0
      || image.height <= 0
    ) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = subjectAnalysisResolution;
    canvas.height = subjectAnalysisResolution;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const crop = effectivePrimaryCrop?.length === 4
      ? effectivePrimaryCrop
      : [0, 0, 1, 1];
    const [cropX, cropY, cropWidth, cropHeight] = crop;
    const sourceX = cropX * image.width;
    const sourceY = cropY * image.height;
    const sourceWidth = Math.max(1, cropWidth * image.width);
    const sourceHeight = Math.max(1, cropHeight * image.height);

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const alphaCanvas = document.createElement('canvas');
    alphaCanvas.width = canvas.width;
    alphaCanvas.height = canvas.height;
    const alphaCtx = alphaCanvas.getContext('2d', { willReadFrequently: true });
    if (!alphaCtx) return null;

    const alphaImage = (croppedPrimaryAlphaTexture ?? primaryAlphaTexture)?.image;
    if (
      alphaImage
      && typeof alphaImage.width === 'number'
      && typeof alphaImage.height === 'number'
      && alphaImage.width > 0
      && alphaImage.height > 0
    ) {
      alphaCtx.drawImage(alphaImage, 0, 0, canvas.width, canvas.height);
    } else {
      alphaCtx.fillStyle = '#ffffff';
      alphaCtx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const alphaSource = alphaCtx.getImageData(0, 0, canvas.width, canvas.height);
    const out = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const u = x / (canvas.width - 1);
        const v = y / (canvas.height - 1);
        const index = (y * canvas.width + x) * 4;
        const alpha = alphaSource.data[index] / 255;
        const r = source.data[index] / 255;
        const g = source.data[index + 1] / 255;
        const b = source.data[index + 2] / 255;
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        const ovalDx = (u - 0.5) / (isAnchor ? 0.42 : 0.38);
        const ovalDy = (v - (isChapter ? 0.48 : 0.52)) / (isAnchor ? 0.56 : 0.5);
        const bodyOval = 1 - smoothstep(0.72, 1.08, Math.sqrt(ovalDx * ovalDx + ovalDy * ovalDy));

        const shoulderDx = (u - 0.5) / 0.42;
        const shoulderDy = (v - 0.76) / 0.2;
        const shoulderSupport = 1 - smoothstep(0.75, 1.05, Math.sqrt(shoulderDx * shoulderDx + shoulderDy * shoulderDy));

        const upperBias = 1 - smoothstep(0.42, 0.96, v);
        const depth = THREE.MathUtils.clamp(
          alpha * (
            0.24
            + bodyOval * 0.38
            + shoulderSupport * 0.22
            + upperBias * 0.08
            + luma * 0.12
          ),
          0,
          1,
        );

        const value = Math.round(depth * 255);
        out.data[index] = value;
        out.data[index + 1] = value;
        out.data[index + 2] = value;
        out.data[index + 3] = 255;
      }
    }

    ctx.putImageData(out, 0, 0);
    ctx.filter = 'blur(3px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [
    croppedPrimaryAlphaTexture,
    croppedPrimaryTexture,
    isAnchor,
    isChapter,
    effectivePrimaryCrop,
    primaryTexture,
    subjectAnalysisResolution,
  ]);
  const primarySilhouetteCanvas = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const alphaImage = croppedPrimaryAlphaTexture?.image;
    if (
      !alphaImage
      || typeof alphaImage.width !== 'number'
      || typeof alphaImage.height !== 'number'
      || alphaImage.width <= 0
      || alphaImage.height <= 0
    ) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = subjectAnalysisResolution;
    canvas.height = subjectAnalysisResolution;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(alphaImage, 0, 0, canvas.width, canvas.height);
    return canvas;
  }, [croppedPrimaryAlphaTexture, subjectAnalysisResolution]);
  const subjectShellColor = useMemo(() => {
    if (!primaryColorCanvas || !primarySilhouetteCanvas) return '#d9dbe2';

    const colorCtx = primaryColorCanvas.getContext('2d', { willReadFrequently: true });
    const silhouetteCtx = primarySilhouetteCanvas.getContext('2d', { willReadFrequently: true });
    if (!colorCtx || !silhouetteCtx) return '#d9dbe2';

    const width = primaryColorCanvas.width;
    const height = primaryColorCanvas.height;
    const colorData = colorCtx.getImageData(0, 0, width, height).data;
    const alphaData = silhouetteCtx.getImageData(0, 0, width, height).data;

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let weightSum = 0;

    for (let index = 0; index < colorData.length; index += 4) {
      const alpha = alphaData[index] / 255;
      if (alpha < 0.18) continue;

      const weight = 0.2 + alpha * 0.8;
      rSum += colorData[index] * weight;
      gSum += colorData[index + 1] * weight;
      bSum += colorData[index + 2] * weight;
      weightSum += weight;
    }

    if (!weightSum) return '#d9dbe2';

    const color = new THREE.Color(
      rSum / (weightSum * 255),
      gSum / (weightSum * 255),
      bSum / (weightSum * 255),
    );
    const hsl = {};
    color.getHSL(hsl);
    color.setHSL(
      hsl.h,
      THREE.MathUtils.clamp(hsl.s * 0.92, 0.18, 0.7),
      THREE.MathUtils.clamp(hsl.l * 1.06, 0.34, 0.76),
    );
    return `#${color.getHexString()}`;
  }, [primaryColorCanvas, primarySilhouetteCanvas]);
  const subjectBodyColor = useMemo(() => {
    const color = new THREE.Color(subjectShellColor);
    const lift = new THREE.Color('#f4f0e8');
    color.lerp(lift, isChapter ? 0.08 : 0.14);
    color.offsetHSL(0, 0.02, -0.08);
    return `#${color.getHexString()}`;
  }, [isChapter, subjectShellColor]);
  const subjectProjectedPointParts = useMemo(() => {
    if (!subjectProjectedMeshParts?.length || !primaryColorCanvas || !primarySilhouetteCanvas) return [];

    const colorCtx = primaryColorCanvas.getContext('2d', { willReadFrequently: true });
    const silhouetteCtx = primarySilhouetteCanvas.getContext('2d', { willReadFrequently: true });
    if (!colorCtx || !silhouetteCtx) return [];

    const width = primaryColorCanvas.width;
    const height = primaryColorCanvas.height;
    const colorData = colorCtx.getImageData(0, 0, width, height).data;
    const alphaData = silhouetteCtx.getImageData(0, 0, width, height).data;
    const shellColor = new THREE.Color(subjectShellColor);

    return subjectProjectedMeshParts
      .map((part, index) => {
        const position = part.geometry.getAttribute('position');
        const normal = part.geometry.getAttribute('normal');
        const uv = part.geometry.getAttribute('uv');
        if (!position || !uv) return null;

        const points = [];
        const colors = [];
        for (let vertex = 0; vertex < position.count; vertex += 1) {
          const facing = normal ? Math.abs(normal.getZ(vertex)) : 1;
          if (facing < 0.08) continue;

          const u = THREE.MathUtils.clamp(uv.getX(vertex), 0, 1);
          const v = THREE.MathUtils.clamp(1 - uv.getY(vertex), 0, 1);
          const x = Math.round(u * Math.max(1, width - 1));
          const y = Math.round(v * Math.max(1, height - 1));
          const sampleIndex = (y * width + x) * 4;
          const alpha = alphaData[sampleIndex] / 255;
          if (alpha < 0.28) continue;

          points.push(
            position.getX(vertex),
            position.getY(vertex),
            position.getZ(vertex),
          );

          const mix = THREE.MathUtils.clamp(0.16 + alpha * 0.72, 0, 0.9);
          colors.push(
            (colorData[sampleIndex] / 255) * mix + shellColor.r * (1 - mix),
            (colorData[sampleIndex + 1] / 255) * mix + shellColor.g * (1 - mix),
            (colorData[sampleIndex + 2] / 255) * mix + shellColor.b * (1 - mix),
          );
        }

        if (points.length < 9) return null;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return {
          key: `subject-point-cloud-${index}`,
          geometry,
        };
      })
      .filter(Boolean);
  }, [primaryColorCanvas, primarySilhouetteCanvas, subjectProjectedMeshParts, subjectShellColor]);
  const primaryFacetGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1, 68, 68);
    const silhouetteCanvas = primarySilhouetteCanvas;
    const silhouetteCtx = silhouetteCanvas?.getContext?.('2d', { willReadFrequently: true });
    const depthCanvas = subjectDepthMap?.image;
    const depthCtx = depthCanvas?.getContext?.('2d', { willReadFrequently: true });
    if (!silhouetteCtx || !depthCtx) return geometry;

    const depthData = depthCtx.getImageData(0, 0, depthCanvas.width, depthCanvas.height).data;
    const alphaData = silhouetteCtx.getImageData(0, 0, silhouetteCanvas.width, silhouetteCanvas.height).data;
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const relief = isAnchor ? 0.15 : 0.09;
    const sampleAlpha = (u, v) => {
      const sampleX = Math.min(
        silhouetteCanvas.width - 1,
        Math.max(0, Math.round(u * (silhouetteCanvas.width - 1))),
      );
      const sampleY = Math.min(
        silhouetteCanvas.height - 1,
        Math.max(0, Math.round(v * (silhouetteCanvas.height - 1))),
      );
      const sampleIndex = (sampleY * silhouetteCanvas.width + sampleX) * 4;
      return alphaData[sampleIndex] / 255;
    };

    for (let index = 0; index < position.count; index += 1) {
      const u = uv.getX(index);
      const v = 1 - uv.getY(index);
      const sampleX = Math.min(depthCanvas.width - 1, Math.max(0, Math.round(u * (depthCanvas.width - 1))));
      const sampleY = Math.min(depthCanvas.height - 1, Math.max(0, Math.round(v * (depthCanvas.height - 1))));
      const sampleIndex = (sampleY * depthCanvas.width + sampleX) * 4;
      const depth = depthData[sampleIndex] / 255;
      const alpha = sampleAlpha(u, v);
      const edgeFade = smoothstep(0.06, 0.34, alpha);
      position.setZ(index, depth * relief * edgeFade);
    }

    const segmentCount = 68;
    const indices = [];
    const activeThreshold = isAnchor ? 0.16 : 0.2;
    for (let y = 0; y < segmentCount; y += 1) {
      for (let x = 0; x < segmentCount; x += 1) {
        const u0 = x / segmentCount;
        const v0 = y / segmentCount;
        const u1 = (x + 1) / segmentCount;
        const v1 = (y + 1) / segmentCount;
        const cellAlpha = Math.max(
          sampleAlpha(u0, v0),
          sampleAlpha(u1, v0),
          sampleAlpha(u0, v1),
          sampleAlpha(u1, v1),
        );
        if (cellAlpha < activeThreshold) continue;

        const topLeft = y * (segmentCount + 1) + x;
        const topRight = topLeft + 1;
        const bottomLeft = (y + 1) * (segmentCount + 1) + x;
        const bottomRight = bottomLeft + 1;
        indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
      }
    }

    geometry.setIndex(indices);
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, [isAnchor, primarySilhouetteCanvas, subjectDepthMap]);
  const subjectPointCloudGeometry = useMemo(() => {
    if (!(isAnchor || isChapter) || !primaryColorCanvas || !primarySilhouetteCanvas || !subjectDepthMap?.image) {
      return null;
    }

    const colorCtx = primaryColorCanvas.getContext('2d', { willReadFrequently: true });
    const silhouetteCtx = primarySilhouetteCanvas.getContext('2d', { willReadFrequently: true });
    const depthCanvas = subjectDepthMap.image;
    const depthCtx = depthCanvas?.getContext?.('2d', { willReadFrequently: true });
    if (!colorCtx || !silhouetteCtx || !depthCtx) return null;

    const width = primaryColorCanvas.width;
    const height = primaryColorCanvas.height;
    const colorData = colorCtx.getImageData(0, 0, width, height).data;
    const alphaData = silhouetteCtx.getImageData(0, 0, width, height).data;
    const depthData = depthCtx.getImageData(0, 0, depthCanvas.width, depthCanvas.height).data;

    const stride = 1;
    const jitterXY = isAnchor ? 0.0055 : 0.0052;
    const jitterZ = isAnchor ? 0.026 : 0.012;
    const relief = isAnchor ? 0.3 : 0.16;
    const positions = [];
    const colors = [];

    const hash01 = (x, y, seed) => {
      const value = Math.sin((x + 1.137) * 127.1 + (y + 0.731) * 311.7 + seed * 74.7) * 43758.5453123;
      return value - Math.floor(value);
    };
    const sampleAlpha = (x, y) => {
      const safeX = Math.max(0, Math.min(width - 1, x));
      const safeY = Math.max(0, Math.min(height - 1, y));
      return alphaData[(safeY * width + safeX) * 4] / 255;
    };
    const sampleLuma = (x, y) => {
      const safeX = Math.max(0, Math.min(width - 1, x));
      const safeY = Math.max(0, Math.min(height - 1, y));
      const index = (safeY * width + safeX) * 4;
      const r = colorData[index] / 255;
      const g = colorData[index + 1] / 255;
      const b = colorData[index + 2] / 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const index = (y * width + x) * 4;
        const alpha = alphaData[index] / 255;
        if (alpha < (isAnchor ? 0.24 : 0.42)) continue;

        const alphaDx = Math.abs(sampleAlpha(x + 1, y) - sampleAlpha(x - 1, y));
        const alphaDy = Math.abs(sampleAlpha(x, y + 1) - sampleAlpha(x, y - 1));
        const edgeStrength = THREE.MathUtils.clamp((alphaDx + alphaDy) * 1.8, 0, 1);
        const lumaDx = Math.abs(sampleLuma(x + 1, y) - sampleLuma(x - 1, y));
        const lumaDy = Math.abs(sampleLuma(x, y + 1) - sampleLuma(x, y - 1));
        const detailStrength = THREE.MathUtils.clamp((lumaDx + lumaDy) * 2.4, 0, 1);
        const fillStrength = THREE.MathUtils.smoothstep(0.22, 0.86, alpha) * 0.16;
        const keepChance = isAnchor
          ? THREE.MathUtils.clamp(
            0.12
            + edgeStrength * 0.9
            + detailStrength * 0.58
            + fillStrength * 1.1,
            0.12,
            1,
          )
          : THREE.MathUtils.clamp(
            0.035
            + edgeStrength * 1.15
            + detailStrength * 0.82
            + fillStrength * 0.18,
            0.035,
            0.78,
          );
        if (hash01(x, y, 3) > keepChance) continue;

        const depthIndex = (y * depthCanvas.width + x) * 4;
        const depth = depthData[depthIndex] / 255;
        const r = colorData[index] / 255;
        const g = colorData[index + 1] / 255;
        const b = colorData[index + 2] / 255;

        const u = x / (width - 1);
        const v = y / (height - 1);
        const centeredX = (u - 0.5) * 1.02;
        const centeredY = (0.5 - v) * 1.02;
        const contourTaper = THREE.MathUtils.smoothstep(0.18, 0.9, alpha);
        const emphasis = THREE.MathUtils.clamp(
          0.3 + edgeStrength * 0.9 + detailStrength * 0.45,
          0.25,
          1.1,
        );
        const localDepth = depth * relief * contourTaper * emphasis * (isAnchor ? 1 : 0.72);
        const basePx = centeredX + (hash01(x, y, 11) - 0.5) * jitterXY;
        const basePy = centeredY + (hash01(x, y, 19) - 0.5) * jitterXY;
        const layerCount = isAnchor ? 5 : 3;

        for (let layer = 0; layer < layerCount; layer += 1) {
          const layerT = layerCount === 1 ? 0.5 : layer / (layerCount - 1);
          const layerBias = isAnchor
            ? (layerT - 0.5) * 0.13
            : -0.024 * contourTaper;
          const pz = localDepth + layerBias * contourTaper + (hash01(x, y, 29 + layer * 7) - 0.5) * jitterZ * contourTaper;
          const px = basePx + (hash01(x, y, 41 + layer * 5) - 0.5) * jitterXY * 0.7;
          const py = basePy + (hash01(x, y, 53 + layer * 5) - 0.5) * jitterXY * 0.7;

          positions.push(px, py, pz);
          colors.push(r, g, b);
        }
      }
    }

    if (!positions.length) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }, [isAnchor, isChapter, primaryColorCanvas, primarySilhouetteCanvas, subjectDepthMap]);
  const subjectContourCloudGeometry = useMemo(() => {
    if (!(isAnchor || isChapter) || !primarySilhouetteCanvas || !subjectDepthMap?.image) {
      return null;
    }

    const silhouetteCtx = primarySilhouetteCanvas.getContext('2d', { willReadFrequently: true });
    const depthCanvas = subjectDepthMap.image;
    const depthCtx = depthCanvas?.getContext?.('2d', { willReadFrequently: true });
    if (!silhouetteCtx || !depthCtx) return null;

    const width = primarySilhouetteCanvas.width;
    const height = primarySilhouetteCanvas.height;
    const alphaData = silhouetteCtx.getImageData(0, 0, width, height).data;
    const depthData = depthCtx.getImageData(0, 0, depthCanvas.width, depthCanvas.height).data;
    const positions = [];
    const jitterXY = isAnchor ? 0.0038 : 0.0048;
    const jitterZ = isAnchor ? 0.018 : 0.015;
    const relief = isAnchor ? 0.2 : 0.16;

    const hash01 = (x, y, seed) => {
      const value = Math.sin((x + 1.137) * 127.1 + (y + 0.731) * 311.7 + seed * 74.7) * 43758.5453123;
      return value - Math.floor(value);
    };
    const sampleAlpha = (x, y) => {
      const safeX = Math.max(0, Math.min(width - 1, x));
      const safeY = Math.max(0, Math.min(height - 1, y));
      return alphaData[(safeY * width + safeX) * 4] / 255;
    };

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const alpha = alphaData[index] / 255;
        if (alpha < (isAnchor ? 0.18 : 0.26)) continue;

        const alphaDx = Math.abs(sampleAlpha(x + 1, y) - sampleAlpha(x - 1, y));
        const alphaDy = Math.abs(sampleAlpha(x, y + 1) - sampleAlpha(x, y - 1));
        const edgeStrength = THREE.MathUtils.clamp((alphaDx + alphaDy) * 2.1, 0, 1);
        const rimStrength = THREE.MathUtils.clamp((1 - alpha) * 1.8, 0, 1);
        const contourStrength = Math.max(edgeStrength, rimStrength * 0.8);
        if (contourStrength < (isAnchor ? 0.08 : 0.11)) continue;

        const keepChance = THREE.MathUtils.clamp(
          0.12 + contourStrength * 0.95,
          0.12,
          0.96,
        );
        if (hash01(x, y, 61) > keepChance) continue;

        const depthIndex = (y * depthCanvas.width + x) * 4;
        const depth = depthData[depthIndex] / 255;
        const u = x / (width - 1);
        const v = y / (height - 1);
        const centeredX = (u - 0.5) * 1.01;
        const centeredY = (0.5 - v) * 1.01;
        const contourTaper = THREE.MathUtils.smoothstep(0.12, 0.92, alpha);
        const baseDepth = depth * relief * (0.55 + contourStrength * 0.8) * contourTaper;
        const px = centeredX + (hash01(x, y, 67) - 0.5) * jitterXY;
        const py = centeredY + (hash01(x, y, 71) - 0.5) * jitterXY;
        const layerCount = isAnchor ? 3 : 2;

        for (let layer = 0; layer < layerCount; layer += 1) {
          const layerT = layerCount === 1 ? 0.5 : layer / (layerCount - 1);
          const pz = baseDepth
            + (layerT - 0.5) * (isAnchor ? 0.08 : 0.06) * contourStrength
            + (hash01(x, y, 79 + layer * 7) - 0.5) * jitterZ * contourTaper;

          positions.push(px, py, pz);
        }
      }
    }

    if (!positions.length) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }, [isAnchor, isChapter, primarySilhouetteCanvas, subjectDepthMap]);
  const subjectDepthSliceTextures = useMemo(() => {
    if (!(isAnchor || isChapter) || typeof document === 'undefined' || !primaryColorCanvas || !primarySilhouetteCanvas || !subjectDepthMap?.image) {
      return [];
    }
    if (useHybridSubjectSupport || !useImageSliceVolume) {
      return [];
    }

    const colorCtx = primaryColorCanvas.getContext('2d', { willReadFrequently: true });
    const silhouetteCtx = primarySilhouetteCanvas.getContext('2d', { willReadFrequently: true });
    const depthCanvas = subjectDepthMap.image;
    const depthCtx = depthCanvas?.getContext?.('2d', { willReadFrequently: true });
    if (!colorCtx || !silhouetteCtx || !depthCtx) return [];

    const width = primaryColorCanvas.width;
    const height = primaryColorCanvas.height;
    const colorData = colorCtx.getImageData(0, 0, width, height).data;
    const alphaData = silhouetteCtx.getImageData(0, 0, width, height).data;
    const depthData = depthCtx.getImageData(0, 0, depthCanvas.width, depthCanvas.height).data;

    const sliceCount = isAnchor ? 12 : 7;
    const bandWidth = isAnchor ? 0.11 : 0.16;
    const slices = [];

    for (let slice = 0; slice < sliceCount; slice += 1) {
      const center = sliceCount === 1 ? 0.5 : slice / (sliceCount - 1);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;

      const image = ctx.createImageData(width, height);
      let coverage = 0;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const alpha = alphaData[index] / 255;
          if (alpha < 0.2) continue;

          const depth = depthData[index] / 255;
          const distance = Math.abs(depth - center);
          const band = 1 - smoothstep(0, bandWidth, distance);
          if (band <= 0.02) continue;

          const u = x / Math.max(1, width - 1);
          const v = y / Math.max(1, height - 1);
          const ovalDx = (u - 0.5) / 0.4;
          const ovalDy = (v - 0.5) / 0.56;
          const bodyBias = 1 - smoothstep(0.74, 1.02, Math.sqrt(ovalDx * ovalDx + ovalDy * ovalDy));
          const finalAlpha = THREE.MathUtils.clamp(
            alpha * Math.pow(band, 1.25) * (0.58 + bodyBias * 0.42),
            0,
            1,
          );
          if (finalAlpha <= 0.035) continue;

          image.data[index] = colorData[index];
          image.data[index + 1] = colorData[index + 1];
          image.data[index + 2] = colorData[index + 2];
          image.data[index + 3] = Math.round(finalAlpha * 255);
          coverage += finalAlpha;
        }
      }

      if (coverage <= width * height * (isAnchor ? 0.0009 : 0.0014)) {
        continue;
      }

      ctx.putImageData(image, 0, 0);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;

      const depthOffset = (center - 0.5) * (isAnchor ? 0.18 : 0.09);
      const scaleBoost = 1 + Math.abs(center - 0.5) * (isAnchor ? 0.03 : 0.022);
      slices.push({
        key: `slice-${slice}`,
        texture,
        z: depthOffset,
        opacity: (isAnchor ? 0.08 : 0.06) + (1 - Math.abs(center - 0.5) * 1.2) * (isAnchor ? 0.12 : 0.08),
        scaleBoost,
      });
    }

    return slices;
  }, [
    isAnchor,
    isChapter,
    primaryColorCanvas,
    primarySilhouetteCanvas,
    subjectDepthMap,
    useHybridSubjectSupport,
    useImageSliceVolume,
  ]);
  useEffect(() => () => {
    subjectDepthMap?.dispose?.();
    primaryFacetGeometry?.dispose?.();
    subjectImageGeometry?.dispose?.();
    subjectPointCloudGeometry?.dispose?.();
    subjectContourCloudGeometry?.dispose?.();
    subjectProjectedMeshParts?.forEach((part) => {
      part.geometry?.dispose?.();
    });
    subjectProjectedPointParts?.forEach((part) => {
      part.geometry?.dispose?.();
    });
    subjectDepthSliceTextures.forEach((slice) => {
      slice.texture?.dispose?.();
    });
  }, [
    primaryFacetGeometry,
    subjectDepthMap,
    subjectImageGeometry,
    subjectPointCloudGeometry,
    subjectContourCloudGeometry,
    subjectProjectedMeshParts,
    subjectProjectedPointParts,
    subjectDepthSliceTextures,
  ]);
  const subjectVolumeCloudLayers = useMemo(() => [], []);
  const subjectMeshShellLayers = useMemo(() => {
    if (!(isAnchor || isChapter)) return [];

    if (isChapter) {
      return [
        {
          key: 'chapter-shell-back',
          position: [0, 0, -0.018],
          scale: [1.004, 1.003, 1],
          opacity: 0.022,
          color: subjectShellColor,
        },
      ];
    }

    return [
      {
        key: 'anchor-shell-back',
        position: [0, 0, -0.046],
        scale: [1.014, 1.01, 1],
        opacity: 0.052,
        color: '#f7fbff',
      },
      {
        key: 'anchor-shell-mid',
        position: [0, 0, -0.022],
        scale: [1.006, 1.004, 1],
        opacity: 0.032,
        color: subjectShellColor,
      },
    ];
  }, [isAnchor, isChapter, subjectShellColor]);
  const chapterSubjectAuraLayers = useMemo(() => {
    if (!isChapter) return [];
    return [];
  }, [blend, isChapter, subjectShellColor]);
  const hasSubjectDepthSlices = subjectDepthSliceTextures.length > 0;
  const shouldUseSubjectMeshShells = subjectMeshShellLayers.length > 0 && !useDepthVolumeSubject;

  return (
    <group ref={groupRef}>
      {croppedPrimaryTexture && (
        <group>
          {(isAnchor || isChapter) ? (
            useProjectedSubjectMesh ? (
              <>
                <group
                  position={subjectMeshWorldPosition}
                  rotation={subjectWorldRotation}
                >
                  <group rotation={subjectMeshWorldRotation}>
                    <group scale={subjectMeshWorldScale}>
                      {subjectProjectedPointParts.map((part, index) => (
                        <points key={part.key} renderOrder={46 + index}>
                          <primitive object={part.geometry} attach="geometry" />
                          <pointsMaterial
                            ref={(material) => {
                              subjectProjectedMeshPointMaterialRefs.current[index] = material ?? null;
                              if (material) {
                                material.userData.baseOpacity = isChapter ? 0.082 : 0.105;
                                material.userData.frontWeight = isChapter ? 0.012 : 0.018;
                                material.userData.sideWeight = isChapter ? 0.44 : 0.54;
                              }
                            }}
                            vertexColors
                            size={isChapter ? 0.0072 : 0.0088}
                            sizeAttenuation
                            transparent
                            opacity={(isChapter ? 0.082 : 0.105) * blend}
                            depthWrite={false}
                            depthTest
                            blending={THREE.NormalBlending}
                          />
                        </points>
                      ))}
                    </group>
                  </group>
                </group>
                <group
                  ref={subjectRigRef}
                  position={primaryPosition}
                  rotation={subjectWorldRotation}
                >
                  <group ref={subjectBillboardRef}>
                    <group ref={subjectFacingRef} rotation={subjectLocalRotation}>
                      <mesh
                        renderOrder={52}
                        scale={primaryScale}
                      >
                        <primitive object={subjectImageGeometry} attach="geometry" />
                        <meshBasicMaterial
                          ref={subjectFrontMaterialRef}
                          map={croppedPrimaryTexture}
                          alphaMap={croppedPrimaryAlphaTexture ?? primaryAlphaTexture}
                          transparent={false}
                          opacity={Math.min(0.76, subjectImageOpacity * 2.0)}
                          alphaTest={isChapter ? 0.78 : 0.72}
                          color="#ffffff"
                          depthWrite
                          depthTest
                          blending={THREE.NormalBlending}
                        />
                      </mesh>
                      <mesh
                        renderOrder={51}
                        position={[0, 0, -0.014]}
                        scale={[primaryScale[0] * 1.02, primaryScale[1] * 1.02, 1]}
                      >
                        <primitive object={subjectImageGeometry} attach="geometry" />
                        <meshBasicMaterial
                          ref={subjectGlowMaterialRef}
                          map={croppedPrimaryTexture}
                          alphaMap={croppedPrimaryAlphaTexture ?? primaryAlphaTexture}
                          transparent
                          opacity={((isChapter ? 0.008 : 0.012) + pointer.activity * (isChapter ? 0.012 : 0.016)) * blend}
                          alphaTest={0.84}
                          color={tint}
                          depthWrite={false}
                          depthTest={false}
                          blending={THREE.AdditiveBlending}
                        />
                      </mesh>
                    </group>
                  </group>
                </group>
              </>
            ) : (
            <>
            {useHybridSubjectSupport && (
              <group
                position={subjectMeshWorldPosition}
                rotation={subjectWorldRotation}
              >
                <group rotation={subjectMeshWorldRotation}>
                  <group scale={subjectMeshWorldScale}>
                    {useHybridSubjectFill && subjectProjectedMeshParts.map((part, index) => (
                      <mesh key={`${part.key}-hybrid-fill`} renderOrder={40 + index}>
                        <primitive object={part.geometry} attach="geometry" />
                        <meshBasicMaterial
                          transparent
                          opacity={(isChapter ? 0.028 : 0.044) * blend}
                          color={subjectBodyColor}
                          side={THREE.DoubleSide}
                          depthWrite={false}
                          depthTest={false}
                          blending={THREE.NormalBlending}
                          ref={(material) => {
                            subjectProjectedFillMaterialRefs.current[index] = material ?? null;
                            if (material) {
                              material.userData.baseOpacity = isChapter ? 0.028 : 0.044;
                              material.userData.frontWeight = isChapter ? 0.05 : 0.1;
                              material.userData.sideWeight = isChapter ? 0.54 : 0.48;
                            }
                          }}
                        />
                      </mesh>
                    ))}
                    {useProjectedSubjectSurface && subjectProjectedMeshParts.map((part, index) => (
                      <mesh key={`${part.key}-hybrid-surface`} renderOrder={41 + index}>
                        <primitive object={part.geometry} attach="geometry" />
                        <meshBasicMaterial
                          map={croppedPrimaryTexture}
                          alphaMap={croppedPrimaryAlphaTexture ?? primaryAlphaTexture}
                          transparent
                          opacity={(isChapter ? 0.18 : 0.24) * blend}
                          color="#ffffff"
                          side={THREE.FrontSide}
                          depthWrite={false}
                          depthTest={false}
                          alphaTest={isChapter ? 0.62 : 0.54}
                          blending={THREE.NormalBlending}
                          ref={(material) => {
                            subjectProjectedSurfaceMaterialRefs.current[index] = material ?? null;
                            if (material) {
                              material.userData.baseOpacity = isChapter ? 0.18 : 0.24;
                              material.userData.frontWeight = isChapter ? 0.84 : 0.9;
                              material.userData.sideWeight = isChapter ? 0.04 : 0.1;
                            }
                          }}
                        />
                      </mesh>
                    ))}
                    {subjectProjectedMeshParts.map((part, index) => (
                      !isChapter && (
                      <mesh key={`${part.key}-hybrid-shell`} renderOrder={42 + index}>
                        <primitive object={part.geometry} attach="geometry" />
                        <meshBasicMaterial
                          transparent
                          opacity={0.058 * blend}
                          color={subjectBodyColor}
                          side={THREE.DoubleSide}
                          depthWrite={false}
                          depthTest={false}
                          blending={THREE.NormalBlending}
                          ref={(material) => {
                            subjectHybridShellMaterialRefs.current[index] = material ?? null;
                            if (material) {
                              material.userData.baseOpacity = 0.058;
                              material.userData.frontWeight = 0.08;
                              material.userData.sideWeight = 0.62;
                            }
                          }}
                        />
                      </mesh>
                      )
                    ))}
                    {useHybridSubjectPoints && subjectProjectedPointParts.map((part, index) => (
                      <points key={`${part.key}-hybrid-points`} renderOrder={46 + index}>
                        <primitive object={part.geometry} attach="geometry" />
                        <pointsMaterial
                          vertexColors
                          size={isChapter ? 0.0078 : 0.0094}
                          sizeAttenuation
                          transparent
                          opacity={(isChapter ? 0.075 : 0.11) * blend}
                          depthWrite={false}
                          depthTest={false}
                          blending={THREE.AdditiveBlending}
                          ref={(material) => {
                            subjectHybridPointMaterialRefs.current[index] = material ?? null;
                            if (material) {
                              material.userData.baseOpacity = isChapter ? 0.075 : 0.11;
                            }
                          }}
                        />
                      </points>
                    ))}
                  </group>
                </group>
              </group>
            )}
            <group
              ref={subjectRigRef}
              position={primaryPosition}
              rotation={subjectWorldRotation}
            >
              <group ref={subjectBillboardRef}>
              <group ref={subjectFacingRef} rotation={subjectLocalRotation}>
                <mesh
                  renderOrder={36}
                  position={[0, 0, -0.02]}
                  scale={[primaryScale[0] * 1.1, primaryScale[1] * 1.1, 1]}
                >
                  <primitive object={primaryFacetGeometry} attach="geometry" />
                  <meshBasicMaterial
                    transparent
                    alphaMap={croppedPrimaryAlphaTexture ?? primaryAlphaTexture}
                    opacity={(isChapter ? 0.022 : 0.03) * blend}
                    color="#050608"
                    depthWrite={false}
                    depthTest={false}
                    blending={THREE.NormalBlending}
                  />
                </mesh>
                {!useDepthVolumeSubject && primaryBackgroundTexture && isAnchor && !hasSubjectDepthSlices && (
                  <mesh
                    renderOrder={37}
                    position={[0, 0, isChapter ? -0.018 : -0.055]}
                    scale={[
                      primaryScale[0] * (isChapter ? 1.03 : 1.05),
                      primaryScale[1] * (isChapter ? 1.03 : 1.05),
                      1,
                    ]}
                  >
                    <primitive object={primaryFacetGeometry} attach="geometry" />
                    <meshBasicMaterial
                      ref={subjectBackgroundMaterialRef}
                      map={primaryBackgroundTexture}
                      alphaMap={croppedPrimaryAlphaTexture ?? primaryAlphaTexture}
                      transparent
                      opacity={(isAnchor ? 0.08 : isChapter ? 0.06 : 0.028) * blend}
                      alphaTest={isChapter ? 0.86 : hasSubjectDepthSlices ? 0.56 : 0}
                      depthWrite={false}
                      depthTest={false}
                      blending={isChapter ? THREE.NormalBlending : THREE.AdditiveBlending}
                    />
                  </mesh>
                )}
                {!useDepthVolumeSubject && isChapter && chapterSubjectAuraLayers.map((shell, index) => (
                  <mesh
                    key={shell.key}
                    renderOrder={38 + index}
                    position={shell.position}
                    scale={[
                      primaryScale[0] * shell.scale[0],
                      primaryScale[1] * shell.scale[1],
                      1,
                    ]}
                  >
                    <primitive object={primaryFacetGeometry} attach="geometry" />
                    <meshBasicMaterial
                      alphaMap={croppedPrimaryAlphaTexture ?? primaryAlphaTexture}
                      transparent
                      opacity={shell.opacity}
                      alphaTest={0.6}
                      color={shell.color}
                      depthWrite={false}
                      depthTest={false}
                      blending={THREE.AdditiveBlending}
                    />
                  </mesh>
                ))}
                {shouldUseSubjectMeshShells && subjectMeshShellLayers.map((shell, index) => (
                  <mesh
                    key={shell.key}
                    renderOrder={39 + index}
                    position={shell.position}
                    scale={[
                      primaryScale[0] * shell.scale[0],
                      primaryScale[1] * shell.scale[1],
                      1,
                    ]}
                  >
                    <primitive object={primaryFacetGeometry} attach="geometry" />
                    <meshBasicMaterial
                      alphaMap={croppedPrimaryAlphaTexture ?? primaryAlphaTexture}
                      transparent
                      opacity={shell.opacity * blend}
                      alphaTest={isChapter ? 0.76 : 0.68}
                      color={shell.color}
                      depthWrite={false}
                      depthTest={isAnchor}
                      blending={THREE.NormalBlending}
                      ref={(material) => {
                        subjectShellMeshMaterialRefs.current[index] = material ?? null;
                        if (material) {
                          material.userData.baseOpacity = shell.opacity;
                          material.userData.frontWeight = isChapter ? 0.12 - index * 0.02 : 0.28 - index * 0.06;
                          material.userData.sideWeight = isChapter ? 0.22 + index * 0.04 : 0.14 + index * 0.06;
                        }
                      }}
                    />
                  </mesh>
                ))}
                {subjectVolumeCloudLayers.map((shell, index) => (
                  <points
                    key={shell.key}
                    renderOrder={38}
                    position={shell.position}
                    rotation={shell.rotation}
                    scale={[
                      primaryScale[0] * shell.scale[0],
                      primaryScale[1] * shell.scale[1],
                      1,
                    ]}
                  >
                    <primitive object={subjectContourCloudGeometry ?? subjectPointCloudGeometry} attach="geometry" />
                    <pointsMaterial
                      ref={(material) => {
                        subjectVolumeMaterialRefs.current[index] = material ?? null;
                        if (material) {
                          material.userData.baseOpacity = shell.opacity;
                        }
                      }}
                      size={shell.size}
                      sizeAttenuation
                      transparent
                      opacity={shell.opacity}
                      color={subjectShellColor}
                      depthWrite={false}
                      depthTest={false}
                      blending={THREE.AdditiveBlending}
                    />
                  </points>
                ))}
                {hasSubjectDepthSlices && subjectContourCloudGeometry && (
                  <points
                    renderOrder={39}
                    position={[0, 0, -0.01]}
                    scale={[primaryScale[0], primaryScale[1], 1]}
                  >
                    <primitive object={subjectContourCloudGeometry} attach="geometry" />
                    <pointsMaterial
                      size={isAnchor ? 0.0062 : 0.0058}
                      sizeAttenuation
                      transparent
                      opacity={(isAnchor ? 0.028 : 0.024) * blend}
                      color={subjectShellColor}
                      depthWrite={false}
                      depthTest={false}
                      blending={THREE.AdditiveBlending}
                    />
                  </points>
                )}
                {hasSubjectDepthSlices && subjectDepthSliceTextures.map((slice, index) => (
                  <mesh
                    key={slice.key}
                    renderOrder={40 + index}
                    position={[0, 0, slice.z]}
                    scale={[
                      primaryScale[0] * slice.scaleBoost,
                      primaryScale[1] * slice.scaleBoost,
                      1,
                    ]}
                  >
                    <primitive object={subjectImageGeometry} attach="geometry" />
                    <meshBasicMaterial
                      map={slice.texture}
                      transparent
                      opacity={slice.opacity * blend}
                      color="#ffffff"
                      depthWrite={false}
                      depthTest={false}
                      alphaTest={isAnchor ? 0.28 : 0.42}
                      blending={THREE.NormalBlending}
                    />
                  </mesh>
                ))}
                {subjectPointCloudGeometry && (isAnchor || isChapter) && !hasSubjectDepthSlices && !shouldUseSubjectMeshShells && (
                  <points
                    renderOrder={40}
                    position={[0, 0, isChapter ? -0.016 : -0.012]}
                    scale={[primaryScale[0], primaryScale[1], 1]}
                  >
                    <primitive object={subjectPointCloudGeometry} attach="geometry" />
                    <pointsMaterial
                      ref={subjectPointMaterialRef}
                      vertexColors
                      size={useImageCloudSubject ? (isAnchor ? 0.0048 : 0.0042) : (isAnchor ? 0.0058 : 0.0052)}
                      sizeAttenuation
                      transparent
                      opacity={((useImageCloudSubject ? (isAnchor ? 0.34 : 0.26) : (isAnchor ? 0.24 : 0.18))) * blend}
                      depthWrite={false}
                      depthTest={false}
                      blending={THREE.NormalBlending}
                    />
                  </points>
                )}
                <mesh
                  renderOrder={48}
                  scale={primaryScale}
                >
                  <primitive object={(isChapter || shouldUseSubjectMeshShells || useDepthVolumeSubject) ? subjectImageGeometry : primaryFacetGeometry} attach="geometry" />
                  <meshBasicMaterial
                    ref={subjectFrontMaterialRef}
                    map={croppedPrimaryTexture}
                    alphaMap={croppedPrimaryAlphaTexture ?? primaryAlphaTexture}
                    transparent
                    opacity={Math.min(useImageCloudSubject ? 0.68 : 0.58, subjectImageOpacity * (useImageCloudSubject ? 1.72 : 1.45))}
                    alphaTest={
                      useImageCloudSubject
                        ? (isChapter ? 0.6 : 0.5)
                        : (isChapter ? 0.64 : hasSubjectDepthSlices ? 0.52 : 0.42)
                    }
                    color="#ffffff"
                    depthWrite={isChapter}
                    depthTest={isChapter}
                    blending={THREE.NormalBlending}
                  />
                </mesh>
                <mesh
                  renderOrder={39}
                  position={[0, 0, -0.015]}
                  scale={[primaryScale[0] * 1.02, primaryScale[1] * 1.02, 1]}
                >
                  <primitive object={(isChapter || shouldUseSubjectMeshShells || useDepthVolumeSubject) ? subjectImageGeometry : primaryFacetGeometry} attach="geometry" />
                  <meshBasicMaterial
                    ref={subjectGlowMaterialRef}
                    map={croppedPrimaryTexture}
                    alphaMap={croppedPrimaryAlphaTexture ?? primaryAlphaTexture}
                    transparent
                    opacity={((isChapter ? 0.018 : 0.028) + pointer.activity * (isChapter ? 0.026 : 0.03)) * blend}
                    alphaTest={isChapter ? 0.68 : hasSubjectDepthSlices ? 0.26 : 0}
                    color={tint}
                    depthWrite={false}
                    depthTest={isChapter}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              </group>
              </group>
            </group>
            </>
            )
          ) : (
            <mesh
              renderOrder={40}
              position={primaryPosition}
              rotation={primaryRotation}
              scale={primaryScale}
            >
              <primitive object={primaryFacetGeometry} attach="geometry" />
              <meshBasicMaterial
                map={croppedPrimaryTexture}
                alphaMap={croppedPrimaryAlphaTexture ?? primaryAlphaTexture}
                transparent
                opacity={primaryOpacity}
                color={tint}
                depthWrite={false}
                depthTest={false}
                blending={primaryBlending}
              />
            </mesh>
          )}
        </group>
      )}

      {!(isAnchor || isChapter) && supportTextures.map((texture, index) => {
        const isPeripheralShard = isAnchor || isChapter;
        const normalized = supportTextures.length === 1 ? 0.5 : index / Math.max(1, supportTextures.length - 1);
        const angle = (normalized - 0.5) * 1.15 + orbitOffset;
        const radius = (isPeripheralShard ? 4.1 + index * 0.22 : 3.2 + index * 0.38) * radiusMultiplier;
        const y = isPeripheralShard
          ? ((index % 2 === 0 ? 0.34 : -0.24) + index * 0.04)
          : ((index % 2 === 0 ? 0.18 : -0.14) + index * 0.02);
        const pointerBias = 1 - Math.min(1, Math.abs((pointer.x + 1) * 0.5 - normalized) * 1.8);
        const shardWake = smoothstep(0.84, 0.985, travelProgress);
        const opacity = isPeripheralShard
          ? (shardWake * (0.025 + pointer.activity * 0.035 * pointerBias)) * blend
          : (0.03 + travelProgress * 0.05 + pointer.activity * 0.06 * pointerBias) * blend;
        const scaleX = isPeripheralShard ? 0.78 + index * 0.08 : 2.2 + index * 0.18;
        const scaleY = isPeripheralShard ? 1.04 + index * 0.06 : 1.45 + index * 0.12;
        const shardColor = isPeripheralShard ? '#d6d0c5' : tint;

        return (
          <mesh
            key={resolvedUrls[index]}
            renderOrder={24}
            position={[Math.sin(angle) * radius, y, -Math.cos(angle) * radius + depthOffset]}
            rotation={[
              0.03 * (index % 2 === 0 ? 1 : -1),
              angle + (isPeripheralShard ? (normalized - 0.5) * 0.35 : 0),
              isPeripheralShard ? (normalized - 0.5) * 0.08 : 0,
            ]}
            scale={[scaleX, scaleY, 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={texture}
              transparent
              opacity={opacity}
              color={shardColor}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
    </group>
  );
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
  focusIntensity = 0,
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
      pointer.activity * 1.05 + Math.max(0, travelProgress - 0.15) * 0.35 + audioBands.high * 0.28 + focusIntensity * 0.62,
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
        pointer.y * 1.1 + focusIntensity * 0.06,
        0.14,
      );
      groupRef.current.position.z = THREE.MathUtils.lerp(
        groupRef.current.position.z,
        -2.1 - travelProgress * 1.25 + focusIntensity * 0.16,
        0.08,
      );
    }

    if (lineRef.current) {
      lineRef.current.rotation.y = drift + pointer.x * 0.14;
      lineRef.current.rotation.x = pointer.y * 0.08;
      lineRef.current.material.opacity = reveal * (0.48 + focusIntensity * 0.26);
      lineRef.current.material.color.setRGB(
        0.42 + audioBands.high * 0.22 + focusIntensity * 0.08,
        0.62 + pointer.activity * 0.26 + focusIntensity * 0.12,
        1,
      );
    }

    if (pointRef.current) {
      pointRef.current.rotation.y = -drift * 1.15;
      pointRef.current.material.opacity = reveal;
      pointRef.current.material.size = 0.06 + reveal * 0.08 + audioBands.high * 0.05 + focusIntensity * 0.04;
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
function WorldPostProcessing({
  archiveMode = false,
  chapterMode = false,
  standaloneWorld = false,
  focusIntensity = 0,
}) {
  const baseFocusDistance = chapterMode
    ? 0.015
    : standaloneWorld
      ? 0.015
      : 0.02;
  const dofFocusDistance = THREE.MathUtils.lerp(baseFocusDistance, 0.008, focusIntensity);
  const baseFocalLength = chapterMode
    ? 0.012
    : standaloneWorld
      ? 0.01
      : 0.04;
  const dofFocalLength = THREE.MathUtils.lerp(baseFocalLength, chapterMode ? 0.022 : 0.018, focusIntensity);
  const dofBokehScale = archiveMode
    ? (chapterMode ? 0.2 : standaloneWorld ? 0.08 : 1.0) + focusIntensity * (chapterMode ? 0.75 : 0.52)
    : 1.5;
  const bloomIntensity = (standaloneWorld && archiveMode ? 0.22 : 0.35) + focusIntensity * 0.08;
  return (
    <EffectComposer disableNormalPass frameBufferType={HalfFloatType}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.4}
        radius={0.35}
        mipmapBlur
      />
      <DepthOfField
        focusDistance={dofFocusDistance}
        focalLength={dofFocalLength}
        bokehScale={dofBokehScale}
      />
      <Vignette
        eskil={false}
        offset={0.25}
        darkness={0.6 + focusIntensity * 0.12}
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
  subjectMeshPath = null,
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
    artDirection: value.subjectCrop ? {
      subjectCrop: value.subjectCrop,
    } : undefined,
    subject3d: subjectMeshPath ? {
      mesh: subjectMeshPath,
      transform: {
        position: value.subjectMeshPosition,
        scale: value.subjectMeshScale,
        rotation: value.subjectMeshRotation,
      },
    } : undefined,
  }), [subjectMeshPath, value]);

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

  const renderVec4 = (label, field) => (
    <label style={{ display: 'grid', gap: '0.28rem' }}>
      <span style={{ fontSize: '0.66rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.56)' }}>
        {label}
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.3rem' }}>
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
      {renderVec4('Subject Crop', 'subjectCrop')}
      {subjectMeshPath && renderVec3('Subject Mesh Pos', 'subjectMeshPosition')}
      {subjectMeshPath && renderVec3('Subject Mesh Scale', 'subjectMeshScale')}
      {subjectMeshPath && renderVec3('Subject Mesh Rot', 'subjectMeshRotation')}

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
  archiveNextScene = null,
  archiveClusterBlend = 0,
}) {
  const isFullTier = tier === 'full';
  const hasFlightPath = !!scene.flightPath;
  const hasRealWorld = !!splatUrl;
  const nextClusterPreviewImages = useMemo(
    () => archiveNextScene ? [archiveNextScene.previewImage ?? archiveNextScene.photoUrl].filter(Boolean) : [],
    [archiveNextScene],
  );

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

      {archiveMode && archiveClusterBlend > 0.04 && nextClusterPreviewImages.length > 0 && (
        <ClusterMemoryFacets
          images={nextClusterPreviewImages}
          pointer={archivePointer}
          travelProgress={Math.min(1, archiveTravelProgress + archiveClusterBlend * 0.32)}
          blend={archiveClusterBlend}
          tint="#dff4ff"
          orbitOffset={0.42}
          depthOffset={-1.4 * archiveClusterBlend}
          radiusMultiplier={0.84}
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
    archiveNextScene = null,
    archiveClusterBlend = 0,
  },
  ref,
) {
  const location = useLocation();
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

  const rawWorldMode = useMemo(
    () => new URLSearchParams(location.search).get('raw') === '1',
    [location.search],
  );
  const fullSourceMode = useMemo(
    () => new URLSearchParams(location.search).get('full') === '1',
    [location.search],
  );
  // Determine splat URL: meta.json world.splat takes priority, then scene.splatUrl
  const splatUrl = useMemo(() => {
    const sharedSceneId = meta?.world?.sharedSceneId ?? scene.id;
    const defaultSharedAsset = fullSourceMode ? 'world/scene.ply' : 'world/scene.runtime.ply';
    const preferredWorldAsset =
      (fullSourceMode && meta?.world?.sourceSplat)
      || meta?.world?.splat
      || (meta?.world?.sharedSceneId ? defaultSharedAsset : null);
    if (preferredWorldAsset) {
      // meta.json splat paths are relative to the memory directory.
      // Support both the current world/scene.ply contract and legacy scene.ply values.
      return resolveMemoryWorldPath(sharedSceneId, preferredWorldAsset);
    }
    return scene.splatUrl || null;
  }, [fullSourceMode, meta, scene.id, scene.splatUrl]);

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
  const presentationMode = meta?.world?.presentationMode
    ?? (meta?.world?.sharedSceneId ? 'chapter' : 'anchor');
  const chapterPresentation = presentationMode === 'chapter' || Boolean(meta?.world?.sharedSceneId);
  const standaloneAnchorWorld = presentationMode === 'anchor'
    && !meta?.world?.sharedSceneId
    && meta?.world?.provenance?.tier === 'world-model-fused';
  const clusterPrimaryImage = (standaloneAnchorWorld || chapterPresentation || meta?.source?.postImages?.length)
    ? (scene.previewImage ?? scene.photoUrl)
    : null;
  const clusterPrimaryMask = useMemo(
    () => resolveMemoryAssetPath(scene.id, meta?.source?.mask)
      ?? scene.samMaskUrl
      ?? null,
    [meta?.source?.mask, scene.id, scene.samMaskUrl],
  );
  const defaultSubjectCrop = useMemo(
    () => cloneVec4(meta?.artDirection?.subjectCrop, [0, 0, 1, 1]),
    [meta?.artDirection?.subjectCrop],
  );
  const defaultSubjectMeshPath = meta?.subject3d?.mesh ?? null;
  const defaultSubjectMeshTransform = useMemo(() => ({
    mode: meta?.subject3d?.mode ?? 'projected-mesh',
    supportMode:
      meta?.subject3d?.transform?.supportMode
      ?? (meta?.subject3d?.mode === 'depth-volume' ? 'image-cloud' : 'mesh-fill'),
    position: cloneVec3(meta?.subject3d?.transform?.position, [0, 0, 0]),
    scale: cloneVec3(meta?.subject3d?.transform?.scale, [1, 1, 1]),
    rotation: cloneVec3(meta?.subject3d?.transform?.rotation, [0, 0, 0]),
  }), [
    meta?.subject3d?.mode,
    meta?.subject3d?.transform?.supportMode,
    meta?.subject3d?.transform?.position,
    meta?.subject3d?.transform?.rotation,
    meta?.subject3d?.transform?.scale,
  ]);
  const clusterPrimaryCrop = editorState?.subjectCrop ?? defaultSubjectCrop;
  const effectiveSubjectMeshTransform = editorState ? {
    mode: defaultSubjectMeshTransform.mode,
    supportMode: defaultSubjectMeshTransform.supportMode,
    position: cloneVec3(editorState.subjectMeshPosition, defaultSubjectMeshTransform.position),
    scale: cloneVec3(editorState.subjectMeshScale, defaultSubjectMeshTransform.scale),
    rotation: cloneVec3(editorState.subjectMeshRotation, defaultSubjectMeshTransform.rotation),
  } : defaultSubjectMeshTransform;
  const clusterSubjectMesh = defaultSubjectMeshPath
    ? resolveMemoryAssetPath(scene.id, defaultSubjectMeshPath)
    : null;
  const clusterSourceImages = standaloneAnchorWorld
    ? [clusterPrimaryImage].filter(Boolean)
    : chapterPresentation
    ? [clusterPrimaryImage].filter(Boolean)
    : (meta?.source?.postImages ?? []).slice(0, 4);
  const revealStandaloneFacets = archivePointer.activity > 0.42 || archiveTravelProgress > 0.44;
  const maskedSubjectAnchor = standaloneAnchorWorld && Boolean(clusterPrimaryMask);
  const anchorFacetPresentation = standaloneAnchorWorld
    ? (maskedSubjectAnchor ? 'anchor' : 'ambient')
    : (chapterPresentation ? 'chapter' : 'anchor');
  const archiveSubjectFocusIntensity = useMemo(
    () => computeSubjectFocusIntensity({
      pointer: archivePointer,
      travelProgress: archiveTravelProgress,
      subjectCrop: clusterPrimaryCrop,
      presentation: anchorFacetPresentation,
    }),
    [anchorFacetPresentation, archivePointer, archiveTravelProgress, clusterPrimaryCrop],
  );
  const anchorFacetBlend = standaloneAnchorWorld
    ? Math.min(
      0.96,
      (
        (maskedSubjectAnchor ? 0.62 : 0.26)
        + Math.max(0, archivePointer.activity - 0.18) * (maskedSubjectAnchor ? 0.22 : 0.16)
        + Math.max(0, archiveTravelProgress - 0.28) * (maskedSubjectAnchor ? 0.14 : 0.1)
        + (revealStandaloneFacets ? (maskedSubjectAnchor ? 0.06 : 0.04) : 0)
      ),
    )
    : (archiveNextScene ? Math.max(0.28, 1 - archiveClusterBlend * 0.52) : 1);
  const dreamParticleCount = standaloneAnchorWorld
    ? (isFullTier ? 9000 : 4200)
    : chapterPresentation
      ? (isFullTier ? 12000 : 5600)
      : (isFullTier ? 16000 : 7200);
  const dreamParticleRadius = standaloneAnchorWorld
    ? (isFullTier ? 8.4 : 5.8)
    : chapterPresentation
      ? (isFullTier ? 9.1 : 6.2)
      : (isFullTier ? 10.5 : 7.0);
  const nextClusterPreviewImages = useMemo(
    () => archiveNextScene ? [archiveNextScene.previewImage ?? archiveNextScene.photoUrl].filter(Boolean) : [],
    [archiveNextScene],
  );
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
      subjectCrop: cloneVec4(
        isCurrentEditorState ? parsed?.subjectCrop : null,
        defaultSubjectCrop,
      ),
      subjectMeshPosition: cloneVec3(
        isCurrentEditorState ? parsed?.subjectMeshPosition : null,
        defaultSubjectMeshTransform.position,
      ),
      subjectMeshScale: cloneVec3(
        isCurrentEditorState ? parsed?.subjectMeshScale : null,
        defaultSubjectMeshTransform.scale,
      ),
      subjectMeshRotation: cloneVec3(
        isCurrentEditorState ? parsed?.subjectMeshRotation : null,
        defaultSubjectMeshTransform.rotation,
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
    defaultSubjectCrop,
    defaultSubjectMeshTransform.position,
    defaultSubjectMeshTransform.rotation,
    defaultSubjectMeshTransform.scale,
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

          {!rawWorldMode
            && (
              standaloneAnchorWorld
                ? clusterSourceImages.length > 0
                : clusterSourceImages.length > 1
            )
            && (
            <ClusterMemoryFacets
              primaryImage={clusterPrimaryImage}
              primaryAlphaImage={clusterPrimaryMask}
              subjectMeshUrl={clusterSubjectMesh}
              subjectMeshTransform={effectiveSubjectMeshTransform}
              primaryCrop={clusterPrimaryCrop}
              images={clusterSourceImages}
              pointer={archivePointer}
              travelProgress={archiveTravelProgress}
              blend={anchorFacetBlend}
              presentation={anchorFacetPresentation}
              focusIntensity={archiveSubjectFocusIntensity}
            />
          )}

          {!rawWorldMode && chapterPresentation && clusterPrimaryImage && (
            <ClusterMemoryFacets
              primaryImage={clusterPrimaryImage}
              primaryAlphaImage={clusterPrimaryMask}
              subjectMeshUrl={clusterSubjectMesh}
              subjectMeshTransform={effectiveSubjectMeshTransform}
              primaryCrop={clusterPrimaryCrop}
              images={[]}
              pointer={archivePointer}
              travelProgress={archiveTravelProgress}
              blend={1}
              tint="#f3eee7"
              depthOffset={-0.6}
              radiusMultiplier={0.92}
              presentation="chapter"
              focusIntensity={archiveSubjectFocusIntensity}
            />
          )}

          {!rawWorldMode && archiveMode && archiveClusterBlend > 0.82 && nextClusterPreviewImages.length > 0 && (
            <ClusterMemoryFacets
              images={nextClusterPreviewImages}
              pointer={archivePointer}
              travelProgress={Math.min(1, archiveTravelProgress * 0.18 + archiveClusterBlend * 0.16)}
              blend={Math.max(0, archiveClusterBlend - 0.82) / 0.18 * 0.18}
              tint="#ecf5ff"
              orbitOffset={0.42}
              depthOffset={-0.78 * archiveClusterBlend}
              radiusMultiplier={0.58}
            />
          )}

          {/* Layer 2: Dream particles — luminous dust motes */}
          {!rawWorldMode && (
            <DreamParticles
              count={dreamParticleCount}
              radius={dreamParticleRadius}
              color="#FFE4B5"
              travelProgress={archiveTravelProgress}
              pointer={archivePointer}
            />
          )}

          {!rawWorldMode && archiveMode && (
            <SynapseField
              pointer={archivePointer}
              travelProgress={archiveTravelProgress}
              focusIntensity={archiveSubjectFocusIntensity}
            />
          )}

          {/* Layer 3: Atmosphere fog */}
          {!rawWorldMode && (
            <WorldAtmosphere
              fogColor="#0a0a12"
              radius={isFullTier ? 30.0 : 20.0}
            />
          )}

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
          {isFullTier && enablePostProcessing && !rawWorldMode && (
            <WorldPostProcessing
              archiveMode={archiveMode}
              chapterMode={chapterPresentation}
              standaloneWorld={standaloneAnchorWorld}
              focusIntensity={archiveSubjectFocusIntensity}
            />
          )}
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
            subjectMeshPath={defaultSubjectMeshPath}
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
                subjectCrop: cloneVec4(defaultSubjectCrop),
                subjectMeshPosition: cloneVec3(defaultSubjectMeshTransform.position),
                subjectMeshScale: cloneVec3(defaultSubjectMeshTransform.scale),
                subjectMeshRotation: cloneVec3(defaultSubjectMeshTransform.rotation),
              });
            }}
          />
        )}

        {!rawWorldMode && <div className="capsule-vignette" />}
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
          archiveNextScene={archiveNextScene}
          archiveClusterBlend={archiveClusterBlend}
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
          subjectMeshPath={defaultSubjectMeshPath}
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
              subjectCrop: cloneVec4(defaultSubjectCrop),
              subjectMeshPosition: cloneVec3(defaultSubjectMeshTransform.position),
              subjectMeshScale: cloneVec3(defaultSubjectMeshTransform.scale),
              subjectMeshRotation: cloneVec3(defaultSubjectMeshTransform.rotation),
            });
          }}
        />
      )}
    </div>
  );
});

export default WorldMemoryRenderer;
