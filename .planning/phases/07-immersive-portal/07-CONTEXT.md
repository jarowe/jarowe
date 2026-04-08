# Phase 7: Immersive Portal - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

One flagship gaussian splat memory capsule with portal transition, soundtrack, narrative, shareable URL, and mobile fallback. Infrastructure-first: build the complete viewer system with a placeholder scene, ready for real capture data swap.

</domain>

<decisions>
## Implementation Decisions

### Splat Viewer
- `@mkkellogg/gaussian-splats-3d` — standalone Three.js viewer, supports .ply/.splat/.spz
- Works with existing R3F setup in the project
- Placeholder: real licensed splat asset (SPZ or compressed PLY) for representative performance testing

### Portal Transition
- Camera flythrough with dissolve shader — globe/constellation zooms toward portal point, dissolves into splat scene
- Uses existing View Transitions API as wrapper (from Phase 3)
- Not a hard page cut — smooth cinematic transition

### Scene Metadata
- `src/data/memoryScenes.js` — scene registry with shape: `{ id, title, location, narrative: [{ text, delay }], soundtrack, coordinates, previewImage }`
- Extensible for future scenes — same metadata shape for all
- Placeholder scene uses same asset loading path as real scenes

### Narrative Overlay
- Semi-transparent text cards that fade in sequentially with configurable delays
- Positioned bottom-left, not blocking the scene
- Minimal UI: title, narrative text, back button

### Soundtrack
- Auto-play muted with "unmute" prompt (browser autoplay policy)
- Uses existing Howler.js AudioProvider pattern
- Fades in over 2s when unmuted

### OG Social Preview
- Extend existing `/api/og` Vercel Function with `memory` template
- Uses scene's `previewImage` field for card background
- `/memory/[scene-name]` route is directly shareable

### Mobile Fallback
- Capability-based detection (not just viewport) — if device can't sustain splat, show fallback
- Static panoramic image with narrative text and "View in 3D on desktop" prompt
- Preserves meaning without crashing mobile GPUs

### Claude's Discretion
No items deferred — all areas decided.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/viewTransitions.js` — View Transitions API wrapper (Phase 3)
- `src/context/AudioContext.jsx` — Howler.js AudioProvider for soundtrack
- `api/og.js` — Existing OG image Vercel Function (extend with memory template)
- `src/App.jsx` — Route definitions and lazy loading patterns

### Established Patterns
- React.lazy() + Suspense for heavy components
- `import.meta.env.BASE_URL` for asset paths
- Framer Motion for animations
- Glass-panel aesthetic for UI overlays

### Integration Points
- `src/App.jsx` — Add `/memory/:sceneId` route
- `api/og.js` — Add memory template
- Globe/constellation — Portal entry point (click handler → transition → navigate)

</code_context>

<specifics>
## Specific Ideas

- Placeholder must be a real splat file in the same format expected for production (SPZ/compressed PLY)
- Mobile fallback should be capability-based, not just viewport-based
- Scene data shape must be designed for extensibility (future scenes)

</specifics>

<deferred>
## Deferred Ideas

- Additional memory scenes (capture more locations later)
- VR/WebXR mode for splat scenes (EXP-07)

</deferred>
