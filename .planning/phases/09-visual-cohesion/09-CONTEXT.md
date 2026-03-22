# Phase 9: Visual Cohesion - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 delivers two features: (1) TodayRail "Explore" card connecting holidays to constellation nodes via deep-linking, and (2) Starseed brand warmth restoration with Workshop-influenced card design. The phase touches TodayRail, holidayCalendar data, Starseed page/CSS, and starseedProjects data — it does NOT modify Workshop, constellation scene internals, or globe rendering.

</domain>

<decisions>
## Implementation Decisions

### Holiday → Constellation Mapping
- Map only T3+ holidays (~25 entries) with optional `nodeId` field in holidayCalendar.js
- Explore card shows holiday emoji + name + "Explore in constellation" link — minimal, no preview
- Unmapped holidays: show holiday info only, hide the "Explore" link — no generic CTA
- Use existing `/constellation/:nodeId` deep-link URL pattern (already implemented)

### Starseed Gold Brand Identity
- Warm amber gold tone range: `#d4a843` to `#f0c85a` — rich, not flashy
- Gold appears on: wordmark gradient, card borders on hover, icon tints, tag accents — purple stays for site-wide elements
- Gradient: dark cosmic → warm gold: `linear-gradient(135deg, #1a1426 0%, #2a1f12 38%, #d4a843 100%)` — preserves depth with gold as accent destination
- Hub background: subtle warm radial glow behind hero — `radial-gradient(ellipse at 50% 30%, rgba(212,168,67,0.08), transparent 70%)`

### Starseed Card Design (Workshop Influence)
- Background gradient + depth shadows only — no 3D tilt (tilt is Workshop's signature)
- Each project card gets its own subtle gradient variation — rotate hue within gold/amber range per card
- Hover: lift + gold border glow + gradient intensity increase — `translateY(-4px)`, border `rgba(212,168,67,0.4)`, shadow `0 12px 30px rgba(212,168,67,0.12)`
- Subtle `translateZ` on content (title, icon) for parallax feel without tilt — gives Workshop-like depth at lower interaction cost

### Claude's Discretion
- Exact set of T3+ holidays to map to constellation nodes (depends on which constellation nodes exist)
- Per-card gradient hue rotation values for Starseed project cards
- Exact `translateZ` values for card content layering
- TodayRail card layout adjustments to accommodate Explore link

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useHoliday()` context — already provides current holiday data to TodayRail
- `/constellation/:nodeId` deep-link route — auto-focuses node via Zustand `focusNode()`
- Workshop card CSS patterns — `.card-bg-image`, `translateZ` layering, hover shadow/border
- `dailyPick()` deterministic seed in TodayRail — for consistent daily selection

### Established Patterns
- Glass card pattern: `rgba(15,15,18,0.5)` base, subtle border, scale/lift on hover
- Framer Motion staggered card entrance (Starseed uses delay: 0.15 * index)
- Category system in holidayCalendar.js with accent colors per category
- CSS custom properties for theming

### Integration Points
- `src/data/holidayCalendar.js` — add `nodeId` field to T3+ entries
- `src/components/TodayRail.jsx` — conditional Explore link when holiday has nodeId
- `src/pages/Starseed.jsx` + `.css` — gold brand + Workshop-style card overhaul
- `src/data/starseedProjects.js` — add per-card gradient data or derive from index

</code_context>

<specifics>
## Specific Ideas

- User specified dark-cosmic-to-gold gradient: `linear-gradient(135deg, #1a1426 0%, #2a1f12 38%, #d4a843 100%)` — NOT pure gold (would flatten depth)
- Workshop influence means "depth and desirability" not "clone the tilt gimmick"
- Each Starseed card should feel like it has its own identity within a shared gold system
- Hover should feel premium through lift, glow, and layered content rather than motion spectacle

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-visual-cohesion*
*Context gathered: 2026-03-22 via Smart Discuss (autonomous)*
