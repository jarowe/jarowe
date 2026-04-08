/**
 * FBOInstancedParticles — GPU-driven high-quality particle renderer
 *
 * Renders 300K+ particles as <points> with a custom ShaderMaterial that reads
 * positions from an FBO DataTexture in the vertex shader. Colors come from a
 * separate static DataTexture (from mesh surface sampling).
 *
 * Ported from Amina's InstancedParticles.tsx, but fundamentally redesigned:
 * - Uses Points instead of InstancedMesh (no per-frame matrix uploads at 300K)
 * - GPU reads FBO position texture via texture2D(tPosition, aReference)
 * - Fragment shader renders volumetric-looking soft spheres with fake lighting
 *   (normal-from-UV technique on point sprites)
 * - Depth of field: points further from focus plane get larger but more
 *   transparent, simulating circle of confusion
 *
 * @param {Object} props
 * @param {THREE.DataTexture} props.positionTexture - FBO simulation output (RGBA Float)
 * @param {THREE.DataTexture} props.colorTexture - per-particle color (RGBA or RGB Float)
 * @param {number} props.particleCount - total particles
 * @param {number} [props.pointScale=1.0] - global point size multiplier
 * @param {number} [props.focusDistance=5.0] - camera distance at which particles are sharpest
 * @param {number} [props.dofStrength=0.0] - depth-of-field blur intensity (0 = off)
 * @param {number} [props.opacity=1.0] - global opacity multiplier
 * @param {boolean} [props.additiveBlending=true] - true for glow, false for solid voxel look
 */

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── Shaders ────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
uniform sampler2D tPosition;
uniform sampler2D tColor;
uniform float uTime;
uniform float uPointScale;
uniform float uFocusDistance;
uniform float uDofStrength;
uniform float uOpacity;
uniform float uPixelRatio;
uniform vec3 uMousePos;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uDepthWave;

attribute vec2 aReference;   // UV into FBO textures (per-vertex)

varying vec3 vColor;
varying float vAlpha;
varying float vViewDist;

void main() {
  // ── Read position from FBO ──
  vec4 posData = texture2D(tPosition, aReference);
  vec3 pos = posData.xyz;

  // Life / activation can be packed in posData.w (1.0 = alive, 0.0 = dead)
  float life = posData.w;

  // ── Read color from static texture ──
  vec4 colData = texture2D(tColor, aReference);
  vColor = colData.rgb;

  // Brush-through interaction: nearby particles peel away from the pointer.
  if (uMouseStrength > 0.001) {
    vec3 awayFromMouse = pos - uMousePos;
    float mouseDist = length(awayFromMouse);
    if (mouseDist > 0.0001 && mouseDist < uMouseRadius) {
      float mouseInfluence = 1.0 - mouseDist / uMouseRadius;
      mouseInfluence *= mouseInfluence;
      pos += normalize(awayFromMouse) * mouseInfluence * uMouseStrength;
    }
  }

  // Roll a soft depth wave through the field so the volume feels like it breathes.
  float depthWave = sin(uTime * 0.45 + pos.y * 1.35 + aReference.x * 8.0) * uDepthWave;
  pos.z += depthWave;

  // ── Model-view transform ──
  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  float dist = -mvPos.z; // distance from camera (positive)

  // ── Point size with perspective correction ──
  // Base size modulated by life (dead particles shrink to 0)
  float baseSize = uPointScale * life;

  // Depth of field: particles away from focus plane grow (blur circle)
  float focusDelta = abs(dist - uFocusDistance);
  float dofScale = 1.0 + focusDelta * uDofStrength * 0.05;

  // Perspective correction: size decreases with distance
  float perspSize = baseSize * dofScale * (300.0 / max(dist, 0.1));

  // Subtle breathing based on time + per-particle offset from aReference
  float breathPhase = uTime * 0.6 + aReference.x * 6.2831 + aReference.y * 3.1415;
  float breathScale = 1.0 + sin(breathPhase) * 0.08;

  gl_PointSize = clamp(perspSize * breathScale * uPixelRatio, 0.5, 20.0);

  // ── Alpha ──
  // DOF: distant-from-focus particles become more transparent
  float dofAlpha = 1.0 / (1.0 + focusDelta * uDofStrength * 0.15);
  vAlpha = uOpacity * life * dofAlpha;

  vViewDist = dist;

  gl_Position = projectionMatrix * mvPos;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vViewDist;

void main() {
  // ── Point sprite UV → fake sphere normal ──
  vec2 uv = gl_PointCoord * 2.0 - 1.0; // [-1, 1]
  float r2 = dot(uv, uv);

  // Discard outside circle
  if (r2 > 1.0) discard;

  // Fake sphere normal from UV (hemisphere)
  float z = sqrt(1.0 - r2);
  vec3 normal = vec3(uv, z);

  // ── Lighting (simple top-right key + ambient) ──
  vec3 lightDir = normalize(vec3(0.4, 0.7, 0.9));
  float NdotL = max(dot(normal, lightDir), 0.0);

  // Ambient + diffuse + rim
  float ambient = 0.25;
  float diffuse = NdotL * 0.55;

  // Rim / subsurface scatter glow — brighter at edges
  float rim = pow(1.0 - z, 2.5) * 0.6;

  // Specular highlight for gloss
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.4;

  // Combine
  float lighting = ambient + diffuse + rim;
  vec3 color = vColor * lighting + vec3(spec);

  // Soft edge antialiasing
  float edgeSoftness = smoothstep(1.0, 0.85, sqrt(r2));

  float alpha = vAlpha * edgeSoftness;
  if (alpha < 0.005) discard;

  gl_FragColor = vec4(color, alpha);
}
`;

// ── Component ─────────────────────────────────────────────────────

export default function FBOInstancedParticles({
  positionTexture,
  colorTexture,
  particleCount,
  pointScale = 1.0,
  focusDistance = 5.0,
  dofStrength = 0.0,
  opacity = 1.0,
  additiveBlending = true,
  mousePosition = null,
  mouseRadius = 0.0,
  mouseStrength = 0.0,
  depthWave = 0.0,
}) {
  const pointsRef = useRef();
  const { viewport } = useThree();

  // Build geometry with aReference UVs that index into the FBO textures
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Determine FBO texture dimensions from positionTexture
    // If texture isn't available yet, estimate a square layout
    const texWidth = positionTexture?.image?.width || Math.ceil(Math.sqrt(particleCount));
    const texHeight = positionTexture?.image?.height || Math.ceil(particleCount / texWidth);

    // aReference: vec2 UV coordinates mapping each vertex to a pixel in the FBO
    const references = new Float32Array(particleCount * 2);
    for (let i = 0; i < particleCount; i++) {
      const x = i % texWidth;
      const y = Math.floor(i / texWidth);
      // Center of pixel in UV space
      references[i * 2]     = (x + 0.5) / texWidth;
      references[i * 2 + 1] = (y + 0.5) / texHeight;
    }

    geo.setAttribute('aReference', new THREE.BufferAttribute(references, 2));

    // Dummy position attribute (required by Three.js for points, but ignored by shader)
    const dummy = new Float32Array(particleCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(dummy, 3));

    return geo;
  }, [particleCount, positionTexture]);

  // Shader material with FBO texture uniforms
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        tPosition: { value: null },
        tColor: { value: null },
        uTime: { value: 0 },
        uPointScale: { value: pointScale },
        uFocusDistance: { value: focusDistance },
        uDofStrength: { value: dofStrength },
        uOpacity: { value: opacity },
        uPixelRatio: { value: viewport.dpr || 1 },
        uMousePos: { value: new THREE.Vector3(0, 999, 0) },
        uMouseRadius: { value: mouseRadius },
        uMouseStrength: { value: mouseStrength },
        uDepthWave: { value: depthWave },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: additiveBlending ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
  }, [additiveBlending]); // Only recreate if blending mode changes

  // Update uniforms each frame (avoids material recreation on prop changes)
  useFrame(({ clock }) => {
    const mat = material;
    mat.uniforms.tPosition.value = positionTexture;
    mat.uniforms.tColor.value = colorTexture;
    mat.uniforms.uTime.value = clock.getElapsedTime();
    mat.uniforms.uPointScale.value = pointScale;
    mat.uniforms.uFocusDistance.value = focusDistance;
    mat.uniforms.uDofStrength.value = dofStrength;
    mat.uniforms.uOpacity.value = opacity;
    mat.uniforms.uPixelRatio.value = viewport.dpr || 1;
    mat.uniforms.uMouseRadius.value = mouseRadius;
    mat.uniforms.uMouseStrength.value = mouseStrength;
    mat.uniforms.uDepthWave.value = depthWave;
    const mouseUniform = mat.uniforms.uMousePos.value;
    if (mousePosition) {
      mouseUniform.copy(mousePosition);
    } else {
      mouseUniform.set(0, 999, 0);
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}
