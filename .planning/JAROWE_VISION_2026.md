# JAROWE.COM: THE VISION
## "A Playable Life" — The Future of the Personal Web

*Synthesized from 9 parallel research agents exploring every frontier of what's possible.*
*March 20, 2026*

---

## PART 1: WHAT IS JAROWE.COM?

### The Identity

**jarowe.com = WONDER** — the verb AND the noun. You come here to wonder, and it IS a wonder.

Primary framing: **"A playable life"** — three words that create an entirely new category. Not a portfolio. Not a blog. Not a game. A person's creative existence made interactive and explorable.

Secondary framing: **"A handmade corner of the internet"** — In the age of AI slop, craft is rebellion. One person made ALL of this.

Tagline: **"Come wonder."**

### The Unfilled Niche

No site on the internet combines ALL of:
- Daily-changing content (365 holidays)
- Persistent progression (XP, achievements, streaks)
- A resident AI character with relationship memory (Glint)
- 32+ playable games integrated into a larger narrative
- A 3D life constellation as explorable data
- A cinematic globe with real-time sun
- Music as a first-class feature
- Deep hidden secrets rewarding exploration

**jarowe.com is alone in this space.** The niche is: "the personal website as a living, playable, daily-changing world."

### The Manifesto (excerpt)

> We forgot that the internet was supposed to be fun.
>
> Technology should feel like magic, not like work. A 3D globe with real-time sun position. A character that remembers your name. A constellation that maps a life in three dimensions. These are not features. They are spells.
>
> Personality is the only defensible moat. AI can generate a portfolio in thirty seconds. What AI cannot generate is THIS — a specific human's specific worldview, expressed through specific creative choices.
>
> Come wonder.

---

## PART 2: THE ARCHITECTURE OF A LIVING SITE

### Three Pillars

1. **Temporal Awareness** — The site knows what day, time, season, weather, and moon phase it is. It changes accordingly.
2. **Relational Memory** — The site knows YOU. How many times you've visited, what you've discovered, how long you've been away. It deepens.
3. **Generative Freshness** — Something is procedurally unique to each visit. The site is never "done."

### The Four Layers

| Layer | Purpose | Examples |
|-------|---------|---------|
| **About** | Who is Jared Rowe? | Globe, Constellation, Garden, NOW |
| **Play** | Delightful standalone experiences | Games, Cipher, Shader Gallery, Physics Toys |
| **Return** | Daily engagement hooks | Holiday calendar, Daily seed content, Streaks, Glint journal |
| **Participate** | Community & creation | Guest book, Starseed Canvas, Community constellation, Leaderboards |

---

## PART 3: THE PROJECT HORIZON

### Tier 1: Quick Wins (Hours of Work Each)

#### 1.1 Daily Seed System
**What:** A `dailySeed.js` utility module that deterministically selects content per day.
**Tech:** `seedrandom` npm (3KB) — replaces hand-rolled seededRandom
**Impact:** Foundation for ALL daily-rotating content
```js
import seedrandom from 'seedrandom';
export const getDailySeed = (ns = '') => seedrandom(new Date().toISOString().slice(0,10) + ns);
export const dailyPick = (arr, ns) => arr[Math.floor(getDailySeed(ns)() * arr.length)];
```

#### 1.2 Moon Phase & Sun Integration
**What:** Client-side astronomical awareness driving site-wide visuals.
**Tech:** `suncalc` npm (4KB, zero deps)
- Moon phase fraction → constellation particle brightness, nebula glow intensity
- Full moon: enhanced glow, special Glint dialogue
- Dawn/dusk/night → continuous color temperature shift via CSS custom properties
- Sun position already computed for globe → extend to site-wide lighting
**Cost:** $0 (client-side computation)

#### 1.3 Extended CSS Variable Theming
**What:** The site's entire color palette shifts by season, time-of-day, and holiday.
- Morning = warm gold → Afternoon = crisp white → Evening = cool blue → Night = deep indigo
- Spring greens → Summer vibrancy → Autumn warmth → Winter cool
- Holiday accent overrides (already partially built)
**Tech:** CSS custom properties set by HolidayProvider + new temporal logic

#### 1.4 Date-Locked Easter Eggs
- Friday the 13th: Glint gets nervous, subtle glitch effects
- Full moon: werewolf cursor, brighter starfield
- Pi Day (3/14): Pi digits scroll across the bottom
- Summer/Winter Solstice: Special astronomical animation
- Leap Day: Content only available once every 4 years
**Tech:** Pure JS date checks + existing effect systems

#### 1.5 View Transitions Between Pages
**What:** Cinematic page transitions using the View Transitions API.
**Tech:** `document.startViewTransition()` + `view-transition-name` on persistent elements
- Globe morphs into constellation, photos fly to new positions, navbar slides
- Production-ready in Chrome 111+, Edge, Firefox 144+, Safari 18+
**Impact:** Single biggest "this feels like an app" improvement

#### 1.6 Dynamic OG Images
**What:** Every URL generates a unique social card when shared.
**Tech:** `@vercel/og` Edge Function — generates images at request time
- Constellation page: shows the focused node + connections
- Game result: score + visual
- Globe: snapshot of current view
- Daily holiday: themed card
**Impact:** Makes every link irresistible to click. Poorly configured OG images reduce CTR by 40%.

#### 1.7 Command Palette (Cmd+K)
**What:** Universal search + action launcher.
**Tech:** Custom React component (or `cmdk` npm package)
- Type to find any constellation node, navigate to any page, launch any game, toggle music, summon Glint
**Impact:** Transforms the site from "website" to "application"

---

### Tier 2: Medium Projects (Days of Work Each)

#### 2.1 Weather-Responsive Atmosphere
**What:** Real weather data driving site visuals.
**Tech:** Open-Meteo API (free, no key needed)
```
GET https://api.open-meteo.com/v1/forecast?latitude=28.54&longitude=-81.38&current_weather=true
```
- Cloud cover → nebula fog density
- Temperature → color warmth
- Wind speed → particle velocity
- Rain → rain particle overlay
- Thunderstorm → occasional lightning flash
- Clear night → boosted starfield + shooting stars
**Cost:** $0 (free API, cache in sessionStorage every 30 min)

#### 2.2 Audio-Reactive Constellation
**What:** When music plays, the constellation breathes with it.
**Tech:** AnalyserNode branch-connected to Howler masterGain (already documented in MEMORY)
- Low frequencies → pulse helix spine nodes
- Mid frequencies → ripple particle cloud
- High frequencies → sparkle effects on connections
- Bass hits → spawn particles
**Impact:** High "wow factor" — the constellation literally dances to the music

#### 2.3 ISS Tracker on Globe
**What:** Real International Space Station position on your globe.
**Tech:** `http://api.open-notify.org/iss-now.json` (free, no key, poll every 30s)
- Animate smoothly between positions
- When ISS is overhead visitor's location, Glint says "The ISS is flying over you right now!"
- Add to existing satellite system in Section F
**Cost:** $0

#### 2.4 Glint Daily Journal (AI-Generated)
**What:** Every day, Glint writes a ~200-word journal entry.
**Tech:** Vercel Cron (`0 7 * * *`) → `/api/daily-journal.js`
- Reads today's holiday + constellation events on this date
- Calls gpt-4o-mini with Glint's personality prompt
- Stores in Supabase `glint_journal` table
- Displayed as "Glint's Thought of the Day" card
**Cost:** ~$0.06/month (30 calls x gpt-4o-mini)

#### 2.5 Daily Featured Content Rotation
**What:** "Today at jarowe.com" — a rotating hero section.
- Today's constellation node highlight
- Today's featured track
- Today's game challenge
- Today's creative prompt
- "This day in Jared's life" memory
**Tech:** `dailyPick()` from the seed system + existing data sources
**Impact:** The Wordle effect — "what's there today?"

#### 2.6 Visitor Streak System
**What:** Consecutive-days-visited counter with Glint reactions.
- Day 3: "Three in a row! You're becoming a regular."
- Day 7: "A whole week! I made you something..." (unlock reward)
- Day 30: "You've been here every day for a month. We should talk." (special Glint dialogue)
- Streak Freeze: miss 1 day without losing streak (reduces churn 21% per Duolingo data)
**Tech:** localStorage timestamp tracking + existing XP system

#### 2.7 NASA APOD Integration
**What:** NASA's Astronomy Picture of the Day as ambient content.
**Tech:** `GET https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY` (free, 1000 req/hr)
- Fetched via Vercel Cron daily, cached
- Display on `/now` page or as constellation background
**Cost:** $0

#### 2.8 Generative Visitor Fingerprint
**What:** On first visit, generate a unique mini-constellation from visitor data.
**Tech:** Hash timestamp+user-agent → seed → TSL shader or canvas art
- "Your visit created this" — a unique artifact
- Downloadable as PNG, shareable via URL-encoded seed
- Each subsequent visit adds a node (growing personal constellation)
**Impact:** Highly memorable, shareable, no two visitors see the same thing

---

### Tier 3: Major Features (Weeks of Work Each)

#### 3.1 Gaussian Splat Gallery
**What:** Photorealistic 3D walkthroughs of real places in Jared's life.
**Tech Stack:**
- **Capture:** Polycam (phone) or PostShot (desktop, NVIDIA GPU)
- **Edit/Optimize:** SuperSplat (free, browser-based)
- **Render:** Spark.js (`@sparkjsdev/spark`) — the leading 3DGS renderer for Three.js
  - By World Labs, GitHub's most influential library of 2025
  - Supports PLY, SPLAT, KSPLAT, SPZ formats
  - "Dynos" system for animated/interactive splats
- **Format:** SPZ (10x smaller than PLY, visually indistinguishable)
- **Alternative:** drei `<Splat>` component for simpler integration
**Scenes to capture:**
- Home office / creative workspace
- Syros Greece house (worldschooling memories)
- Orlando theme park moments
- Munich Elgato HQ
**Performance:** 500K splats @ 30-60fps desktop, 300K mobile. SPZ format = ~8MB per scene.
**Integration:** Portal from globe — click a location → camera dives in → splat scene loads

#### 3.2 Glint as Full Concierge (Tool Use)
**What:** Glint can actually DO things — navigate pages, launch games, open panels, create accounts.
**Tech:** OpenAI function calling / tool use
```js
// api/glint-chat.js — add tools array
tools: [
  { name: 'navigate', parameters: { page: 'string', focusNode: 'string?' } },
  { name: 'launchGame', parameters: { gameId: 'string' } },
  { name: 'openPanel', parameters: { panel: 'cipher|trivia|game|chat' } },
  { name: 'controlMusic', parameters: { action: 'play|pause|next' } },
  { name: 'createAccount', parameters: {} },
  { name: 'celebrate', parameters: { type: 'confetti|portal|beam' } },
]
```
**Action Dispatcher:** `src/utils/glintActions.js` — maps tool names to React state mutations via CustomEvents
**Impact:** "Take me to the constellation" → Glint actually takes you there. Transformative.

#### 3.3 Spatial Portal Transitions
**What:** Moving between spaces feels like traveling through portals, not clicking links.
**Tech:** drei MeshPortalMaterial + GSAP camera flythroughs
- Globe → Constellation: camera dives into globe, stars streak, constellation materializes
- Constellation → Glint Space: approach prism node, light refracts, enter cosmic room
- Any space → Splat Gallery: picture frame becomes portal, camera enters
**Transition shader:** Full-screen quad with wipe/dissolve/portal-spiral/dimensional-tear effects

#### 3.4 Starseed Labs — Creative Workspace
**What:** `/labs` route — a creative incubator space within the site.
**Components:**
| Feature | Package | Size | License | Cost |
|---------|---------|------|---------|------|
| Scratchpad | `@milkdown/core` + React plugin | ~40KB | MIT | Free |
| Creative Canvas | `@excalidraw/excalidraw` | ~400KB | MIT | Free |
| Kanban Board | `@dnd-kit/core` + sortable | ~13KB | MIT | Free |
| Drag/Drop | `@dnd-kit/core` | ~13KB | MIT | Free |

**Route structure:**
```
/labs                  — Hub/gallery landing
/labs/scratchpad       — Milkdown markdown notepad
/labs/workspace        — Excalidraw canvas
/labs/workspace/:id    — Specific project
/labs/brainstorm       — Glint-powered ideation
/labs/stories          — Bedtime story library (future)
```
**Auth:** Supabase anonymous sign-in → upgrade to OAuth when saving. Anonymous-first, account as unlock.
**Glint integration:** Glint as "lab assistant" — greets you, helps brainstorm, comments on work.

#### 3.5 Positive News / "Starseed Network"
**What:** AI-curated positive news from 15+ sources, visualized as living constellations.
**Pipeline:**
```
Vercel Cron (every 4-6 hours) → Fetch RSS + APIs →
Deduplicate → Keyword pre-filter → Sentiment scoring →
LLM summary (gpt-4o-mini, $0.001/article) →
Store top 50 in Supabase → Serve via API route
```
**Sources (all free):**
- RSS: Positive.News, Reasons to be Cheerful, Good News Network, Future Crunch, Vox Future Perfect
- APIs: Hacker News, Reddit r/UpliftingNews (JSON), Product Hunt
- Sentiment filter: keyword heuristics (free) → Transformers.js (free, client-side)

**Visualization:** Stories as stars in a constellation. Brightness = engagement. Color = category. Connections form when stories share themes. Maps to existing constellation engine.

**Glint Briefing:** Daily AI editorial — "Okay so humans actually did something cool today..." — personality-driven synthesis delivered in chat panel or dedicated briefing view.
**Cost:** ~$1-3/month for LLM summarization

#### 3.6 Voice-Enabled Glint
**What:** Glint can speak, and visitors can talk to him.
**Tech (layered approach):**
| Tier | Input | Output | Cost |
|------|-------|--------|------|
| Free | Web Speech API (browser-native) | Web Speech API TTS | $0 |
| Premium | Whisper-web (browser ML) | ElevenLabs Flash v2.5 (~75ms) | ~$5-20/mo |
| Full Duplex | OpenAI Realtime API (WebRTC, <300ms) | Built-in model voice | Pay per use |

**Expression sync:** Feed audio amplitude → `window.__prismTalking` for lip-sync
**Custom voice:** ElevenLabs allows text-prompt voice design — "crystalline, slightly reverbed, cosmic wonder"

#### 3.7 Multiplayer Presence
**What:** "You're not alone here" — see other visitors exploring in real-time.
**Tech:** PartyKit (free tier, Cloudflare-based)
- Cursor presence: other visitors' cursors as tiny stars
- "3 people are exploring right now" indicator
- Shared Glint reactions: when someone bops Glint, all visitors see a ripple
- Constellation co-viewing: when someone focuses a node, others see a subtle glow
**Impact:** Transforms single-player into multiplayer. "Someone in Tokyo just bopped Glint!"

---

### Tier 4: Ambitious / Long-Term

#### 4.1 WebGPU Experiences
- Fluid simulation landing (130K particles, MLS-MPM)
- GPU-computed audio visualizer (100K+ reactive particles)
- Constellation engine on WebGPU compute (gravitational node attraction)
- TSL shader gallery / creative coding playground
**Tech:** Three.js WebGPURenderer + TSL (82.7% browser coverage)
**Note:** TSL compiles to both WGSL (WebGPU) AND GLSL (WebGL2) — write once, run everywhere

#### 4.2 Interactive Story Engine (Bedtime Stories)
```json
{
  "id": "starlight-adventure",
  "pages": [{
    "text": "Once upon a time...",
    "illustration": "/images/stories/starlight-01.jpg",
    "choices": [
      { "text": "Follow the light", "nextPage": "page-2a" },
      { "text": "Stay in the garden", "nextPage": "page-2b" }
    ]
  }]
}
```
- Choose-your-own-adventure branching
- "Read to me" via Web Speech API (free) or ElevenLabs
- AI-personalized variations (child's name, favorite animal)
- Full-bleed illustrations, dark mode, ambient sound

#### 4.3 StarOS Desktop Mode
**What:** At high engagement (XP 2000+), unlock a creative OS mode.
- Taskbar = cosmic dock with Glint as assistant icon
- Windows = draggable glass panels for games, constellation, music, chat
- File system = constellation data (epochs = folders, nodes = files)
- Terminal = Glint chat styled as command prompt
**Tech:** `react-rnd` for draggable/resizable windows, or Dockview for IDE-like layouts
**Unlock trigger:** RelationshipMemory level "friend" or XP threshold

#### 4.4 Ambient Storytelling / ARG
**What:** A background narrative that unfolds over weeks through subtle changes.
- Week 1: A faint signal appears — one star pulses differently
- Week 2: Glint notices: "Something's different up there..."
- Week 3: A second star joins the pattern
- Week 4: The pattern resolves into coordinates → new constellation node appears
- Hidden pages at obscure URLs (`/void`, `/signal`)
- Clues in page source comments, console logs, Glint dialogue
- Correct solutions unlock exclusive content

#### 4.5 Hand-Tracked Glint Interaction
**What:** Visitors wave at Glint, point to make him look, or poke him with their finger.
**Tech:** MediaPipe hand landmarks (21 points per hand, 30+ fps)
- Webcam stays private (client-side only)
- Glint reacts: "Hey, I can see you waving!"
- Maps hand position to eye tracking, expressions
**Viral potential:** Extremely high. Screenshot/video-worthy.

#### 4.6 VR Constellation Mode
**What:** Enter the 3D constellation in VR. Navigate by looking at nodes. Reach out to grab connections.
**Tech:** `@react-three/xr` + `renderer.xr.enabled = true`
- Requires Quest or PCVR
- Graceful detection: `navigator.xr?.isSessionSupported('immersive-vr')`
- VR rollercoaster through life timeline (Three.js has this example)

---

## PART 4: THE DAILY ENGINE

### What Makes Someone Return Tomorrow

The entire "living site" infrastructure runs for **under $0.20/month**:

| Item | Monthly Cost |
|------|-------------|
| OpenAI daily journal (30 calls) | ~$0.06 |
| Replicate daily art (30 images) | ~$0.12 |
| Supabase (free tier) | $0.00 |
| Vercel (free/hobby tier) | $0.00 |
| NASA/Weather/ISS APIs | $0.00 |
| **Total** | **~$0.18** |

### Daily Content Calendar

| Day | Daily Seed Content |
|-----|-------------------|
| Every day | Unique holiday (364 entries) + holiday-matched game |
| Every day | Glint's journal entry (AI-generated) |
| Every day | Daily cipher puzzle |
| Every day | Featured constellation node |
| Every day | Featured music track |
| Every day | Generative art piece (shader seeded by date) |
| Every day | "This day in Jared's life" memory (if exists) |
| Mondays | New experiment/feature reveal |
| Full moons | Special visual events + Glint dialogue |
| Solstices | Astronomical animations |

### Free APIs Powering the Living Site

| API | Purpose | Auth | Limit |
|-----|---------|------|-------|
| Open-Meteo | Weather-responsive visuals | None | 10K/day |
| SunCalc (npm) | Moon phase, sunrise/sunset | N/A (client) | N/A |
| NASA APOD | Daily space photo | Free key | 1000/hr |
| ISS Position | Real-time on globe | None | 1/sec |
| GitHub GraphQL | Contribution activity | PAT | 5000/hr |
| Launch Library 2 | Upcoming space launches | None | 15/hr |

### Key NPM Packages to Add

| Package | Size | Purpose |
|---------|------|---------|
| `seedrandom` | 3KB | Deterministic daily PRNG |
| `suncalc` | 4KB | Moon phase + sun position |
| `simplex-noise` | 2KB | Seeded generative art |
| `@sparkjsdev/spark` | ~100KB | Gaussian splat rendering |
| `@milkdown/core` | ~40KB | Markdown notepad |
| `@excalidraw/excalidraw` | ~400KB | Creative canvas |
| `tone` | ~150KB | Generative music (future) |

---

## PART 5: GROWTH & ACTIVATION

### The Flywheel

```
CREATION LOOP: New feature → richer site → more to discover → more return visits

DAILY LOOP: Visit → holiday/cipher/game → XP earned → level up → achievement →
            Glint deepens → "what's tomorrow?" → return

VIRAL LOOP: Discover delight → screenshot/share → friend visits → they share
            Key: dynamic OG images make every URL share-worthy

COMMUNITY LOOP (future): Sign up → leaderboard → compare with friends →
            user-generated content → new visitors
```

### The 30-Second Activation Path

| Time | What Happens |
|------|-------------|
| 0-5s | Globe/constellation stops the scroll. Visual hook. |
| 5-10s | Glint peeks with context-aware greeting + ONE action |
| 10-30s | Visitor plays today's game OR explores a constellation node |
| 30-120s | XP earned, easter egg discovered, music playing |
| 2-10min | Vault teased, streak started, "there's more tomorrow" surfaced |
| Return | Glint remembers them. Content is different. Relationship deepens. |

### Viral Moments to Engineer

1. **Glint saying something unexpectedly clever** → screenshot-worthy
2. **Constellation data viz** → r/dataisbeautiful material
3. **Gaussian splat gallery** → "how is this on a PERSONAL SITE?"
4. **Hand-tracked Glint** → video-worthy, TikTok potential
5. **"First to discover" mechanic** in any combinatorial experience

### Discovery Channels

| Channel | Action |
|---------|--------|
| Hacker News | "Show HN: I turned my personal site into an interactive digital theme park" |
| Awwwards/FWA | Submit for SOTD when polished |
| Product Hunt | Launch with "A living, playable personal website" |
| Dev.to/Medium | "How I built a 3D life constellation with R3F" (technical breakdown) |
| Creative coding | Submit experiments to OpenProcessing, Shadertoy |
| GitHub awesome lists | awesome-creative-coding, awesome-threejs |
| IndieWeb/POSSE | Publish on jarowe.com first, syndicate to X/LinkedIn |

### Metrics That Matter

| Category | Metric |
|----------|--------|
| Engagement | Avg engagement time, interactions/visit, scroll depth |
| Return | D1/D7/D30 retention, streak distribution, resurrection rate |
| Delight | Easter eggs discovered, games completed, Glint conversations started |
| Viral | Share rate, referral sources, OG image CTR |
| Community | Leaderboard participation, guest book contributions |

---

## PART 6: THE 5-YEAR ARC

### Year 1 (2026): "The Most Interesting Website You've Never Heard Of"
- 50-200 daily visitors
- Full 365-day holiday coverage with unique daily content
- Gaussian splat gallery live
- Glint as full concierge with tool use
- First viral moment on HN or creative Twitter

### Year 2 (2027): "The Daily Destination"
- 500-2,000 daily visitors
- Multiplayer features live (cursors, leaderboards, presence)
- Voice-enabled Glint
- Starseed Labs creative workspace operational
- Community forms around daily ritual

### Year 3 (2028): "The Living Standard"
- 2,000-10,000 daily visitors
- Open-source the experience framework
- Monthly creative challenges with community participation
- The "digital homestead" concept gains traction

### Year 4 (2029): "The Platform Question"
- Decision point: stay personal or build a platform?
- Path A: jarowe.com as cultural artifact, inspiring a movement
- Path B: "Squarespace for experiential personal sites" — a company

### Year 5 (2030): "The Legacy"
- Proof that one human can build something on the web that rivals what entire companies produce
- The personal web renaissance

---

## PART 7: IMPLEMENTATION PRIORITY

### Phase 1: The Living Foundation (1-2 weeks)
- [ ] `dailySeed.js` utility module
- [ ] `suncalc` moon/sun integration
- [ ] Extended CSS variable theming (time/season)
- [ ] Date-locked easter eggs (6-8 dates)
- [ ] Dynamic OG images via `@vercel/og`
- [ ] Command palette (Cmd+K)
- [ ] View Transitions API between routes

### Phase 2: Daily Engine (2-3 weeks)
- [ ] Daily featured constellation node/track/game
- [ ] Glint daily journal (Vercel cron + OpenAI)
- [ ] Weather-responsive atmosphere (Open-Meteo)
- [ ] Visitor streak system
- [ ] NASA APOD integration
- [ ] ISS tracker on globe

### Phase 3: Immersive Experiences (3-4 weeks)
- [ ] Gaussian splat gallery (Spark.js + Polycam captures)
- [ ] Audio-reactive constellation
- [ ] Glint tool use (concierge actions)
- [ ] Spatial portal transitions (GSAP + MeshPortalMaterial)

### Phase 4: Creative Platform (3-4 weeks)
- [ ] Starseed Labs landing + route structure
- [ ] Milkdown scratchpad
- [ ] Excalidraw canvas workspace
- [ ] Glint brainstorm mode (structured AI ideation)

### Phase 5: Community & Voice (2-3 weeks)
- [ ] PartyKit multiplayer presence
- [ ] Leaderboards (activate existing Supabase infra)
- [ ] Guest book / star contributions
- [ ] Voice-enabled Glint (Web Speech API tier)

### Phase 6: Advanced (ongoing)
- [ ] Positive news network (Starseed Network)
- [ ] WebGPU shader gallery
- [ ] Interactive bedtime stories
- [ ] StarOS desktop mode
- [ ] Ambient storytelling / ARG
- [ ] Hand-tracked Glint (MediaPipe)

---

## APPENDIX A: Key Technology References

### Gaussian Splatting
- **Spark.js** (sparkjsdev/spark) — World Labs, the leading 3DGS renderer
- **SuperSplat** (superspl.at/editor) — Free browser-based splat editor
- **Polycam** (poly.cam) — Phone-to-splat capture
- **SPZ format** — 10x compression, Khronos glTF standardization in progress
- drei `<Splat>` component for simple R3F integration

### WebGPU / TSL
- Three.js WebGPURenderer with 170+ examples
- TSL compiles to WGSL (WebGPU) AND GLSL (WebGL2)
- 82.7% global browser coverage
- R3F v10 with native WebGPU support incoming

### Real-Time / Multiplayer
- **PartyKit** — Serverless WebSocket rooms, free tier, Cloudflare-based
- **Liveblocks** — Structured real-time collaboration, 1000 connections free
- **Y.js** — CRDT library for conflict-free sync

### AI / Voice
- **OpenAI Realtime API** — WebRTC, <300ms, full duplex voice
- **ElevenLabs Flash v2.5** — ~75ms TTS, custom voice design
- **Whisper-web** — Browser-native speech recognition (Transformers.js)
- **MediaPipe** — Hand/face/pose tracking at 30+ fps in browser

### Creative Tools
- **Excalidraw** — MIT, free, hand-drawn aesthetic canvas
- **Milkdown** — MIT, lightweight Markdown WYSIWYG
- **Tone.js** — Generative music framework
- **LYGIA** — Cross-platform shader function library

---

## APPENDIX B: Source URLs by Research Domain

### Gaussian Splatting
- Spark.js: github.com/sparkjsdev/spark
- SuperSplat: superspl.at/editor (github.com/playcanvas/supersplat)
- GaussianSplats3D: github.com/mkkellogg/GaussianSplats3D
- gsplat.js: github.com/huggingface/gsplat.js
- drei Splat docs: drei.docs.pmnd.rs/abstractions/splat
- Polycam: poly.cam/tools/gaussian-splatting
- SPZ format: github.com/nianticlabs/spz
- Khronos glTF extension: khronos.org/news/press/gltf-gaussian-splatting-press-release
- World Labs Marble: worldlabs.ai/blog/bigger-better-worlds

### Living Web / Generative
- LYGIA shader library: lygia.xyz
- Generative Artistry: generativeartistry.com
- Open-Meteo: open-meteo.com
- SunCalc: github.com/mourner/suncalc
- NASA APOD: api.nasa.gov
- ISS Position: api.open-notify.org/iss-now.json
- Tone.js: tonejs.github.io
- seedrandom: npmjs.com/package/seedrandom

### AI / Concierge
- Vercel AI SDK: ai-sdk.dev
- CopilotKit: github.com/CopilotKit/CopilotKit
- AG-UI Protocol: docs.ag-ui.com
- OpenAI Realtime API: platform.openai.com/docs/guides/realtime
- ElevenLabs: elevenlabs.io/docs
- Whisper-web: github.com/xenova/whisper-web
- MediaPipe: developers.google.com/mediapipe

### Community / News
- PartyKit: partykit.io
- Liveblocks: liveblocks.io
- Y.js: docs.yjs.dev
- Are.na: are.na/about
- Excalidraw: github.com/excalidraw/excalidraw
- Milkdown: milkdown.dev
- tldraw: tldraw.dev

### Activation / Growth
- neal.fun analysis: postunreel.com/blog/neal-fun-complete-guide
- Bruno Simon case study: medium.com/@bruno_simon
- Wordle psychology: uxmag.com/articles/the-fascinating-psychology-tricks-that-make-wordle-so-addictive
- Duolingo gamification: strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo
- Vercel OG images: vercel.com/docs/og-image-generation
- Awesome Creative Coding: github.com/terkelg/awesome-creative-coding
