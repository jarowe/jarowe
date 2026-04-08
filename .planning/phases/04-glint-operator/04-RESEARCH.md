# Phase 4: Glint Operator - Research

**Researched:** 2026-03-21
**Domain:** AI function calling, command palette UX, edge-cached content generation, action dispatch architecture
**Confidence:** HIGH

## Summary

Phase 4 transforms Glint from a conversational character into an actionable operator who can navigate the site, launch games, control music, surface daily content, and present AI-generated daily journal reflections. The architecture centers on a shared action dispatcher (`src/utils/actionDispatcher.js`) that bridges two input surfaces -- Glint AI chat (via OpenAI function calling) and a Cmd+K command palette (via `cmdk` library) -- into the same execution path using CustomEvent dispatch.

The most critical technical finding is that OpenAI's Chat Completions API does NOT reliably produce text content AND tool_calls in the same response. The model tends to emit only tool_calls when it decides to call a function, omitting narration text. This means the "narration before action" UX (GLINT-04) must be implemented client-side: the client generates in-character narration from a curated pool keyed by tool name, displays it with expression change, then dispatches the action after a ~500ms delay. This is more reliable AND lower latency than waiting for the model to potentially stream text before a tool call.

The journal endpoint (TODAY-05) must be a GET request because Vercel Edge caching via `s-maxage` only works for GET/HEAD requests -- POST requests bypass the CDN cache entirely. The endpoint should return JSON with `Cache-Control: max-age=0, s-maxage=86400, stale-while-revalidate=3600` so it generates once per day and serves cached globally.

**Primary recommendation:** Use OpenAI function calling (`tools` parameter) for intent detection only. Handle all narration and execution client-side via the shared action dispatcher and curated narration pools.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- OpenAI function calling defines Glint's tool intent; client-side dispatches via CustomEvent bus
- Shared action dispatcher lives at `src/utils/actionDispatcher.js` -- pure JS module with `dispatch(action, params)`, used by both Glint chat response handler and Cmd+K palette
- CustomEvent bus (`glint-action`) bridges into React-managed state -- listeners in AudioProvider and App.jsx pick up events for music control and navigation
- Static tool registry in dispatcher -- all known tools defined upfront in a `TOOLS` map matching OpenAI function schemas; bounded, not plugin-based
- Use `cmdk` library (Paige Sun / pacocoursey) -- lightweight (~4KB), unstyled, composable, great keyboard UX
- 4 searchable categories: Pages, Games, Actions (play/pause/mute/next), Constellation Nodes -- each with icon and section header
- Built-in cmdk fuzzy matching with category headers
- Dark glass panel centered top (Spotlight-style), blurred backdrop, matches site glass-panel aesthetic with `--tod-*` tinting
- New Vercel Edge Function `/api/glint-journal` generates once per day, cached via `Cache-Control: s-maxage=86400` on Vercel edge
- Replaces the "Glint Invitation" card in TodayRail -- becomes the living journal card
- Fallback: curated pool of ~30 static Glint-voice reflections in `src/data/glintJournal.js`, rotated by dailySeed -- seamless, no loading spinner
- Content: 2-3 sentences, journal/reflection style -- Glint musing about creativity, light, wonder, or the day's holiday
- 1 sentence in-character narration before each tool action -- short, playful, never robotic
- Brief expression change (excited/mischief) + subtle shimmer animation during execution, action fires after ~500ms narration delay
- In-character soft failure narration -- no stack traces or technical jargon
- Minimal visual feedback beyond Glint's bubble -- navigation just navigates, music shows existing player state, game launches GameLauncher

### Claude's Discretion
No items deferred to Claude's discretion -- all areas decided.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GLINT-01 | Glint can navigate visitor to any page on the site via natural conversation | OpenAI function calling with `navigate` tool; action dispatcher dispatches `glint-action` CustomEvent; App.jsx listener calls `useNavigate()` |
| GLINT-02 | Glint can launch any game from the registry via conversation | `launch_game` tool with game ID parameter; dispatcher emits `glint-action` with type `launch-game`; Home.jsx sets `showGame` state from event |
| GLINT-03 | Glint can control music playback via conversation | `control_music` tool with action parameter (play/pause/next); dispatcher emits `glint-action` with type `music-control`; AudioProvider listener calls togglePlay/handleNext |
| GLINT-04 | Tool calls narrated in character, not robotic | Client-side narration pool per tool (NOT model-generated); expression change + ~500ms delay before action dispatch; curated phrases in dispatcher TOOLS map |
| GLINT-05 | Command palette (Cmd+K) shares same action dispatcher as Glint's tools | cmdk 1.1.1 with Command.Dialog; 4 categories (Pages, Games, Actions, Constellation Nodes); items dispatch through same `actionDispatcher.dispatch()` |
| GLINT-07 | Glint can show daily content and progress signal on request | `show_daily` tool; action gathers current holiday, creative prompt, and journal data; narrated response with relevant daily state |
| TODAY-05 | AI-generated daily journal entry displayed as "Thought of the Day" | `/api/glint-journal` GET endpoint with `s-maxage=86400`; fallback pool of 30 static reflections via dailyPick; replaces Glint Invitation card in TodayRail |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cmdk | 1.1.1 | Command palette component | Unstyled, composable, ~82KB unpacked (~4KB gzip), React 18/19 compatible, built-in fuzzy filtering, data-attribute styling, used by Vercel/Linear/Raycast |
| OpenAI Chat Completions API | v1 (chat/completions) | Function calling for Glint tool intent | Existing endpoint already uses this; `tools` parameter with `strict: true` for reliable schema adherence |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | ^1.1.6 | Peer dependency of cmdk | Auto-installed with cmdk; Command.Dialog composes Radix Dialog for accessible modal |
| @radix-ui/react-id | ^1.1.0 | Peer dependency of cmdk | Auto-installed with cmdk |
| @radix-ui/react-primitive | ^2.0.2 | Peer dependency of cmdk | Auto-installed with cmdk |
| @radix-ui/react-compose-refs | ^1.1.1 | Peer dependency of cmdk | Auto-installed with cmdk |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cmdk | ninja-keys / kbar | cmdk is lighter, unstyled (matches project's custom glass aesthetic), and the explicit user decision |
| OpenAI Chat Completions + tools | OpenAI Responses API | Responses API is newer but requires migration of existing streaming proxy; Chat Completions is stable and already wired |
| Edge-cached GET endpoint | KV store / Supabase | Edge cache is zero-cost, zero-infrastructure, auto-invalidates on deploy; KV adds complexity for a single daily value |

**Installation:**
```bash
npm install cmdk
```

**Version verification:** cmdk 1.1.1 confirmed via npm registry (2026-03-21). Peer dependencies: `react: ^18 || ^19`, `react-dom: ^18 || ^19`. Project uses React 19.2.0 -- fully compatible. Radix UI packages are transitive dependencies installed automatically.

## Architecture Patterns

### Recommended Project Structure
```
src/
  utils/
    actionDispatcher.js    # NEW: Shared action dispatch (pure JS, no React)
  data/
    glintJournal.js        # NEW: ~30 static fallback journal reflections
  components/
    CommandPalette.jsx     # NEW: cmdk-based Cmd+K palette
    CommandPalette.css     # NEW: Glass-panel styling for palette
    TodayRail.jsx          # MODIFY: Replace Glint Invitation with journal card
    GlintChatPanel.jsx     # MODIFY: Add tool call result rendering
api/
  glint-chat.js            # MODIFY: Add tools parameter to OpenAI request
  glint-journal.js         # NEW: GET endpoint, edge-cached daily journal
  _lib/
    glint-system-prompt.js # MODIFY: Add tool usage instructions to system prompt
    glint-tools.js         # NEW: Tool definitions shared between API and client
```

### Pattern 1: Action Dispatcher (Pure JS Module)
**What:** A centralized, framework-agnostic module that maps action names to execution logic via CustomEvent dispatch
**When to use:** When multiple input surfaces (AI chat, command palette, keyboard shortcuts) need to trigger the same actions
**Example:**
```javascript
// src/utils/actionDispatcher.js
const TOOLS = {
  navigate: {
    schema: {
      type: 'function',
      function: {
        name: 'navigate',
        description: 'Navigate the visitor to a page on the site',
        parameters: {
          type: 'object',
          properties: {
            destination: {
              type: 'string',
              enum: ['/', '/constellation', '/universe', '/garden', '/now',
                     '/favorites', '/vault', '/starseed', '/profile'],
              description: 'The route path to navigate to'
            }
          },
          required: ['destination'],
          additionalProperties: false
        },
        strict: true
      }
    },
    narrations: [
      "Ooh, let me refract you over there...",
      "One prismatic leap, coming right up!",
      "Follow my light!",
    ],
    expression: 'excited',
  },
  launch_game: {
    schema: { /* ... game ID parameter ... */ },
    narrations: ["Time to play! Let me load that up...", /* ... */],
    expression: 'mischief',
  },
  control_music: {
    schema: { /* ... play/pause/next parameter ... */ },
    narrations: ["Let me tune those wavelengths...", /* ... */],
    expression: 'happy',
  },
  show_daily: {
    schema: { /* ... no parameters needed ... */ },
    narrations: ["Let me check what the light brought today...", /* ... */],
    expression: 'curious',
  },
};

export function getToolSchemas() {
  return Object.values(TOOLS).map(t => t.schema);
}

export function getNarration(toolName) {
  const tool = TOOLS[toolName];
  if (!tool) return null;
  const lines = tool.narrations;
  return {
    text: lines[Math.floor(Math.random() * lines.length)],
    expression: tool.expression,
  };
}

export function dispatch(action, params = {}) {
  window.dispatchEvent(new CustomEvent('glint-action', {
    detail: { action, params }
  }));
}
```

### Pattern 2: OpenAI Function Calling with Streaming SSE Proxy
**What:** Extend the existing `api/glint-chat.js` Edge Function to include `tools` in the OpenAI request, detect tool_calls in streamed deltas, and forward them to the client via SSE
**When to use:** When the AI needs to decide whether user intent maps to a tool action or a conversational response
**Example:**
```javascript
// In api/glint-chat.js — add tools to OpenAI request
const openaiPayload = {
  model,
  messages: apiMessages,
  stream: true,
  max_tokens: 300,
  temperature: 0.85,
  tools: toolSchemas,        // NEW: from glint-tools.js
  tool_choice: 'auto',       // Let model decide
};

// In SSE stream reader — detect tool_calls in delta
// When streaming, tool_calls appear as delta.tool_calls[i]
// with progressive function.name and function.arguments
// finish_reason will be 'tool_calls' instead of 'stop'
// Accumulate arguments across chunks, then send as a single SSE event:
// data: {"tool_call":{"name":"navigate","arguments":{"destination":"/constellation"}}}
```

### Pattern 3: Client-Side Tool Call Handling (Two-Phase UX)
**What:** When a tool_call arrives from the stream, the client: (1) shows narration with expression change, (2) dispatches action after delay
**When to use:** Every tool call from Glint AI chat
**Example:**
```javascript
// In Home.jsx handleAiChat — after stream completes
if (toolCall) {
  const narr = getNarration(toolCall.name);
  // Phase 1: Show narration bubble + expression
  window.__prismExpression = narr.expression;
  setPrismBubble(narr.text);
  // Phase 2: Execute after delay
  setTimeout(() => {
    dispatch(toolCall.name, JSON.parse(toolCall.arguments));
  }, 500);
}
```

### Pattern 4: Edge-Cached Daily Journal
**What:** A GET endpoint that generates journal content via OpenAI, cached for 24h by Vercel's edge CDN
**When to use:** For the daily Glint journal card on the homepage
**Example:**
```javascript
// api/glint-journal.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }
  // Generate journal entry via OpenAI (non-streaming, short)
  const entry = await generateJournalEntry();
  return new Response(JSON.stringify(entry), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=0, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
```

### Pattern 5: cmdk Command Palette with Custom Glass Styling
**What:** Command.Dialog with 4 grouped categories, styled via data-attributes to match site glass-panel aesthetic
**When to use:** Cmd+K keyboard shortcut opens Spotlight-style search
**Example:**
```jsx
// src/components/CommandPalette.jsx
import { Command } from 'cmdk';

function CommandPalette({ open, onOpenChange }) {
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange}>
      <Command.Input placeholder="Search pages, games, actions..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Pages">
          <Command.Item onSelect={() => dispatch('navigate', { destination: '/constellation' })}>
            Constellation
          </Command.Item>
          {/* ... */}
        </Command.Group>
        <Command.Group heading="Games">
          {/* Map from gameRegistry */}
        </Command.Group>
        <Command.Group heading="Actions">
          <Command.Item onSelect={() => dispatch('control_music', { action: 'play' })}>
            Play Music
          </Command.Item>
          {/* ... */}
        </Command.Group>
        <Command.Group heading="Constellation Nodes">
          {/* Loaded from constellation.graph.json */}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

### Anti-Patterns to Avoid
- **Relying on model to narrate AND call tools:** OpenAI models do NOT reliably produce text content alongside tool_calls in the same response. The finish_reason is either `stop` (text only) or `tool_calls` (tools only). Always generate narration client-side.
- **POST endpoint for cached content:** Vercel's edge CDN only caches GET/HEAD responses. A POST to `/api/glint-journal` would bypass cache entirely and hit OpenAI on every request.
- **Plugin-based tool registry:** The user explicitly decided on a static TOOLS map. Do not build dynamic tool loading or plugin registration.
- **Putting cmdk items in App.jsx:** The command palette should be its own lazy-loaded component, not inline in App.jsx. The ~82KB unpacked cmdk + Radix dependencies should not load until first Cmd+K press.
- **Rendering tool call JSON in chat:** Tool calls should never show raw JSON to the user. Show only the narration text, then the action result. The tool call is invisible infrastructure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Command palette | Custom search dropdown with keyboard nav | cmdk 1.1.1 | Keyboard navigation, accessibility (ARIA combobox), fuzzy filtering, scroll management are deceptively complex |
| Fuzzy search/filtering | Custom string matching for palette | cmdk built-in filter | cmdk's filter ranks results by relevance out of the box; handles edge cases like partial matches |
| Dialog overlay (for palette) | Custom modal with focus trap | cmdk's Command.Dialog (wraps Radix Dialog) | Focus trapping, escape handling, scroll lock, portal rendering all handled |
| Daily content rotation | Custom date-based selection | Existing `dailySeed.js` / `dailyPick()` | Already deterministic and battle-tested in the project |
| SSE streaming proxy | Custom WebSocket or polling | Existing `api/glint-chat.js` pattern | Already handles SSE chunking, error recovery, safety timeout |

**Key insight:** The action dispatcher itself IS a hand-roll, but intentionally so -- it is a ~50-line pure JS module that maps actions to CustomEvents. This is simpler than any library solution and matches the project's existing CustomEvent pattern (`add-xp`, `game-complete`, `trigger-prism-peek`, etc.).

## Common Pitfalls

### Pitfall 1: Tool Call Arguments Arrive in Chunks
**What goes wrong:** Treating each streaming delta's `tool_calls[0].function.arguments` as a complete JSON string, leading to parse errors.
**Why it happens:** OpenAI streams tool call arguments token by token, just like text content. The arguments field is built incrementally across multiple SSE chunks.
**How to avoid:** Accumulate `function.arguments` across all deltas for the same tool call index. Only JSON.parse when `finish_reason` is `tool_calls` (final chunk).
**Warning signs:** `SyntaxError: Unexpected end of JSON input` in the streaming handler.

### Pitfall 2: Cmd+K Conflicts with Existing Handler
**What goes wrong:** The existing `useEffect` in Home.jsx (line 5234-5257) already handles Ctrl+K to toggle the chat panel. Adding cmdk's Command.Dialog with its own Cmd+K listener creates a conflict.
**Why it happens:** Two keydown listeners both responding to the same shortcut.
**How to avoid:** Remove the existing Ctrl+K handler from Home.jsx. Replace it with the command palette's open/close state. The palette becomes the Cmd+K target; opening Glint chat is one of the palette's actions.
**Warning signs:** Cmd+K opens both the palette and the chat panel simultaneously.

### Pitfall 3: Vercel Edge Cache Not Working for Journal
**What goes wrong:** The journal endpoint generates a new OpenAI response on every request, costing money and adding latency.
**Why it happens:** Using POST instead of GET, or including `Authorization` headers, or setting `private` cache-control. Any of these bypass Vercel's CDN cache.
**How to avoid:** Use GET method only. Do not require authentication. Set `Cache-Control: max-age=0, s-maxage=86400, stale-while-revalidate=3600`. Do not set `Authorization` or `Set-Cookie` headers.
**Warning signs:** `x-vercel-cache: MISS` on every request in response headers.

### Pitfall 4: Command Palette Loading 417 Constellation Nodes Eagerly
**What goes wrong:** Importing the full constellation graph JSON (417 nodes) at palette mount time adds unnecessary bundle weight and parse time.
**Why it happens:** Constellation data is in `public/data/constellation.graph.json` (large file with media, descriptions, connections).
**How to avoid:** Build a lightweight search index at build time or on first palette open -- extract only `{id, title, type, epoch}` from each node. Load this index lazily on first Cmd+K, not at app startup. Alternatively, fetch the JSON only when the palette opens and cache in memory.
**Warning signs:** Slow initial Cmd+K open, large JS bundle increase.

### Pitfall 5: Game Registry Items Not All Playable
**What goes wrong:** The command palette or Glint AI offers to launch a game that is a stub ("Coming Soon" placeholder), frustrating the user.
**Why it happens:** The `gameRegistry.js` has both real games and stub games. Stubs have components that render a "Coming Soon" screen but are not actual games.
**How to avoid:** When building the palette game list and the AI tool's game enum, filter to only games that are fully implemented. Add a `playable: true/false` flag to registry entries, or maintain a separate allowlist of implemented game IDs.
**Warning signs:** User says "Play a game" and gets a Coming Soon screen.

### Pitfall 6: Navigation Tool Firing on Non-Home Pages
**What goes wrong:** Glint chat currently only exists on the Home page (in Home.jsx). If a user navigates away, the chat state is lost. The action dispatcher's `navigate` event fires but no listener exists on the target page.
**Why it happens:** GlintChatPanel and all AI chat state live in Home.jsx, not in a global context.
**How to avoid:** The action dispatcher uses `window.dispatchEvent` which is global. The navigation listener should be in App.jsx (which is always mounted). Music control listener should be in AudioProvider (always mounted). Game launch may need to be elevated to App.jsx or use a global state approach. For this phase, accept that AI chat is home-page-only and the Cmd+K palette works everywhere.
**Warning signs:** Actions dispatched but nothing happens because the listener component is not mounted.

## Code Examples

### OpenAI Function Calling Request Format (Chat Completions)
```javascript
// Source: OpenAI API docs - function calling guide
// The tools parameter structure for Chat Completions API
const requestBody = {
  model: 'gpt-4o-mini',
  messages: apiMessages,
  stream: true,
  max_tokens: 300,
  temperature: 0.85,
  tools: [
    {
      type: 'function',
      function: {
        name: 'navigate',
        description: 'Navigate the visitor to a specific page on jarowe.com. Use when the visitor asks to go somewhere, visit a page, or see a specific section.',
        parameters: {
          type: 'object',
          properties: {
            destination: {
              type: 'string',
              enum: ['/', '/constellation', '/universe', '/garden',
                     '/now', '/favorites', '/vault', '/starseed', '/profile'],
              description: 'The route path to navigate to'
            }
          },
          required: ['destination'],
          additionalProperties: false
        },
        strict: true
      }
    },
    {
      type: 'function',
      function: {
        name: 'launch_game',
        description: 'Launch a mini-game for the visitor. Use when they ask to play a game, want entertainment, or are bored.',
        parameters: {
          type: 'object',
          properties: {
            game_id: {
              type: 'string',
              enum: ['emoji-slots', 'fortune-cookie', 'whack-a-mole',
                     'memory-match', 'word-scramble', 'snake', 'breakout',
                     'typing-race', 'mini-golf', 'pizza-maker'],
              description: 'The game to launch'
            }
          },
          required: ['game_id'],
          additionalProperties: false
        },
        strict: true
      }
    },
    {
      type: 'function',
      function: {
        name: 'control_music',
        description: 'Control music playback. Use when the visitor asks to play music, pause, skip, or stop music.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['play', 'pause', 'next'],
              description: 'The playback action to perform'
            }
          },
          required: ['action'],
          additionalProperties: false
        },
        strict: true
      }
    },
    {
      type: 'function',
      function: {
        name: 'show_daily',
        description: "Show today's daily content including holiday, creative prompt, and Glint journal entry. Use when the visitor asks what's new today or what's happening.",
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false
        },
        strict: true
      }
    }
  ],
  tool_choice: 'auto',
};
```

### Streaming Tool Call Accumulation
```javascript
// Source: OpenAI community / API docs - streaming tool_calls
// In api/glint-chat.js stream handler -- accumulate tool call arguments
let toolCalls = {};
let finishReason = null;

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;

  const json = JSON.parse(trimmed.slice(6));
  const delta = json.choices?.[0]?.delta;
  finishReason = json.choices?.[0]?.finish_reason || finishReason;

  // Accumulate text content (existing behavior)
  if (delta?.content) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: delta.content })}\n\n`));
  }

  // Accumulate tool calls (NEW)
  if (delta?.tool_calls) {
    for (const tc of delta.tool_calls) {
      const idx = tc.index;
      if (!toolCalls[idx]) {
        toolCalls[idx] = { id: tc.id, name: tc.function?.name || '', arguments: '' };
      }
      if (tc.function?.name) toolCalls[idx].name = tc.function.name;
      if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
    }
  }

  // When stream ends with tool_calls finish_reason, send accumulated tool call
  if (finishReason === 'tool_calls') {
    const calls = Object.values(toolCalls);
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ tool_calls: calls })}\n\n`)
    );
  }
}
```

### cmdk Glass Panel Styling
```css
/* Source: cmdk data-attribute styling pattern */
/* CommandPalette.css -- Glass panel matching site aesthetic */

[cmdk-dialog] {
  position: fixed;
  inset: 0;
  z-index: 10000;
}

[cmdk-overlay] {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

[cmdk-root] {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: min(90vw, 560px);
  background: rgba(var(--tod-glass-rgb, 20, 10, 40), 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

[cmdk-input] {
  width: 100%;
  padding: 16px 20px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 16px;
  outline: none;
}

[cmdk-list] {
  max-height: 400px;
  overflow: auto;
  padding: 8px;
}

[cmdk-group-heading] {
  padding: 8px 12px 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.4);
}

[cmdk-item] {
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

[cmdk-item][data-selected='true'] {
  background: rgba(124, 58, 237, 0.25);
  color: white;
}

[cmdk-empty] {
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
}
```

### Vercel Edge Cached Journal Endpoint
```javascript
// Source: Vercel docs - Cache-Control headers
// api/glint-journal.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // Fallback: if no API key, return null (client uses static fallback pool)
  if (!apiKey) {
    return new Response(JSON.stringify({ entry: null, source: 'no-key' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=0, s-maxage=3600',
      },
    });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Glint, a sentient prismatic entity. Write a 2-3 sentence journal reflection for today (${today}). Muse about creativity, light, wonder, or the nature of digital existence. Be poetic but warm, playful but genuine. Never mention being AI. Respond with ONLY the journal text, no quotes or labels.`
          },
          { role: 'user', content: `Write your journal entry for ${today}.` }
        ],
        max_tokens: 150,
        temperature: 0.9,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const entry = data.choices?.[0]?.message?.content?.trim();

    return new Response(JSON.stringify({ entry, date: today, source: 'ai' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache on Vercel edge for 24h, serve stale for 1h while revalidating
        'Cache-Control': 'max-age=0, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ entry: null, source: 'error' }), {
      status: 200, // Return 200 so client gracefully falls back
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=0, s-maxage=300', // Retry cache in 5 min on error
      },
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `functions` parameter in Chat Completions | `tools` parameter with `type: 'function'` | June 2023 (GPT-4 update) | `functions` is deprecated; always use `tools` array |
| No strict mode for function calling | `strict: true` with structured outputs | Aug 2024 | Guarantees response adheres to schema; requires `additionalProperties: false` and all fields `required` |
| Chat Completions only | Responses API recommended for new projects | March 2025 | Responses API is the new default, but Chat Completions remains fully supported and stable |
| cmdk 0.x with lowercase value | cmdk 1.x with case-sensitive value, mandatory Command.List | 2024 | Breaking change: values are trimmed but case-preserved; Command.List is required or errors occur |

**Deprecated/outdated:**
- `functions` parameter in Chat Completions: replaced by `tools` array
- `function_call` in response delta: replaced by `tool_calls` array
- cmdk `filter` prop on items: filtering is now on root Command component only
- `react-cmdk` (albingroen): different package, last published 3 years ago, NOT the same as `cmdk` by pacocoursey

## Open Questions

1. **Constellation Node Search Index Size**
   - What we know: 417 nodes in constellation.graph.json, each with title, description, entities, epoch, connections, media
   - What's unclear: Whether loading all 417 nodes into the palette is too heavy, or if a lightweight {id, title} index is sufficient for search
   - Recommendation: Build a lightweight search index on first palette open. Extract `{id, title, type}` -- roughly 417 * ~100 bytes = ~40KB. This is fine for client-side fuzzy search.

2. **Game ID Allowlist for AI Tools**
   - What we know: gameRegistry.js has ~60+ game entries including variants and stubs
   - What's unclear: Which games are fully playable vs. stubs without checking each component
   - Recommendation: The `enum` in the `launch_game` tool schema should list only confirmed-playable base game IDs. From MEMORY.md, confirmed playable: emoji-slots, fortune-cookie, whack-a-mole, memory-match, word-scramble, snake, breakout, typing-race, pizza-maker, mini-golf. Plus Wave 2 additions: gacha-pull, scratch-card, coin-toss, lucky-wheel, bubble-pop, tower-stack, reaction-test, color-flood, catch-dodge, pattern-recall, space-invaders, dungeon-crawl, claw-machine, slot-machine, rhythm-tap, scavenger-hunt, platform-runner, card-battle, treasure-dig, rune-match, conveyor-chef, asteroid-dodge. Verify at implementation time.

3. **show_daily Tool Response Content**
   - What we know: GLINT-07 requires Glint to respond with current daily content on request
   - What's unclear: Whether `show_daily` should return data for the AI to narrate, or if the client should gather data and compose the response
   - Recommendation: The `show_daily` tool should NOT call OpenAI again. Instead, the client should gather current holiday, prompt, and journal data locally and compose a narrated response from the action dispatcher. This avoids a double API call and is faster.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None currently installed |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GLINT-01 | Navigate to page via Glint chat | manual-only | Manual: say "take me to constellation" in chat | N/A |
| GLINT-02 | Launch game via Glint chat | manual-only | Manual: say "play a game" in chat | N/A |
| GLINT-03 | Control music via Glint chat | manual-only | Manual: say "play some music" in chat | N/A |
| GLINT-04 | Tool calls narrated in character | manual-only | Manual: verify narration appears before action | N/A |
| GLINT-05 | Cmd+K palette with shared dispatcher | manual-only | Manual: press Cmd+K, search, select items | N/A |
| GLINT-07 | Show daily content on request | manual-only | Manual: say "what's new today?" in chat | N/A |
| TODAY-05 | AI journal card in TodayRail | manual-only | Manual: check homepage for journal card + `curl /api/glint-journal` headers | N/A |

**Note:** All requirements involve AI integration, real-time UI behavior, and browser-specific interactions (keyboard shortcuts, navigation, audio playback) that cannot be meaningfully unit-tested without extensive mocking. Manual verification is the appropriate test type for this phase. The action dispatcher module (`actionDispatcher.js`) could have unit tests for dispatch/narration logic, but the project has no test framework installed and adding one is out of scope for this phase.

### Sampling Rate
- **Per task commit:** Manual verification of the specific requirement
- **Per wave merge:** Full manual walkthrough of all 7 requirements
- **Phase gate:** All 7 requirements verified via manual testing checklist

### Wave 0 Gaps
- None -- manual testing approach requires no test infrastructure

## Sources

### Primary (HIGH confidence)
- OpenAI API Docs - Function Calling Guide: https://developers.openai.com/api/docs/guides/function-calling -- tool schema format, strict mode, multi-turn flow
- OpenAI API Docs - Streaming Events: https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events -- delta format for tool_calls, finish_reason values
- cmdk GitHub (pacocoursey): https://github.com/pacocoursey/cmdk -- API docs, component structure, Dialog usage
- Vercel Docs - Cache-Control Headers: https://vercel.com/docs/caching/cache-control-headers -- s-maxage behavior, GET-only caching, stale-while-revalidate
- npm registry: cmdk 1.1.1 -- version, peer deps (react ^18 || ^19), dependencies (Radix UI)

### Secondary (MEDIUM confidence)
- OpenAI Community Forum - Mixed content + tool_calls: https://community.openai.com/t/how-to-include-content-and-tool-calls-in-one-message/981808 -- confirmed unreliable dual output
- OpenAI Community Forum - Streaming tool_calls: https://community.openai.com/t/help-for-function-calls-with-streaming/627170 -- accumulation pattern for streamed arguments
- Vercel Next.js Discussion - POST not cached: https://github.com/vercel/next.js/discussions/78158 -- confirmed POST bypasses edge cache

### Tertiary (LOW confidence)
- None -- all critical findings verified against primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - cmdk version verified via npm, OpenAI API verified via official docs
- Architecture: HIGH - based on existing codebase patterns (CustomEvent, SSE proxy, Edge Functions) and verified API behavior
- Pitfalls: HIGH - tool_calls streaming behavior verified across multiple OpenAI community reports; Vercel caching behavior verified via official docs
- Narration approach: HIGH - model's inability to reliably produce text + tool_calls is well-documented; client-side narration is the proven pattern

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable -- OpenAI Chat Completions API is mature, cmdk 1.x is stable)
