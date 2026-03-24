/**
 * ParticleMemoryField — R3F Points + LineSegments component for the particle memory field
 *
 * Receives pre-computed particle data (Float32Arrays from particleSampler)
 * and renders them as <points> with a custom ShaderMaterial featuring
 * dual buffer interpolation, depth-correlated breathing, and shader halo.
 *
 * Optionally renders wire connections as <lineSegments> when wireData is provided
 * (full tier only — simplified tier passes null wireData).
 */

import { forwardRef, useRef, useMemo, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTICLE_MEMORY_VERT, PARTICLE_MEMORY_FRAG } from './particleShaders';
import { WIRE_VERT, WIRE_FRAG } from './wireShaders';

const ParticleMemoryField = forwardRef(function ParticleMemoryField({ particleData, config, wireData }, ref) {
  // Uniforms — stable ref for mutation by useFrame and external controllers
  const uniforms = useRef({
    uTime: { value: 0 },
    uBreathSpeed: { value: config.breathSpeed || 0.4 },
    uBreathAmplitude: { value: config.breathAmplitude || 0.015 },
    uMorphProgress: { value: 1.0 }, // 1.0 = photo-formed (Phase 14 default)
    uMorphStagger: { value: 0.0 },  // Phase 16: depth-stagger offset for reform convergence
  });

  // Wire uniforms — separate ref for wire material
  const wireUniforms = useRef({
    uTime: { value: 0 },
    uWirePulse: { value: 0.15 },
  });

  // Expose uniforms so ArcController / Phase 16 can animate uMorphProgress + wireUniforms
  useImperativeHandle(ref, () => ({
    uniforms: uniforms.current,
    wireUniforms: wireUniforms.current,
  }));

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

  // Wire geometry (only built when wireData is provided)
  const wireGeometry = useMemo(() => {
    if (!wireData) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(wireData.positions, 3));
    geo.setAttribute('aColorA', new THREE.BufferAttribute(wireData.colorsA, 3));
    geo.setAttribute('aColorB', new THREE.BufferAttribute(wireData.colorsB, 3));
    geo.setAttribute('aWireAlpha', new THREE.BufferAttribute(wireData.alphas, 1));
    return geo;
  }, [wireData]);

  // ShaderMaterial with breathing + morphProgress uniforms
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: uniforms.current,
    vertexShader: PARTICLE_MEMORY_VERT,
    fragmentShader: PARTICLE_MEMORY_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), []);

  // Wire ShaderMaterial — thin luminous LineSegments
  const wireMaterial = useMemo(() => {
    if (!wireData) return null;
    return new THREE.ShaderMaterial({
      uniforms: wireUniforms.current,
      vertexShader: WIRE_VERT,
      fragmentShader: WIRE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [wireData]);

  // Animation loop — update uTime each frame for both particles and wires
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    uniforms.current.uTime.value = t;
    wireUniforms.current.uTime.value = t;
  });

  return (
    <>
      <points geometry={geometry} material={material} />
      {wireGeometry && wireMaterial && (
        <lineSegments geometry={wireGeometry} material={wireMaterial} />
      )}
    </>
  );
});

export default ParticleMemoryField;
