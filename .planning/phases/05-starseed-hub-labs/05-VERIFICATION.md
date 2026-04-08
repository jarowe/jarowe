---
phase: 05-starseed-hub-labs
verified: 2026-03-21T16:13:32Z
status: human_needed
score: 7/8 must-haves verified
human_verification:
  - test: "Visit https://starseed.llc (or verify Vercel dashboard shows domain added)"
    expected: "starseed.llc redirects to jarowe.com/starseed with a permanent 308 redirect"
    why_human: "STAR-07 is a Vercel dashboard DNS configuration — no code to verify programmatically. User explicitly deferred this."
---

# Phase 5: Starseed Hub + Labs Verification Report

**Phase Goal:** Starseed becomes a real, professional creation destination -- visitors can browse active projects, contact Jared for business, and open creation tools (scratchpad, canvas) within the Starseed brand
**Verified:** 2026-03-21T16:13:32Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Visitor sees 4 project cards (BEAMY, AMINA, DECKIT, Starseed Labs) with icons, descriptions, and tags on /starseed | VERIFIED | `Starseed.jsx` maps over `STARSEED_PROJECTS` (4 entries); each has icon, description, tags rendered |
| 2 | BEAMY card links to /projects/beamy, Labs card to /starseed/labs; AMINA and DECKIT show "Coming soon" | VERIFIED | `starseedProjects.js`: BEAMY url=`/projects/beamy`, Labs url=`/starseed/labs`; AMINA/DECKIT url=null, status=`coming-soon` |
| 3 | A contact/inquiry section with mailto:jared@starseed.llc exists below the project grid | VERIFIED | `Starseed.jsx` line 102: `<a href="mailto:jared@starseed.llc">`, `.starseed-contact` section present |
| 4 | starseed.llc DNS redirects to jarowe.com/starseed | HUMAN NEEDED | User deferred this (Vercel dashboard config, no code change). Marked human_needed per project instructions. |
| 5 | Visitor can open /starseed/labs/scratchpad and type markdown that auto-saves to localStorage | VERIFIED | `Scratchpad.jsx`: `MilkdownProvider` wraps `MilkdownEditor`, `useAutoSave(STORAGE_KEY, 2000)` wired to `handleContentChange`, key=`jarowe_labs_scratchpad` |
| 6 | Visitor can open /starseed/labs/canvas and draw on an Excalidraw canvas that persists to localStorage | VERIFIED | `Canvas.jsx`: `Excalidraw` component present, `handleChange` debounces 2s write to `localStorage.setItem(STORAGE_KEY, ...)`, key=`jarowe_labs_canvas` |
| 7 | Neither Milkdown nor Excalidraw loads on non-Labs routes | VERIFIED | All three imports use `lazyRetry(() => import('./pages/labs/...'))` pattern in `App.jsx`; Excalidraw and Milkdown only imported inside lazy-loaded modules |
| 8 | Homepage "Start in Starseed" CTA links to /starseed/labs/scratchpad with the creative prompt pre-loaded | VERIFIED | `TodayRail.jsx` line 134: `to={\`/starseed/labs/scratchpad?prompt=${encodeURIComponent(todayData.prompt.text)}\`}` |

**Score:** 7/8 truths verified (1 human_needed, 0 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/data/starseedProjects.js` | 4-project array with id, name, description, icon, tags, url, status | VERIFIED | 39 lines, exports `STARSEED_PROJECTS` with all required fields for all 4 projects |
| `src/pages/Starseed.jsx` | Data-driven cards + contact section | VERIFIED | Imports `STARSEED_PROJECTS`, maps over it at line 45, contact section at line 97-106 |
| `src/pages/Starseed.css` | Contact section styles | VERIFIED | `.starseed-contact`, `.starseed-contact__text`, `.starseed-contact__link` at lines 217+ |
| `vite.config.js` | Excalidraw ESM compatibility | VERIFIED | `optimizeDeps.esbuildOptions.target: 'es2022'` at line 10 |
| `src/hooks/useAutoSave.js` | Shared debounced localStorage hook | VERIFIED | Exports `useAutoSave`, 29 lines, full implementation with debounce, save/load, cleanup |
| `src/pages/labs/Scratchpad.jsx` | Milkdown editor with auto-save and prompt pre-loading | VERIFIED | Contains `MilkdownProvider`, `Crepe`, `useAutoSave`, `jarowe_labs_scratchpad`; prompt pre-load with draft-first hygiene |
| `src/pages/labs/Scratchpad.css` | Dark theme overrides for Milkdown | VERIFIED | `.scratchpad-editor-container` present, 70 lines of theme overrides |
| `src/pages/labs/Canvas.jsx` | Excalidraw canvas with localStorage persistence | VERIFIED | Contains `Excalidraw`, `jarowe_labs_canvas`, `collaborators = new Map()`, partial appState save |
| `src/pages/labs/Canvas.css` | Full-height container | VERIFIED | `height: calc(100vh - 64px)` on `.canvas-editor-container` |
| `src/pages/labs/LabsHub.jsx` | 3-card hub under Starseed shell | VERIFIED | Contains `starseed-shell`, `data-brand="starseed"`, 3 cards (scratchpad/canvas/brainstorm) |
| `src/pages/labs/LabsHub.css` | Glass card grid | VERIFIED | `labs-hub-grid`, `labs-hub-card`, `labs-hub-card--disabled` all present |
| `src/App.jsx` | Lazy-loaded routes for all 3 Labs paths | VERIFIED | All three `lazyRetry` imports + routes for `/starseed/labs`, `/starseed/labs/scratchpad`, `/starseed/labs/canvas` |
| `src/components/TodayRail.jsx` | Updated CTA with prompt param | VERIFIED | `encodeURIComponent(todayData.prompt.text)` wired to scratchpad URL |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Starseed.jsx` | `starseedProjects.js` | `import STARSEED_PROJECTS` | WIRED | Line 4: `import { STARSEED_PROJECTS } from '../data/starseedProjects'`; used at line 45 |
| `Starseed.jsx` | `/projects/beamy` | `navigate(project.url)` | WIRED | `handleClick` calls `navigate(project.url)` for internal URLs; BEAMY.url = `/projects/beamy` |
| `Starseed.jsx` | `/starseed/labs` | `navigate(project.url)` | WIRED | Labs project.url = `/starseed/labs`, same click handler |
| `App.jsx` | `labs/Scratchpad.jsx` | `lazyRetry(() => import('./pages/labs/Scratchpad'))` | WIRED | Line 35: exact pattern; route wired at line 290 |
| `App.jsx` | `labs/Canvas.jsx` | `lazyRetry(() => import('./pages/labs/Canvas'))` | WIRED | Line 36 as `LabsCanvas`; route wired at line 295 |
| `App.jsx` | `labs/LabsHub.jsx` | `lazyRetry(() => import('./pages/labs/LabsHub'))` | WIRED | Line 37; route wired at line 285 |
| `Scratchpad.jsx` | `localStorage` | `useAutoSave('jarowe_labs_scratchpad')` | WIRED | `useAutoSave(STORAGE_KEY, 2000)` → `save(markdown)` in `handleContentChange` |
| `Canvas.jsx` | `localStorage` | `debounced onChange handler` | WIRED | `handleChange` debounces 2s write with `localStorage.setItem(STORAGE_KEY, ...)` |
| `LabsHub.jsx` | `/starseed/labs/scratchpad` | `<Link to={tool.url}>` | WIRED | `tool.url = '/starseed/labs/scratchpad'`, `Link` component at line 90 |
| `LabsHub.jsx` | `/starseed/labs/canvas` | `<Link to={tool.url}>` | WIRED | `tool.url = '/starseed/labs/canvas'`, same `Link` component |
| `TodayRail.jsx` | `/starseed/labs/scratchpad` | `Link with prompt query param` | WIRED | Line 134: full `encodeURIComponent` URL with prompt param |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| STAR-02 | 05-01-PLAN | Project cards display active projects with icons, descriptions, tags | SATISFIED | `Starseed.jsx` renders 4 data-driven cards with icon (via ICON_MAP), description, and tags array |
| STAR-05 | 05-01-PLAN | Contact section for business inquiries with form or mailto | SATISFIED | `<section className="starseed-contact">` with `<a href="mailto:jared@starseed.llc">` |
| STAR-06 | 05-01-PLAN | Each project card links to its detail page or external URL | SATISFIED | BEAMY links to `/projects/beamy`, Labs links to `/starseed/labs`; AMINA/DECKIT have null URLs and `starseed-card--disabled` styling |
| STAR-07 | 05-01-PLAN | starseed.llc DNS redirects to jarowe.com/starseed | NEEDS HUMAN | User explicitly deferred (Vercel dashboard action, not code). Code is ready; DNS config pending. |
| LABS-01 | 05-02-PLAN | `/starseed/labs/scratchpad` with Milkdown editor and localStorage auto-save | SATISFIED | `Scratchpad.jsx` has full Milkdown Crepe editor, `useAutoSave` wired, storage key confirmed |
| LABS-02 | 05-02-PLAN | `/starseed/labs/canvas` with Excalidraw and localStorage persistence | SATISFIED | `Canvas.jsx` has Excalidraw with `onChange` handler writing to `jarowe_labs_canvas` |
| LABS-03 | 05-02-PLAN | Both editors lazy-loaded, never load on non-Labs routes | SATISFIED | All three Labs modules use `lazyRetry()` in `App.jsx`; no direct imports in Starseed.jsx or App.jsx body |
| LABS-06 | 05-03-PLAN | Labs hub page at /starseed/labs with entry point cards | SATISFIED | `LabsHub.jsx` renders 3 cards (Scratchpad active, Canvas active, Brainstorm coming-soon); route registered in `App.jsx` |

**Note:** REQUIREMENTS.md checkboxes for STAR-02, STAR-05, STAR-06, STAR-07, and LABS-06 still show `[ ]` (unchecked). The code satisfies these requirements; the requirements file needs a documentation update (not a code gap).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | All phase files are clean. No TODOs, FIXMEs, empty implementations, or stub handlers detected. |

The two `return null` occurrences in `Canvas.jsx` (lines 14, 22) are inside `loadSavedScene()` error handling — correct behavior, not stubs.

### Human Verification Required

#### 1. starseed.llc DNS Redirect (STAR-07)

**Test:** Add `starseed.llc` in the Vercel Dashboard under Project Settings → Domains. Configure DNS records at the domain registrar as Vercel instructs. After DNS propagation, run `curl -I https://starseed.llc` from a terminal.
**Expected:** HTTP/1.1 308 Permanent Redirect with `Location: https://jarowe.com/starseed` header
**Why human:** This is a Vercel dashboard + registrar DNS action. No code change is needed — the code is correct. The user explicitly deferred this in Plan 01 (see 05-01-SUMMARY.md "DNS redirect deferred by user").

#### 2. Lazy-load isolation (LABS-03 runtime confirmation)

**Test:** In a browser with DevTools Network tab open, visit `/starseed` (not `/starseed/labs`). Filter by "JS". Navigate to `/starseed/labs/scratchpad` and then `/starseed/labs/canvas`.
**Expected:** On `/starseed`, no Milkdown or Excalidraw chunks load. When navigating to each Labs route, the respective chunk appears then.
**Why human:** Code inspection confirms lazy-loading is correctly wired, but actual chunk split verification requires a browser network trace against the production build.

#### 3. localStorage persistence across reload

**Test:** Visit `/starseed/labs/scratchpad`, type "Hello world", wait 3 seconds, then reload the page.
**Expected:** "Hello world" text is still present (loaded from `jarowe_labs_scratchpad` localStorage key).
**Why human:** Auto-save relies on a 2-second debounce and runtime localStorage — cannot verify without a browser session.

### Gaps Summary

No gaps blocking goal achievement. All code artifacts exist, are substantive (not stubs), and are correctly wired. STAR-07 is deferred by user choice (Vercel dashboard action) and is tracked as human_needed.

The REQUIREMENTS.md file has stale checkboxes (still showing `[ ]` for STAR-02, STAR-05, STAR-06, and LABS-06 even though code is complete). This is a documentation inconsistency, not a code gap.

---

_Verified: 2026-03-21T16:13:32Z_
_Verifier: Claude (gsd-verifier)_
