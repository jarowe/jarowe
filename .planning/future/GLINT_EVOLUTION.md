# GLINT EVOLUTION — From Mascot to Operator

## The thesis

Glint's current state: a charming AI character who chats, peeks, and has personality.
Glint's target state: **the operating layer of the site** — a host who can explain, navigate, reveal, activate, and create.

The difference is agency. Today Glint talks about the site. Tomorrow Glint acts within it.

## Current architecture (what exists)

| Layer | File | Status |
|-------|------|--------|
| Tier 1: Ambient brain | `src/utils/glintBrain.js` | Built. Context-aware peek lines. |
| Tier 2: Dialogue trees | `src/utils/glintBrain.js` | Built. 6 trees, ~40 nodes, pill navigation. |
| Tier 3: Autonomy | `src/utils/glintAutonomy.js` | Built. Cooldowns, scheduling, event reactions, relationship memory. |
| Tier 4: AI chat | `api/glint-chat.js` + components | Built. SSE streaming, OpenAI-backed, expression parsing. |
| Character rendering | `Home.jsx` (Prism/Canvas) | Built. Glass shader, eye, mouth, eyelid, expressions. |
| Relationship memory | `glintAutonomy.js` → localStorage | Built. stranger→acquaintance→friend→best-friend. |

### Key integration points
- `Home.jsx:~L4994` — Chat handling, AI mode, streaming state
- `api/glint-chat.js:L11` — Edge Function, SSE proxy to OpenAI
- `api/_lib/glint-system-prompt.js` — Dynamic personality + knowledge
- `src/utils/glintBrain.js` — Ambient + dialogue logic
- `src/utils/glintAutonomy.js:L54` — Autonomy class with 4 subsystems

---

## Phase 1: Bounded tool use (weeks 2-4)

### The pattern
OpenAI function calling: define tools as JSON schemas → LLM returns `tool_calls` → client executes → LLM confirms naturally.

### Action dispatcher
```js
// src/utils/glintActions.js
const GLINT_TOOLS = {
  navigate: ({ page, focusNode }) => {
    // Dispatch to React Router
    window.dispatchEvent(new CustomEvent('glint-navigate', {
      detail: { page, focusNode }
    }));
    return { success: true, page };
  },

  focusConstellationNode: ({ nodeId }) => {
    window.dispatchEvent(new CustomEvent('constellation-focus', {
      detail: { nodeId }
    }));
    return { success: true, nodeId };
  },

  launchGame: ({ gameId }) => {
    window.dispatchEvent(new CustomEvent('glint-launch-game', {
      detail: { gameId }
    }));
    return { success: true, gameId };
  },

  showTodaySignal: () => {
    window.dispatchEvent(new CustomEvent('glint-show-today'));
    return { success: true };
  },

  controlMusic: ({ action }) => {
    window.dispatchEvent(new CustomEvent('glint-music', {
      detail: { action }
    }));
    return { success: true, action };
  },

  celebrate: ({ type }) => {
    if (type === 'confetti') import('canvas-confetti').then(m => m.default());
    return { success: true, type };
  },

  createNote: ({ title, content }) => {
    window.dispatchEvent(new CustomEvent('glint-create-note', {
      detail: { title, content }
    }));
    return { success: true, title };
  },

  saveIdea: ({ text }) => {
    window.dispatchEvent(new CustomEvent('glint-save-idea', {
      detail: { text }
    }));
    return { success: true };
  },
};

export function executeGlintTool(toolName, args) {
  const handler = GLINT_TOOLS[toolName];
  if (!handler) return { error: `Unknown tool: ${toolName}` };
  return handler(args);
}
```

### Tool definitions for OpenAI
```js
// In api/glint-chat.js
const tools = [
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Navigate the visitor to a page on the site',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'string', enum: ['/', '/constellation', '/garden', '/universe', '/now', '/favorites', '/workshop', '/labs'] },
          focusNode: { type: 'string', description: 'Optional constellation node ID to focus' }
        },
        required: ['page']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'launchGame',
      description: 'Start a mini-game for the visitor',
      parameters: {
        type: 'object',
        properties: {
          gameId: { type: 'string', description: 'Game ID from the registry' }
        },
        required: ['gameId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'controlMusic',
      description: 'Control the music player',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['play', 'pause', 'next'] }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'showTodaySignal',
      description: 'Show the daily content/progress signal'
    }
  },
  {
    type: 'function',
    function: {
      name: 'celebrate',
      description: 'Trigger a celebration effect',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['confetti', 'sparkle'] }
        },
        required: ['type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'saveIdea',
      description: 'Save an idea to the Starseed scratchpad',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The idea text to save' }
        },
        required: ['text']
      }
    }
  }
];
```

### SSE stream handling
Modify `handleAiChat` in Home.jsx to detect tool calls in the SSE stream:
```
data: {"tool_call": {"name": "navigate", "arguments": {"page": "/constellation"}}}
```
Execute via dispatcher, send result back to LLM, LLM generates natural confirmation:
"Taking you to the Constellation now — look for the Greece epoch, it's my favorite part."

### Critical constraint
Glint should NEVER:
- Access external APIs or browse the web
- Modify user data without explicit action
- Pretend to have capabilities he doesn't
- Break character to act like a generic assistant

Glint should ALWAYS:
- Stay in character (curious, witty, slightly mischievous)
- Explain what he's doing: "Let me pull that up for you..."
- Offer choices rather than assuming: "Want me to take you there?"
- Gracefully handle tool failures: "Hmm, that didn't work. Try clicking [link] instead."

---

## Phase 2: Command palette integration (weeks 3-5)

### Cmd+K as Glint's keyboard interface
The command palette and Glint share the same action dispatcher. Typing in the command palette is equivalent to asking Glint to do something.

```
Cmd+K → "constellation greece" → navigate to constellation, focus Greece nodes
Cmd+K → "play breakout" → launch Breakout game
Cmd+K → "music" → toggle music
Cmd+K → "today" → show daily content
Cmd+K → "save idea: build a..." → save to Starseed scratchpad
```

This makes Glint's capabilities discoverable through a familiar UI pattern while maintaining Glint as the primary conversational interface.

---

## Phase 3: Voice mode (weeks 8-12)

### Layered approach
| Tier | Input | Output | Cost | When |
|------|-------|--------|------|------|
| Free | Web Speech API | Web Speech API TTS | $0 | First |
| Premium | Whisper-web (Transformers.js) | ElevenLabs Flash v2.5 | ~$5-20/mo | After tool use works |
| Full duplex | OpenAI Realtime API (WebRTC) | Built-in model voice | Per-use | After voice proves value |

### Expression sync
Feed audio amplitude data to `window.__prismTalking` for lip-sync. The mouth texture system (9 textures: neutral/smile/open/talk1/talk2/excited/love/angry/thinking) already supports this.

### Custom voice design
ElevenLabs allows text-prompt voice design. Target: "crystalline, slightly reverbed, with cosmic wonder." The voice should feel like light refracting through glass.

---

## Phase 4: Conversation memory (weeks 10-14)

### What to remember
Store conversation **summaries**, not full transcripts.

```sql
-- Supabase table
CREATE TABLE glint_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  session_date date NOT NULL,
  topics text[],           -- ['greece', 'filmmaking', 'constellation']
  sentiment text,          -- 'curious', 'playful', 'deep'
  summary text,            -- "Visitor explored the Greece epoch, asked about filmmaking career"
  relationship_level text, -- 'stranger', 'acquaintance', 'friend', 'best-friend'
  created_at timestamptz DEFAULT now()
);
```

### On return visit
Glint's system prompt includes:
> "This visitor last came 3 days ago. They were interested in the Greece worldschooling experience and asked about your filmmaking career. Their relationship level is 'acquaintance'. They've visited 12 times."

Glint greets accordingly: "Welcome back. Still thinking about Greece? I found a constellation node you might have missed last time."

---

## Future: WebMCP (2026 H2)

Chrome 146 is previewing WebMCP — a standard where websites declare their capabilities as structured tools. Instead of only Glint calling tools, ANY AI agent could discover jarowe.com's capabilities:

```js
navigator.modelContext.registerTool({
  name: 'explore-constellation',
  description: 'Navigate the life constellation of Jared Rowe',
  parameters: { epoch: 'string', nodeId: 'string' }
});
```

This is forward-looking but positions jarowe.com as an agent-native website.

---

## Challenge: Does tool use break the character?

Risk: Glint becomes a router, not a character. "Navigating to /constellation" is boring. "Let me show you something — this is where the story gets interesting" is not.

**Counter-move:** Every tool call must be wrapped in character. The action dispatcher fires the tool, but the LLM generates the narration around it. The system prompt should instruct: "When using tools, always narrate what you're doing as if you're a host giving a tour, not a computer executing commands."

The character IS the differentiator. Never sacrifice it for efficiency.
