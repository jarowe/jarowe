import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { getCfg } from '../constellationDefaults';

/**
 * Subtle nebula haze near epoch cluster cores.
 * Uses custom shader with radial falloff so blobs appear as soft
 * circular fog instead of hard-edged rectangles.
 */

const nebulaVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    // Radial distance from center (0 at center, 1 at edge)
    vec2 centered = vUv - 0.5;
    float dist = length(centered) * 2.0;
    // Smooth circular falloff — fully transparent at edges
    float alpha = smoothstep(1.0, 0.0, dist) * uOpacity;
    // Extra softening at the edges
    alpha *= alpha;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

function NebulaBlobMaterial({ color, opacity }) {
  const material = useMemo(() => {
    const c = new THREE.Color(color);
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: c },
        uOpacity: { value: opacity },
      },
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
  }, [color, opacity]);
  return <primitive object={material} attach="material" />;
}

export default function NebulaFog({ epochCenters, enabled }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const group = children[i];
      if (group.children) {
        group.rotation.z = Math.sin(t * 0.03 + i * 1.5) * 0.08;
      }
    }
  });

  if (!enabled || !epochCenters || epochCenters.length === 0) return null;

  const scale = getCfg('nebulaScale');
  const primaryOpacity = getCfg('nebulaOpacity');
  const secondaryOpacity = getCfg('nebulaSecondaryOpacity');
  const accentOpacity = getCfg('nebulaAccentOpacity');

  return (
    <group ref={groupRef}>
      {epochCenters.map((ec) => (
        <group key={ec.epoch}>
          {/* Primary large haze blob */}
          <Billboard position={[ec.x, ec.y, ec.z]}>
            <mesh>
              <planeGeometry args={[45 * scale, 45 * scale]} />
              <NebulaBlobMaterial color={ec.color} opacity={primaryOpacity} />
            </mesh>
          </Billboard>
          {/* Secondary offset blob for depth */}
          <Billboard position={[ec.x + 10, ec.y + 4, ec.z - 6]}>
            <mesh>
              <planeGeometry args={[35 * scale, 35 * scale]} />
              <NebulaBlobMaterial color={ec.color} opacity={secondaryOpacity} />
            </mesh>
          </Billboard>
          {/* Tertiary small accent */}
          <Billboard position={[ec.x - 7, ec.y - 3, ec.z + 8]}>
            <mesh>
              <planeGeometry args={[25 * scale, 25 * scale]} />
              <NebulaBlobMaterial color={ec.color} opacity={accentOpacity} />
            </mesh>
          </Billboard>
        </group>
      ))}
    </group>
  );
}
