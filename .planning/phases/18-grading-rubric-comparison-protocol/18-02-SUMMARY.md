# Plan 18-02 Summary: Camera Presets & Navigation Bar

**Completed:** 2026-04-05
**Duration:** ~15 min
**Commits:** 3 atomic commits

## What Was Done

### 1. Camera Presets Module (`src/data/cameraPresets.js`)

Defined 7 standardised camera positions (V0-V6) for the grading protocol:

| View | Name | Action |
|------|------|--------|
| V0 | Start | Default camera from meta.json |
| V1 | Right-45 | Orbit 45 degrees clockwise |
| V2 | Right-90 | Orbit 90 degrees clockwise |
| V3 | Rear-180 | Orbit 180 degrees (rear view) |
| V4 | Overhead | 2x height, looking down |
| V5 | Approach | Dolly forward 50% toward target |
| V6 | Ground | 0.3 units above ground plane |

Each preset includes:
- `computeCamera(sceneCam)` function computing position/target/fov
- `id`, `name`, `shortcut`, `description`, `evaluate` metadata
- Export helpers: `getPresetById`, `computePresetCamera`, `buildCameraPresetMessage`

### 2. PostMessage Camera Control (`src/components/WorldMemoryRenderer.jsx`)

Added `PostMessageCameraListener` component inside `WorldExploreControls`:
- Listens for `memory-world:set-camera` postMessage from parent window
- Smoothly transitions camera using ease-out cubic interpolation (~40 frames)
- Sends `memory-world:camera-ready` confirmation when transition completes
- Integrated as a sibling of OrbitControls (inside Fragment)

### 3. Camera Preset Navigation Bar (`src/pages/labs/MemoryWorldLab.jsx`)

Added to the lab UI:
- Horizontal bar of 7 preset buttons above the viewer iframe
- Each button shows View ID (V0-V6) and name
- Active preset highlighted with blue accent
- Transitioning state shown with reduced opacity
- Tooltips show description + evaluation criteria + shortcut
- Keyboard shortcuts: Shift+0 through Shift+6

### 4. Supporting Changes

- **vite.config.js**: Restored full lab API plugin; added `camera` field to scene payload
- **App.jsx**: Added lazy-loaded routes for `/starseed/labs/memory-worlds/:sceneId`
- **MemoryWorldLab.css**: Added camera preset bar styles matching existing lab design

## Verification

- `npx vite build` passes cleanly (3436 modules, 12.93s)
- All 7 presets defined with correct orbital geometry
- postMessage contract: `memory-world:set-camera` (lab -> viewer) and `memory-world:camera-ready` (viewer -> lab)
- Keyboard shortcuts do not conflict with existing grade shortcuts (1-0)

## Files Changed

- `src/data/cameraPresets.js` (new)
- `src/components/WorldMemoryRenderer.jsx` (restored + postMessage listener)
- `src/pages/labs/MemoryWorldLab.jsx` (restored + camera preset bar)
- `src/pages/labs/MemoryWorldLab.css` (restored + preset styles)
- `src/App.jsx` (lab routes added)
- `vite.config.js` (lab API restored + camera field)
