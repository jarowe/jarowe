# STARSEED LABS — The Creation Layer

## The thesis

jarowe.com inspires. Starseed helps you begin.

The core world provokes wonder and curiosity. Starseed Labs converts that energy into action. Without this layer, the site is purely observational — beautiful but passive. With it, visitors become participants.

## What Starseed IS

A lightweight creative workspace embedded in jarowe.com where visitors can capture ideas, sketch, write, and get AI-assisted project kickoffs.

## What Starseed is NOT

- A full design tool (Figma/Canva competitor)
- A marketplace
- A social platform
- A publishing system
- A project management suite

It is a **scratchpad with superpowers** — the simplest possible creative surface that Glint can hand off into.

---

## Components

### 1. Scratchpad (Milkdown)

**What:** A glass-panel markdown editor for capturing ideas quickly.

**Package:** `@milkdown/core` + `@milkdown/react` + `@milkdown/preset-commonmark`
- ~40KB gzipped
- MIT license, free
- WYSIWYG markdown (no split-pane, the editor IS the preview)
- Headless — style to match jarowe.com's glass-panel aesthetic
- Plugin-driven: slash commands, tables, LaTeX if needed
- Y.js compatible for future collaboration

**Persistence:**
- Anonymous: `localStorage` (key: `jarowe_scratchpad`)
- Authenticated: Supabase `notes` table
- Auto-save: debounced 500ms on every keystroke

**UX:**
- Floating "capture" button (like Glint's peek) opens notepad
- Glass panel aesthetic matching existing site
- Multiple notes via simple tabs
- Glint can pre-populate: "Here's what we just brainstormed..."

### 2. Canvas (Excalidraw)

**What:** Infinite sketch canvas for visual thinking.

**Package:** `@excalidraw/excalidraw`
- ~400KB gzipped (code-split via lazy route)
- MIT license, free
- Hand-drawn aesthetic fits the playful site vibe
- Exports: SVG, PNG, JSON
- Scene data is plain JSON — easy to persist

**Why Excalidraw over tldraw:**
- tldraw requires $6,000/year commercial license
- Excalidraw is MIT, fully free
- The hand-drawn aesthetic matches jarowe.com's personality better than tldraw's polished look
- Both are embeddable React components; Excalidraw wins on cost alone

**Persistence:**
- Anonymous: `localStorage` (scene JSON, up to ~5MB)
- Authenticated: Supabase `canvases` table + Supabase Storage for assets
- Auto-save on scene change (debounced)

**Self-hosted fonts:** Copy from `node_modules/@excalidraw/excalidraw/dist/prod/fonts` into `public/fonts/excalidraw/`

### 3. Brainstorm mode (Glint-powered)

**What:** Structured AI ideation where Glint helps scaffold an idea.

**Flow:**
1. User says "I want to build a..." (in Glint chat or brainstorm page)
2. Glint asks 3-5 clarifying questions
3. Glint generates a structured project brief:
   - Title
   - Core idea (1 sentence)
   - Mood/vibe
   - 3 next steps
   - Suggested tools
4. Brief saved as a note + optional canvas with initial structure

**Tech:** Extend existing `api/glint-chat.js` with a "brainstorm" mode in the system prompt. Use structured output (JSON mode) for the brief generation. Save to Supabase.

**Not:** A full project management system. Just a kickoff. The simplest possible "idea → something tangible."

---

## Route structure

```
/labs                  — Hub landing page
/labs/scratchpad       — Milkdown notepad (default entry point)
/labs/canvas           — Excalidraw canvas
/labs/canvas/:id       — Specific saved canvas
/labs/brainstorm       — Glint brainstorm mode
```

All routes lazy-loaded via `lazyRetry()` (matching existing pattern). Heavy packages (Excalidraw ~400KB) never load on main site pages.

## Navigation

- Navbar: "Create" link → `/labs`
- Glint handoff: "Want to sketch that? → /labs/canvas"
- Homepage CTA: "Start creating in Starseed →"
- After constellation exploration: "Capture this thought →"

## Auth strategy

### Anonymous-first (Supabase native)
```js
// On first Starseed interaction
await supabase.auth.signInAnonymously();
// Creates temporary user, full RLS access
// All work linked to anonymous UUID

// When user wants to save/share
await supabase.auth.linkIdentity({ provider: 'google' });
// All previous data preserved — same UUID
```

**Why:** No login wall. Visitors start creating immediately. Account creation happens when there's value to protect, not as a gate. The existing AuthContext + AuthModal handle this.

**UX for the upgrade moment:**
- After 3+ notes or 2+ canvases: Glint suggests "Want me to save this across devices?"
- Framed as an unlock/reward, not a form
- Ties to existing XP system: "Secure your progress" at XP milestone

---

## Supabase schema

```sql
CREATE TABLE starseed_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  title text DEFAULT 'Untitled',
  content text,       -- Markdown content
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE starseed_canvases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  title text DEFAULT 'Untitled Canvas',
  scene_data jsonb,   -- Excalidraw scene JSON
  thumbnail_url text,  -- Auto-generated preview
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only read/write their own data
ALTER TABLE starseed_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE starseed_canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notes"
  ON starseed_notes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own canvases"
  ON starseed_canvases FOR ALL
  USING (auth.uid() = user_id);
```

---

## Hub landing page (`/labs`)

```
┌─────────────────────────────────────────────┐
│  Starseed Labs                              │
│  "Where ideas take root"                    │
│                                             │
│  Glint: "Welcome to the lab. What are we   │
│  making today?"                             │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │  Scratchpad  │  │   Canvas     │        │
│  │  ✏️ Write     │  │   🎨 Sketch  │        │
│  │  Quick notes │  │   Visual     │        │
│  │  and ideas   │  │   thinking   │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │  Brainstorm  │  │   Recent     │        │
│  │  🧠 With Glint│  │   📁 Your    │        │
│  │  AI-powered  │  │   projects   │        │
│  │  kickoffs    │  │              │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Phased delivery

### Phase 3a: Scratchpad (1 week)
- Milkdown notepad at `/labs/scratchpad`
- localStorage persistence
- Glass-panel styling
- Glint integration (pre-populate from chat)

### Phase 3b: Canvas (1-2 weeks)
- Excalidraw at `/labs/canvas`
- localStorage persistence
- Self-hosted fonts
- Scene save/load

### Phase 3c: Hub + Brainstorm (1 week)
- `/labs` landing page
- Glint brainstorm mode
- Supabase persistence (requires Supabase project setup)
- Anonymous auth flow

---

## Future possibilities (not now)

| Feature | When | Why wait |
|---------|------|----------|
| AI image generation | After brainstorm proves out | Adds API cost, need to validate demand |
| Collaborative canvas | After single-player usage exists | Y.js + WebSocket adds complexity |
| Template library | After 20+ users have created things | Need real patterns to templatize |
| Bedtime story reader | After story content is authored | The reader is easy; the content is the bottleneck |
| Project sharing | After auth is deployed | Need accounts before sharing makes sense |
| Kanban board | After project complexity warrants it | Notes + canvas cover 90% of initial use cases |

## Challenge: Will anyone actually use this?

The risk is building creative tools that nobody touches because they came for the spectacle.

**Counter-move:** Starseed must be PULL, not PUSH. It exists because:
1. Glint naturally hands off into it during conversation
2. The daily prompt explicitly invites creation
3. The constellation sparks ideas that need capturing

If nobody uses it after 60 days, reduce it to just the scratchpad (minimal maintenance cost) and refocus on the core world.

The creation layer is a bet that wonder leads to action. If it doesn't, the bet was cheap ($0 in ongoing costs, ~3 weeks of build time, fully removable).
