/**
 * ParticleMemoryField — R3F Points component for the particle memory field
 *
 * Receives pre-computed particle data (Float32Arrays from particleSampler)
 * and renders them as <points> with a custom ShaderMaterial featuring
 * dual buffer interpolation, depth-correlated breathing, and shader halo.
 */

import { forwardRef, useRef, useMemo, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTICLE_MEMORY_VERT, PARTICLE_MEMORY_FRAG } from './particleShaders';

const ParticleMemoryField = forwardRef(function ParticleMemoryField({ particleData, config }, ref) {
  // Uniforms — stable ref for mutation by useFrame and external controllers
  const uniforms = useRef({
    uTime: { value: 0 },
    uBreathSpeed: { value: config.breathSpeed || 0.4 },
    uBreathAmplitude: { value: config.breathAmplitude || 0.015 },
    uMorphProgress: { value: 1.0 }, // 1.0 = photo-formed (Phase 14 default)
  });

  // Expose uniforms so ArcController / Phase 16 can animate uMorphProgress
  useImperativeHandle(ref, () => ({ uniforms: uniforms.current }));

  // BufferGeometry with all particle attributes
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('aPhotoPosition', new THREE.BufferAttribute(particleData.photoPositions, 3));
    geo.setAttribute('aScatteredPosition', new THREE.BufferAttribute(particleData.scatteredPositions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(particleData.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(particleData.sizes, 1));
    geo.setAttribute('aDepthValue', new THREE.BufferAttribute(particleData.depthValues, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(particleData.phases, 1));
    return geo;
  }, [particleData]);

  // ShaderMaterial with breathing + morphProgress uniforms
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: uniforms.current,
    vertexShader: PARTICLE_MEMORY_VERT,
    fragmentShader: PARTICLE_MEMORY_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), []);

  // Animation loop — update uTime each frame
  useFrame(({ clock }) => {
    uniforms.current.uTime.value = clock.getElapsedTime();
  });

  return <points geometry={geometry} material={material} />;
});

export default ParticleMemoryField;
