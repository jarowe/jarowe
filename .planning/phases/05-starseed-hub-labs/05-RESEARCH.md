# Phase 05: Starseed Hub & Labs - Research

**Researched:** 2026-03-21
**Domain:** Headless markdown editing (Milkdown), infinite canvas (Excalidraw), Starseed brand integration, Vercel domain redirect
**Confidence:** HIGH

## Summary

Phase 5 transforms the existing Starseed shell (Phase 3 scaffold) into a professional creation hub with real project cards, a contact section, Labs creation tools (Milkdown scratchpad + Excalidraw canvas), and starseed.llc domain redirect. The existing `Starseed.jsx` already has 3 placeholder project cards, the nav chrome, and the escape hatch -- Phase 5 upgrades these to live content and adds the Labs subsystem.

The two heavy editor libraries (Milkdown Crepe ~1.8MB unpacked, Excalidraw ~46MB unpacked but tree-shakable ESM) are well-suited for lazy loading via React.lazy(). Both have React 19 support confirmed. Milkdown v7.19.0 provides the Crepe high-level API with `getMarkdown()` and a listener plugin for auto-save. Excalidraw v0.18.0 (March 2025) moved to ESM format, making it tree-shakable but requiring Vite config additions (`optimizeDeps.esbuildOptions.target: "es2022"`).

**Primary recommendation:** Lazy-load both editors at the route level (not component level), use localStorage with debounced saves, and keep the Starseed shell as the layout wrapper for all `/starseed/*` routes via nested routing.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Align `/starseed` visual identity with starseed.llc branding -- pull brand tokens (colors, fonts, feel) from the actual starseed.llc site, not the current placeholder gold accent (#dbb978)
- 4 projects displayed: BEAMY, AMINA, DECKIT, Starseed Labs -- each with icon, description, tags
- External URLs for live projects, internal `/starseed/labs` for Labs, "Coming soon" badge for unreleased
- Simple mailto link to Jared's business email + brief "Work with Starseed" section (no form backend)
- Add starseed.llc as domain in Vercel Domains dashboard, configure redirect to jarowe.com/starseed (permanent 308, NOT vercel.json)
- Milkdown markdown editor: default toolbar (bold, italic, headings, lists, code, link), dark theme, localStorage auto-save every 2 seconds
- Excalidraw infinite canvas: dark theme, localStorage persistence for scene data, default drawing tools, no collaboration features
- Both lazy-loaded -- never load on non-Labs routes
- `/starseed/labs` hub page with 3 glass cards: Scratchpad, Canvas, Brainstorm
- Brainstorm card shows "Coming soon" (LABS-05 is Phase 6)
- Labs routes under Starseed shell -- share Starseed nav chrome and escape hatch
- Labs content area has fullscreen layout for editors (no bento grid)
- "Start in Starseed" CTA navigates to `/starseed/labs/scratchpad?prompt=...` with creative prompt pre-loaded
- Query-param hygiene: treat preloaded prompt as optional, don't overwrite existing draft if localStorage has content

### Claude's Discretion
No items deferred to Claude's discretion -- all areas decided.

### Deferred Ideas (OUT OF SCOPE)
- LABS-04: Glint "save idea" tool call to scratchpad (Phase 6)
- LABS-05: Glint brainstorm mode to structured ideation session (Phase 6)

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STAR-02 | Project cards display active Starseed projects with icons, descriptions, tags | Existing card structure in Starseed.jsx; add DECKIT card + real links/external URLs |
| STAR-05 | Contact/client-facing section for Starseed business inquiries | Simple mailto approach (locked decision); add section below project grid |
| STAR-06 | Each project card links to detail page or external project URL | onClick handlers already exist for BEAMY; add external links and internal `/starseed/labs` |
| STAR-07 | starseed.llc DNS redirects to jarowe.com/starseed | Vercel Domains dashboard (locked decision); manual config step, not code |
| LABS-01 | `/starseed/labs/scratchpad` with Milkdown WYSIWYG + localStorage auto-save | Milkdown Crepe v7.19.0 with React adapter; listener plugin for auto-save |
| LABS-02 | `/starseed/labs/canvas` with Excalidraw + localStorage persistence | Excalidraw v0.18.0 ESM; onChange handler + initialData for persistence |
| LABS-03 | Both editors lazy-loaded, never load on non-Labs routes | React.lazy() at route level in App.jsx; verify via network tab |
| LABS-06 | Labs hub page at `/starseed/labs` with entry point cards | Glass card grid matching Starseed aesthetic; 3 cards (scratchpad, canvas, brainstorm) |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @milkdown/crepe | 7.19.0 | Batteries-included markdown WYSIWYG editor | High-level Crepe API provides getMarkdown(), toolbar, themes out of the box; avoids manual plugin composition |
| @milkdown/react | 7.19.0 | React bindings for Milkdown | useEditor hook + MilkdownProvider + Milkdown component; official React adapter |
| @excalidraw/excalidraw | 0.18.0 | Infinite drawing canvas | ESM tree-shakable, dark theme prop, onChange/initialData for persistence, React 19 compatible |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @milkdown/plugin-listener | 7.19.0 | Content change events | Needed for auto-save; provides markdownUpdated callback |
| lucide-react | (existing) | Icons for project cards and Labs | Already in project; use for card icons (PenTool, Palette, Lightbulb, etc.) |
| framer-motion | (existing) | Entry animations for cards and sections | Already in project; used in existing Starseed.jsx |
| react-router-dom | (existing) | Nested routes for /starseed/* | Already in project; add Labs subroutes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Milkdown Crepe | @milkdown/kit (raw) | Kit is 143KB vs Crepe 1.8MB, but requires manual plugin composition -- Crepe is the locked choice |
| Excalidraw | tldraw | Similar capability but Excalidraw is the locked choice with better dark theme support |
| localStorage | IndexedDB | Overkill for single-document persistence; localStorage is simpler and adequate |

**Installation:**
```bash
npm install @milkdown/crepe @milkdown/react @milkdown/plugin-listener @excalidraw/excalidraw
```

**Version verification:** All versions verified via `npm view` on 2026-03-21.

## Architecture Patterns

### Recommended Project Structure
```
src/
  pages/
    Starseed.jsx          # Upgraded: real project cards, contact, Labs nav link
    Starseed.css          # Upgraded: new sections, brand token overrides
    labs/
      LabsHub.jsx         # /starseed/labs -- 3 glass cards
      LabsHub.css
      Scratchpad.jsx      # /starseed/labs/scratchpad -- Milkdown editor
      Scratchpad.css
      Canvas.jsx          # /starseed/labs/canvas -- Excalidraw canvas
      Canvas.css
```

### Pattern 1: Nested Route Layout (Starseed Shell)
**What:** Use the existing Starseed shell (`data-brand="starseed"`, own nav chrome, escape hatch) as a layout wrapper for all `/starseed/*` routes.
**When to use:** All Labs pages must inherit Starseed nav chrome.
**Example:**
```jsx
// In App.jsx -- use nested route with shared layout
const LabsHub = lazyRetry(() => import('./pages/labs/LabsHub'));
const Scratchpad = lazyRetry(() => import('./pages/labs/Scratchpad'));
const Canvas = lazyRetry(() => import('./pages/labs/Canvas'));

// Routes (inside existing Routes block)
<Route path="/starseed" element={<Suspense fallback={<LazyFallback label="Loading Starseed..." />}><Starseed /></Suspense>} />
<Route path="/starseed/labs" element={<Suspense fallback={<LazyFallback />}><LabsHub /></Suspense>} />
<Route path="/starseed/labs/scratchpad" element={<Suspense fallback={<LazyFallback />}><Scratchpad /></Suspense>} />
<Route path="/starseed/labs/canvas" element={<Suspense fallback={<LazyFallback />}><Canvas /></Suspense>} />
```

**Note:** Each Labs page wraps itself in `<div className="starseed-shell" data-brand="starseed">` with the starseed-nav header to maintain chrome consistency, since the current routing doesn't use layout routes. This matches the existing pattern in `Starseed.jsx`.

### Pattern 2: Lazy-Loaded Editor Components
**What:** React.lazy() at the route level ensures editor bundles never load on non-Labs routes.
**When to use:** LABS-03 requirement -- zero editor code on `/starseed` or homepage.
**Example:**
```jsx
// Scratchpad.jsx -- editor loaded at route level, not nested lazy
import { Crepe } from '@milkdown/crepe';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css'; // or nord-dark

// The entire page component is already lazy-loaded via lazyRetry() in App.jsx
// No additional React.lazy needed inside the component
```

### Pattern 3: Debounced localStorage Auto-Save
**What:** Save editor content to localStorage with 2-second debounce.
**When to use:** Both Scratchpad and Canvas editors.
**Example:**
```jsx
// Custom hook pattern
function useAutoSave(key, delay = 2000) {
  const timeoutRef = useRef(null);
  const save = useCallback((data) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(data));
    }, delay);
  }, [key, delay]);

  const load = useCallback(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }, [key]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);
  return { save, load };
}
```

### Pattern 4: Query-Param Prompt Pre-Loading
**What:** TodayRail CTA sends `?prompt=...` to scratchpad; scratchpad uses it only if no existing draft.
**When to use:** LABS-01 + TODAY-07 integration.
**Example:**
```jsx
// In Scratchpad.jsx
const [searchParams] = useSearchParams();
const promptParam = searchParams.get('prompt');

const initialContent = useMemo(() => {
  const saved = localStorage.getItem('jarowe_labs_scratchpad');
  if (saved) return saved; // Existing draft takes priority
  if (promptParam) return `# Creative Prompt\n\n${promptParam}\n\n---\n\n`;
  return '# Untitled\n\nStart writing...';
}, []);
```

### Anti-Patterns to Avoid
- **Nested React.lazy inside lazy-loaded components:** The route-level lazy is sufficient; adding another React.lazy for the editor inside the page component causes double-suspense and unnecessary complexity.
- **Saving full Excalidraw appState to localStorage:** Only persist `elements` and a minimal subset of `appState` (theme, zoom, scroll). The full appState includes transient UI state (selection, cursor) that bloats storage and causes restore bugs. Specifically, `appState.collaborators` is a Map that breaks JSON serialization.
- **Using Milkdown listener plugin separately from Crepe:** Crepe has its own `.on()` API that wraps the listener; no need to manually `.use(listener)`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown WYSIWYG | Custom ProseMirror setup | Milkdown Crepe | Crepe bundles toolbar, slash commands, lists, code blocks, tables -- hundreds of edge cases |
| Drawing canvas | Canvas API + custom tools | Excalidraw | Infinite canvas, shape tools, selection, export -- massive complexity |
| Content change detection | Manual DOM diffing | Milkdown listener / Excalidraw onChange | Both libraries expose proper change callbacks |
| Debounced save | setTimeout spaghetti | useAutoSave hook (simple, shared) | Clean pattern, reused across both editors |
| Domain redirect | vercel.json rewrites | Vercel Domains dashboard | Dashboard is the documented path for domain-level redirects; vercel.json redirects don't support adding custom domains |

**Key insight:** The editors ARE the product for Labs -- the only custom code needed is the shell/layout, persistence layer, and prompt pre-loading.

## Common Pitfalls

### Pitfall 1: Excalidraw v0.18 ESM Configuration
**What goes wrong:** Build fails or runtime errors with "Arbitrary module namespace identifier names" error.
**Why it happens:** Excalidraw v0.18.0 moved to ESM; locales are now transpiled ES modules requiring es2022 target.
**How to avoid:** Add to vite.config.js:
```js
optimizeDeps: {
  esbuildOptions: {
    target: 'es2022',
  }
}
```
**Warning signs:** Build errors mentioning module resolution or locale imports.

### Pitfall 2: Excalidraw Container Sizing
**What goes wrong:** Excalidraw renders as 0px height (invisible).
**Why it happens:** Excalidraw takes 100% width/height of its containing block. If container has no explicit height, it collapses.
**How to avoid:** Set explicit height on container: `height: calc(100vh - 64px)` (subtract nav chrome height).
**Warning signs:** Component mounts but nothing visible.

### Pitfall 3: Overwriting Existing Drafts with Prompt Param
**What goes wrong:** User has in-progress work, clicks "Start in Starseed" CTA, loses their draft.
**Why it happens:** Naive implementation loads `?prompt=` param as initial content unconditionally.
**How to avoid:** Check localStorage first; only use prompt param when no saved content exists.
**Warning signs:** User complaints about lost work.

### Pitfall 4: Milkdown Crepe CodeMirror Bundle Bloat
**What goes wrong:** Bundle includes all CodeMirror language definitions (~150 chunks).
**Why it happens:** Crepe's CodeMirror feature dynamically imports all languages; bundlers can't tree-shake dynamic imports.
**How to avoid:** Disable CodeMirror feature if code blocks aren't needed, or accept the bundle cost since the entire page is lazy-loaded anyway:
```js
const crepe = new Crepe({
  features: { [Crepe.Feature.CodeMirror]: false }
});
```
**Warning signs:** Large number of chunks in build output, slow initial load of scratchpad route.

### Pitfall 5: starseed.llc Brand Tokens
**What goes wrong:** Implementation uses incorrect brand colors/fonts because starseed.llc has no live site.
**Why it happens:** The starseed.llc domain currently returns 404 -- there is no live brand to pull from.
**How to avoid:** The existing Starseed shell already uses gold (#dbb978) palette. Since starseed.llc has no live site, keep the current Phase 3 brand tokens as the canonical Starseed brand. The CONTEXT.md instruction to "pull from actual starseed.llc" cannot be fulfilled because the site does not exist.
**Warning signs:** Spending time trying to scrape a non-existent site.

### Pitfall 6: Excalidraw Collaborators Map Serialization
**What goes wrong:** `JSON.parse(localStorage.getItem(...))` throws or produces broken state.
**Why it happens:** `appState.collaborators` is a JavaScript Map, which JSON.stringify serializes as `{}`. On restore, code expects a Map but gets a plain object.
**How to avoid:** After parsing stored appState, reset collaborators: `appState.collaborators = new Map()`.
**Warning signs:** Console errors about `.has` or `.get` not being a function.

## Code Examples

### Milkdown Crepe Editor in React (Scratchpad)
```jsx
// Source: Milkdown official React recipe + Crepe API docs
import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Crepe } from '@milkdown/crepe';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

function MilkdownEditor({ defaultValue, onContentChange }) {
  useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue,
      features: {
        [Crepe.Feature.CodeMirror]: false, // Reduces bundle; re-enable if code blocks needed
        [Crepe.Feature.Latex]: false,       // Not needed for scratchpad
        [Crepe.Feature.ImageBlock]: false,  // No image upload for localStorage-only tool
      },
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_, markdown, prevMarkdown) => {
        if (markdown !== prevMarkdown) {
          onContentChange(markdown);
        }
      });
    });

    return crepe;
  }, []);

  return <Milkdown />;
}

export default function Scratchpad() {
  // ... load from localStorage, handle prompt param, render MilkdownProvider > MilkdownEditor
}
```

### Excalidraw Canvas with Persistence
```jsx
// Source: Excalidraw docs props API + GitHub issue #10255
import { useState, useCallback, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const STORAGE_KEY = 'jarowe_labs_canvas';

function loadSavedScene() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Reset collaborators Map (JSON.stringify breaks Maps)
    if (parsed.appState) parsed.appState.collaborators = new Map();
    return parsed;
  } catch { return null; }
}

export default function Canvas() {
  const [initialData] = useState(loadSavedScene);
  const saveTimeout = useRef(null);

  const handleChange = useCallback((elements, appState) => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      // Persist only essential state
      const toSave = {
        elements,
        appState: {
          theme: appState.theme,
          viewBackgroundColor: appState.viewBackgroundColor,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }, 2000);
  }, []);

  return (
    <div className="starseed-shell" data-brand="starseed">
      {/* nav chrome */}
      <div style={{ height: 'calc(100vh - 64px)' }}>
        <Excalidraw
          initialData={initialData}
          onChange={handleChange}
          theme="dark"
          UIOptions={{ canvasActions: { toggleTheme: false } }}
        />
      </div>
    </div>
  );
}
```

### TodayRail CTA Update
```jsx
// Source: Existing TodayRail.jsx line 133 -- update Link target
// Before:
<Link to="/starseed" className="today-card__cta today-card__cta--starseed">

// After:
<Link
  to={`/starseed/labs/scratchpad?prompt=${encodeURIComponent(todayData.prompt.text)}`}
  className="today-card__cta today-card__cta--starseed"
>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Excalidraw UMD bundle | Excalidraw ESM (v0.18.0) | March 2025 | Tree-shakable, requires es2022 target in Vite |
| Milkdown manual plugin composition | Milkdown Crepe (v7.5.0+) | 2024 | High-level API, built-in toolbar/features, getMarkdown() |
| Milkdown Crepe monolith features | CrepeBuilder selective import (v7.12.1) | 2025 | Opt-in features for smaller bundles |
| process.env.IS_PREACT Excalidraw hack | Removed in v0.18.0 ESM | March 2025 | No longer needed in Vite config |

**Deprecated/outdated:**
- Excalidraw `commitToHistory` param in `updateScene()` -- replaced by `CaptureUpdateAction` enum
- Milkdown `@milkdown/theme-nord` standalone -- themes now bundled in `@milkdown/crepe/theme/`
- Excalidraw `excalidraw-assets` static folders -- fonts now auto-load from CDN

## Open Questions

1. **starseed.llc Brand Tokens**
   - What we know: starseed.llc returns 404; no live site exists to pull brand tokens from
   - What's unclear: Whether Jared has brand guidelines elsewhere (Figma, brand kit, etc.)
   - Recommendation: Keep current Phase 3 gold (#dbb978) palette as canonical Starseed brand. Flag to user that starseed.llc is not live -- the existing brand in Starseed.css IS the brand for now.

2. **DECKIT Project Details**
   - What we know: CONTEXT.md lists DECKIT as one of 4 project cards
   - What's unclear: No code, description, tags, or URL exists for DECKIT in the codebase
   - Recommendation: Plan will need project metadata (description, tags, URL/status) for the DECKIT card. Use placeholder until user provides.

3. **Excalidraw Font Loading in Production**
   - What we know: v0.18.0 loads fonts from esm.run CDN by default
   - What's unclear: Whether Vercel deployment has any CSP headers blocking esm.run CDN
   - Recommendation: Test CDN font loading in production; if blocked, self-host fonts via `window.EXCALIDRAW_ASSET_PATH`.

4. **Milkdown Crepe Dark Theme**
   - What we know: Crepe ships frame, classic, and nord themes with dark variants
   - What's unclear: Exact CSS variable names for dark variant of frame theme
   - Recommendation: Import `@milkdown/crepe/theme/frame-dark.css` (or `nord-dark.css`) and verify; override CSS variables as needed to match Starseed palette.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual verification (no automated test framework in project) |
| Config file | none |
| Quick run command | `npm run build && npm run preview` |
| Full suite command | Manual checklist verification |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STAR-02 | 4 project cards with icons, descriptions, tags | manual | Visual inspection of /starseed | N/A |
| STAR-05 | Contact section with mailto link | manual | Click mailto link | N/A |
| STAR-06 | Project cards link to detail/external URLs | manual | Click each card, verify navigation | N/A |
| STAR-07 | starseed.llc redirects to jarowe.com/starseed | manual | `curl -I https://starseed.llc` | N/A |
| LABS-01 | Scratchpad with Milkdown + localStorage | manual | Type content, reload, verify persistence | N/A |
| LABS-02 | Canvas with Excalidraw + localStorage | manual | Draw shapes, reload, verify persistence | N/A |
| LABS-03 | Editors never load on non-Labs routes | manual | Network tab on /starseed -- no milkdown/excalidraw chunks | N/A |
| LABS-06 | Labs hub with 3 cards | manual | Navigate to /starseed/labs, verify 3 cards | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (verify no build errors)
- **Per wave merge:** Full manual test of all routes + network tab lazy-load verification
- **Phase gate:** All 8 requirements manually verified

### Wave 0 Gaps
- None -- no automated test infrastructure exists in project; all verification is manual + build success

## Sources

### Primary (HIGH confidence)
- npm registry: `@milkdown/crepe@7.19.0`, `@milkdown/react@7.19.0`, `@excalidraw/excalidraw@0.18.0` -- versions verified via `npm view`
- [Milkdown React Recipe](https://milkdown.dev/docs/recipes/react) -- useEditor + MilkdownProvider pattern
- [Milkdown Crepe API](https://milkdown.dev/docs/api/crepe) -- getMarkdown(), features, on() listener
- [Milkdown Using Crepe Guide](https://milkdown.dev/docs/guide/using-crepe) -- installation, themes, feature config
- [Milkdown Styling Guide](https://milkdown.dev/docs/guide/styling) -- CSS variables, theme imports
- [Excalidraw Props API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props) -- onChange, initialData, theme, UIOptions
- [Excalidraw Installation](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation) -- package install, asset path
- [Excalidraw v0.18.0 Release](https://github.com/excalidraw/excalidraw/releases/tag/v0.18.0) -- ESM migration, Vite config

### Secondary (MEDIUM confidence)
- [Milkdown Crepe + React Discussion #1498](https://github.com/orgs/Milkdown/discussions/1498) -- working React code example verified against API docs
- [Excalidraw localStorage Issue #10255](https://github.com/excalidraw/excalidraw/issues/10255) -- save/restore pattern with collaborators Map fix
- [Milkdown Bundle Size Issue #1533](https://github.com/Milkdown/milkdown/issues/1533) -- CodeMirror language bloat, CrepeBuilder solution
- [DeepWiki Milkdown Crepe](https://deepwiki.com/Milkdown/milkdown/6.3-crepe-editor) -- feature modules, builder API
- [DeepWiki Excalidraw Props](https://deepwiki.com/excalidraw/excalidraw/10.2-component-props-and-api) -- component props reference

### Tertiary (LOW confidence)
- starseed.llc -- returns 404; domain exists but no live site (verified 2026-03-21)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on npm registry, API patterns confirmed via official docs
- Architecture: HIGH -- existing Starseed.jsx and App.jsx patterns are clear; nested routes follow established project conventions
- Pitfalls: HIGH -- ESM migration issues, container sizing, and localStorage serialization are well-documented community findings
- Brand tokens: LOW -- starseed.llc has no live site; existing Phase 3 palette is the only available brand reference

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (30 days; both libraries are stable releases)
