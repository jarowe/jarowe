import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

/** Theme-based color palette (same as NodeCloud) */
const THEME_COLORS = {
  love: '#f472b6', family: '#fb923c', fatherhood: '#fb923c',
  career: '#60a5fa', craft: '#38bdf8', growth: '#a78bfa',
  reflection: '#c084fc', adventure: '#2dd4bf', travel: '#2dd4bf',
  greece: '#2dd4bf', celebration: '#fbbf24', friendship: '#818cf8',
  nature: '#34d399', food: '#f97316', nostalgia: '#d4a574',
  faith: '#e2c6ff', home: '#86efac',
};

const TYPE_COLORS = {
  project: '#f59e0b', moment: '#f87171', person: '#a78bfa',
  place: '#2dd4bf', idea: '#22d3ee', milestone: '#fbbf24',
  track: '#34d399',
};

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
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    // Soft glow falloff
    float alpha = smoothstep(0.5, 0.15, dist) * 0.6;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

/**
 * HelixBackbone — two faint luminous spline rails (one per strand)
 * plus subtle rung links every 4th phase step.
 * Now includes colored node markers along the spine.
 *
 * Gives the constellation an unmistakable double-helix DNA scaffold.
 * Disabled on low GPU tiers (tier <= 1) via the `disabled` prop.
 */
export default function HelixBackbone({ positions, disabled }) {
  const { strand0Points, strand1Points, rungs } = useMemo(() => {
    if (!positions || positions.length === 0) {
      return { strand0Points: [], strand1Points: [], rungs: [] };
    }

    // Separate nodes by strand, sorted by Y for smooth splines
    const s0 = [];
    const s1 = [];
    for (const node of positions) {
      const strand = node.strand;
      const pt = [node.x, node.y, node.z];
      if (strand === 0) {
        s0.push(pt);
      } else if (strand === 1) {
        s1.push(pt);
      }
    }

    // Sort by Y (ascending) for smooth curve
    const sortByY = (a, b) => a[1] - b[1];
    s0.sort(sortByY);
    s1.sort(sortByY);

    // Generate smooth spline points for each strand
    const interpolateStrand = (pts) => {
      if (pts.length < 2) return pts;
      const vectors = pts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
      const curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal', 0.5);
      // Sample at enough points for smooth appearance
      const samples = Math.max(pts.length * 4, 60);
      return curve.getPoints(samples).map((v) => [v.x, v.y, v.z]);
    };

    const strand0Points = interpolateStrand(s0);
    const strand1Points = interpolateStrand(s1);

    // Build rungs: pair nearest Y-neighbors from each strand at regular intervals
    const rungs = [];
    if (s0.length >= 2 && s1.length >= 2) {
      // Walk strand0 at every 4th node and find closest strand1 node by Y
      const step = Math.max(1, Math.floor(s0.length / Math.ceil(s0.length / 4)));
      for (let i = 0; i < s0.length; i += step) {
        const p0 = s0[i];
        // Find closest s1 point by Y distance
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
          rungs.push([p0, bestPt]);
        }
      }
    }

    return { strand0Points, strand1Points, rungs };
  }, [positions]);

  // Build colored node markers at each helix node position
  const markerGeometry = useMemo(() => {
    if (!positions || positions.length === 0) return null;

    const count = positions.length;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const node = positions[i];
      pos[i * 3] = node.x;
      pos[i * 3 + 1] = node.y;
      pos[i * 3 + 2] = node.z;

      const color = getNodeColor(node);
      const sig = node.significance ?? 0.5;
      tempColor.set(color).multiplyScalar(0.6 + sig * 0.6);
      col[i * 3] = tempColor.r;
      col[i * 3 + 1] = tempColor.g;
      col[i * 3 + 2] = tempColor.b;

      // Size scaled by significance — subtle range
      sz[i] = 3.0 + sig * 4.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    return geo;
  }, [positions]);

  const markerMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: markerVertexShader,
      fragmentShader: markerFragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  if (disabled || (strand0Points.length < 2 && strand1Points.length < 2)) return null;

  return (
    <group>
      {/* Strand 0 rail */}
      {strand0Points.length >= 2 && (
        <Line
          points={strand0Points}
          color={[0.3, 0.6, 1.0]}
          lineWidth={1.2}
          transparent
          opacity={0.12}
          toneMapped={false}
        />
      )}

      {/* Strand 1 rail */}
      {strand1Points.length >= 2 && (
        <Line
          points={strand1Points}
          color={[1.0, 0.4, 0.7]}
          lineWidth={1.2}
          transparent
          opacity={0.12}
          toneMapped={false}
        />
      )}

      {/* Rungs connecting the two strands */}
      {rungs.map((pair, i) => (
        <Line
          key={`rung-${i}`}
          points={pair}
          color={[0.7, 0.7, 1.0]}
          lineWidth={0.6}
          transparent
          opacity={0.06}
          toneMapped={false}
        />
      ))}

      {/* Colored node markers along the backbone */}
      {markerGeometry && (
        <points geometry={markerGeometry} material={markerMaterial} />
      )}
    </group>
  );
}
