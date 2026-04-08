# Phase 6: Automation & Retention - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

The site becomes self-sustaining and return-worthy with weather-driven atmosphere, dynamic OG social previews, visitor streak system, date-locked easter eggs, and Glint-Labs idea saving + brainstorm mode. TODAY-06 (progress signal card) is descoped.

</domain>

<decisions>
## Implementation Decisions

### Weather & Atmosphere
- Open-Meteo API (free, no API key, CORS-friendly) — client-side fetch with browser geolocation
- Visual effects: Globe fog/cloud density + particle speed + color warmth, constellation nebula opacity + star twinkle rate, CSS `--weather-*` custom properties
- Fallback when geolocation denied: default "clear day" atmosphere — no weather effects, no error state
- Update frequency: every 30 minutes via cached fetch
- Cache last successful weather payload in localStorage — reuse during 30-minute window, graceful fallback on denial/failure

### Dynamic OG Social Previews
- `@vercel/og` at `/api/og` with route/template params — Vercel Function on Node.js runtime (NOT Edge Function)
- 4 route-specific templates: homepage, constellation, games, starseed — each with distinct visual identity
- JSX-to-PNG via Satori — no third-party services

### Streak System
- localStorage `jarowe_streak` with `{ count, lastVisit, freezeAvailable }`
- Increment on new calendar day, reset if gap > 1 day (unless freeze used)
- Glint milestone peeks at 3/7/14/30 days via existing autonomy event system
- Custom dialogue lines per milestone. One freeze available (recharges after 30-day streak)

### Easter Eggs & Seasonal Content
- 5 date triggers: Full moon (dynamic via astro.js), Friday the 13th, Pi Day (3/14), Summer/Winter solstices, Site birthday
- Per-event: CSS class on `<body>` + Glint dialogue. Full moon = enhanced glow/particles, Friday 13th = spooky shift, Pi Day = pi prompt, Solstice = golden/blue boost, Birthday = confetti + celebration
- `src/utils/easterEggs.js` utility checked on homepage mount — returns `{ event, cssClass, glintDialogue }` or null
- Additive with time-of-day — easter egg CSS layered on top of `--tod-*`, not replacing them
- Site birthday: single canonical constant, not hardcoded in multiple places

### Glint-Labs Integration
- `save_idea` tool in actionDispatcher — dispatches `glint-action` with `{ action: 'save_idea', params: { content } }`
- Home.jsx handler writes to localStorage `jarowe_scratchpad_content`, appending with timestamps/separators (never overwriting)
- Brainstorm mode: conversational flow via AI chat — Glint asks 3-4 questions → generates markdown brief (title, idea, mood, next steps) → offers to save
- Brainstorm instructions added to `glint-system-prompt.js` (not client-side state machine)
- Markdown template: `# {Title}\n\n**Idea:** {summary}\n**Mood:** {mood}\n**Next Steps:**\n- {step1}\n- {step2}`

### Scope Decisions
- TODAY-06 (progress signal card) DESCOPED from Phase 6 — requires editorial infrastructure incompatible with "works for Jared" constraint
- Weather effects are additive (on top of time-of-day), not replacement

### Claude's Discretion
No items deferred to Claude's discretion — all areas decided.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/astro.js` — Moon phase + illumination calculations (reuse for full moon detection + easter eggs)
- `src/utils/timeOfDay.js` — CSS custom property application (extend pattern for weather properties)
- `src/utils/actionDispatcher.js` — Tool registry + dispatch (add save_idea + brainstorm tools)
- `src/utils/glintAutonomy.js` — Event reaction system (add streak milestone triggers)
- `src/utils/glintBrain.js` — Reactive line pools (add easter egg + streak lines)
- `api/_lib/glint-system-prompt.js` — System prompt builder (add brainstorm instructions)
- `api/_lib/glint-tools.js` — Server-side tool schemas (add save_idea + brainstorm schemas)
- `src/utils/dailySeed.js` — Daily deterministic selection (for easter egg content rotation)

### Established Patterns
- CustomEvent dispatch for cross-component communication
- CSS custom properties for atmospheric effects (`--tod-*`)
- localStorage for persistent state
- Vercel API functions in `api/` directory (with `_lib/` for helpers)
- `canvas-confetti` for celebration effects (birthday easter egg)

### Integration Points
- `src/pages/Home.jsx` — Weather fetch + easter egg check on mount, streak tracking
- `src/App.jsx` — OG meta tags per route (or defer to server-side)
- `api/og.js` — New Vercel Function for OG image generation
- `src/utils/actionDispatcher.js` — Add save_idea tool
- Globe shaders — Weather uniform inputs for fog/particle effects

</code_context>

<specifics>
## Specific Ideas

- Weather payload cache in localStorage prevents repeated geolocation prompts and handles failures gracefully
- Site birthday should be a constant in a shared config (not duplicated)
- save_idea appends with timestamps/separators — never overwrites existing scratchpad content
- OG images use Vercel Function on Node.js runtime per current Vercel docs (not Edge Function)

</specifics>

<deferred>
## Deferred Ideas

- TODAY-06: Daily progress signal card (requires editorial infrastructure — deferred indefinitely)

</deferred>
