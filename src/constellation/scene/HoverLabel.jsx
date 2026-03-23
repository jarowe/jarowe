import { Billboard, Text } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useConstellationStore } from '../store';

/** Color mapping for node types */
const TYPE_COLORS = {
  milestone: '#FFD700',
  person: '#4FC3F7',
  moment: '#AB47BC',
  idea: '#66BB6A',
  project: '#FF7043',
  place: '#26C6DA',
  track: '#34d399',
};

/** Capitalize first letter */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Format date as "Mon DD, YYYY" */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
}

/**
 * 3D billboard hover label — only renders when the WebGL context is healthy.
 * When the context is lost/degraded, returns null and the DOM-based
 * DomHoverLabel in ConstellationPage takes over as fallback.
 */
export default function HoverLabel({ nodes }) {
  const gl = useThree((s) => s.gl);
  const hoveredNodeIdx = useConstellationStore((s) => s.hoveredNodeIdx);

  if (hoveredNodeIdx === null || !nodes || hoveredNodeIdx >= nodes.length) {
    return null;
  }

  // Guard: don't render 3D text if WebGL context is lost — DOM fallback handles it
  try {
    const ctx = gl.getContext();
    if (!ctx || ctx.isContextLost()) return null;
  } catch {
    return null;
  }

  const node = nodes[hoveredNodeIdx];
  const yOffset = node.size + 1.5;
  const typeColor = TYPE_COLORS[node.type] || '#AAAAAA';

  return (
    <Billboard follow position={[node.x, node.y + yOffset, node.z]}>
      <group>
        <Text
          fontSize={1.2}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.05}
          outlineColor="black"
          maxWidth={20}
          position={[0, 0, 0]}
        >
          {node.title}
        </Text>
        <Text
          fontSize={0.7}
          color={typeColor}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.05}
          outlineColor="black"
          maxWidth={20}
          position={[0, -1.4, 0]}
        >
          {capitalize(node.type)}
        </Text>
        {node.date && (
          <Text
            fontSize={0.6}
            color="rgba(255,255,255,0.6)"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.05}
            outlineColor="black"
            maxWidth={20}
            position={[0, -2.4, 0]}
          >
            {formatDate(node.date)}
          </Text>
        )}
      </group>
    </Billboard>
  );
}
