import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useConstellationStore } from '../store';
import { getCfg } from '../constellationDefaults';
import { getIntroReveal } from './introMath';
import { gaussianFalloff, getAmbientEnvelope, scheduleAmbientEvent } from './ambientLife';

/** Theme-based color palette (same as NodeCloud) */
const THEME_COLORS = {
  love: '#f472b6', family: '#fb923c', fatherhood: '#fb923c',
  brotherhood: '#e0915a', marriage: '#f9a8d4', childhood: '#fdba74',
  career: '#60a5fa', craft: '#38bdf8', filmmaking: '#67e8f9',
  growth: '#a78bfa', reflection: '#c084fc',
  adventure: '#2dd4bf', travel: '#2dd4bf', greece: '#2dd4bf',
  worldschooling: '#5eead4',
  celebration: '#fbbf24', friendship: '#818cf8',
  nature: '#34d399', food: '#f97316', nostalgia: '#d4a574',
  faith: '#e2c6ff', home: '#86efac',
  health: '#4ade80', entrepreneurship: '#f59e0b', technology: '#22d3ee',
};

const TYPE_COLORS = {
  project: '#f59e0b', moment: '#f87171', person: '#a78bfa',
  place: '#2dd4bf', idea: '#22d3ee', milestone: '#fbbf24',
  track: '#34d399',
};

const tempColor = new THREE.Color();
const energyColor = new THREE.Color('#ecf6ff');

function getNodeColor(node) {
  if (node.theme && THEME_COLORS[node.theme]) return THEME_COLORS[node.theme];
  if (node.type && TYPE_COLORS[node.type]) return TYPE_COLORS[node.type];
  return '#94a3b8';
}

/** Vertex shader for colored node markers on the backbone */
const markerVertexShader = `
  attribute float size;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (180.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 2.0, 12.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const markerFragmentShader = `
  varying vec3 vColor;
  uniform float uOpacity;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float core = smoothstep(0.5, 0.05, dist);
    float glow = smoothstep(0.5, 0.0, dist);
    float alpha = core * 0.8 + glow * 0.35;
    vec3 col = vColor + vColor * core * 0.5;
    gl_FragColor = vec4(col, alpha * uOpacity);
  }
`;

export default function HelixBackbone({
  positions,
  disabled,
  introRef = null,
  reducedMotion = false,
}) {
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);
  const filterEntity = useConstellationStore((s) => s.filterEntity);
  const strand0Ref = useRef(null);
  const strand1Ref = useRef(null);
  const rungRefs = useRef([]);
  const energyRef = useRef({
    active: false,
    nextTime: 0,
    startTime: 0,
    duration: 0,
    direction: 1,
  });

  const { strand0Points, strand1Points, rungs, yRange } = useMemo(() => {
    if (!positions || positions.length === 0) {
      return {
        strand0Points: [],
        strand1Points: [],
        rungs: [],
        yRange: { min: 0, max: 0 },
      };
    }

    const s0 = [];
    const s1 = [];
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of positions) {
      const strand = node.strand;
      const pt = [node.x, node.y, node.z];
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
      if (strand === 0) {
        s0.push(pt);
      } else if (strand === 1) {
        s1.push(pt);
      }
    }

    const sortByY = (a, b) => a[1] - b[1];
    s0.sort(sortByY);
    s1.sort(sortByY);

    const interpolateStrand = (pts) => {
      if (pts.length < 2) return pts;
      const vectors = pts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
      const curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal', 0.5);
      const samples = Math.max(pts.length * 4, 60);
      return curve.getPoints(samples).map((v) => [v.x, v.y, v.z]);
    };

    const strand0Points = interpolateStrand(s0);
    const strand1Points = interpolateStrand(s1);
    const rungPairs = [];

    if (s0.length >= 2 && s1.length >= 2) {
      const step = Math.max(1, Math.floor(s0.length / Math.ceil(s0.length / 4)));
      for (let i = 0; i < s0.length; i += step) {
        const p0 = s0[i];
        let bestDist = Infinity;
        let bestPt = s1[0];
        for (const p1 of s1) {
          const dy = Math.abs(p1[1] - p0[1]);
          if (dy < bestDist) {
            bestDist = dy;
            bestPt = p1;
          }
        }
        if (bestDist < 10) {
          rungPairs.push({
            points: [p0, bestPt],
            centerY: (p0[1] + bestPt[1]) * 0.5,
          });
        }
      }
    }

    return {
      strand0Points,
      strand1Points,
      rungs: rungPairs,
      yRange: {
        min: Number.isFinite(minY) ? minY : 0,
        max: Number.isFinite(maxY) ? maxY : 0,
      },
    };
  }, [positions]);

  const markerGeometry = useMemo(() => {
    if (!positions || positions.length === 0) return null;

    const count = positions.length;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const node = positions[i];
      pos[i * 3] = node.x;
      pos[i * 3 + 1] = node.y;
      pos[i * 3 + 2] = node.z;
      col[i * 3] = 0;
      col[i * 3 + 1] = 0;
      col[i * 3 + 2] = 0;
      sz[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    return geometry;
  }, [positions]);

  const markerMaterial = useMemo(() => (
    new THREE.ShaderMaterial({
      vertexShader: markerVertexShader,
      fragmentShader: markerFragmentShader,
      uniforms: {
        uOpacity: { value: 1 },
      },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  ), []);

  useEffect(() => () => {
    markerGeometry?.dispose();
    markerMaterial.dispose();
  }, [markerGeometry, markerMaterial]);

  useFrame(({ clock }) => {
    const introProgress = introRef?.current?.progress ?? 1;
    const strandReveal = getIntroReveal(introProgress, 0.14, 0.58);
    const rungReveal = getIntroReveal(introProgress, 0.28, 0.74);
    const now = clock.getElapsedTime();
    const basePulse = reducedMotion ? 1 : 0.94 + Math.sin(now * 0.55) * 0.06;
    const ambientEnabled = getCfg('ambientLifeEnabled') && getCfg('backboneEnergyEnabled') && !reducedMotion;
    const canRunEnergy = ambientEnabled && !focusedNodeId && !filterEntity && rungReveal > 0.98;
    const energy = energyRef.current;

    if (!energy.nextTime) {
      scheduleAmbientEvent(
        energy,
        now,
        getCfg('backboneEnergyIntervalMin'),
        getCfg('backboneEnergyIntervalMax')
      );
    }

    if (canRunEnergy && !energy.active && now >= energy.nextTime) {
      energy.active = true;
      energy.startTime = now;
      energy.duration = getCfg('backboneEnergyDuration');
      energy.direction = Math.random() > 0.5 ? 1 : -1;
    } else if (!canRunEnergy) {
      energy.active = false;
    }

    let energyY = null;
    let energyEnvelope = 0;
    if (energy.active) {
      energyEnvelope = getAmbientEnvelope(now, energy.startTime, energy.duration);
      if (energyEnvelope <= 0) {
        scheduleAmbientEvent(
          energy,
          now,
          getCfg('backboneEnergyIntervalMin'),
          getCfg('backboneEnergyIntervalMax')
        );
      } else {
        const progress = (now - energy.startTime) / energy.duration;
        const sweepProgress = energy.direction === 1 ? progress : 1 - progress;
        energyY = THREE.MathUtils.lerp(yRange.min, yRange.max, sweepProgress);
      }
    }

    const energyBoost = energyY === null
      ? 0
      : getCfg('backboneEnergyBoost') * energyEnvelope;
    const bandSize = getCfg('backboneEnergyBandSize');

    if (strand0Ref.current?.material) {
      strand0Ref.current.material.opacity = getCfg('strandOpacity') * strandReveal * basePulse * (1 + energyBoost * 0.12);
      strand0Ref.current.material.linewidth = getCfg('strandWidth');
      strand0Ref.current.material.color.set(getCfg('strandColor0'));
    }
    if (strand1Ref.current?.material) {
      strand1Ref.current.material.opacity = getCfg('strandOpacity') * strandReveal * basePulse * (1 + energyBoost * 0.12);
      strand1Ref.current.material.linewidth = getCfg('strandWidth');
      strand1Ref.current.material.color.set(getCfg('strandColor1'));
    }

    rungRefs.current.forEach((rung, index) => {
      if (!rung?.material) return;
      const band = energyY === null
        ? 0
        : gaussianFalloff(Math.abs(rungs[index].centerY - energyY), bandSize);
      rung.material.opacity = getCfg('rungOpacity') * rungReveal * (1 + band * energyBoost * 0.7);
      rung.material.linewidth = getCfg('rungWidth') * (1 + band * energyBoost * 0.16);
      tempColor.set(getCfg('rungColor')).lerp(energyColor, band * energyBoost * 0.16);
      rung.material.color.copy(tempColor);
    });

    if (markerGeometry) {
      const colorAttr = markerGeometry.getAttribute('color');
      const sizeAttr = markerGeometry.getAttribute('size');

      for (let i = 0; i < positions.length; i++) {
        const node = positions[i];
        const sig = node.significance ?? 0.5;
        const band = energyY === null
          ? 0
          : gaussianFalloff(Math.abs(node.y - energyY), bandSize);
        const brightness = (getCfg('markerBrightnessBase') + sig * getCfg('markerBrightnessRange'))
          * (1 + band * energyBoost);
        const size = (getCfg('markerSizeBase') + sig * getCfg('markerSizeRange'))
          * (1 + band * energyBoost * 0.08);

        tempColor.set(getNodeColor(node)).multiplyScalar(brightness);
        colorAttr.array[i * 3] = tempColor.r;
        colorAttr.array[i * 3 + 1] = tempColor.g;
        colorAttr.array[i * 3 + 2] = tempColor.b;
        sizeAttr.array[i] = size;
      }

      colorAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }

    if (markerMaterial.uniforms?.uOpacity) {
      markerMaterial.uniforms.uOpacity.value = rungReveal * (1 + energyBoost * 0.08);
    }
  });

  if (disabled || (strand0Points.length < 2 && strand1Points.length < 2)) return null;

  return (
    <group>
      {strand0Points.length >= 2 && (
        <Line
          ref={strand0Ref}
          points={strand0Points}
          color={getCfg('strandColor0')}
          lineWidth={getCfg('strandWidth')}
          transparent
          opacity={getCfg('strandOpacity')}
          toneMapped={false}
        />
      )}

      {strand1Points.length >= 2 && (
        <Line
          ref={strand1Ref}
          points={strand1Points}
          color={getCfg('strandColor1')}
          lineWidth={getCfg('strandWidth')}
          transparent
          opacity={getCfg('strandOpacity')}
          toneMapped={false}
        />
      )}

      {rungs.map((rung, i) => (
        <Line
          key={`rung-${i}`}
          ref={(node) => {
            rungRefs.current[i] = node;
          }}
          points={rung.points}
          color={getCfg('rungColor')}
          lineWidth={getCfg('rungWidth')}
          transparent
          opacity={getCfg('rungOpacity')}
          toneMapped={false}
        />
      ))}

      {markerGeometry && (
        <points geometry={markerGeometry} material={markerMaterial} />
      )}
    </group>
  );
}
