# Phase 4: Glint Operator - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Glint becomes an actionable guide with bounded tool use (navigate, launch games, control music, surface daily content) and a Cmd+K command palette as the keyboard-first alternative. An AI-generated daily journal card replaces the static Glint Invitation in TodayRail.

</domain>

<decisions>
## Implementation Decisions

### Tool System Architecture
- OpenAI function calling defines Glint's tool intent; client-side dispatches via CustomEvent bus
- Shared action dispatcher lives at `src/utils/actionDispatcher.js` — pure JS module with `dispatch(action, params)`, used by both Glint chat response handler and Cmd+K palette
- CustomEvent bus (`glint-action`) bridges into React-managed state — listeners in AudioProvider and App.jsx pick up events for music control and navigation
- Static tool registry in dispatcher — all known tools defined upfront in a `TOOLS` map matching OpenAI function schemas; bounded, not plugin-based

### Command Palette UX
- Use `cmdk` library (Paige Sun) — lightweight (~4KB), unstyled, composable, great keyboard UX
- 4 searchable categories: Pages, Games, Actions (play/pause/mute/next), Constellation Nodes — each with icon and section header
- Built-in cmdk fuzzy matching with category headers
- Dark glass panel centered top (Spotlight-style), blurred backdrop, matches site glass-panel aesthetic with `--tod-*` tinting

### AI Daily Journal
- New Vercel Edge Function `/api/glint-journal` generates once per day, cached via `Cache-Control: s-maxage=86400` on Vercel edge
- Replaces the "Glint Invitation" card in TodayRail — becomes the living journal card
- Fallback: curated pool of ~30 static Glint-voice reflections in `src/data/glintJournal.js`, rotated by dailySeed — seamless, no loading spinner
- Content: 2-3 sentences, journal/reflection style — Glint musing about creativity, light, wonder, or the day's holiday

### Tool Narration & Execution UX
- 1 sentence in-character narration before each tool action — "Ooh, let me refract you over to the constellation..." Short, playful, never robotic
- Brief expression change (excited/mischief) + subtle shimmer animation during execution, action fires after ~500ms narration delay
- In-character soft failure narration — "Hmm, my light's a bit scattered right now..." No stack traces or technical jargon
- Minimal visual feedback beyond Glint's bubble — navigation just navigates, music shows existing player state, game launches GameLauncher. No extra toasts

### Claude's Discretion
No items deferred to Claude's discretion — all areas decided.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/glint-chat.js` — Existing Vercel Edge Function for Glint AI chat with SSE streaming (extend for function calling)
- `api/_lib/glint-system-prompt.js` — Dynamic system prompt builder (extend with tool definitions)
- `src/data/gameRegistry.js` — Full game registry with IDs, names, tiers, lazy components (searchable by palette)
- `src/context/AudioContext.jsx` — AudioProvider with play/pause/next/volume state (target for music tool)
- `src/utils/glintBrain.js` — Existing scripted dialogue system (Tier 1 ambient + Tier 2 conversation)
- `src/utils/glintAutonomy.js` — Autonomy system with event reactions (pause/resume during interactions)
- `src/components/GlintChatInput.jsx` + `GlintChatPanel.jsx` — Existing AI chat UI (extend for tool call rendering)
- `src/components/TodayRail.jsx` — Today Rail with 3 cards including Glint Invitation (replace with journal)
- `src/utils/dailySeed.js` — Deterministic daily content rotation (use for journal fallback selection)

### Established Patterns
- CustomEvent dispatch for cross-component communication (`add-xp`, `game-complete`, `auth-signed-in`)
- Lazy loading for heavy components via `React.lazy()` + `Suspense`
- Glass-panel aesthetic with `backdrop-filter: blur()` and `--tod-*` CSS custom properties
- Howler.js via AudioProvider for all music state management
- `window.__prismExpression` + `window.__prismTalking` for Glint expression coordination

### Integration Points
- `src/App.jsx` — Route definitions, Navbar rendering, global effects (add palette + action listeners)
- `src/pages/Home.jsx` — Glint chat state management, bubble rendering, AI message handling (add tool call handling)
- React Router `useNavigate()` — Navigation tool target
- `src/components/GameLauncher.jsx` — Game launch entry point (tool dispatches `showGame` state)

</code_context>

<specifics>
## Specific Ideas

- Glint narrations should feel like a tour guide, not a CLI — "Let me refract you over there" not "Navigating to /constellation"
- The action dispatcher is the contract between Glint and Cmd+K — both systems must use the same dispatch interface
- Journal fallback pool should be indistinguishable from AI-generated content in voice and quality

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
