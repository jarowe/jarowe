// Shared Prism Geometry + Glass Shader Factories
// Used by both Prism3D (peek character) and Globe Glint (globe prism)
import * as THREE from 'three';

/* ═══════════ GEOMETRY FACTORY ═══════════ */

/**
 * Creates a prism BufferGeometry for the given shape string.
 * Pure function — no React hooks.
 */
export function createPrismGeometry(shape) {
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
    case 'rounded-pyramid': {
      const pyShape = new THREE.Shape();
      const pyR = 0.9;
      const pyBevel = 0.18;
      const pyPts = [[-pyR, -pyR], [pyR, -pyR], [pyR, pyR], [-pyR, pyR]];
      for (let i = 0; i < 4; i++) {
        const curr = pyPts[i];
        const next = pyPts[(i + 1) % 4];
        const prev = pyPts[(i + 3) % 4];
        const toN = [next[0] - curr[0], next[1] - curr[1]];
        const toP = [prev[0] - curr[0], prev[1] - curr[1]];
        const lN = Math.sqrt(toN[0] ** 2 + toN[1] ** 2);
        const lP = Math.sqrt(toP[0] ** 2 + toP[1] ** 2);
        const pA = [curr[0] + (toN[0] / lN) * pyBevel * 2, curr[1] + (toN[1] / lN) * pyBevel * 2];
        const pB = [curr[0] + (toP[0] / lP) * pyBevel * 2, curr[1] + (toP[1] / lP) * pyBevel * 2];
        if (i === 0) pyShape.moveTo(pB[0], pB[1]);
        else pyShape.lineTo(pB[0], pB[1]);
        pyShape.quadraticCurveTo(curr[0], curr[1], pA[0], pA[1]);
      }
      pyShape.closePath();
      const pyGeo = new THREE.ExtrudeGeometry(pyShape, {
        depth: 2.0, bevelEnabled: true, bevelThickness: 0.1,
        bevelSize: 0.1, bevelSegments: 4,
      });
      pyGeo.center();
      const pyPos = pyGeo.attributes.position;
      for (let i = 0; i < pyPos.count; i++) {
        const z = pyPos.getZ(i);
        if (z > 0) {
          const taper = 1 - (z / 1.2);
          const t = Math.max(0.05, taper);
          pyPos.setX(i, pyPos.getX(i) * t);
          pyPos.setY(i, pyPos.getY(i) * t);
        }
      }
      pyPos.needsUpdate = true;
      pyGeo.computeVertexNormals();
      return pyGeo;
    }
    case 'pyramid': {
      const geo = new THREE.ConeGeometry(1, 2, 4, 1);
      geo.computeVertexNormals();
      return geo;
    }
    case 'crystal': {
      const geo = new THREE.OctahedronGeometry(1.2, 2);
      geo.computeVertexNormals();
      return geo;
    }
    case 'sphere':
      return new THREE.SphereGeometry(1, 32, 32);
    case 'gem': {
      const geo = new THREE.DodecahedronGeometry(1, 1);
      geo.computeVertexNormals();
      return geo;
    }
    case 'prism':
    default: {
      const geo = new THREE.CylinderGeometry(1, 1, 1.8, 3, 1);
      geo.computeVertexNormals();
      return geo;
    }
  }
}

/* ═══════════ GLASS SHADERS ═══════════ */

export const glassVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const glassFragmentShader = `
  uniform float uTime;
  uniform float uIsSide;
  uniform float uIOR;
  uniform float uCausticIntensity;
  uniform float uIridescenceIntensity;
  uniform float uChromaticSpread;
  uniform float uGlassAlpha;
  uniform float uStreakIntensity;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    float NdotV = abs(dot(N, V));
    float t = uTime * 0.15;

    // ── CHROMATIC ABERRATION: each color channel refracts differently ──
    float cspr = uChromaticSpread;
    float fresnelR = pow(1.0 - NdotV, 2.8 - 0.8 * cspr);
    float fresnelG = pow(1.0 - NdotV, 2.8);
    float fresnelB = pow(1.0 - NdotV, 2.8 + 0.8 * cspr);
    float fresnel = pow(1.0 - NdotV, 2.8);

    // ── REFRACTED SAMPLING POSITION ──
    vec3 refracted = refract(-V, N, uIOR);
    vec3 samplePos = vWorldPos + refracted * 1.5;

    // ── INTERNAL CAUSTIC PATTERNS (bright rainbow light swimming inside) ──
    float c1 = vnoise(samplePos.xy * 3.0 + t * 0.6);
    float c2 = vnoise(samplePos.yz * 4.0 - t * 0.8 + 5.0);
    float c3 = vnoise(samplePos.xz * 2.5 + t * 0.4 + 10.0);
    float causticBright = pow(abs(sin(c1 * 8.0 + c2 * 5.0)), 3.0) * 0.6 * uCausticIntensity;
    float causticBright2 = pow(abs(sin(c2 * 6.0 + c3 * 4.0 + 2.0)), 3.0) * 0.4 * uCausticIntensity;

    // ── LIGHT STREAKS (vertical caustics through crystal) ──
    float streaks = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float sx = sin(samplePos.x * (6.0 + fi * 3.0) + t * (1.0 + fi * 0.4) + fi * 1.7);
      streaks += pow(max(0.0, sx * 0.5 + 0.5), 14.0) * 0.2 * uStreakIntensity;
    }

    // ── DOUBLE THIN-FILM IRIDESCENCE ──
    float angle = acos(clamp(NdotV, 0.0, 1.0));
    float iri1 = angle * 4.0 + t * 2.0;
    float iri2 = angle * 6.5 - t * 1.2;
    vec3 iridescence = vec3(
      0.5 + 0.5 * sin(iri1 * 4.0),
      0.5 + 0.5 * sin(iri1 * 4.0 + 2.094),
      0.5 + 0.5 * sin(iri1 * 4.0 + 4.189)
    );
    vec3 iri2Color = vec3(
      0.5 + 0.5 * sin(iri2 * 3.0 + 1.0),
      0.5 + 0.5 * sin(iri2 * 3.0 + 3.094),
      0.5 + 0.5 * sin(iri2 * 3.0 + 5.189)
    );
    iridescence = mix(iridescence, iri2Color, 0.4);

    // ── CAUSTIC RAINBOW COLORS (light patterns refracted inside) ──
    vec3 causticColor = vec3(
      0.3 + 0.7 * sin(c1 * 8.0 + t * 0.5),
      0.3 + 0.7 * sin(c1 * 8.0 + t * 0.5 + 2.094),
      0.3 + 0.7 * sin(c1 * 8.0 + t * 0.5 + 4.189)
    ) * causticBright;

    vec3 causticColor2 = vec3(
      0.3 + 0.7 * sin(c2 * 6.0 + t * 0.3 + 1.0),
      0.3 + 0.7 * sin(c2 * 6.0 + t * 0.3 + 3.094),
      0.3 + 0.7 * sin(c2 * 6.0 + t * 0.3 + 5.189)
    ) * causticBright2;

    // ── SPECULAR HIGHLIGHTS (very sharp, glass-like) ──
    vec3 L1 = normalize(vec3(-1.0, 0.7, 0.8));
    vec3 L2 = normalize(vec3(1.0, 0.3, 0.5));
    vec3 L3 = normalize(vec3(0.0, -0.8, 0.6));
    vec3 L4 = normalize(vec3(sin(t * 0.5) * 0.7, 0.5, 0.7));
    float spec1 = pow(max(dot(reflect(-L1, N), V), 0.0), 200.0);
    float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 120.0);
    float spec3 = pow(max(dot(reflect(-L3, N), V), 0.0), 80.0);
    float spec4 = pow(max(dot(reflect(-L4, N), V), 0.0), 150.0);
    float specTotal = spec1 + spec2 * 0.7 + spec3 * 0.5 + spec4 * 0.5;

    // ── COMPOSITE ──
    vec3 interior = vec3(0.08, 0.05, 0.18);
    interior += causticColor + causticColor2;
    interior += vec3(0.6, 0.5, 1.0) * streaks;

    vec3 color = mix(interior, iridescence * 1.5, fresnel * 0.6 * uIridescenceIntensity);

    color.r += fresnelR * 0.35 * cspr;
    color.b += fresnelB * 0.3 * cspr;

    color += vec3(1.0, 0.98, 0.95) * specTotal * 1.3;

    color += vec3(0.8, 0.7, 1.0) * pow(fresnel, 2.5) * 0.9;

    // ── ALPHA ──
    float baseAlpha = uIsSide > 0.5 ? uGlassAlpha * 1.59 : uGlassAlpha;
    float alpha = baseAlpha + fresnel * 0.6 + specTotal * 0.2 + (causticBright + causticBright2) * 0.15;
    alpha = min(alpha, 0.92);

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ═══════════ GLASS MATERIAL FACTORY ═══════════ */

/**
 * Creates a THREE.ShaderMaterial with the glass shaders + default uniforms.
 * @param {{ side: THREE.Side, isSide: number }} opts
 * @returns {THREE.ShaderMaterial}
 */
export function createGlassMaterial({ side, isSide }) {
  const cfg = window.__prismConfig || {};
  return new THREE.ShaderMaterial({
    vertexShader: glassVertexShader,
    fragmentShader: glassFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uIsSide: { value: isSide },
      uIOR: { value: cfg.glassIOR ?? 0.67 },
      uCausticIntensity: { value: cfg.causticIntensity ?? 1.0 },
      uIridescenceIntensity: { value: cfg.iridescenceIntensity ?? 1.0 },
      uChromaticSpread: { value: cfg.chromaticSpread ?? 1.0 },
      uGlassAlpha: { value: cfg.glassAlpha ?? 0.22 },
      uStreakIntensity: { value: cfg.streakIntensity ?? 1.0 },
    },
    transparent: true,
    side,
    depthWrite: false,
  });
}
