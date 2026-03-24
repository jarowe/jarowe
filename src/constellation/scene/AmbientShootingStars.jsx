import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useConstellationStore } from '../store';
import { getCfg } from '../constellationDefaults';
import { getIntroReveal } from './introMath';
import { getAmbientEnvelope, randomRange, scheduleAmbientEvent } from './ambientLife';

const tempForward = new THREE.Vector3();
const tempRight = new THREE.Vector3();
const tempUp = new THREE.Vector3();
const tempCenter = new THREE.Vector3();
const tempHead = new THREE.Vector3();
const tempTail = new THREE.Vector3();
const tempDirection = new THREE.Vector3();
const tempColor = new THREE.Color();

export default function AmbientShootingStars({ introRef = null, reducedMotion = false }) {
  const { camera, viewport } = useThree();
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const filterEntity = useConstellationStore((s) => s.filterEntity);

  const groupRef = useRef(null);
  const headRef = useRef(null);
  const eventRef = useRef({ active: false, nextTime: 0, startTime: 0, duration: 0 });
  const shotRef = useRef({
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
  });

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    return geometry;
  }, []);

  const lineMaterial = useMemo(() => (
    new THREE.LineBasicMaterial({
      color: '#dbe9ff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  ), []);

  const headGeometry = useMemo(() => new THREE.SphereGeometry(0.8, 10, 10), []);
  const headMaterial = useMemo(() => (
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  ), []);

  useEffect(() => () => {
    lineGeometry.dispose();
    lineMaterial.dispose();
    headGeometry.dispose();
    headMaterial.dispose();
  }, [headGeometry, headMaterial, lineGeometry, lineMaterial]);

  useFrame((state) => {
    const group = groupRef.current;
    const head = headRef.current;
    if (!group || !head) return;

    const now = state.clock.getElapsedTime();
    const introProgress = introRef?.current?.progress ?? 1;
    const introReveal = getIntroReveal(introProgress, 0.82, 1);
    const ambientEnabled = getCfg('ambientLifeEnabled') && getCfg('shootingStarsEnabled') && !reducedMotion;
    const canSpawn = ambientEnabled && !focusedNodeId && !filterEntity && introReveal > 0.98;
    const event = eventRef.current;

    if (!event.nextTime) {
      scheduleAmbientEvent(
        event,
        now,
        getCfg('shootingStarIntervalMin'),
        getCfg('shootingStarIntervalMax')
      );
    }

    if (!canSpawn) {
      event.active = false;
      group.visible = false;
      lineMaterial.opacity = 0;
      headMaterial.opacity = 0;
      return;
    }

    if (!event.active && now >= event.nextTime) {
      const distance = randomRange(
        Math.max(150, getCfg('starRadius') * 0.85),
        Math.max(220, getCfg('starRadius') + getCfg('starDepth') * 0.85)
      );
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const planeHeight = 2 * Math.tan(fov * 0.5) * distance;
      const planeWidth = planeHeight * camera.aspect;
      const side = Math.random() > 0.5 ? 1 : -1;
      const startX = side * planeWidth * randomRange(0.55, 0.85);
      const endX = -side * planeWidth * randomRange(0.15, 0.45);
      const startY = planeHeight * randomRange(-0.35, 0.35);
      const endY = startY - planeHeight * randomRange(0.08, 0.24);

      camera.getWorldDirection(tempForward).normalize();
      tempRight.crossVectors(tempForward, camera.up).normalize();
      tempUp.crossVectors(tempRight, tempForward).normalize();
      tempCenter.copy(camera.position).addScaledVector(tempForward, distance);

      shotRef.current.start
        .copy(tempCenter)
        .addScaledVector(tempRight, startX)
        .addScaledVector(tempUp, startY);
      shotRef.current.end
        .copy(tempCenter)
        .addScaledVector(tempRight, endX)
        .addScaledVector(tempUp, endY);

      event.active = true;
      event.startTime = now;
      event.duration = getCfg('shootingStarDuration');
    }

    if (!event.active) {
      group.visible = false;
      return;
    }

    const envelope = getAmbientEnvelope(now, event.startTime, event.duration);
    if (envelope <= 0) {
      scheduleAmbientEvent(
        event,
        now,
        getCfg('shootingStarIntervalMin'),
        getCfg('shootingStarIntervalMax')
      );
      group.visible = false;
      lineMaterial.opacity = 0;
      headMaterial.opacity = 0;
      return;
    }

    const progress = (now - event.startTime) / event.duration;
    tempHead.lerpVectors(shotRef.current.start, shotRef.current.end, progress);
    tempDirection.subVectors(shotRef.current.end, shotRef.current.start).normalize();
    tempTail.copy(tempHead).addScaledVector(tempDirection, -getCfg('shootingStarLength'));

    const positions = lineGeometry.attributes.position.array;
    positions[0] = tempTail.x;
    positions[1] = tempTail.y;
    positions[2] = tempTail.z;
    positions[3] = tempHead.x;
    positions[4] = tempHead.y;
    positions[5] = tempHead.z;
    lineGeometry.attributes.position.needsUpdate = true;
    lineGeometry.computeBoundingSphere();

    const brightness = getCfg('shootingStarBrightness');
    const opacity = introReveal * envelope * brightness;
    tempColor.setRGB(0.86 + envelope * 0.12, 0.9 + envelope * 0.08, 1);
    lineMaterial.color.copy(tempColor);
    lineMaterial.opacity = opacity * 0.7;

    head.position.copy(tempHead);
    head.scale.setScalar(0.65 + envelope * 0.55);
    headMaterial.color.copy(tempColor);
    headMaterial.opacity = opacity;

    group.visible = viewport.width > 0;
  });

  return (
    <group ref={groupRef} visible={false} renderOrder={3}>
      <line geometry={lineGeometry} material={lineMaterial} />
      <mesh ref={headRef} geometry={headGeometry} material={headMaterial} />
    </group>
  );
}
