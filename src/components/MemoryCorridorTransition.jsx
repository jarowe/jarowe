import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { AdditiveBlending, CatmullRomCurve3, Color, TextureLoader, Vector3 } from 'three';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

const BASE = import.meta.env.BASE_URL;

function resolveAsset(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE}${path.replace(/^\//, '')}`;
}

function colorToArray(hex) {
  const color = new Color(hex);
  return [color.r, color.g, color.b];
}

function getScenePalette(scene, role = 'current') {
  const mood = scene?.mood || 'warm';
  if (mood === 'cool') {
    return role === 'current'
      ? ['#66b9ff', '#c7ecff', '#ffffff']
      : ['#9c7bff', '#e6d3ff', '#fff5fd'];
  }
  if (mood === 'golden') {
    return role === 'current'
      ? ['#ffde99', '#fff2cb', '#fff8ee']
      : ['#8bc7ff', '#d5eeff', '#ffffff'];
  }
  return role === 'current'
    ? ['#ffcf8a', '#ffe6bf', '#fff8ef']
    : ['#81c9ff', '#d4efff', '#ffffff'];
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
    const end = Math.min(to, targetArray.length);
    for (let index = from; index < end; index += 1) sum += targetArray[index];
    return end > from ? sum / (end - from) / 255 : 0;
  });

  return {
    low: values[0],
    mid: values[1],
    high: values[2],
    energy: (values[0] + values[1] + values[2]) / 3,
  };
}

function createParticleAttributes(currentScene, nextScene, direction = 'next', options = {}) {
  const count = options.count ?? 5200;
  const profile = options.profile ?? 'core';
  const startPalette = getScenePalette(currentScene, 'current');
  const endPalette = getScenePalette(nextScene, 'next');
  const startColors = startPalette.map(colorToArray);
  const endColors = endPalette.map(colorToArray);

  const start = new Float32Array(count * 3);
  const end = new Float32Array(count * 3);
  const colorA = new Float32Array(count * 3);
  const colorB = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  const scale = new Float32Array(count);

  const directionSign = direction === 'previous' ? -1 : 1;
  const isMist = profile === 'mist';

  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    const band = i % 3;
    const radius = isMist
      ? 0.9 + Math.pow(Math.random(), 0.42) * 7.8
      : 0.45 + Math.pow(Math.random(), 0.32) * 5.6;
    const theta = Math.random() * Math.PI * 2;
    const heightBias = (Math.random() - 0.5) * (isMist ? 8.2 : 4.8);
    const driftBias = band === 0 ? -1.35 : band === 1 ? 0 : 1.35;
    const startZ = (isMist ? 6.8 : 4.8) + Math.random() * (isMist ? 3.8 : 2.4);
    const endZ = -(isMist ? 14.8 : 11.5) - Math.random() * (isMist ? 8.4 : 5.2);

    start[i * 3] = Math.cos(theta) * radius * (isMist ? 1.36 : 1.12) + driftBias * (isMist ? 0.22 : 0.28);
    start[i * 3 + 1] = Math.sin(theta * 1.7) * radius * (isMist ? 0.62 : 0.48) + heightBias;
    start[i * 3 + 2] = startZ * directionSign;

    end[i * 3] = (Math.cos(theta * 0.55 + 0.75) * radius * (isMist ? 0.34 : 0.26) + driftBias * 0.06) * directionSign;
    end[i * 3 + 1] = Math.sin(theta * 0.35 + 1.4) * radius * (isMist ? 0.28 : 0.2) + heightBias * (isMist ? 0.28 : 0.22);
    end[i * 3 + 2] = endZ * directionSign;

    const startColor = startColors[Math.floor(Math.random() * startColors.length)];
    const endColor = endColors[Math.floor(((t * endColors.length) + band) % endColors.length)];
    colorA.set(startColor, i * 3);
    colorB.set(endColor, i * 3);
    phase[i] = Math.random() * Math.PI * 2;
    speed[i] = (isMist ? 0.28 : 0.45) + Math.random() * (isMist ? 0.55 : 0.75);
    scale[i] = isMist
      ? 0.24 + Math.random() * 0.78
      : 0.68 + Math.random() * 1.18;
  }

  return { count, start, end, colorA, colorB, phase, speed, scale };
}

const PARTICLE_VERT = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uAudioLow;
uniform float uAudioMid;
uniform float uAudioHigh;
uniform float uFlowScale;
uniform float uSizeBase;
uniform float uSizeMax;
uniform float uAlphaScale;
attribute vec3 aStart;
attribute vec3 aEnd;
attribute vec3 aColorA;
attribute vec3 aColorB;
attribute float aPhase;
attribute float aSpeed;
attribute float aScale;
varying vec3 vColor;
varying float vAlpha;

float easeOutCubic(float t) {
  float x = clamp(t, 0.0, 1.0);
  return 1.0 - pow(1.0 - x, 3.0);
}

void main() {
  float p = easeOutCubic(uProgress);
  vec3 pos = mix(aStart, aEnd, p);

  float swirl = uTime * (0.45 + aSpeed) + aPhase;
  float musicWave = sin(pos.z * 0.95 + uTime * (0.8 + aSpeed * 0.35) + aPhase) * (0.18 + uAudioMid * 0.42);
  float corridorPull = sin(swirl + pos.z * 0.55) * (1.0 - p) * (1.05 + uAudioLow * 1.1);
  pos.x += (cos(swirl * 1.3) * 0.22 + corridorPull * 0.22 + musicWave * 0.3) * uFlowScale;
  pos.y += (sin(swirl * 0.8) * 0.16 + cos(swirl * 0.6 + pos.z) * 0.12 + musicWave * 0.12) * uFlowScale;
  pos.z += sin(swirl * 0.5) * 0.14 + uAudioLow * 0.36;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  float depth = max(-mvPos.z, 0.01);
  float size = (aScale * (uSizeBase + uAudioHigh * 18.0)) / depth;
  gl_PointSize = clamp(size, 0.7, uSizeMax);
  gl_Position = projectionMatrix * mvPos;

  vColor = mix(aColorA, aColorB, smoothstep(0.15, 0.92, p));
  float travelFade = smoothstep(0.0, 0.1, p) * (1.0 - smoothstep(0.96, 1.0, p));
  float energy = max(uAudioLow, max(uAudioMid, uAudioHigh));
  vAlpha = (0.24 + aScale * 0.12 + energy * 0.18) * max(0.26, travelFade) * uAlphaScale;
}
`;

const PARTICLE_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float core = 1.0 - smoothstep(0.08, 0.34, d);
  float halo = 1.0 - smoothstep(0.18, 0.68, d);
  float alpha = (core * 0.92 + halo * 0.28) * vAlpha;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor, alpha);
}
`;

function CorridorCamera({ progress, direction = 'next', variant = 'thread' }) {
  const { camera } = useThree();
  const sign = direction === 'previous' ? -1 : 1;
  const audioDataRef = useRef(new Uint8Array(128));
  const isCluster = variant === 'cluster';

  useFrame(({ clock }) => {
    const eased = 1 - ((1 - progress) * (1 - progress));
    const audioBands = sampleGlobalAudioBands(audioDataRef.current);
    const time = clock.getElapsedTime();
    camera.position.x = Math.sin(eased * Math.PI * 1.56 + time * 0.18)
      * ((isCluster ? 0.24 : 0.36) + audioBands.mid * (isCluster ? 0.22 : 0.34))
      * sign;
    camera.position.y = 0.02 + Math.sin(eased * Math.PI * 1.95 + time * 0.12)
      * ((isCluster ? 0.1 : 0.16) + audioBands.low * (isCluster ? 0.08 : 0.14));
    camera.position.z = isCluster ? 7.4 - eased * 5.1 : 8.6 - eased * 7.5;
    camera.lookAt(
      Math.sin(eased * Math.PI * 0.8 + time * 0.08) * (isCluster ? 0.18 : 0.28) * sign,
      Math.sin(eased * Math.PI + time * 0.11) * (isCluster ? 0.07 : 0.12),
      (isCluster ? -6.8 : -11.2) * sign,
    );
    camera.rotation.z = Math.sin(time * 0.2 + eased * 2.2) * (isCluster ? 0.01 : 0.018) * sign;
  });

  return null;
}

function CorridorParticles({ currentScene, nextScene, progress, direction, profile = 'core' }) {
  const particlesRef = useRef(null);
  const materialRef = useRef(null);
  const audioDataRef = useRef(new Uint8Array(128));
  const settings = useMemo(() => (
    profile === 'mist'
      ? {
          count: 12400,
          flowScale: 1.36,
          sizeBase: 18,
          sizeMax: 6.5,
          alphaScale: 0.42,
        }
      : {
          count: 7600,
          flowScale: 1,
          sizeBase: 28,
          sizeMax: 12,
          alphaScale: 0.78,
        }
  ), [profile]);
  const data = useMemo(
    () => createParticleAttributes(currentScene, nextScene, direction, settings),
    [currentScene, nextScene, direction, settings],
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.start, 3));
    geo.setAttribute('aStart', new THREE.BufferAttribute(data.start, 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(data.end, 3));
    geo.setAttribute('aColorA', new THREE.BufferAttribute(data.colorA, 3));
    geo.setAttribute('aColorB', new THREE.BufferAttribute(data.colorB, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(data.phase, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(data.speed, 1));
    geo.setAttribute('aScale', new THREE.BufferAttribute(data.scale, 1));
    return geo;
  }, [data]);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    const audioBands = sampleGlobalAudioBands(audioDataRef.current);
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uProgress.value = progress;
    materialRef.current.uniforms.uAudioLow.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uAudioLow.value,
      audioBands.low,
      0.14,
    );
    materialRef.current.uniforms.uAudioMid.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uAudioMid.value,
      audioBands.mid,
      0.14,
    );
    materialRef.current.uniforms.uAudioHigh.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uAudioHigh.value,
      audioBands.high,
      0.14,
    );
  });

  useEffect(() => () => {
    geometry.dispose();
    materialRef.current?.dispose();
  }, [geometry]);

  return (
    <points ref={particlesRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={PARTICLE_VERT}
        fragmentShader={PARTICLE_FRAG}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uProgress: { value: progress },
          uAudioLow: { value: 0 },
          uAudioMid: { value: 0 },
          uAudioHigh: { value: 0 },
          uFlowScale: { value: settings.flowScale },
          uSizeBase: { value: settings.sizeBase },
          uSizeMax: { value: settings.sizeMax },
          uAlphaScale: { value: settings.alphaScale },
        }}
      />
    </points>
  );
}

function MemoryPreviewPlane({ scene, progress, position, rotationY = 0, mode = 'current' }) {
  const imageUrl = resolveAsset(scene?.previewImage || scene?.photoUrl);
  const texture = useLoader(TextureLoader, imageUrl || `${BASE}images/memory/placeholder-preview.jpg`);
  const meshRef = useRef(null);

  useEffect(() => {
    if (texture) texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  useFrame(() => {
    if (!meshRef.current) return;
    const opacity = mode === 'current'
      ? 1 - Math.min(progress * 1.65, 1)
      : Math.max(0, Math.min((progress - 0.36) / 0.5, 1));
    meshRef.current.material.opacity = opacity * (mode === 'current' ? 0.09 : 0.12);
    meshRef.current.position.x = position[0] + Math.sin(progress * Math.PI * 1.2 + rotationY) * 0.12;
    meshRef.current.position.y = position[1] + Math.cos(progress * Math.PI * 0.9 + rotationY) * 0.05;
    meshRef.current.position.z = position[2] + Math.sin(progress * Math.PI * 1.4 + rotationY) * 0.26;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[6.2, 3.5]} />
      <meshBasicMaterial map={texture} transparent opacity={0.45} toneMapped={false} />
    </mesh>
  );
}

function MemoryGhostShell({ scene, progress, direction = 'next', mode = 'current', variant = 'thread' }) {
  const imageUrl = resolveAsset(scene?.previewImage || scene?.photoUrl);
  const texture = useLoader(TextureLoader, imageUrl || `${BASE}images/memory/placeholder-preview.jpg`);
  const groupRef = useRef(null);
  const layerRefs = useRef([]);
  const sign = direction === 'previous' ? -1 : 1;
  const isCluster = variant === 'cluster';
  const tintA = new Color(getScenePalette(scene, mode === 'current' ? 'current' : 'next')[0]);
  const tintB = new Color(getScenePalette(scene, mode === 'current' ? 'current' : 'next')[1]);

  useEffect(() => {
    if (texture) texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();
    const reveal = mode === 'current'
      ? 1 - THREE.MathUtils.smoothstep(progress, 0.08, 0.68)
      : THREE.MathUtils.smoothstep(progress, 0.28, 0.9);
    const drift = mode === 'current' ? progress * 0.8 : (1 - progress) * 0.55;

    groupRef.current.position.x = Math.sin(time * 0.24 + (mode === 'current' ? 0 : 1.4)) * 0.22 * sign;
    groupRef.current.position.y = Math.cos(time * 0.18 + (mode === 'current' ? 0 : 1.2)) * 0.16;
    groupRef.current.position.z = mode === 'current'
      ? (isCluster ? 1.8 - progress * 1.6 : 2.8 - progress * 2.4)
      : (isCluster ? -5.4 + progress * 2.6 : -7.8 + progress * 3.6);
    groupRef.current.rotation.y = rotationYFromMode(mode, sign, drift);

    layerRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const layerBias = index * 0.18;
      mesh.position.z = (mode === 'current'
        ? index * (isCluster ? -0.34 : -0.48)
        : index * (isCluster ? 0.42 : 0.62)) + layerBias;
      mesh.position.x = (index - 1.5) * 0.12 * sign;
      mesh.position.y = Math.sin(time * 0.45 + index * 0.8) * 0.06;
      const scale = mode === 'current'
        ? (isCluster ? 1.34 : 1.65) + index * 0.08 - progress * 0.18
        : (isCluster ? 1.08 : 1.25) + index * 0.1 + progress * 0.2;
      mesh.scale.setScalar(scale);
      mesh.rotation.z = Math.sin(time * 0.2 + index * 0.6) * 0.06 * sign;
      mesh.material.opacity = reveal * (0.11 - index * 0.018);
      mesh.material.color.copy(tintA).lerp(tintB, 0.28 + index * 0.14);
    });
  });

  return (
    <group ref={groupRef}>
      {[0, 1, 2, 3].map((index) => (
        <mesh
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          ref={(node) => {
            layerRefs.current[index] = node;
          }}
        >
          <planeGeometry args={[12.8, 7.2]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={0}
            toneMapped={false}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function rotationYFromMode(mode, sign, drift) {
  if (mode === 'current') return -0.08 * sign - drift * 0.08;
  return Math.PI + 0.16 * sign + drift * 0.06;
}

function SynapsePulseBursts({ progress, direction = 'next', currentScene, nextScene }) {
  const pointsRef = useRef(null);
  const lineRef = useRef(null);
  const sign = direction === 'previous' ? -1 : 1;

  const { pointGeometry, lineGeometry } = useMemo(() => {
    const nodeCount = 120;
    const positions = new Float32Array(nodeCount * 3);
    const phases = new Float32Array(nodeCount);
    const linePositions = [];

    for (let index = 0; index < nodeCount; index += 1) {
      const ring = index % 12;
      const spiral = Math.floor(index / 12);
      const angle = (ring / 12) * Math.PI * 2 + spiral * 0.38;
      const radius = 0.55 + spiral * 0.16;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(angle * 1.2) * 0.42 + (spiral - 4.5) * 0.11;
      positions[index * 3 + 2] = -spiral * 0.65;
      phases[index] = Math.random() * Math.PI * 2;

      if (index > 0) {
        linePositions.push(
          positions[(index - 1) * 3],
          positions[(index - 1) * 3 + 1],
          positions[(index - 1) * 3 + 2],
          positions[index * 3],
          positions[index * 3 + 1],
          positions[index * 3 + 2],
        );
      }
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

    return { pointGeometry: pointGeo, lineGeometry: lineGeo };
  }, []);

  useEffect(() => () => {
    pointGeometry.dispose();
    lineGeometry.dispose();
  }, [pointGeometry, lineGeometry]);

  useFrame(({ clock }) => {
    const pulse = THREE.MathUtils.smoothstep(progress, 0.14, 0.88);
    const color = new Color(getScenePalette(currentScene, 'current')[1]).lerp(
      new Color(getScenePalette(nextScene, 'next')[0]),
      THREE.MathUtils.smoothstep(progress, 0.35, 0.95),
    );

    if (pointsRef.current) {
      pointsRef.current.position.z = -1.8 - progress * 3.4;
      pointsRef.current.position.x = Math.sin(clock.getElapsedTime() * 0.4) * 0.3 * sign;
      pointsRef.current.rotation.z = clock.getElapsedTime() * 0.08 * sign;
      pointsRef.current.material.opacity = pulse * 0.72;
      pointsRef.current.material.color.copy(color);
    }

    if (lineRef.current && pointsRef.current) {
      lineRef.current.position.copy(pointsRef.current.position);
      lineRef.current.rotation.copy(pointsRef.current.rotation);
      lineRef.current.material.opacity = pulse * 0.16;
      lineRef.current.material.color.copy(color);
    }
  });

  return (
    <group>
      <lineSegments ref={lineRef} geometry={lineGeometry}>
        <lineBasicMaterial transparent opacity={0} toneMapped={false} />
      </lineSegments>
      <points ref={pointsRef} geometry={pointGeometry}>
        <pointsMaterial
          transparent
          opacity={0}
          color="#ffffff"
          size={0.08}
          sizeAttenuation
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

function PlexusThreads({ progress, currentScene, nextScene, direction = 'next' }) {
  const currentPalette = getScenePalette(currentScene, 'current');
  const nextPalette = getScenePalette(nextScene, 'next');
  const sign = direction === 'previous' ? -1 : 1;

  const strands = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const spread = (index - 3) * 0.72;
      const points = [
        new Vector3(spread * 1.2 * sign, -2.2 + index * 0.18, 4.2 * sign),
        new Vector3(spread * 0.78 * sign, 0.4 - index * 0.15, 0.8 * sign),
        new Vector3(spread * 0.26 * sign, -0.2 + index * 0.09, -3.8 * sign),
        new Vector3(spread * 0.08 * sign, 0.12, -8.8 * sign),
      ];
      return new CatmullRomCurve3(points).getPoints(28);
    });
  }, [direction, sign]);

  return (
    <group>
      {strands.map((points, index) => (
        <PlexusThread
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          points={points}
          progress={progress}
          colorA={currentPalette[index % currentPalette.length]}
          colorB={nextPalette[index % nextPalette.length]}
          delay={index * 0.07}
        />
      ))}
    </group>
  );
}

function PlexusThread({ points, progress, colorA, colorB, delay }) {
  const lineRef = useRef(null);
  const audioDataRef = useRef(new Uint8Array(128));

  useFrame(({ clock }) => {
    if (!lineRef.current?.material) return;
    const audioBands = sampleGlobalAudioBands(audioDataRef.current);
    const mat = lineRef.current.material;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 2.4 + delay * 6.0) * 0.5;
    const reveal = Math.max(0, Math.min((progress - delay) / 0.55, 1));
    const color = new Color(colorA).lerp(new Color(colorB), Math.max(0, Math.min((progress - 0.3) / 0.7, 1)));
    mat.color.copy(color);
    mat.opacity = reveal * (0.1 + pulse * 0.1 + audioBands.high * 0.18);
    mat.dashOffset -= 0.015 + audioBands.mid * 0.04;
  });

  return (
    <Line
      ref={lineRef}
      points={points}
      transparent
      opacity={0}
      color={colorA}
      lineWidth={1.1}
      toneMapped={false}
      dashed
      dashSize={0.4}
      gapSize={0.24}
    />
  );
}

function CorridorFog({ progress, currentScene, nextScene }) {
  const meshRef = useRef(null);
  const currentColor = new Color(getScenePalette(currentScene, 'current')[0]);
  const nextColor = new Color(getScenePalette(nextScene, 'next')[0]);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.material.opacity = 0.08 + Math.sin(progress * Math.PI) * 0.06;
    meshRef.current.material.color.copy(currentColor).lerp(nextColor, Math.max(0, Math.min((progress - 0.25) / 0.7, 1)));
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2.5]}>
      <planeGeometry args={[40, 24]} />
      <meshBasicMaterial transparent opacity={0.2} color="#09121d" />
    </mesh>
  );
}

export default function MemoryCorridorTransition({
  currentScene,
  nextScene,
  progress,
  direction = 'next',
  variant = 'thread',
}) {
  const isCluster = variant === 'cluster';
  return (
    <div className="memory-archive__corridor-canvas">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.1, 5.8], fov: 54, near: 0.1, far: 60 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <color attach="background" args={['#020207']} />
        <fog attach="fog" args={['#020207', 10, 26]} />
        <ambientLight intensity={0.22} />
        <pointLight position={[0, 2.4, 2]} intensity={1.5} color="#f2d8b1" />
        <pointLight position={[0, -1.2, -10]} intensity={1.1} color="#87c7ff" />
        <pointLight position={[0, 0.4, -4.4]} intensity={0.65} color="#ffe9bf" />

        <CorridorCamera progress={progress} direction={direction} variant={variant} />
        <CorridorFog progress={progress} currentScene={currentScene} nextScene={nextScene} />
        <CorridorParticles
          currentScene={currentScene}
          nextScene={nextScene}
          progress={progress}
          direction={direction}
          profile="mist"
        />
        <MemoryGhostShell
          scene={currentScene}
          progress={progress}
          direction={direction}
          mode="current"
          variant={variant}
        />
        <MemoryGhostShell
          scene={nextScene}
          progress={progress}
          direction={direction}
          mode="next"
          variant={variant}
        />
        <MemoryPreviewPlane
          scene={currentScene}
          progress={progress}
          position={isCluster ? [-0.32, 0.05, 7.4] : [-0.65, 0.08, 10.2]}
          rotationY={-0.08}
          mode="current"
        />
        <MemoryPreviewPlane
          scene={nextScene}
          progress={progress}
          position={isCluster ? [0.26, 0.03, -8.6] : [0.4, 0.04, -14.2]}
          rotationY={Math.PI}
          mode="next"
        />
        <PlexusThreads
          progress={progress}
          currentScene={currentScene}
          nextScene={nextScene}
          direction={direction}
        />
        <SynapsePulseBursts
          progress={progress}
          currentScene={currentScene}
          nextScene={nextScene}
          direction={direction}
        />
        <CorridorParticles
          currentScene={currentScene}
          nextScene={nextScene}
          progress={progress}
          direction={direction}
          profile="core"
        />
      </Canvas>
    </div>
  );
}
