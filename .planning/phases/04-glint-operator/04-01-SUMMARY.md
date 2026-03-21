---
phase: 04-glint-operator
plan: 01
subsystem: ai, api
tags: [openai, function-calling, sse, streaming, custom-events, tools]

requires:
  - phase: glint-ai-chat-tier4
    provides: SSE streaming proxy (api/glint-chat.js), system prompt builder, Glint chat UI in Home.jsx
provides:
  - Action dispatcher module with 4 tools (navigate, launch_game, control_music, show_daily)
  - OpenAI function calling integration in chat API with stream-based tool call accumulation
  - Client-side two-phase UX (narration + delayed dispatch) for tool calls
  - glint-action CustomEvent interface for cross-component action execution
affects: [04-02-command-palette, 04-03-action-listeners, glint-operator]

tech-stack:
  added: []
  patterns: [OpenAI function calling with streaming SSE accumulation, CustomEvent-based action dispatch, two-phase narration UX]

key-files:
  created:
    - src/utils/actionDispatcher.js
    - api/_lib/glint-tools.js
  modified:
    - api/glint-chat.js
    - api/_lib/glint-system-prompt.js
    - src/pages/Home.jsx

key-decisions:
  - "Dual tool schema definition (client + API) due to Edge/browser runtime boundary"
  - "Tool call arguments accumulated across stream chunks, emitted as single SSE event on finish_reason=tool_calls"
  - "500ms narration delay before action dispatch for two-phase UX feel"

patterns-established:
  - "CustomEvent('glint-action') as universal action dispatch interface for navigate/game/music/daily"
  - "getNarration(toolName) for in-character narration with expression changes"
  - "GameLauncher accepts string game_id via showGame state (typeof check for tool vs holiday launches)"

requirements-completed: [GLINT-01, GLINT-02, GLINT-03, GLINT-04]

duration: 6min
completed: 2026-03-21
---

# Phase 04 Plan 01: Core Tool System Summary

**OpenAI function calling with 4 tools (navigate, launch_game, control_music, show_daily), streaming SSE tool call accumulation, and two-phase narration UX in Glint AI chat**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-21T07:23:42Z
- **Completed:** 2026-03-21T07:29:21Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created action dispatcher module with 4 tool definitions, narration pools (5-6 lines each), expression mappings, and CustomEvent dispatch
- Extended Glint chat API with OpenAI function calling: tools parameter, tool_choice: auto, stream-based argument accumulation across chunks
- Wired tool call detection into Home.jsx stream reader with two-phase UX (narration + 500ms delayed dispatch)
- Added glint-action event listener for navigate and game launch actions
- Updated GameLauncher to support both tool-based (string game_id) and holiday-based (boolean) showGame values

## Task Commits

Each task was committed atomically:

1. **Task 1: Create action dispatcher module and extend API with function calling** - `3071ab9` (feat)
2. **Task 2: Wire tool call handling into Home.jsx stream reader** - `db3bbda` (feat)

## Files Created/Modified
- `src/utils/actionDispatcher.js` - Full tool definitions with schemas, narrations, expressions, and dispatch via CustomEvent
- `api/_lib/glint-tools.js` - Server-side tool schemas for Edge Function (intentional duplication of schema-only data)
- `api/glint-chat.js` - Extended with tools parameter, tool_choice, and stream-based tool call accumulation
- `api/_lib/glint-system-prompt.js` - Added tool usage instructions to system prompt
- `src/pages/Home.jsx` - Tool call detection in stream reader, narration UX, glint-action listener, GameLauncher update

## Decisions Made
- **Dual schema definition**: Tool schemas exist in both `src/utils/actionDispatcher.js` (client) and `api/_lib/glint-tools.js` (API). This is intentional because the API runs on Vercel Edge and cannot import from `src/`. Narration and expression data is client-only.
- **Stream accumulation pattern**: Tool call arguments arrive token-by-token from OpenAI. We accumulate across chunks using an index-keyed object and emit the complete tool call as a single SSE event when `finish_reason === 'tool_calls'`.
- **500ms narration delay**: When a tool call is received, Glint shows an in-character narration line with expression change for 500ms before dispatching the action, creating a two-phase UX that feels like Glint is "doing" the action.
- **GameLauncher typeof check**: `showGame` state now accepts both `true` (holiday game) and a string game ID (tool-based launch), using `typeof showGame === 'string'` to distinguish.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `src/utils/actionDispatcher.js` already existed as a stub from a parallel agent (Plan 02). The full implementation overwrote it correctly with all 4 tools and exports. No conflict.

## User Setup Required
None - no external service configuration required. Uses existing OpenAI API key already configured for Glint chat.

## Next Phase Readiness
- Action dispatcher ready for Plan 02 (CommandPalette) to import and use
- Music control and show_daily action handlers deferred to Plan 03 (App.jsx / AudioProvider scope)
- All 4 tool schemas available server-side for function calling

## Self-Check: PASSED

All 5 files verified present. Both commit hashes (3071ab9, db3bbda) verified in git log.

---
*Phase: 04-glint-operator*
*Completed: 2026-03-21*
