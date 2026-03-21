---
phase: 05-starseed-hub-labs
plan: 02
subsystem: ui
tags: [milkdown, excalidraw, markdown-editor, canvas, localStorage, lazy-loading, vite]

# Dependency graph
requires:
  - phase: 05-starseed-hub-labs/01
    provides: "Starseed hub shell with campaign-shell pattern and nav chrome"
provides:
  - "Milkdown markdown scratchpad at /starseed/labs/scratchpad with auto-save"
  - "Excalidraw infinite canvas at /starseed/labs/canvas with persistence"
  - "Shared useAutoSave hook for debounced localStorage save/load"
  - "Vite es2022 optimizeDeps config for Excalidraw ESM compatibility"
  - "Lazy-loaded routes for both Labs tools in App.jsx"
affects: [05-starseed-hub-labs/03]

# Tech tracking
tech-stack:
  added: ["@milkdown/crepe", "@milkdown/react", "@excalidraw/excalidraw"]
  patterns: ["debounced-localStorage-auto-save", "lazy-route-per-tool", "query-param-prompt-preloading"]

key-files:
  created:
    - "src/hooks/useAutoSave.js"
    - "src/pages/labs/Scratchpad.jsx"
    - "src/pages/labs/Scratchpad.css"
    - "src/pages/labs/Canvas.jsx"
    - "src/pages/labs/Canvas.css"
  modified:
    - "vite.config.js"
    - "src/App.jsx"
    - "package.json"

key-decisions:
  - "Disabled Milkdown CodeMirror, Latex, and ImageBlock features to reduce bundle size"
  - "Canvas persists only 5 essential appState fields (theme, viewBackgroundColor, zoom, scrollX, scrollY) to avoid serializing transient UI state"
  - "Named Canvas lazy import LabsCanvas to avoid potential name conflicts in App.jsx"
  - "Deferred LabsHub route to Plan 03 (when LabsHub.jsx is created)"

patterns-established:
  - "Labs page shell: replicate starseed-nav chrome from Starseed.jsx, import Starseed.css for consistency"
  - "useAutoSave hook: reusable debounced localStorage save/load with configurable key and delay"
  - "Excalidraw collaborators Map reset on load: JSON.stringify breaks Maps, must reconstruct"

requirements-completed: [LABS-01, LABS-02, LABS-03]

# Metrics
duration: 9min
completed: 2026-03-21
---

# Phase 05 Plan 02: Labs Creation Tools Summary

**Milkdown markdown scratchpad and Excalidraw infinite canvas with localStorage auto-save, lazy-loaded routes, and Vite es2022 config**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-21T09:11:14Z
- **Completed:** 2026-03-21T09:20:24Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Milkdown Crepe scratchpad at /starseed/labs/scratchpad with dark Starseed theme, 2s debounced auto-save, and prompt pre-loading from query params (existing draft takes priority)
- Excalidraw infinite canvas at /starseed/labs/canvas with dark theme, localStorage persistence of drawings, and Map collaborators reset on load
- Shared useAutoSave hook for debounced localStorage save/load, reusable across Labs tools
- Vite configured with es2022 target for Excalidraw ESM compatibility
- Both editors are fully lazy-loaded via lazyRetry() -- zero code loaded on non-Labs routes

## Task Commits

Each task was committed atomically:

1. **Task 1: Install deps, configure Vite, create useAutoSave hook, build Scratchpad** - `3b9df43` (feat)
2. **Task 2: Create Excalidraw Canvas page and wire both Labs routes in App.jsx** - `332f7b6` (feat)

## Files Created/Modified
- `vite.config.js` - Added optimizeDeps.esbuildOptions.target: 'es2022' for Excalidraw ESM
- `src/hooks/useAutoSave.js` - Shared debounced localStorage save/load hook
- `src/pages/labs/Scratchpad.jsx` - Milkdown Crepe editor page with dark theme, auto-save, prompt pre-loading
- `src/pages/labs/Scratchpad.css` - Dark Starseed theme overrides for Milkdown frame theme
- `src/pages/labs/Canvas.jsx` - Excalidraw canvas page with dark theme, localStorage persistence
- `src/pages/labs/Canvas.css` - Full-height container with Excalidraw color overrides
- `src/App.jsx` - Added lazy imports and routes for /starseed/labs/scratchpad and /starseed/labs/canvas
- `package.json` - Added @milkdown/crepe, @milkdown/react, @excalidraw/excalidraw

## Decisions Made
- Disabled Milkdown CodeMirror, Latex, and ImageBlock features to keep bundle lean
- Canvas persists only 5 essential appState fields to avoid serializing transient Excalidraw UI state
- Named Canvas import `LabsCanvas` in App.jsx to avoid potential conflicts
- Deferred `/starseed/labs` hub route to Plan 03 (when LabsHub.jsx is created)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both editor tools functional and lazy-loaded
- Ready for Plan 03 to create the LabsHub index page linking to these tools
- useAutoSave hook available for any future Labs tools that need localStorage persistence

## Self-Check: PASSED

- All 5 created files verified on disk
- Both commits (3b9df43, 332f7b6) verified in git log
- Build succeeds (exit code 0)

---
*Phase: 05-starseed-hub-labs*
*Completed: 2026-03-21*
