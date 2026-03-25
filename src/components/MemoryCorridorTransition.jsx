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

function createParticleAttributes(currentScene, nextScene, direction = 'next') {
  const count = 5200;
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

  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    const band = i % 3;
    const radius = 0.45 + Math.pow(Math.random(), 0.32) * 5.6;
    const theta = Math.random() * Math.PI * 2;
    const heightBias = (Math.random() - 0.5) * 4.8;
    const driftBias = band === 0 ? -1.35 : band === 1 ? 0 : 1.35;
    const startZ = 4.8 + Math.random() * 2.4;
    const endZ = -11.5 - Math.random() * 5.2;

    start[i * 3] = Math.cos(theta) * radius * 1.12 + driftBias * 0.28;
    start[i * 3 + 1] = Math.sin(theta * 1.7) * radius * 0.48 + heightBias;
    start[i * 3 + 2] = startZ * directionSign;

    end[i * 3] = (Math.cos(theta * 0.55 + 0.75) * radius * 0.26 + driftBias * 0.06) * directionSign;
    end[i * 3 + 1] = Math.sin(theta * 0.35 + 1.4) * radius * 0.2 + heightBias * 0.22;
    end[i * 3 + 2] = endZ * directionSign;

    const startColor = startColors[Math.floor(Math.random() * startColors.length)];
    const endColor = endColors[Math.floor(((t * endColors.length) + band) % endColors.length)];
    colorA.set(startColor, i * 3);
    colorB.set(endColor, i * 3);
    phase[i] = Math.random() * Math.PI * 2;
    speed[i] = 0.45 + Math.random() * 0.75;
    scale[i] = 0.85 + Math.random() * 1.75;
  }

  return { count, start, end, colorA, colorB, phase, speed, scale };
}

const PARTICLE_VERT = /* glsl */ `
uniform float uTime;
uniform float uProgress;
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
  float corridorPull = sin(swirl + pos.z * 0.55) * (1.0 - p) * 1.35;
  pos.x += cos(swirl * 1.3) * 0.38 + corridorPull * 0.28;
  pos.y += sin(swirl * 0.8) * 0.26 + cos(swirl * 0.6 + pos.z) * 0.16;
  pos.z += sin(swirl * 0.5) * 0.18;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  float depth = max(-mvPos.z, 0.01);
  gl_PointSize = clamp((aScale * 58.0) / depth, 1.0, 19.0);
  gl_Position = projectionMatrix * mvPos;

  vColor = mix(aColorA, aColorB, smoothstep(0.15, 0.92, p));
  float travelFade = smoothstep(0.0, 0.1, p) * (1.0 - smoothstep(0.96, 1.0, p));
  vAlpha = (0.38 + aScale * 0.16) * max(0.3, travelFade);
}
`;

const PARTICLE_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float core = 1.0 - smoothstep(0.14, 0.48, d);
  float halo = 1.0 - smoothstep(0.22, 0.78, d);
  float alpha = (core * 0.8 + halo * 0.35) * vAlpha;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor, alpha);
}
`;

function CorridorCamera({ progress, direction = 'next' }) {
  const { camera } = useThree();
  const sign = direction === 'previous' ? -1 : 1;

  useFrame(() => {
    const eased = 1 - ((1 - progress) * (1 - progress));
    camera.position.x = Math.sin(eased * Math.PI * 1.4) * 0.42 * sign;
    camera.position.y = 0.08 + Math.sin(eased * Math.PI * 1.85) * 0.22;
    camera.position.z = 8.4 - eased * 7.2;
    camera.lookAt(Math.sin(eased * Math.PI * 0.8) * 0.32 * sign, Math.sin(eased * Math.PI) * 0.08, -10.8 * sign);
  });

  return null;
}

function CorridorParticles({ currentScene, nextScene, progress, direction }) {
  const particlesRef = useRef(null);
  const materialRef = useRef(null);
  const data = useMemo(
    () => createParticleAttributes(currentScene, nextScene, direction),
    [currentScene, nextScene, direction],
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
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uProgress.value = progress;
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
    meshRef.current.material.opacity = opacity * (mode === 'current' ? 0.18 : 0.24);
    meshRef.current.position.x = position[0] + Math.sin(progress * Math.PI * 1.2 + rotationY) * 0.12;
    meshRef.current.position.y = position[1] + Math.cos(progress * Math.PI * 0.9 + rotationY) * 0.05;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[6.2, 3.5]} />
      <meshBasicMaterial map={texture} transparent opacity={0.45} toneMapped={false} />
    </mesh>
  );
}

function MemoryGhostShell({ scene, progress, direction = 'next', mode = 'current' }) {
  const imageUrl = resolveAsset(scene?.previewImage || scene?.photoUrl);
  const texture = useLoader(TextureLoader, imageUrl || `${BASE}images/memory/placeholder-preview.jpg`);
  const groupRef = useRef(null);
  const layerRefs = useRef([]);
  const sign = direction === 'previous' ? -1 : 1;
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
      ? 2.8 - progress * 2.4
      : -7.8 + progress * 3.6;
    groupRef.current.rotation.y = rotationYFromMode(mode, sign, drift);

    layerRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const layerBias = index * 0.18;
      mesh.position.z = (mode === 'current' ? index * -0.48 : index * 0.62) + layerBias;
      mesh.position.x = (index - 1.5) * 0.12 * sign;
      mesh.position.y = Math.sin(time * 0.45 + index * 0.8) * 0.06;
      const scale = mode === 'current'
        ? 1.65 + index * 0.08 - progress * 0.18
        : 1.25 + index * 0.1 + progress * 0.2;
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

  useFrame(({ clock }) => {
    if (!lineRef.current?.material) return;
    const mat = lineRef.current.material;
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 2.4 + delay * 6.0) * 0.5;
    const reveal = Math.max(0, Math.min((progress - delay) / 0.55, 1));
    const color = new Color(colorA).lerp(new Color(colorB), Math.max(0, Math.min((progress - 0.3) / 0.7, 1)));
    mat.color.copy(color);
    mat.opacity = reveal * (0.16 + pulse * 0.12);
    mat.dashOffset -= 0.015;
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
}) {
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

        <CorridorCamera progress={progress} direction={direction} />
        <CorridorFog progress={progress} currentScene={currentScene} nextScene={nextScene} />
        <MemoryGhostShell
          scene={currentScene}
          progress={progress}
          direction={direction}
          mode="current"
        />
        <MemoryGhostShell
          scene={nextScene}
          progress={progress}
          direction={direction}
          mode="next"
        />
        <MemoryPreviewPlane
          scene={currentScene}
          progress={progress}
          position={[-0.65, 0.08, 10.2]}
          rotationY={-0.08}
          mode="current"
        />
        <MemoryPreviewPlane
          scene={nextScene}
          progress={progress}
          position={[0.4, 0.04, -14.2]}
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
        />
      </Canvas>
    </div>
  );
}
