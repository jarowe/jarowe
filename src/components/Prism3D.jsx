import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';

/* ═══════════ GLOBAL PRISM CONFIG (GlobeEditor writes, Prism3D reads) ═══════════ */
export const PRISM_DEFAULTS = {
  // Shape
  shape: 'rounded-prism',
  // Mouse reactivity
  driftStrength: 0.8,
  driftSpeed: 0.04,
  driftTiltX: 0.15,
  driftTiltY: 0.1,
  rayBendAmount: 0.12,
  rayVerticalBend: 0.06,
  beamTrackAmount: 0.12,
  eyeTrackSpeed: 0.06,
  eyeTrackRange: 0.5,
  rotationMouseInfluence: 0.5,
  // Particles
  sparkleCount: 30,
  sparkleSize: 2.5,
  sparkleSpeed: 0.5,
  sparkleOpacity: 0.8,
  // Lighting
  ambientIntensity: 0.4,
  keyLightIntensity: 3,
  fillLightIntensity: 1.5,
  internalGlowIntensity: 1.5,
  internalGlowDistance: 4,
  lightSpillIntensity: 1.0,
  // Animation
  floatSpeed: 2,
  rotationIntensity: 0.3,
  floatIntensity: 0.5,
  rotationSpeed: 0.2,
  breathingAmp: 0.02,
  breathingSpeed: 0.8,
  // Canvas / display
  canvasSize: 420,
  featherInner: 25,
  featherOuter: 75,
  // Beam / rays
  beamOpacity: 1.0,
  rayOpacity: 0.85,
  // Edge glow
  edgeGlowOpacity: 0.4,
  // Vertex highlights
  vertexHighlightScale: 0.35,
  vertexHighlightPulse: 0.15,
};

// Live config object - editor mutates this, prism reads each frame
if (!window.__prismConfig) {
  window.__prismConfig = { ...PRISM_DEFAULTS };
}
const cfg = window.__prismConfig;

/* ═══════════ Mouse tracking (window-level) ═══════════ */
const mousePos = new THREE.Vector2(0, 0);
const mouseVel = { current: 0 };

/* ═══════════ SHADERS ═══════════ */

const simpleVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ── CUSTOM GLASS SHADER (replaces MTM - no FBO, no black, always colorful) ── */
const glassVert = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const glassFrag = `
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    float NdotV = abs(dot(N, V));
    float fresnel = pow(1.0 - NdotV, 2.5);

    // Iridescent rainbow that shifts with viewing angle + time
    float iri = acos(clamp(NdotV, 0.0, 1.0)) * 2.0 + uTime * 0.25;
    vec3 iridescence = vec3(
      0.5 + 0.5 * sin(iri * 4.0),
      0.5 + 0.5 * sin(iri * 4.0 + 2.094),
      0.5 + 0.5 * sin(iri * 4.0 + 4.189)
    );

    // Swirling interior nebula for depth
    float t = uTime * 0.25;
    vec3 nebula = vec3(
      0.55 + 0.45 * sin(vWorldPos.y * 2.0 + t),
      0.35 + 0.35 * sin(vWorldPos.x * 2.0 + t * 0.7 + 2.094),
      0.65 + 0.35 * sin(vWorldPos.z * 2.0 + t * 0.5 + 4.189)
    );

    // Two specular highlights for sparkle
    vec3 L1 = normalize(vec3(-1.0, 0.7, 0.8));
    vec3 L2 = normalize(vec3(1.0, 0.3, 0.5));
    float spec1 = pow(max(dot(reflect(-L1, N), V), 0.0), 60.0);
    float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 30.0);

    // Glass color: subtle purple tint at center, iridescent + nebula at edges
    vec3 baseTint = vec3(0.55, 0.4, 1.0); // purple glass tint
    vec3 color = mix(nebula * 0.4 + baseTint * 0.15, iridescence, fresnel * 0.6);
    color += vec3(1.0, 0.98, 0.95) * (spec1 * 0.7 + spec2 * 0.35);

    // Alpha: visible glass center, bright edges + specs
    float alpha = 0.18 + fresnel * 0.5 + (spec1 + spec2 * 0.5) * 0.25;
    alpha = min(alpha, 0.85);

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ── CONVERGING BEAM SHADER (tapers toward prism) ── */
const beamFrag = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    // Beam tapers as it converges toward prism (vUv.x: 0=far left, 1=at prism)
    float taper = 1.0 - vUv.x * vUv.x * 0.75;
    float d = abs(vUv.y - 0.5) * 2.0 / max(taper, 0.05);

    // Core gets tighter + brighter near prism
    float core = exp(-d * d * 20.0);
    float glow = exp(-d * d * 2.5) * taper;
    float convergeBright = 0.4 + vUv.x * 0.6;

    float intensity = (core * 1.5 + glow * 0.35) * convergeBright;
    float shimmer = 0.93 + 0.07 * sin(vUv.x * 30.0 - uTime * 6.0);

    // Near prism, start showing spectral hints
    float spectralHint = vUv.x * vUv.x * 0.15;
    vec3 hint = vec3(
      1.0 + sin(vUv.y * 12.0 + uTime) * spectralHint,
      1.0 + sin(vUv.y * 12.0 + uTime + 2.0) * spectralHint,
      1.0 - spectralHint * 0.3
    );

    vec3 color = vec3(1.0, 0.98, 0.93) * hint * (1.0 + core * 0.6);
    float alpha = intensity * uOpacity * shimmer;

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ── SPREADING RAY SHADER (widens from prism) ── */
const rayFrag = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // Ray widens as it spreads from prism (vUv.x: 0=at prism, 1=far right)
    float spread = 0.25 + vUv.x * 0.75;
    float d = abs(vUv.y - 0.5) * 2.0 / max(spread, 0.05);

    float fade = pow(1.0 - vUv.x, 0.6);
    float core = exp(-d * d * 25.0);
    float glow = exp(-d * d * 3.5);

    float intensity = (core * 1.4 + glow * 0.45) * fade;
    float shimmer = 0.88 + 0.12 * sin(vUv.x * 20.0 + uTime * 3.0);

    vec3 color = uColor * (1.6 + core * 0.8);
    float alpha = intensity * uOpacity * shimmer;

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ── EDGE GLOW SHADER (bright white glass etching) ── */
const edgeGlowVert = `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const edgeGlowFrag = `
  uniform float uTime;
  uniform float uOpacity;

  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    float NdotV = abs(dot(vWorldNormal, vViewDir));
    float fresnel = pow(1.0 - NdotV, 2.0);

    float shimmer = 0.7 + 0.3 * sin(uTime * 2.0 + vWorldPos.y * 4.0 + vWorldPos.x * 3.0);

    // Subtle prismatic shift at edges
    float hue = uTime * 0.15 + fresnel * 2.0;
    vec3 prismatic = vec3(
      0.5 + 0.5 * sin(hue),
      0.5 + 0.5 * sin(hue + 2.094),
      0.5 + 0.5 * sin(hue + 4.189)
    );

    // Mostly bright white with prismatic hint
    vec3 color = mix(vec3(1.0), prismatic, fresnel * 0.35);

    // Catch-light
    vec3 lightDir = normalize(vec3(sin(uTime * 0.3) * 0.5, 0.7, 0.6));
    float catchLight = pow(max(0.0, dot(reflect(-vViewDir, vWorldNormal), lightDir)), 6.0);
    color += vec3(1.0, 0.97, 0.92) * catchLight * 0.5;

    float alpha = (0.3 + fresnel * 0.5 + catchLight * 0.3) * uOpacity * shimmer;

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ═══════════ TEXTURE GENERATORS ═══════════ */

function createEyeTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2, cy = size / 2;

  // Big white sclera
  const scleraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 56);
  scleraGrad.addColorStop(0, 'rgba(255,255,255,0.99)');
  scleraGrad.addColorStop(0.7, 'rgba(245,240,255,0.97)');
  scleraGrad.addColorStop(1, 'rgba(210,205,230,0.9)');
  ctx.beginPath();
  ctx.ellipse(cx, cy, 56, 48, 0, 0, Math.PI * 2);
  ctx.fillStyle = scleraGrad;
  ctx.fill();

  // BIG vibrant iris
  const irisGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 30);
  irisGrad.addColorStop(0, '#0f0033');
  irisGrad.addColorStop(0.2, '#4c1d95');
  irisGrad.addColorStop(0.45, '#7c3aed');
  irisGrad.addColorStop(0.7, '#8b5cf6');
  irisGrad.addColorStop(1, '#c4b5fd');
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fillStyle = irisGrad;
  ctx.fill();

  // Iris fibers
  ctx.save();
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 10, cy + Math.sin(angle) * 10);
    ctx.lineTo(cx + Math.cos(angle) * 28, cy + Math.sin(angle) * 28);
    ctx.strokeStyle = i % 4 === 0 ? '#e9d5ff' : i % 3 === 0 ? '#c4b5fd' : '#8b5cf6';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();

  // BIG pupil
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fillStyle = '#020010';
  ctx.fill();

  // Big main highlight (googly eye!)
  ctx.beginPath();
  ctx.arc(cx + 12, cy - 12, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.fill();

  // Second highlight
  ctx.beginPath();
  ctx.arc(cx - 9, cy + 9, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();

  // Tiny sparkle
  ctx.beginPath();
  ctx.arc(cx + 6, cy - 18, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createStarTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2, cy = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.08, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.25, 'rgba(220,200,255,0.35)');
  grad.addColorStop(1, 'rgba(200,180,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.5;
  for (let angle = 0; angle < Math.PI; angle += Math.PI / 4) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 28, cy + Math.sin(angle) * 28);
    ctx.lineTo(cx - Math.cos(angle) * 28, cy - Math.sin(angle) * 28);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ═══════════ VIVID NEBULA BACKDROP TEXTURE ═══════════ */
function createNebulaTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');

  // Rich dark-indigo base
  const baseGrad = ctx.createLinearGradient(0, 0, size, size);
  baseGrad.addColorStop(0, '#0f0a3e');
  baseGrad.addColorStop(0.3, '#1a0e4a');
  baseGrad.addColorStop(0.6, '#0d1a3f');
  baseGrad.addColorStop(1, '#150a35');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  const blobs = [
    { x: 100, y: 100, r: 200, color: [147, 51, 234], a: 0.7 },
    { x: 400, y: 120, r: 180, color: [56, 189, 248], a: 0.65 },
    { x: 256, y: 400, r: 200, color: [244, 114, 182], a: 0.6 },
    { x: 80,  y: 370, r: 160, color: [34, 197, 94],  a: 0.5 },
    { x: 420, y: 380, r: 150, color: [250, 204, 21],  a: 0.5 },
    { x: 256, y: 220, r: 250, color: [124, 58, 237],  a: 0.6 },
    { x: 180, y: 280, r: 180, color: [99, 102, 241],  a: 0.55 },
    { x: 370, y: 260, r: 160, color: [236, 72, 153],  a: 0.55 },
  ];

  blobs.forEach(b => {
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${b.a})`);
    grad.addColorStop(0.4, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${b.a * 0.7})`);
    grad.addColorStop(0.7, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${b.a * 0.35})`);
    grad.addColorStop(1, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });

  // Bright center glow
  const centerGlow = ctx.createRadialGradient(256, 256, 0, 256, 256, 200);
  centerGlow.addColorStop(0, 'rgba(220, 200, 255, 0.5)');
  centerGlow.addColorStop(0.3, 'rgba(160, 120, 255, 0.35)');
  centerGlow.addColorStop(0.6, 'rgba(100, 60, 200, 0.2)');
  centerGlow.addColorStop(1, 'rgba(20, 10, 60, 0)');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ═══════════ GEOMETRY HOOK (shape selection) ═══════════ */
function usePrismGeometry(shape) {
  return useMemo(() => {
    switch (shape) {
      case 'rounded-prism': {
        const triShape = new THREE.Shape();
        const r = 1;
        const bevelR = 0.15;
        const angles = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI / 3), Math.PI / 2 + (4 * Math.PI / 3)];
        const pts = angles.map(a => [Math.cos(a) * r, Math.sin(a) * r]);

        for (let i = 0; i < 3; i++) {
          const curr = pts[i];
          const next = pts[(i + 1) % 3];
          const prev = pts[(i + 2) % 3];

          const toNext = [next[0] - curr[0], next[1] - curr[1]];
          const toPrev = [prev[0] - curr[0], prev[1] - curr[1]];
          const lenNext = Math.sqrt(toNext[0] ** 2 + toNext[1] ** 2);
          const lenPrev = Math.sqrt(toPrev[0] ** 2 + toPrev[1] ** 2);

          const dnx = toNext[0] / lenNext, dny = toNext[1] / lenNext;
          const dpx = toPrev[0] / lenPrev, dpy = toPrev[1] / lenPrev;

          const pA = [curr[0] + dnx * bevelR * 2, curr[1] + dny * bevelR * 2];
          const pB = [curr[0] + dpx * bevelR * 2, curr[1] + dpy * bevelR * 2];

          if (i === 0) {
            triShape.moveTo(pB[0], pB[1]);
          } else {
            triShape.lineTo(pB[0], pB[1]);
          }
          triShape.quadraticCurveTo(curr[0], curr[1], pA[0], pA[1]);
        }
        triShape.closePath();

        const geo = new THREE.ExtrudeGeometry(triShape, {
          depth: 1.8,
          bevelEnabled: true,
          bevelThickness: 0.08,
          bevelSize: 0.08,
          bevelSegments: 4,
        });
        geo.center();
        geo.computeVertexNormals();
        return geo;
      }
      case 'pyramid':
        return new THREE.ConeGeometry(1, 2, 4);
      case 'crystal':
        return new THREE.OctahedronGeometry(1.2, 0);
      case 'sphere':
        return new THREE.SphereGeometry(1, 32, 32);
      case 'gem':
        return new THREE.DodecahedronGeometry(1, 0);
      case 'prism':
      default:
        return new THREE.CylinderGeometry(1, 1, 1.8, 3);
    }
  }, [shape]);
}

/* ═══════════ NEBULA BACKDROP ═══════════ */
function NebulaBackdrop({ texture }) {
  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[16, 16]} />
      <meshBasicMaterial map={texture} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

/* ═══════════ PRISM BODY (custom glass shader + edges) ═══════════ */
function PrismBody({ geometry }) {
  const groupRef = useRef();
  const glassMatRef = useRef();
  const edgeMatRef = useRef();

  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(geometry, 20), [geometry]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    groupRef.current.rotation.y += delta * cfg.rotationSpeed;
    groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.12;
    groupRef.current.rotation.y += mousePos.x * delta * cfg.rotationMouseInfluence;
    groupRef.current.rotation.x += mousePos.y * delta * (cfg.rotationMouseInfluence * 0.6);

    // Squash & stretch from bop
    const squashTs = window.__prismSquash;
    if (squashTs && Date.now() - squashTs < 600) {
      const progress = (Date.now() - squashTs) / 600;
      let sx, sy, sz;
      if (progress < 0.15) {
        const p = progress / 0.15;
        sx = 1 + 0.3 * p; sy = 1 - 0.3 * p; sz = 1 + 0.3 * p;
      } else if (progress < 0.35) {
        const p = (progress - 0.15) / 0.2;
        sx = 1.3 - 0.45 * p; sy = 0.7 + 0.55 * p; sz = 1.3 - 0.45 * p;
      } else {
        const p = (progress - 0.35) / 0.65;
        const spring = Math.sin(p * Math.PI * 3) * (1 - p) * 0.12;
        sx = 0.85 + 0.15 * p + spring; sy = 1.25 - 0.25 * p - spring; sz = 0.85 + 0.15 * p + spring;
      }
      groupRef.current.scale.set(sx, sy, sz);
    } else {
      const breath = 1 + Math.sin(t * cfg.breathingSpeed) * cfg.breathingAmp;
      groupRef.current.scale.setScalar(breath);
    }

    // Update glass shader time
    if (glassMatRef.current) glassMatRef.current.uniforms.uTime.value = t;
    // Update edge glow shader
    if (edgeMatRef.current) {
      edgeMatRef.current.uniforms.uTime.value = t;
      edgeMatRef.current.uniforms.uOpacity.value = cfg.edgeGlowOpacity;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Glass body - custom shader: iridescent, transparent, NO black */}
      <mesh geometry={geometry}>
        <shaderMaterial
          ref={glassMatRef}
          vertexShader={glassVert}
          fragmentShader={glassFrag}
          uniforms={{ uTime: { value: 0 } }}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Bright white edge glow on EdgesGeometry */}
      <lineSegments geometry={edgesGeo} renderOrder={2}>
        <shaderMaterial
          ref={edgeMatRef}
          vertexShader={edgeGlowVert}
          fragmentShader={edgeGlowFrag}
          uniforms={{
            uTime: { value: 0 },
            uOpacity: { value: cfg.edgeGlowOpacity },
          }}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

    </group>
  );
}

/* ═══════════ MOUSE DRIFT GROUP ═══════════ */
function MouseDriftGroup({ children }) {
  const groupRef = useRef();
  const driftTarget = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!groupRef.current) return;
    driftTarget.current.set(
      mousePos.x * cfg.driftStrength,
      mousePos.y * (cfg.driftStrength * 0.75),
      mouseVel.current * 0.3
    );
    groupRef.current.position.lerp(driftTarget.current, cfg.driftSpeed);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z, mousePos.x * -cfg.driftTiltX, 0.05
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, mousePos.y * cfg.driftTiltY, 0.04
    );
  });

  return <group ref={groupRef}>{children}</group>;
}

/* ═══════════ BIG GOOFY EYE (clearly visible through glass) ═══════════ */
function GlassOrbEye() {
  const groupRef = useRef();
  const orbRef = useRef();
  const eyeTexture = useMemo(() => createEyeTexture(), []);
  const expressionRef = useRef('normal');
  const expressionTimer = useRef(0);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const lerpFactor = cfg.eyeTrackSpeed + Math.min(mouseVel.current * 3, 0.15);

    let extraYOffset = 0;
    let irisScale = 1;
    const expr = expressionRef.current;

    if (expr === 'curious') irisScale = 1.15;
    else if (expr === 'surprised') irisScale = 0.8;
    else if (expr === 'happy') extraYOffset = 0.06;

    // Cycle expressions
    if (t - expressionTimer.current > 6) {
      expressionTimer.current = t;
      const states = ['normal', 'curious', 'normal', 'happy', 'normal', 'surprised'];
      expressionRef.current = states[Math.floor(Math.random() * states.length)];
      // Trigger squash on surprise
      if (expressionRef.current === 'surprised') window.__prismSquash = Date.now();
    }

    // Occasional curious look-around
    let lookOffsetX = 0, lookOffsetY = 0;
    const lookCycle = (t * 0.3) % 5;
    if (lookCycle > 3.5 && lookCycle < 4.5) {
      const lp = (lookCycle - 3.5) * 2;
      lookOffsetX = Math.sin(lp * Math.PI) * 0.2;
      lookOffsetY = Math.cos(lp * Math.PI * 0.7) * 0.12;
    }

    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, mousePos.y * cfg.eyeTrackRange + lookOffsetY + extraYOffset, lerpFactor
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, mousePos.x * cfg.eyeTrackRange + lookOffsetX, lerpFactor
    );
    if (orbRef.current) {
      const pulse = (1 + Math.sin(t * 2) * 0.05) * irisScale;
      orbRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.05, 0.3]}>
      {/* Eye texture sprite - faces camera, googly style */}
      <sprite ref={orbRef} scale={[0.9, 0.76, 1]} position={[0, 0, 0.56]}>
        <spriteMaterial map={eyeTexture} transparent depthWrite={false} />
      </sprite>
      <Eyelid />
    </group>
  );
}

/* ═══════════ EYELID (big dramatic blinks) ═══════════ */
function Eyelid() {
  const meshRef = useRef();
  const blinkState = useRef({ nextBlink: 2, phase: 0, doubleBlink: false });

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const bs = blinkState.current;

    bs.nextBlink -= delta;
    if (bs.nextBlink <= 0) {
      bs.phase = 1;
      bs.doubleBlink = Math.random() < 0.25;
      const mouseProximity = Math.sqrt(mousePos.x * mousePos.x + mousePos.y * mousePos.y);
      bs.nextBlink = 2.5 + Math.random() * 3 - mouseProximity * 2;
      if (bs.nextBlink < 1.2) bs.nextBlink = 1.2;
    }

    if (bs.phase > 0) {
      bs.phase += delta * 7;
      let scaleY;
      if (bs.phase < 1.5) {
        scaleY = Math.min(1, (bs.phase - 1) * 2);
      } else if (bs.phase < 2.5) {
        scaleY = Math.max(0, 1 - (bs.phase - 1.5) * 2);
      } else if (bs.doubleBlink && bs.phase < 3.5) {
        scaleY = Math.min(1, (bs.phase - 2.5) * 2);
      } else if (bs.doubleBlink && bs.phase < 4.5) {
        scaleY = Math.max(0, 1 - (bs.phase - 3.5) * 2);
      } else {
        scaleY = 0;
        bs.phase = 0;
      }
      meshRef.current.scale.y = scaleY;
    } else {
      meshRef.current.scale.y = 0;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0.16, 0.4]}>
      <planeGeometry args={[0.7, 0.4]} />
      <meshBasicMaterial
        color="#0a0a2e"
        transparent
        opacity={0.92}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ═══════════ CONVERGING WHITE BEAM (Pink Floyd style) ═══════════ */
function IncomingBeam() {
  const matRef = useRef();
  const meshRef = useRef();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(7, 1);
    g.translate(-3.5, 0, 0); // extends from x=-7 to x=0
    return g;
  }, []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uOpacity.value = cfg.beamOpacity;
    if (meshRef.current) {
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        0.05 + mousePos.y * cfg.beamTrackAmount,
        0.05
      );
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0.04]} rotation={[0, 0, 0.05]} geometry={geo}>
      <shaderMaterial
        ref={matRef}
        vertexShader={simpleVert}
        fragmentShader={beamFrag}
        uniforms={{
          uTime: { value: 0 },
          uOpacity: { value: cfg.beamOpacity },
        }}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ═══════════ RAINBOW FAN (spreads from prism - light splitting!) ═══════════ */
const RAINBOW_BANDS = [
  { color: new THREE.Color('#ff1a1a'), angle: -0.35 },
  { color: new THREE.Color('#ff7700'), angle: -0.23 },
  { color: new THREE.Color('#ffdd00'), angle: -0.12 },
  { color: new THREE.Color('#22dd44'), angle: 0.00 },
  { color: new THREE.Color('#2288ff'), angle: 0.12 },
  { color: new THREE.Color('#5533ff'), angle: 0.23 },
  { color: new THREE.Color('#aa22ff'), angle: 0.35 },
];

function RainbowFan() {
  const raysRef = useRef([]);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(7, 0.5);
    g.translate(3.5, 0, 0); // extends from x=0 to x=7
    return g;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mouseSpread = mousePos.x * cfg.rayBendAmount;
    const mouseVertical = mousePos.y * cfg.rayVerticalBend;
    raysRef.current.forEach((mesh, i) => {
      if (!mesh?.material?.uniforms) return;
      const wave = Math.sin(t * 0.8 + i * 0.9) * 0.01;
      mesh.rotation.z = RAINBOW_BANDS[i].angle + wave + mouseSpread;
      mesh.rotation.x = mouseVertical;
      mesh.material.uniforms.uOpacity.value = cfg.rayOpacity + Math.sin(t * 1.8 + i * 1.3) * 0.15;
      mesh.material.uniforms.uTime.value = t;
    });
  });

  return (
    <group position={[0, 0, 0.04]}>
      {RAINBOW_BANDS.map((band, i) => (
        <mesh
          key={i}
          ref={el => (raysRef.current[i] = el)}
          rotation={[0, 0, band.angle]}
          geometry={geo}
        >
          <shaderMaterial
            vertexShader={simpleVert}
            fragmentShader={rayFrag}
            uniforms={{
              uColor: { value: band.color },
              uOpacity: { value: cfg.rayOpacity },
              uTime: { value: 0 },
            }}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════ VERTEX STAR-BURSTS ═══════════ */
function VertexHighlights() {
  const starTex = useMemo(() => createStarTexture(), []);
  const spritesRef = useRef([]);

  const vertices = useMemo(() => {
    const r = 1, h = 0.9;
    const s = Math.sin((2 * Math.PI) / 3) * r;
    const c2 = Math.cos((2 * Math.PI) / 3) * r;
    return [
      [r, h, 0], [c2, h, s], [c2, h, -s],
      [r, -h, 0], [c2, -h, s], [c2, -h, -s],
    ];
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    spritesRef.current.forEach((sprite, i) => {
      if (!sprite) return;
      const pulse = cfg.vertexHighlightScale + Math.sin(t * 3.5 + i * 1.1) * cfg.vertexHighlightPulse;
      sprite.scale.set(pulse, pulse, 1);
    });
  });

  return (
    <>
      {vertices.map((pos, i) => (
        <sprite
          key={i}
          ref={el => (spritesRef.current[i] = el)}
          position={pos}
          scale={[0.35, 0.35, 1]}
        >
          <spriteMaterial
            map={starTex}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </>
  );
}

/* ═══════════ INTERNAL COLOR-CYCLING GLOW ═══════════ */
function InternalGlow() {
  const lightRef = useRef();

  useFrame((state) => {
    if (!lightRef.current) return;
    const hue = (state.clock.elapsedTime * 0.08) % 1;
    lightRef.current.color.setHSL(hue, 0.8, 0.6);
    lightRef.current.intensity = cfg.internalGlowIntensity + mouseVel.current * 5;
    lightRef.current.distance = cfg.internalGlowDistance;
  });

  return <pointLight ref={lightRef} position={[0, 0, 0]} intensity={cfg.internalGlowIntensity} distance={cfg.internalGlowDistance} />;
}

/* ═══════════ SCENE LIGHTS ═══════════ */
function SceneLights() {
  const ambRef = useRef();
  const keyRef = useRef();
  const fillRef = useRef();

  useFrame(() => {
    if (ambRef.current) ambRef.current.intensity = cfg.ambientIntensity;
    if (keyRef.current) keyRef.current.intensity = cfg.keyLightIntensity;
    if (fillRef.current) fillRef.current.intensity = cfg.fillLightIntensity;
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={cfg.ambientIntensity} />
      <pointLight ref={keyRef} position={[-4, 3, 3]} color="#ffffff" intensity={cfg.keyLightIntensity} />
      <pointLight ref={fillRef} position={[3, -1, 4]} color="#9333ea" intensity={cfg.fillLightIntensity} />
    </>
  );
}

/* ═══════════ LIGHT SPILL ═══════════ */
function LightSpill() {
  const lightRef = useRef();

  useFrame((state) => {
    if (!lightRef.current) return;
    const t = state.clock.elapsedTime;
    lightRef.current.position.set(
      Math.sin(t * 0.7) * 2 + mousePos.x * 1.5,
      Math.cos(t * 0.5) * 2 + mousePos.y * 1.5,
      2
    );
    lightRef.current.intensity = (1.5 + mouseVel.current * 5) * cfg.lightSpillIntensity;
    const hue = (t * 0.05) % 1;
    lightRef.current.color.setHSL(hue, 0.7, 0.6);
  });

  return <pointLight ref={lightRef} color="#a855f7" distance={6} />;
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function Prism3D() {
  const nebulaTex = useMemo(() => createNebulaTexture(), []);
  const prevMouseRef = useRef(new THREE.Vector2(0, 0));

  const [shape, setShape] = useState(cfg.shape || 'rounded-prism');
  const geometry = usePrismGeometry(shape);

  useEffect(() => {
    const handler = () => setShape(cfg.shape || 'rounded-prism');
    window.addEventListener('prism-shape-change', handler);
    const interval = setInterval(() => {
      if (cfg.shape !== shape) setShape(cfg.shape || 'rounded-prism');
    }, 500);
    return () => {
      window.removeEventListener('prism-shape-change', handler);
      clearInterval(interval);
    };
  }, [shape]);

  useEffect(() => {
    const handler = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      const dx = nx - prevMouseRef.current.x;
      const dy = ny - prevMouseRef.current.y;
      mouseVel.current = Math.sqrt(dx * dx + dy * dy);
      mousePos.x = nx;
      mousePos.y = ny;
      prevMouseRef.current.set(nx, ny);
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const size = cfg.canvasSize;
  const fi = cfg.featherInner;
  const fo = cfg.featherOuter;

  return (
    <div
      className="prism-3d-canvas-wrapper"
      style={{
        width: size,
        height: size,
        pointerEvents: 'none',
        WebkitMaskImage: `radial-gradient(ellipse at center, black ${fi}%, transparent ${fo}%)`,
        maskImage: `radial-gradient(ellipse at center, black ${fi}%, transparent ${fo}%)`,
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: 'default', premultipliedAlpha: false }}
        dpr={Math.min(1.5, typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1)}
        camera={{ position: [0, 0, 6], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <SceneLights />
        <LightSpill />
        <NebulaBackdrop texture={nebulaTex} />

        <MouseDriftGroup>
          <Float speed={cfg.floatSpeed} rotationIntensity={cfg.rotationIntensity} floatIntensity={cfg.floatIntensity}>
            <PrismBody geometry={geometry} />
            <GlassOrbEye />
            <InternalGlow />
            <VertexHighlights />
            <IncomingBeam />
            <RainbowFan />

            <Sparkles
              count={cfg.sparkleCount}
              scale={[4, 4, 4]}
              size={cfg.sparkleSize}
              speed={cfg.sparkleSpeed}
              opacity={cfg.sparkleOpacity}
              color="#c4b5fd"
              noise={2}
            />
          </Float>
        </MouseDriftGroup>
      </Canvas>
    </div>
  );
}
