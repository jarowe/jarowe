import { Billboard, Text } from '@react-three/drei';
import { useConstellationStore } from '../store';

/** Color mapping for node types */
const TYPE_COLORS = {
  milestone: '#FFD700',
  person: '#4FC3F7',
  moment: '#AB47BC',
  idea: '#66BB6A',
  project: '#FF7043',
  place: '#26C6DA',
};

/** Format a date string as readable "Mon DD, YYYY" */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Capitalize first letter of a string */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 3D billboard hover label that appears above the hovered node.
 * Shows node title, color-coded type badge, and formatted date.
 */
export default function HoverLabel({ nodes }) {
  const hoveredNodeIdx = useConstellationStore((s) => s.hoveredNodeIdx);

  if (hoveredNodeIdx === null || !nodes || hoveredNodeIdx >= nodes.length) {
    return null;
  }

  const node = nodes[hoveredNodeIdx];
  const yOffset = node.size + 1.5;
  const typeColor = TYPE_COLORS[node.type] || '#AAAAAA';

  return (
    <Billboard follow position={[node.x, node.y + yOffset, node.z]}>
      <group>
        {/* Title */}
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
        {/* Type badge */}
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
        {/* Date */}
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
