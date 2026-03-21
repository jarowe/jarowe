# Phase 5: Starseed Hub & Labs - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Starseed becomes a real, professional creation destination with active project cards, a contact section, Labs creation tools (Milkdown scratchpad + Excalidraw canvas), and starseed.llc domain redirect. Brand identity aligns with starseed.llc.

</domain>

<decisions>
## Implementation Decisions

### Starseed Brand Identity
- Align `/starseed` visual identity with starseed.llc branding — pull brand tokens (colors, fonts, feel) from the actual starseed.llc site, not the current placeholder gold accent (#dbb978)
- Constraint: final brand tokens and outbound URLs must be pulled from actual starseed.llc source, not guessed

### Project Cards & Content
- 4 projects displayed: BEAMY, AMINA, DECKIT, Starseed Labs — each with icon, description, tags
- External URLs for live projects, internal `/starseed/labs` for Labs, "Coming soon" badge for unreleased
- Each card links to its detail page or external project URL

### Contact Section
- Simple mailto link to Jared's business email + brief "Work with Starseed" section
- Lightweight approach — no form backend, no Formspree/Resend complexity

### DNS Redirect
- Add starseed.llc as domain in Vercel Domains dashboard, configure redirect to jarowe.com/starseed
- Use permanent redirect (308)
- NOT vercel.json redirects — Vercel dashboard is the documented path for domain redirects

### Labs Creation Tools
- Milkdown markdown editor: default toolbar (bold, italic, headings, lists, code, link), dark theme matching Starseed shell, localStorage auto-save every 2 seconds
- Excalidraw infinite canvas: dark theme, localStorage persistence for scene data, default drawing tools, no collaboration features
- Both lazy-loaded — never load on non-Labs routes (verify via network tab)

### Labs Hub & Navigation
- `/starseed/labs` hub page with 3 glass cards: Scratchpad, Canvas, Brainstorm
- Brainstorm card shows "Coming soon" (LABS-05 is Phase 6, not Phase 5)
- Labs routes under Starseed shell — share Starseed nav chrome and escape hatch
- Labs content area has fullscreen layout for editors (no bento grid)

### TodayRail Integration
- "Start in Starseed" CTA navigates to `/starseed/labs/scratchpad?prompt=...` with creative prompt pre-loaded
- Query-param hygiene: treat preloaded prompt as optional, don't overwrite existing draft if localStorage has content

### Scope Boundary
- LABS-04 (Glint "save idea" handoff) is Phase 6, NOT Phase 5
- LABS-05 (brainstorm mode) is Phase 6, NOT Phase 5
- Phase 5 builds the tools; Phase 6 connects Glint to them

### Claude's Discretion
No items deferred to Claude's discretion — all areas decided.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/Starseed.jsx` + `Starseed.css` — Existing branded shell with nav chrome, escape hatch, 3 placeholder project cards (Phase 3 created)
- `src/utils/dailySeed.js` — Daily content rotation (used for "Start in Starseed" CTA prompt selection)
- `src/data/dailyPrompts.js` — 60 creative prompts (source for the pre-loaded scratchpad prompt)
- `src/App.jsx` — Route definitions, lazy loading pattern established
- Glass panel aesthetic with `backdrop-filter: blur()` used throughout site

### Established Patterns
- Campaign-shell pattern: Starseed has own nav/chrome via `data-brand="starseed"` attribute
- React.lazy() for code-split heavy components
- `import.meta.env.BASE_URL` for asset paths
- Framer Motion for enter animations
- Lucide React for icons

### Integration Points
- `src/App.jsx` — Add `/starseed/labs`, `/starseed/labs/scratchpad`, `/starseed/labs/canvas` routes
- `src/pages/Starseed.jsx` — Upgrade project cards with real links, add contact section, add Labs nav link
- `src/components/TodayRail.jsx` — Update "Start in Starseed" CTA to link to `/starseed/labs/scratchpad?prompt=...`

</code_context>

<specifics>
## Specific Ideas

- Brand tokens must come from actual starseed.llc site — research the real brand before implementing
- Query param for scratchpad pre-load should be `?prompt=` with URL-encoded creative prompt text
- Don't overwrite existing localStorage draft when prompt param is present — respect in-progress work

</specifics>

<deferred>
## Deferred Ideas

- LABS-04: Glint "save idea" tool call → scratchpad (Phase 6)
- LABS-05: Glint brainstorm mode → structured ideation session (Phase 6)

</deferred>
