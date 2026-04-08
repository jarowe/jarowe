/**
 * Camera Presets for Memory World Grading Protocol
 *
 * 7 standardised camera positions (V0-V6) used to evaluate every world
 * generation family under the same conditions.  Each preset defines a
 * camera *action* relative to the scene's `camera.startPosition` and
 * `camera.startTarget` from meta.json.
 *
 * The `computeCamera` function for each preset takes the scene camera
 * config and returns { position: [x,y,z], target: [x,y,z], fov }.
 *
 * Ref: .planning/research/GRADING-RUBRIC.md §B.1
 */

/**
 * Orbit the camera around the target by the given azimuth (horizontal)
 * and elevation (vertical) angles in degrees.  Returns new position
 * while keeping the target fixed.
 */
function orbitCamera(position, target, azimuthDeg, elevationDeg = 0) {
  const dx = position[0] - target[0];
  const dy = position[1] - target[1];
  const dz = position[2] - target[2];

  const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const currentAzimuth = Math.atan2(dx, dz);
  const currentElevation = Math.asin(dy / r);

  const newAzimuth = currentAzimuth + (azimuthDeg * Math.PI) / 180;
  const newElevation = Math.max(
    -Math.PI / 2 + 0.01,
    Math.min(Math.PI / 2 - 0.01, currentElevation + (elevationDeg * Math.PI) / 180),
  );

  const cosElev = Math.cos(newElevation);
  return [
    target[0] + r * Math.sin(newAzimuth) * cosElev,
    target[1] + r * Math.sin(newElevation),
    target[2] + r * Math.cos(newAzimuth) * cosElev,
  ];
}

/**
 * Move the camera closer to (or further from) the target by a
 * fractional amount.  `fraction = 0.5` moves halfway toward the target.
 */
function dollyCamera(position, target, fraction) {
  return [
    position[0] + (target[0] - position[0]) * fraction,
    position[1] + (target[1] - position[1]) * fraction,
    position[2] + (target[2] - position[2]) * fraction,
  ];
}

// ── Preset definitions ──────────────────────────────────────

export const CAMERA_PRESETS = [
  {
    id: 'V0',
    name: 'Start',
    shortcut: '0',
    description: 'Default camera position from meta.json',
    evaluate: 'First impression. All 5 dimensions at baseline.',
    computeCamera(cam) {
      return {
        position: [...cam.startPosition],
        target: [...cam.startTarget],
        fov: cam.fov ?? 48,
      };
    },
  },
  {
    id: 'V1',
    name: 'Right-45',
    shortcut: '1',
    description: 'Orbit 45 degrees clockwise',
    evaluate: 'Coherence holds? Parallax correct? Subject area visible?',
    computeCamera(cam) {
      return {
        position: orbitCamera(cam.startPosition, cam.startTarget, 45),
        target: [...cam.startTarget],
        fov: cam.fov ?? 48,
      };
    },
  },
  {
    id: 'V2',
    name: 'Right-90',
    shortcut: '2',
    description: 'Orbit 90 degrees clockwise',
    evaluate: 'Seam visibility. Depth edge quality. Exploration range boundary.',
    computeCamera(cam) {
      return {
        position: orbitCamera(cam.startPosition, cam.startTarget, 90),
        target: [...cam.startTarget],
        fov: cam.fov ?? 48,
      };
    },
  },
  {
    id: 'V3',
    name: 'Rear-180',
    shortcut: '3',
    description: 'Orbit 180 degrees (looking back at original camera position)',
    evaluate: 'Back-hemisphere quality. Hallucination quality. Void exposure.',
    computeCamera(cam) {
      return {
        position: orbitCamera(cam.startPosition, cam.startTarget, 180),
        target: [...cam.startTarget],
        fov: cam.fov ?? 48,
      };
    },
  },
  {
    id: 'V4',
    name: 'Overhead',
    shortcut: '4',
    description: 'Birds-eye review angle using scene distance as the height baseline',
    evaluate: 'Ground plane continuity. Floating splat visibility. World coherence from above.',
    computeCamera(cam) {
      const dx = cam.startTarget[0] - cam.startPosition[0];
      const dz = cam.startTarget[2] - cam.startPosition[2];
      const horizontalDistance = Math.hypot(dx, dz) || 1;
      const distance = Math.hypot(
        cam.startPosition[0] - cam.startTarget[0],
        cam.startPosition[1] - cam.startTarget[1],
        cam.startPosition[2] - cam.startTarget[2],
      ) || 4;
      const forwardX = dx / horizontalDistance;
      const forwardZ = dz / horizontalDistance;
      const height = Math.max(distance * 0.65, 1.8);
      const lookAhead = distance * 0.45;
      const position = [
        cam.startTarget[0] - forwardX * distance * 0.1,
        cam.startTarget[1] + height,
        cam.startTarget[2] - forwardZ * distance * 0.1,
      ];
      const target = [
        cam.startTarget[0] + forwardX * lookAhead,
        cam.startTarget[1],
        cam.startTarget[2] + forwardZ * lookAhead,
      ];
      return {
        position,
        target,
        fov: cam.fov ?? 48,
      };
    },
  },
  {
    id: 'V5',
    name: 'Approach',
    shortcut: '5',
    description: 'Dolly forward to 50% of start-to-target distance',
    evaluate: 'Subject area detail. Depth edge quality on approach.',
    computeCamera(cam) {
      return {
        position: dollyCamera(cam.startPosition, cam.startTarget, 0.5),
        target: [...cam.startTarget],
        fov: cam.fov ?? 48,
      };
    },
  },
  {
    id: 'V6',
    name: 'Ground',
    shortcut: '6',
    description: 'Drop camera to 0.3 units above ground, look forward',
    evaluate: 'Ground surface continuity. Thin-shell detection. Immersion test.',
    computeCamera(cam) {
      const groundY = Math.min(cam.startPosition[1], cam.startTarget[1]) - 0.5;
      const groundPos = [
        cam.startPosition[0],
        groundY + 0.3,
        cam.startPosition[2],
      ];
      return {
        position: groundPos,
        target: [cam.startTarget[0], groundY + 0.3, cam.startTarget[2]],
        fov: cam.fov ?? 48,
      };
    },
  },
];

/**
 * Look up a preset by its ID (e.g. 'V0').
 */
export function getPresetById(id) {
  return CAMERA_PRESETS.find((p) => p.id === id) ?? null;
}

/**
 * Compute camera parameters for a given preset ID and scene camera config.
 *
 * @param {string} presetId - 'V0' through 'V6'
 * @param {{ startPosition: number[], startTarget: number[], fov?: number }} sceneCam
 * @returns {{ position: number[], target: number[], fov: number } | null}
 */
export function computePresetCamera(presetId, sceneCam) {
  const preset = getPresetById(presetId);
  if (!preset || !sceneCam?.startPosition || !sceneCam?.startTarget) return null;
  return preset.computeCamera(sceneCam);
}

/**
 * Build the postMessage payload that the lab sends to the viewer iframe
 * to move the camera to a specific preset.
 *
 * @param {string} presetId
 * @param {{ startPosition: number[], startTarget: number[], fov?: number }} sceneCam
 * @returns {{ type: string, preset: string, camera: object } | null}
 */
export function buildCameraPresetMessage(presetId, sceneCam) {
  const camera = computePresetCamera(presetId, sceneCam);
  if (!camera) return null;
  return {
    type: 'memory-world:set-camera',
    preset: presetId,
    camera,
  };
}
