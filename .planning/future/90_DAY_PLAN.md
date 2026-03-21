# 90-DAY PLAN — Five Phases to a Living World

## Guiding principle

Ship the daily engine and Glint upgrade first. Add creation and immersion second. Acquire attention third. This order matters — retention before spectacle, spectacle before scale.

---

## Phase 1: Clarify the Promise (weeks 1-2)

### Goal
A visitor understands what jarowe.com is in one visit. The homepage answers: "What is alive here today?"

### Deliverables

#### 1.1 "Today" homepage layer
- [ ] `src/utils/dailySeed.js` — deterministic seed module (`seedrandom` npm)
- [ ] `src/utils/astro.js` — moon phase + sun position + time-of-day phase (`suncalc` npm)
- [ ] "Today at jarowe.com" component on homepage showing:
  - Today's holiday (already exists, elevate visibility)
  - Today's featured constellation node (`dailyPick`)
  - Today's creative prompt (from curated pool of ~50)
  - One Glint invitation (context-aware, tied to daily state)
- [ ] Time-of-day color temperature via CSS custom properties

#### 1.2 View Transitions
- [ ] `view-transition-name` on navbar, globe canvas, music player
- [ ] Wrap React Router navigation in `startViewTransition()` with fallback
- [ ] CSS keyframes for crossfade transitions

#### 1.3 Dynamic OG images
- [ ] `api/og.js` — Vercel Edge Function using `@vercel/og`
- [ ] Route-specific OG cards: homepage (today's state), constellation (focused node), games (result)
- [ ] Meta tags updated per-route via React Helmet or document.title

#### 1.4 Date-locked easter eggs (3-5 dates)
- [ ] Full moon: enhanced nebula, Glint moon dialogue
- [ ] Friday the 13th: subtle glitch effects
- [ ] Pi Day (3/14): Pi digits in footer
- [ ] Site birthday: celebration mode

### Acceptance criteria
- Visitor sees date-specific content within 5 seconds
- Page transitions feel smooth and intentional
- Shared URLs have compelling, unique preview images
- Easter eggs fire correctly on their dates

### New packages
- `seedrandom` (3KB)
- `suncalc` (4KB)

### Cost: $0/month

---

## Phase 2: Make Glint an Operator (weeks 2-4)

### Goal
Glint can actually DO things — navigate, reveal, launch, save. He becomes the fastest way to use the site.

### Deliverables

#### 2.1 Action dispatcher
- [ ] `src/utils/glintActions.js` — tool name → React state mutation via CustomEvents
- [ ] Tools: `navigate`, `focusConstellationNode`, `launchGame`, `controlMusic`, `showTodaySignal`, `celebrate`, `saveIdea`
- [ ] Home.jsx event listeners for each action type

#### 2.2 OpenAI tool definitions
- [ ] Add `tools` array to `api/glint-chat.js` OpenAI request
- [ ] Parse `tool_calls` from SSE stream in Home.jsx `handleAiChat`
- [ ] Execute tool → send result back → LLM generates narrated confirmation
- [ ] Error handling: graceful fallback if tool execution fails

#### 2.3 System prompt upgrade
- [ ] Update `api/_lib/glint-system-prompt.js` to include:
  - Tool usage instructions ("When navigating, narrate like a tour guide")
  - Bounded scope ("You can navigate this world. You cannot browse the internet.")
  - Character preservation ("Always stay in character as Glint")
  - Daily context (today's holiday, featured content)

#### 2.4 Command palette
- [ ] Cmd+K opens universal search overlay
- [ ] Search across: constellation nodes, pages, games, music, actions
- [ ] Keyboard-navigable (arrow keys, enter)
- [ ] Shares the same action dispatcher as Glint

### Acceptance criteria
- "Take me to the constellation" → Glint navigates there with narration
- "Play a game" → Glint suggests and launches a game
- "What's new today?" → Glint shows daily content
- Cmd+K works and feels fast
- Glint never breaks character or acts like a generic chatbot

### Cost: ~$0.06/month (same OpenAI usage)

---

## Phase 3: Launch Creation Surface (weeks 3-6)

### Goal
jarowe.com stops being purely observational. Visitors can capture, sketch, and ideate.

### Deliverables

#### 3.1 Starseed scratchpad
- [ ] `/labs/scratchpad` route (lazy-loaded)
- [ ] Milkdown editor with glass-panel styling
- [ ] localStorage persistence (auto-save, 500ms debounce)
- [ ] Glint can pre-populate notes from chat context

#### 3.2 Starseed canvas
- [ ] `/labs/canvas` route (lazy-loaded)
- [ ] Excalidraw embed with self-hosted fonts
- [ ] localStorage persistence (scene JSON)
- [ ] Save/load multiple canvases (tabs or list)

#### 3.3 Labs hub
- [ ] `/labs` landing page with cards for Scratchpad, Canvas, Brainstorm
- [ ] Glint welcome on Labs pages
- [ ] "Start creating in Starseed" CTA on homepage

#### 3.4 Glint handoff
- [ ] "Save this idea" tool creates a note in scratchpad
- [ ] "Sketch this" tool opens canvas with seed content
- [ ] Glint naturally suggests Starseed during conversations about ideas

### Acceptance criteria
- Visitor can write a note and find it on return
- Visitor can sketch on canvas and find it on return
- Glint can route visitors to Labs naturally
- Heavy packages (Excalidraw 400KB) only load on /labs routes

### New packages
- `@milkdown/core` + plugins (~40KB)
- `@excalidraw/excalidraw` (~400KB, lazy)

### Cost: $0/month

---

## Phase 4: Launch the Daily Engine (weeks 5-8)

### Goal
A real return loop exists. People come back because yesterday was different and tomorrow will be too.

### Deliverables

#### 4.1 Weather-responsive atmosphere
- [ ] Fetch Open-Meteo on load (sessionStorage cache, 30-min refresh)
- [ ] Map weather → visual parameters (fog density, particle speed, rain overlay, color warmth)
- [ ] Graceful fallback if geolocation denied (use default coordinates)

#### 4.2 Glint daily journal
- [ ] `api/daily-journal.js` Vercel Edge Function
- [ ] Vercel cron: `"0 7 * * *"` → generate via gpt-4o-mini
- [ ] Store in Supabase `glint_journal(date, body, mood)`
- [ ] Display as card in "Today" section
- [ ] Fallback: curated journal entries for the first month while the pipeline matures

#### 4.3 Streak system
- [ ] localStorage: `jarowe_streak` with currentStreak, lastVisitDate, freezesAvailable
- [ ] Glint reactions at milestones (3, 7, 14, 30 days)
- [ ] Streak freeze mechanic (auto-applied on 1-day miss)
- [ ] Visual indicator (subtle streak counter in navbar or Glint area)

#### 4.4 Daily progress signal
- [ ] `src/data/progressSignals.json` — 50+ hand-curated signals to start
- [ ] `dailyPick(signals, 'progress')` rotation
- [ ] Card in "Today" section: headline + source + link
- [ ] Globe integration: if signal has coordinates, show pin

#### 4.5 Daily prompt
- [ ] `src/data/dailyPrompts.json` — 100+ creative prompts
- [ ] Displayed in "Today" section
- [ ] "Start in Starseed →" CTA opens scratchpad/canvas with prompt pre-loaded

### Acceptance criteria
- Site feels visually different based on actual weather
- Every morning, there's new Glint journal content
- Streak is tracked and Glint reacts to milestones
- One progress signal and one creative prompt visible daily
- Returning visitor sees ALL of these without hunting

### Cost: ~$0.06/month (Glint journal API calls)

---

## Phase 5: One Premium Immersive Portal (weeks 8-12)

### Goal
The site gets a flagship "wow" surface without becoming structurally dependent on immersive tech.

### Deliverables

#### 5.1 Capture and prepare one splat scene
- [ ] Choose location (home office, Greece house, or another meaningful place)
- [ ] Capture via Polycam (phone) or PostShot (desktop)
- [ ] Edit in SuperSplat — crop, clean, optimize
- [ ] Export to SPZ format (~8MB compressed)

#### 5.2 Render in the site
- [ ] Integrate Spark.js (`@sparkjsdev/spark`) or drei `<Splat>`
- [ ] Lazy-loaded on its own route or within constellation detail
- [ ] Soundtrack: auto-play contextual music (Howler.js, existing system)
- [ ] Narrative text overlay: the story of this place

#### 5.3 Portal transition
- [ ] Globe click or constellation node → camera flythrough → splat scene loads
- [ ] Transition shader (portal spiral or dissolve)
- [ ] Back button: reverse transition, return to origin

#### 5.4 Shareable entry point
- [ ] Direct URL: `/memory/[scene-name]`
- [ ] Dynamic OG image showing splat scene preview
- [ ] "Walk through [place name] →" CTA

### Acceptance criteria
- One complete splat scene accessible from the globe or constellation
- Transition feels like entering a portal, not clicking a link
- Scene loads in <3 seconds on desktop, <5 seconds on mobile
- The experience is shareable and has a compelling OG image

### New packages
- `@sparkjsdev/spark` (~100KB, lazy) or `@react-three/drei` Splat (already installed)

### Cost: Polycam free tier or PostShot ~17 EUR one-time. Hosting: $0 (static SPZ file).

---

## Post-90-day: What comes next

| Priority | Feature | Prerequisite |
|----------|---------|-------------|
| 1 | Deploy Supabase (cloud sync, auth, profiles) | Supabase project setup |
| 2 | Leaderboards + achievements visible | Supabase live |
| 3 | Voice-enabled Glint (Web Speech API tier) | Tool use working |
| 4 | Glint conversation memory | Supabase live |
| 5 | PartyKit presence ("3 others exploring") | D7 retention data |
| 6 | More splat scenes | First scene validated |
| 7 | Audio-reactive constellation | AnalyserNode integration |
| 8 | Guest book / community layer | Active returner base |
| 9 | WebGPU shader gallery | R3F v10 or progressive enhance |
| 10 | Show HN launch | Phases 1-5 complete and polished |

---

## Risk register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Building too much before validating | High | Ship Phase 1 in 2 weeks, measure before Phase 3 |
| Glint tool use feels robotic | Medium | System prompt emphasis on character. Test with real users. |
| Nobody uses Starseed | Medium | Start with scratchpad only. If unused after 60 days, reduce scope. |
| Splat capture quality is poor | Low | Use SuperSplat to clean. Multiple captures if needed. |
| Daily engine becomes maintenance burden | Medium | Automate everything possible. Manual curation only for progress signals. |
| Viral moment doesn't come | High | Build for cultural impact, not scale. The site IS the portfolio. |

---

## Definition of done for the 90-day plan

The 90-day plan succeeds if:

1. A first-time visitor understands what jarowe.com is within one visit
2. Glint can navigate, launch games, and save ideas via natural conversation
3. Visitors can create notes and sketches in Starseed Labs
4. The site has visible daily-changing content (weather, holiday, prompt, signal, journal)
5. One gaussian splat memory portal exists and is shareable
6. At least 30% of visitors take at least one intentional action
7. The site is ready for a Show HN launch
