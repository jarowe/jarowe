/**
 * Maps constellation node IDs to memory scene IDs.
 *
 * Portal-eligible nodes get a visual marker in the 3D scene and an
 * "Enter Memory" CTA in the StoryPanel. When triggered, the constellation
 * page fires the PortalVFX sequence and navigates to /memory/:sceneId.
 *
 * Validation: getPortalSceneId() cross-checks the scene registry's
 * portalEntry flag, so a mapping to a scene that exists but doesn't
 * support portal flow will return null.
 */

import { getSceneById } from '../../data/memoryScenes';

const NODE_TO_SCENE = {
  // Syros Greece cave — worldschooling milestone
  'ms-015': 'syros-cave',
};

/**
 * Get the memory scene ID for a constellation node, if the scene
 * exists and supports portal entry. Returns null otherwise.
 */
export function getPortalSceneId(nodeId) {
  const sceneId = NODE_TO_SCENE[nodeId];
  if (!sceneId) return null;
  const scene = getSceneById(sceneId);
  if (!scene || !scene.portalEntry) return null;
  return sceneId;
}

/**
 * Check whether a node is a portal node (validated against scene registry).
 */
export function isPortalNode(nodeId) {
  return getPortalSceneId(nodeId) !== null;
}

/**
 * Get all validated portal node IDs (for visual markers in the 3D scene).
 */
export function getPortalNodeIds() {
  const ids = new Set();
  for (const nodeId of Object.keys(NODE_TO_SCENE)) {
    if (isPortalNode(nodeId)) ids.add(nodeId);
  }
  return ids;
}
