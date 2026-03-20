import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { getCfg } from '../constellationDefaults';

/**
 * Subtle nebula haze near epoch cluster cores.
 * Renders semi-transparent billboard sprites with soft color gradients
 * using additive blending for a luminous sci-fi atmosphere.
 * Each blob slowly rotates to add organic motion.
 */
export default function NebulaFog({ epochCenters, enabled }) {
  const groupRef = useRef();

  // Gentle rotation of the fog blobs for organic feel
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const group = children[i];
      if (group.children) {
        // Rotate each epoch group subtly
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
          {/* Primary large haze blob — additive for luminous glow */}
          <Billboard position={[ec.x, ec.y, ec.z]}>
            <mesh>
              <planeGeometry args={[45 * scale, 45 * scale]} />
              <meshBasicMaterial
                transparent
                opacity={primaryOpacity}
                color={ec.color}
                side={THREE.FrontSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </Billboard>
          {/* Secondary offset blob for depth — slightly different hue */}
          <Billboard
            position={[ec.x + 10, ec.y + 4, ec.z - 6]}
          >
            <mesh>
              <planeGeometry args={[35 * scale, 35 * scale]} />
              <meshBasicMaterial
                transparent
                opacity={secondaryOpacity}
                color={ec.color}
                side={THREE.FrontSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </Billboard>
          {/* Tertiary small accent — brighter, tighter */}
          <Billboard
            position={[ec.x - 7, ec.y - 3, ec.z + 8]}
          >
            <mesh>
              <planeGeometry args={[25 * scale, 25 * scale]} />
              <meshBasicMaterial
                transparent
                opacity={accentOpacity}
                color={ec.color}
                side={THREE.FrontSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </Billboard>
        </group>
      ))}
    </group>
  );
}
