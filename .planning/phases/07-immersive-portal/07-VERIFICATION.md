---
phase: 07-immersive-portal
verified: 2026-03-21T22:00:00Z
status: gaps_found
score: 6/9 must-haves verified
re_verification: false
gaps:
  - truth: "The splat scene is reachable from the globe through a portal-style camera transition (flythrough, dissolve, or dimensional shader) -- not a hard page cut"
    status: partial
    reason: "Navigation from globe to memory portal uses View Transitions API CSS cross-fade, which is a smooth page-level transition but does NOT satisfy the PORTAL-02 requirement for a 3D-style camera flythrough, dissolve, or dimensional shader. The REQUIREMENTS.md traceability table still marks PORTAL-02 as Pending with [ ]."
    artifacts:
      - path: "src/pages/Home.jsx"
        issue: "handleMemoryPointClick uses navigateWithTransition (CSS cross-fade) -- no 3D camera flythrough or shader dissolve effect"
    missing:
      - "A portal-style transition: either a CSS/WebGL dissolve animation on the globe, a camera zoom-in animation before navigation, or a view-transition-name that creates a morphing effect between the globe point and the splat viewer"
      - "Update REQUIREMENTS.md to mark PORTAL-02 as complete once a portal-style visual effect is added, OR obtain explicit sign-off that View Transitions cross-fade satisfies the requirement"

  - truth: "Visiting /memory/[scene-name] shows a dynamic OG image with the splat scene preview"
    status: partial
    reason: "The /memory/:sceneId route has a dynamic OG template (MemoryTemplate) and the OG meta tags update correctly. However, PORTAL-04 specifies 'dynamic OG image showing splat scene preview' -- the MemoryTemplate generates a generic cinematic dark gradient card. It does not show the actual splat scene preview image (scene.previewImage). The REQUIREMENTS.md traceability table still marks PORTAL-04 as Pending."
    artifacts:
      - path: "api/og.js"
        issue: "MemoryTemplate renders a generic dark gradient with glow particles -- does not use scene.previewImage or any scene-specific visual content from the actual splat"
    missing:
      - "The MemoryTemplate in api/og.js should incorporate the scene's previewImage as a background, OR the requirement should be explicitly accepted as met by the cinematic template approach"
      - "Update REQUIREMENTS.md traceability table to mark PORTAL-04 as Complete once accepted"
---

# Phase 7: Immersive Portal Verification Report

**Phase Goal:** One flagship gaussian splat memory capsule gives the site a "wow" moment worth sharing -- a volumetric 3D scene of a meaningful place, reachable through a portal transition, with soundtrack and narrative
**Verified:** 2026-03-21
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Gaussian splat scene renders in browser on capable desktop devices | VERIFIED | MemoryPortal.jsx L56-116: dynamic import of @mkkellogg/gaussian-splats-3d, Viewer initialized with scene config, addSplatScene called with bonsai ksplat URL |
| 2 | Mobile/low-capability devices see static fallback (not crash/blank) | VERIFIED | gpuCapability.js fully implemented with WebGL2, texture size, GPU renderer, and mobile memory checks; MemoryPortal L235-255 renders fallback with previewImage + desktop prompt when capable===false |
| 3 | Narrative text cards fade in sequentially telling the story | VERIFIED | MemoryPortal.jsx L146-156: setTimeout timers per card.delay; AnimatePresence + motion.div with opacity/y animation at L172-189 |
| 4 | Soundtrack auto-plays muted with unmute prompt and 2s fade-in | PARTIALLY VERIFIED | Howl implementation correct (L119-143, L159-168, handleUnmute with .fade(0, 0.6, 2000)). Unverifiable end-to-end: placeholder scene has `soundtrack: null`, so Howl is never created for the current scene. Soundtrack path for real scenes is wired correctly. |
| 5 | Scene metadata registry is extensible (new scene = new entry only) | VERIFIED | memoryScenes.js: single array, getSceneById resolves by id with fallback, component reads scene dynamically via useParams |
| 6 | /memory/placeholder-scene loads as a cold direct URL | VERIFIED | App.jsx L376-380: lazy route `/memory/:sceneId` with Suspense, lazyRetry import. Route does not depend on home navigation. |
| 7 | OG meta tags update when navigating to /memory/* routes | VERIFIED | App.jsx L216-219: path.startsWith('/memory/') branch sets title + description correctly |
| 8 | Globe has a visible portal entry point that navigates with a smooth portal-style transition | PARTIAL | Globe point marker exists (memoryPoints, pointsData, onPointClick wired). CTA button exists. BUT transition is View Transitions API cross-fade only -- not a flythrough, dissolve, or dimensional shader as required by PORTAL-02 |
| 9 | Sharing /memory/[scene-name] produces a social preview card with scene preview | PARTIAL | MemoryTemplate exists in api/og.js and getTemplateForRoute matches /memory/* routes. BUT template shows generic dark gradient, not scene.previewImage. PORTAL-04 specifies "showing splat scene preview" which is not met. |

**Score:** 6/9 truths verified (7 verified + 2 partial)

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/data/memoryScenes.js` | VERIFIED | Exports `getSceneById` and default `scenes` array. 1 placeholder scene with all required fields. `splatIsRemote: true` flag for remote URLs. 49 lines. |
| `src/utils/gpuCapability.js` | VERIFIED | Exports `canRenderSplat`. WebGL2 check, MAX_TEXTURE_SIZE proxy, GPU renderer string list, mobile+memory heuristic. 53 lines. |
| `src/pages/MemoryPortal.jsx` | VERIFIED | 269 lines, well above 120 minimum. Dynamic import of splat library, viewer lifecycle with dispose, narrative timers, Howl conditional creation, fallback branch, proper cleanup. |
| `src/pages/MemoryPortal.css` | VERIFIED | 201 lines, well above 60 minimum. All required classes present: .memory-portal, .memory-splat-container, .memory-loading, .memory-narrative, .memory-narrative-card, .memory-unmute, .memory-back, .memory-title, .memory-fallback, .memory-fallback-prompt, mobile media query. |
| `src/App.jsx` | VERIFIED | L39: MemoryPortal lazyRetry import. L376-380: /memory/:sceneId route with Suspense. L216-219: OG meta update for /memory/* paths. |
| `api/og.js` | PARTIAL | MemoryTemplate function exists (L370-428) and is wired in getTemplateForRoute (L437-441). Template is generic cinematic card -- does not use scene.previewImage. |
| `src/pages/Home.jsx` | PARTIAL | memoryScenes imported (L51), memoryPoints array built (L168-175), handleMemoryPointClick callback (L4171-4176), globe pointsData wired (L6792-6797), CTA button present (L6946-6955). Transition is cross-fade only. |
| `src/pages/Home.css` | VERIFIED | .memory-portal-cta (L494), .memory-portal-cta:hover (L516), .portal-glow (L523), @keyframes portal-pulse (L531). |
| `public/images/memory/placeholder-preview.jpg` | VERIFIED | File exists (confirmed via artifact check) |
| `@mkkellogg/gaussian-splats-3d` | VERIFIED | v0.4.7 installed, appears in package.json L25 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| MemoryPortal.jsx | memoryScenes.js | `getSceneById(sceneId)` import | WIRED | L6: import; L31: called with sceneId from useParams |
| MemoryPortal.jsx | @mkkellogg/gaussian-splats-3d | `import(...)` dynamic | WIRED | L62: dynamic import inside capable===true effect; `new GaussianSplats3D.Viewer(...)` L65 |
| MemoryPortal.jsx | gpuCapability.js | `canRenderSplat()` on mount | WIRED | L7: import; L52: called in useEffect, result sets capable state |
| MemoryPortal.jsx | Howler.js | `new Howl(...)` | WIRED (conditional) | L4: import Howl; L119-143: Howl creation guarded by scene.soundtrack truthy check. Correct for placeholder. |
| App.jsx | MemoryPortal.jsx | lazyRetry + Route element | WIRED | L39: const MemoryPortal = lazyRetry(...); L376: Route path="/memory/:sceneId" |
| App.jsx | OG meta tags | useEffect path.startsWith('/memory/') | WIRED | L216-219: title + description set for /memory/* paths |
| api/og.js | MemoryTemplate | getTemplateForRoute route matching | WIRED | L437-441: /memory/ route → MemoryTemplate with sceneName |
| Home.jsx | /memory/placeholder-scene | navigateWithTransition on click | WIRED | L4173: navigateWithTransition(navigate, `/memory/${point.sceneId}`); L6949: same for CTA button |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PORTAL-01 | 07-01 | One gaussian splat scene viewable in the site | PARTIAL | Viewer renders via @mkkellogg/gaussian-splats-3d. Using `.ksplat` format (bonsai demo), NOT `.spz` format. Not a personally meaningful location -- placeholder only. Context note explicitly allows placeholder. REQUIREMENTS.md marks as `[x]` complete. |
| PORTAL-02 | 07-02 | Splat accessible from globe with portal-style camera transition | PARTIAL - OPEN GAP | Globe entry point exists and CTA button works. Transition is View Transitions API cross-fade (CSS). NOT a flythrough, dissolve, or dimensional shader. REQUIREMENTS.md marks as `[ ]` Pending. Traceability table shows "Pending". |
| PORTAL-03 | 07-01 | Soundtrack auto-plays + narrative text overlay | VERIFIED (conditional) | Howl implementation complete with muted autoplay + 2s fade-in. Narrative AnimatePresence timers working. Placeholder has `soundtrack: null` so Howl doesn't run -- by design. Real scenes with a soundtrack path will work. REQUIREMENTS.md marks as `[x]` complete. |
| PORTAL-04 | 07-02 | Direct shareable URL with dynamic OG image showing splat scene preview | PARTIAL - OPEN GAP | URL `/memory/:sceneId` works. OG template exists and is routed. Template uses generic cinematic gradient, NOT scene.previewImage. Requirement says "showing splat scene preview." REQUIREMENTS.md marks as `[ ]` Pending. Traceability table shows "Pending." |

### Orphaned Requirements

No orphaned requirements. All four PORTAL requirements (PORTAL-01 through PORTAL-04) are claimed by plans 07-01 and 07-02.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/data/memoryScenes.js` | 25 | `soundtrack: null` | Info | By design -- placeholder has no audio. Comment documents intent. No risk. |
| `src/data/memoryScenes.js` | 19-22 | `splatUrl` is remote Hugging Face URL for bonsai demo | Info | By design per context note -- placeholder to be replaced with real capture. No blank screen risk since fallback catches load errors. |
| `src/pages/MemoryPortal.jsx` | 200 | `{scene.soundtrack && soundReady && ...}` | Info | Unmute button never renders for placeholder scene (soundtrack is null). This is correct behavior -- not a bug. |

No blocker or warning anti-patterns found. All placeholder patterns are intentional and documented.

---

## Human Verification Required

### 1. Splat Rendering on Desktop

**Test:** Navigate to `/memory/placeholder-scene` on a desktop browser with a capable GPU. Allow 10-30 seconds for the bonsai ksplat to download from Hugging Face.
**Expected:** 3D bonsai scene renders with orbit controls. Loading spinner appears first, then gives way to the 3D scene. Narrative cards appear at 2s, 6s, 11s.
**Why human:** Requires live browser rendering of the WebGL2 gaussian splat viewer. Cannot verify network download of remote asset programmatically.

### 2. Mobile Fallback

**Test:** Open `/memory/placeholder-scene` on a mobile device (or Chrome DevTools mobile emulation with a low-memory profile).
**Expected:** Static preview image fills the viewport. Fallback prompt ("best experienced in 3D") appears. Narrative cards still fade in. No crash.
**Why human:** `canRenderSplat()` reads live WebGL2 context and device memory -- requires actual device to verify the capability gate fires.

### 3. Portal Entry Experience from Globe

**Test:** On the homepage, find the "Enter Memory Portal" button near the globe. Also look for a purple dot on the globe at lat:0, lng:0 (equator/prime meridian). Click either.
**Expected:** Smooth View Transitions cross-fade into the memory portal page. The transition should not be a hard cut.
**Why human:** View Transitions API requires live browser to verify; also validates that the CTA button is visible and findable in the actual rendered layout.

### 4. Wow-Moment Quality

**Test:** Experience the complete portal flow: globe → portal button → memory portal → narrative cards → orbit the 3D scene.
**Expected:** The experience feels like a genuine "wow moment worth sharing" -- not a tech demo. The narrative cards add emotional weight. The 3D scene is immersive.
**Why human:** Subjective experiential quality cannot be verified programmatically. This is the core phase goal.

---

## Gaps Summary

### Gap 1: PORTAL-02 -- Transition type

The plan deliberated decided to use View Transitions API cross-fade as the portal transition, citing that implementing a true camera flythrough or shader dissolve "would require both pages to be rendered simultaneously in WebGL, which is impractical with two separate Three.js contexts."

The REQUIREMENTS.md traceability table still shows PORTAL-02 as Pending, and the requirement text explicitly calls out "flythrough, dissolve, or dimensional shader." A cross-fade is smooth and functional, but it does not meet the literal requirement text.

**Decision needed:** Either (a) add a CSS dissolve/ripple animation to the View Transitions that creates a "portal feel" and mark PORTAL-02 as satisfied, or (b) explicitly accept the cross-fade as the portal transition and update the requirements table to `[x]` / Complete.

### Gap 2: PORTAL-04 -- OG image content

The OG template is wired and functional, but it shows a generic cinematic card rather than the actual scene preview image. The `scene.previewImage` path is available in the scene registry but is not passed to the OG function (the OG function only receives `route`, not scene metadata).

**Decision needed:** Either (a) pass `?preview=` or `?title=` query params to the OG endpoint and incorporate `scene.previewImage` in the MemoryTemplate, or (b) accept the cinematic template as the "dynamic OG image" and update REQUIREMENTS.md.

### Common Root Cause

Both gaps stem from the same pattern: the plan correctly implemented functional equivalents of the requirements (cross-fade instead of shader transition, cinematic template instead of preview screenshot), but the REQUIREMENTS.md traceability table was not updated to reflect acceptance. These may be intentional design decisions that simply need sign-off, or they may need implementation work.

---

_Verified: 2026-03-21_
_Verifier: Claude (gsd-verifier)_
