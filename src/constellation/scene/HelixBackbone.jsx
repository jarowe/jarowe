import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

/**
 * HelixBackbone — two faint luminous spline rails (one per strand)
 * plus subtle rung links every 4th phase step.
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
    </group>
  );
}
