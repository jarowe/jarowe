import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Howl } from 'howler';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, DepthOfField, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import gsap from 'gsap';
import { getSceneById } from '../data/memoryScenes';
import { getGpuTier } from '../utils/gpuCapability';
import { useAudio } from '../context/AudioContext';
import PortalVFX from '../components/PortalVFX';
import {
  useDreamTransition,
  storeDepartureState,
  retrieveDepartureState,
} from '../components/DreamTransition';
import { useSoundscape } from '../hooks/useSoundscape';
import './MemoryPortal.css';

const ParticleFieldRenderer = React.lazy(() => import('../components/ParticleFieldRenderer'));
const MeshMemoryRenderer = React.lazy(() => import('../components/MeshMemoryRenderer'));
const WorldMemoryRenderer = React.lazy(() => import('../components/WorldMemoryRenderer'));

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
uniform sampler2D uSamMask;
uniform float uDepthScale;
uniform float uDepthBias;
uniform float uDepthContrast;
uniform float uFgDepthScale;
uniform float uBgDepthScale;
uniform float uHasSamMask;

varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;

  // Sample depth and apply contrast + bias
  float d = texture2D(uDepth, uv).r;
  d = pow(d, uDepthContrast);
  d = d + uDepthBias;
  vDepth = d;

  // SAM mask layer separation: foreground and background get different depth multipliers
  float layerScale = uDepthScale;
  if (uHasSamMask > 0.5) {
    float mask = texture2D(uSamMask, uv).r;
    // mask > 0.5 = foreground (white), mask < 0.5 = background (black)
    float fgWeight = smoothstep(0.4, 0.6, mask);
    layerScale = uDepthScale * mix(uBgDepthScale, uFgDepthScale, fgWeight);
  }

  // Displace along Z
  vec3 displaced = position;
  displaced.z += d * layerScale;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

const DISPLACED_FRAG = /* glsl */ `
uniform sampler2D uPhoto;
uniform sampler2D uDepth;
uniform float uDiscardThreshold;
uniform float uWarmth;
uniform float uSaturation;
uniform vec3 uTint;
uniform float uRecessionFade;
uniform vec3 uRecessionColor;

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
  vec3 c = color.rgb;

  // Color grading: warmth shift
  c.r += uWarmth;
  c.b -= uWarmth;

  // Color grading: saturation adjustment
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(lum), c, uSaturation);

  // Color grading: tint multiply
  c *= uTint;

  // Recession fade: mix toward warm white as memory recedes (ARC-03)
  c = mix(c, uRecessionColor, uRecessionFade);

  gl_FragColor = vec4(c, color.a * edgeAlpha);
}
`;

// ---------------------------------------------------------------------------
// CinematicCamera — GSAP-driven multi-beat keyframe choreography
// No OrbitControls. Visitor is guided through the memory.
// ---------------------------------------------------------------------------
export function CinematicCamera({ keyframes, fallbackTarget }) {
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
uniform float uMaxSize;
uniform float uOpacity;
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
  gl_PointSize = min(uSize * (80.0 / max(-mvPos.z, 0.6)), uMaxSize);

  // Depth-based alpha: farther particles are dimmer
  float dist = length(mvPos.xyz);
  vAlpha = smoothstep(8.0, 1.0, dist) * uOpacity * (0.45 + aRandom * 0.35);

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
    uSize: { value: 1.1 },
    uMaxSize: { value: 6.0 },
    uOpacity: { value: 0.18 },
    uColor: { value: new THREE.Color(1.0, 0.97, 0.9) },
  });
  const bokehUniforms = useRef({
    uTime: { value: 0 },
    uDriftSpeed: { value: 0.08 },
    uSize: { value: 1.8 },
    uMaxSize: { value: 14.0 },
    uOpacity: { value: 0.08 },
    uColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
  });
  const streakUniforms = useRef({
    uTime: { value: 0 },
    uDriftSpeed: { value: 0.25 },
    uSize: { value: 0.8 },
    uMaxSize: { value: 4.0 },
    uOpacity: { value: 0.12 },
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
      blending: THREE.NormalBlending,
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
// Color Grading Presets
// ---------------------------------------------------------------------------
const COLOR_GRADING = {
  warm: { warmth: 0.04, saturation: 1.03, tintR: 1.02, tintG: 0.99, tintB: 0.97 },
  cool: { warmth: -0.08, saturation: 0.95, tintR: 0.92, tintG: 0.97, tintB: 1.08 },
  golden: { warmth: 0.18, saturation: 1.15, tintR: 1.1, tintG: 1.0, tintB: 0.85 },
};

// ---------------------------------------------------------------------------
// CapsulePostProcessing — DOF + Vignette + Grain + Color Grading (full tier only)
// ---------------------------------------------------------------------------
function CapsulePostProcessing({ mood }) {
  const grading = COLOR_GRADING[mood] || COLOR_GRADING.warm;

  return (
    <EffectComposer disableNormalPass>
      <DepthOfField
        focusDistance={0.014}
        focalLength={0.025}
        bokehScale={1.15}
        kernelSize={KernelSize.SMALL}
      />
      <Vignette
        eskil={false}
        offset={0.24}
        darkness={0.55}
      />
      <Noise
        blendFunction={BlendFunction.OVERLAY}
        opacity={0.04}
      />
    </EffectComposer>
  );
}

// ---------------------------------------------------------------------------
// DisplacedPlane — subdivided plane with depth displacement shader
// ---------------------------------------------------------------------------
const DisplacedPlane = forwardRef(function DisplacedPlane({ scene, subdivisions, mood }, ref) {
  const meshRef = useRef();
  const photoUrl = resolveAsset(scene.photoUrl);
  const depthUrl = resolveAsset(scene.depthMapUrl);

  const {
    depthScale = 2.0,
    depthBias = 0.0,
    depthContrast = 1.0,
    discardThreshold = 0.15,
  } = scene.depthConfig || {};

  const {
    foregroundDepthScale = 1.0,
    backgroundDepthScale = 1.0,
  } = scene.layerSeparation || {};

  const grading = COLOR_GRADING[mood] || COLOR_GRADING.warm;

  const [photoTex, depthTex, samMaskTex] = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const photo = loader.load(photoUrl);
    const depth = loader.load(depthUrl);
    photo.colorSpace = THREE.SRGBColorSpace;
    depth.colorSpace = THREE.NoColorSpace;
    // Depth needs linear filtering to avoid interpolation artifacts at edges
    depth.minFilter = THREE.LinearFilter;
    depth.magFilter = THREE.LinearFilter;

    let samMask = null;
    if (scene.samMaskUrl) {
      const samMaskUrl = resolveAsset(scene.samMaskUrl);
      samMask = loader.load(samMaskUrl);
      samMask.colorSpace = THREE.NoColorSpace;
      samMask.minFilter = THREE.LinearFilter;
      samMask.magFilter = THREE.LinearFilter;
    }
    return [photo, depth, samMask];
  }, [photoUrl, depthUrl, scene.samMaskUrl]);

  const uniforms = useRef({
    uPhoto: { value: null },
    uDepth: { value: null },
    uDepthScale: { value: depthScale },
    uDepthBias: { value: depthBias },
    uDepthContrast: { value: depthContrast },
    uDiscardThreshold: { value: discardThreshold },
    uWarmth: { value: grading.warmth },
    uSaturation: { value: grading.saturation },
    uTint: { value: new THREE.Vector3(grading.tintR, grading.tintG, grading.tintB) },
    uSamMask: { value: null },
    uFgDepthScale: { value: foregroundDepthScale },
    uBgDepthScale: { value: backgroundDepthScale },
    uHasSamMask: { value: scene.samMaskUrl ? 1.0 : 0.0 },
    uRecessionFade: { value: 0.0 },
    uRecessionColor: { value: new THREE.Vector3(1.0, 0.98, 0.95) },
  });

  useImperativeHandle(ref, () => ({
    uniforms: uniforms.current,
  }));

  useEffect(() => {
    uniforms.current.uPhoto.value = photoTex;
    uniforms.current.uDepth.value = depthTex;
    if (samMaskTex) {
      uniforms.current.uSamMask.value = samMaskTex;
    }
  }, [photoTex, depthTex, samMaskTex]);

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
    const imageWidth = photoTex?.image?.width || 16;
    const imageHeight = photoTex?.image?.height || 9;
    const aspect = imageWidth / imageHeight;
    const height = 2.0;
    const width = height * aspect;
    const xSegments = aspect >= 1 ? subdivisions : Math.max(1, Math.round(subdivisions * aspect));
    const ySegments = aspect >= 1 ? Math.max(1, Math.round(subdivisions / aspect)) : subdivisions;
    return new THREE.PlaneGeometry(
      width,
      height,
      xSegments,
      ySegments,
    );
  }, [photoTex, subdivisions]);

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
});

// ---------------------------------------------------------------------------
// ArcController — GSAP-driven awakening (ARC-01) and recession (ARC-03)
// ---------------------------------------------------------------------------
function ArcController({ planeRef, arc, onRecessionComplete, onAwakeningComplete, directAccess }) {
  const awakeningDone = useRef(false);

  useEffect(() => {
    if (!planeRef.current || !arc) return;
    const u = planeRef.current.uniforms;
    if (!u) return;

    // Direct URL access shortens awakening (no portal entry preceded this)
    const awakeningDelay = directAccess ? 0 : (arc.awakeningDelay || 0.5);
    const awakeningDur = directAccess ? 1.5 : (arc.awakeningDuration || 3.5);

    // ARC-01: Awakening — depthScale animates from 0 to its configured value
    const targetDepth = u.uDepthScale.value; // save the configured target
    u.uDepthScale.value = 0; // start flat

    const awakeningTl = gsap.timeline();
    awakeningTl.to(u.uDepthScale, {
      value: targetDepth,
      duration: awakeningDur,
      ease: arc.awakeningEase || 'power2.out',
      delay: awakeningDelay,
      onComplete: () => {
        awakeningDone.current = true;
        if (onAwakeningComplete) onAwakeningComplete();
      },
    });

    // ARC-03: Recession — depthScale back to 0 + fade to warm white
    const recessionTl = gsap.timeline({ delay: arc.recessionDelay || 20 });
    recessionTl.to(u.uDepthScale, {
      value: 0,
      duration: arc.recessionDuration || 3.0,
      ease: arc.recessionEase || 'power2.in',
    });
    // Fade to warm white simultaneously
    const fadeColor = arc.recessionFadeColor || [1.0, 0.98, 0.95];
    u.uRecessionColor.value.set(fadeColor[0], fadeColor[1], fadeColor[2]);
    recessionTl.to(u.uRecessionFade, {
      value: 1.0,
      duration: arc.recessionDuration || 3.0,
      ease: 'power1.in',
      onComplete: () => {
        if (onRecessionComplete) onRecessionComplete();
      },
    }, '<'); // sync with depthScale recession

    return () => {
      awakeningTl.kill();
      recessionTl.kill();
    };
  }, [planeRef, arc, onRecessionComplete, onAwakeningComplete]);

  return null;
}

// ---------------------------------------------------------------------------
// DisplacedMeshRenderer — depth-displaced 3D mesh from photo+depth pair
// ---------------------------------------------------------------------------
function DisplacedMeshRenderer({ scene, tier, onRecessionComplete, onAwakeningComplete, directAccess }) {
  const subdivisions = tier === 'full' ? 256 : 128;
  const dpr = tier === 'full' ? [1, 2] : [1, 1];
  const planeRef = useRef(null);

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
        <DisplacedPlane ref={planeRef} scene={scene} subdivisions={subdivisions} mood={scene.mood} />
        <AtmosphericParticles tier={tier} />
        <CinematicCamera
          keyframes={scene.cameraKeyframes}
          fallbackTarget={[
            scene.cameraTarget.x,
            scene.cameraTarget.y,
            scene.cameraTarget.z,
          ]}
        />
        {tier === 'full' && <CapsulePostProcessing mood={scene.mood} />}
        <ArcController
          planeRef={planeRef}
          arc={scene.arc}
          onRecessionComplete={onRecessionComplete}
          onAwakeningComplete={onAwakeningComplete}
          directAccess={directAccess}
        />
      </Canvas>
      {/* Simplified tier: CSS vignette overlay (full tier uses postprocessing Vignette) */}
      {tier !== 'full' && <div className="capsule-vignette" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ParallaxFallback — multi-layer Ken Burns with depth-based separation
// ---------------------------------------------------------------------------
function ParallaxFallback({ scene, loadError, renderMode }) {
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

      {/* Sparse CSS particle overlay for particle-memory scenes */}
      {renderMode === 'particle-memory' && (
        <div className="memory-portal__particle-dots">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="memory-portal__dot"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${4 + Math.random() * 6}s`,
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
              }}
            />
          ))}
        </div>
      )}

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
  const [recessionDone, setRecessionDone] = useState(false);
  const [awakeningComplete, setAwakeningComplete] = useState(false);
  const [exitPortalPhase, setExitPortalPhase] = useState(null);
  const [directAccess] = useState(() => {
    const portalEntry = sessionStorage.getItem('jarowe_portal_entry');
    sessionStorage.removeItem('jarowe_portal_entry');
    return !portalEntry;
  });
  // Capture and clear return path on mount so it can't go stale.
  // The scripted exit reads from this ref; any other exit path (back button,
  // direct navigation) leaves no dangling session key.
  const portalReturnRef = useRef(
    sessionStorage.getItem('jarowe_portal_return')
  );
  useState(() => {
    sessionStorage.removeItem('jarowe_portal_return');
  });
  const navigate = useNavigate();
  const exitTimersRef = useRef([]);
  const soundRef = useRef(null);
  const flightProgressRef = useRef(0); // Written by flight controller, read by narrative triggers
  const particleRendererRef = useRef(null); // Phase 16: ref to ParticleFieldRenderer for dream transitions
  const audio = useAudio();
  const handleRecessionComplete = useCallback(() => setRecessionDone(true), []);

  // Phase 16: Determine if this is a particle-memory scene (uses dream transition, not PortalVFX)
  const isParticleMemory = scene.renderMode === 'particle-memory';

  // Phase 16: Dream transition hook — manages entry/exit timelines
  const dreamTransition = useDreamTransition(particleRendererRef, scene, {
    directAccess,
    onExitNavigate: () => {
      navigate(portalReturnRef.current || '/');
    },
  });

  // Phase 17: Soundscape — active when particle-memory, awakened, not receding
  const soundscapeActive = isParticleMemory && awakeningComplete && !recessionDone;
  useSoundscape(soundscapeActive ? scene.id : null, {
    duckSiteMusic: () => audio.duckForCapsule(),
    restoreSiteMusic: () => audio.restoreFromCapsule(),
    enabled: soundscapeActive,
  });

  // Phase 16: Store departure state in sessionStorage on mount (for intentional return)
  useEffect(() => {
    if (isParticleMemory && !directAccess) {
      storeDepartureState(scene.id);
    }
  }, [isParticleMemory, directAccess, scene.id]);

  // PORT-03: Two-stage exit — recession fades content, then reverse portal closes
  // Phase 16: particle-memory scenes use dream exit (DreamTransition) instead of PortalVFX
  useEffect(() => {
    if (!recessionDone) return;

    if (isParticleMemory) {
      // Phase 16: Dream exit — dissolve particles → tunnel → navigate at rupture
      dreamTransition.triggerExit();
      return;
    }

    // Non-particle-memory scenes: existing PortalVFX exit sequence
    const eT = (fn, ms) => {
      const id = setTimeout(fn, ms);
      exitTimersRef.current.push(id);
      return id;
    };

    // Brief pause after recession completes, then portal starts closing
    eT(() => setExitPortalPhase('residual'), 500);
    eT(() => setExitPortalPhase('emerging'), 1500);
    eT(() => setExitPortalPhase('rupture'), 2500);
    eT(() => {
      setExitPortalPhase('gathering');
      // Navigate back: constellation if we came from there, home otherwise
      navigate(portalReturnRef.current || '/');
    }, 3200);
    eT(() => setExitPortalPhase(null), 4000);

    return () => {
      exitTimersRef.current.forEach(clearTimeout);
      exitTimersRef.current = [];
    };
  }, [recessionDone, navigate, isParticleMemory, dreamTransition]);

  // GPU capability check
  useEffect(() => {
    setTier(getGpuTier());
  }, []);

  // Duck GlobalPlayer on capsule entry, restore on exit
  useEffect(() => {
    if (audio) {
      audio.duckForCapsule();
    }
    return () => {
      if (audio) {
        audio.restoreFromCapsule();
      }
    };
  }, [audio]);

  // Per-scene soundtrack — muted by default, user intent to unmute
  useEffect(() => {
    if (!scene.soundtrack) return;
    const soundPath = resolveAsset(scene.soundtrack, false);
    if (!soundPath) return;

    const sound = new Howl({
      src: [soundPath],
      volume: 0,
      loop: true,
      onload: () => setSoundReady(true),
      onloaderror: () => {
        console.warn('[CapsuleShell] Soundtrack failed to load:', soundPath);
      },
    });
    soundRef.current = sound;
    sound.play(); // Plays silently — browser autoplay policy respected since volume is 0

    return () => {
      // Cross-fade out over 1.5s before unloading
      if (soundRef.current) {
        const s = soundRef.current;
        const currentVol = s.volume();
        if (currentVol > 0) {
          s.fade(currentVol, 0, 1500);
          // Delay unload until fade completes
          setTimeout(() => {
            s.unload();
          }, 1600);
        } else {
          s.unload();
        }
      }
      soundRef.current = null;
      setSoundReady(false);
      setMuted(true);
    };
  }, [scene.soundtrack]);

  // Narrative cards — two trigger paths:
  //   1. Progress-threshold (particle-memory scenes with threshold fields): poll flightProgressRef
  //   2. Time-based delay (all other scenes): existing timed setTimeout approach
  useEffect(() => {
    if (!scene.narrative?.length) return;
    if (!awakeningComplete && scene.arc) return; // Wait for awakening if arc is configured

    const hasThresholds = scene.renderMode === 'particle-memory' &&
      scene.narrative.some((card) => typeof card.threshold === 'number');

    if (hasThresholds) {
      // Progress-threshold path: poll flightProgressRef via rAF
      const firedSet = new Set();
      let rafId;

      const poll = () => {
        const progress = flightProgressRef.current;
        scene.narrative.forEach((card, i) => {
          if (!firedSet.has(i) && typeof card.threshold === 'number' && progress >= card.threshold) {
            firedSet.add(i);
            setVisibleCards((prev) => [...prev, i]);
          }
        });
        rafId = requestAnimationFrame(poll);
      };
      rafId = requestAnimationFrame(poll);

      return () => {
        cancelAnimationFrame(rafId);
        setVisibleCards([]);
      };
    }

    // Time-based delay path (non-particle-memory or no thresholds)
    const timers = scene.narrative.map((card, i) =>
      setTimeout(() => setVisibleCards((prev) => [...prev, i]), card.delay)
    );
    return () => {
      timers.forEach(clearTimeout);
      setVisibleCards([]);
    };
  }, [scene.narrative, awakeningComplete, scene.arc, scene.renderMode]);

  const handleUnmute = useCallback(() => {
    if (!soundRef.current) return;
    if (muted) {
      soundRef.current.fade(0, 0.6, 2000);
      setMuted(false);
    } else {
      // Fade out over 500ms on mute — delay state until fade completes
      soundRef.current.fade(soundRef.current.volume(), 0, 500);
      setTimeout(() => setMuted(true), 500);
    }
  }, [muted]);

  const handleSplatLoaded = useCallback(() => setLoaded(true), []);
  const handleSplatError = useCallback((msg) => {
    setLoadError(msg);
    setTier('parallax'); // Fall through to immersive fallback
  }, []);

  // Determine renderer based on scene.renderMode x GPU tier
  // Priority: world-memory (splat world) > particle-memory > displaced-mesh > splat > fallback
  const renderMode = scene.renderMode || 'splat';
  let showWorldMemory = false;
  let showSplat = false;
  let showDisplaced = false;
  let showParticleMemory = false;
  let showFallback = false;

  if (tier === null) {
    // Still checking capabilities — show loading state
  } else if (tier === 'parallax') {
    showFallback = true;
  } else if (renderMode === 'world-memory' || scene.splatUrl) {
    // New priority: scenes with splatUrl or world-memory renderMode use WorldMemoryRenderer
    showWorldMemory = true;
  } else if (renderMode === 'particle-memory') {
    showParticleMemory = true;
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
      {showWorldMemory && (
        <React.Suspense fallback={
          <div className="memory-loading">
            <div className="memory-loading-spinner" />
            <span>Preparing world...</span>
          </div>
        }>
          <WorldMemoryRenderer
            ref={particleRendererRef}
            scene={scene}
            tier={tier}
            onRecessionComplete={handleRecessionComplete}
            onAwakeningComplete={() => {
              setAwakeningComplete(true);
              if (!directAccess) {
                setTimeout(() => dreamTransition.triggerEntry(), 100);
              }
            }}
            directAccess={directAccess}
            onProgress={(p) => { flightProgressRef.current = p; }}
          />
        </React.Suspense>
      )}

      {showSplat && (
        <SplatRenderer
          scene={scene}
          onLoaded={handleSplatLoaded}
          onError={handleSplatError}
        />
      )}

      {showDisplaced && (
        <DisplacedMeshRenderer
          scene={scene}
          tier={tier}
          onRecessionComplete={handleRecessionComplete}
          onAwakeningComplete={() => setAwakeningComplete(true)}
          directAccess={directAccess}
        />
      )}

      {showParticleMemory && (
        <React.Suspense fallback={
          <div className="memory-loading">
            <div className="memory-loading-spinner" />
            <span>Loading particle field...</span>
          </div>
        }>
          <MeshMemoryRenderer
            ref={particleRendererRef}
            scene={scene}
            tier={tier}
            onRecessionComplete={handleRecessionComplete}
            onAwakeningComplete={() => {
              setAwakeningComplete(true);
              // Phase 16: trigger dream entry transition after particles form
              // On portal entry (not direct access), play the dissolve → tunnel → reform sequence
              if (!directAccess) {
                // Small delay to let refs settle after first render
                setTimeout(() => dreamTransition.triggerEntry(), 100);
              }
            }}
            directAccess={directAccess}
            onProgress={(p) => { flightProgressRef.current = p; }}
          />
        </React.Suspense>
      )}

      {showFallback && (
        <ParallaxFallback scene={scene} loadError={loadError} renderMode={renderMode} />
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
        {isParticleMemory ? (
          <button
            className="back-link"
            onClick={() => {
              // Phase 16: Dream exit — dissolve particles → tunnel → navigate
              dreamTransition.triggerExit();
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        ) : scene.arc ? (
          <button
            className="back-link"
            onClick={() => {
              // Trigger early recession — portal exit follows via recessionDone effect
              setRecessionDone(true);
            }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        ) : (
          <Link to="/" className="back-link">
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>
        )}
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
      <div className={`memory-narrative ${recessionDone ? 'memory-narrative--faded' : ''}`}>
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

      {/* Portal exit VFX — reverse phases after recession (non-particle-memory only) */}
      {/* Phase 16: particle-memory scenes use DreamTransition instead of PortalVFX */}
      {!isParticleMemory && (
        <PortalVFX
          phase={exitPortalPhase}
          originX="50%"
          originY="50%"
        />
      )}
    </div>
  );
}
