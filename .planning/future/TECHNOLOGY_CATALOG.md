# TECHNOLOGY CATALOG — Everything Researched

## How to read this

Every technology from the 9-agent research sweep, organized by readiness and fit. Each entry has: what it is, the best package, cost, strategic fit rating (ADOPT / EVALUATE / DEFER), and the rationale.

---

## ADOPT NOW — Production-ready, high fit

### seedrandom
- **What:** Deterministic pseudo-random number generator
- **Package:** `seedrandom` (npm, 3KB)
- **Cost:** $0
- **Use:** Foundation for daily seed system. Same date = same content selection.
- **Replaces:** Hand-rolled `seededRandom` in DailyTrivia.jsx
- **Fit:** ADOPT. Zero risk, immediate value.

### suncalc
- **What:** Sun/moon position, rise/set times, moon phase
- **Package:** `suncalc` (npm, 4KB, zero deps)
- **Cost:** $0 (client-side computation)
- **Use:** Dawn/dusk/night color shifting, moon phase driving visuals, astronomical events.
- **Fit:** ADOPT. Zero risk, enables temporal awareness.

### Open-Meteo Weather API
- **What:** Free weather data — temperature, wind, cloud cover, precipitation
- **Endpoint:** `GET https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&current_weather=true`
- **Cost:** $0 (free, no API key, 10K requests/day)
- **Use:** Weather-responsive visuals — fog density, particle speed, rain overlay.
- **Fit:** ADOPT. Free, reliable, no auth complexity.

### View Transitions API
- **What:** Cinematic page transitions via CSS + JS
- **Package:** None (browser-native)
- **Cost:** $0
- **Support:** Chrome 111+, Edge, Firefox 144+, Safari 18+
- **Use:** Smooth morphing transitions between React Router pages.
- **Fit:** ADOPT. Highest impact-to-effort ratio in the entire catalog.

### @vercel/og
- **What:** Dynamic social card image generation at the edge
- **Package:** `@vercel/og` (npm)
- **Cost:** $0 (runs on Vercel Edge)
- **Use:** Every URL gets a unique, compelling social preview image.
- **Fit:** ADOPT. Critical for shareability.

### OpenAI Function Calling
- **What:** LLM returns structured tool calls that the client executes
- **API:** OpenAI Chat Completions with `tools` parameter
- **Cost:** Same as existing Glint chat (~$0.06/month)
- **Use:** Glint tool use — navigate, launch games, control music, save ideas.
- **Fit:** ADOPT. Uses existing OpenAI integration. Transforms Glint.

---

## ADOPT SOON — Ready when the phase arrives

### Excalidraw
- **What:** Open-source infinite canvas with hand-drawn aesthetic
- **Package:** `@excalidraw/excalidraw` (npm, ~400KB gzipped)
- **License:** MIT, free
- **Cost:** $0
- **Use:** Starseed Labs creative canvas
- **Note:** Self-host fonts from `node_modules/.../dist/prod/fonts` into `public/`
- **Fit:** ADOPT in Phase 3. Lazy-load on /labs routes only.

### Milkdown
- **What:** Plugin-driven WYSIWYG Markdown editor
- **Package:** `@milkdown/core` + `@milkdown/react` + `@milkdown/preset-commonmark` (~40KB)
- **License:** MIT, free
- **Cost:** $0
- **Use:** Starseed Labs scratchpad/notepad
- **Note:** Headless — style to match glass-panel aesthetic. Y.js compatible for future collab.
- **Fit:** ADOPT in Phase 3. Lightweight, easy integration.

### Spark.js
- **What:** Advanced 3D Gaussian Splatting renderer for Three.js
- **Package:** `@sparkjsdev/spark` (npm)
- **Cost:** $0 (open source, World Labs)
- **Use:** Gaussian splat memory portals
- **Note:** Leading 3DGS library. Supports PLY/SPLAT/KSPLAT/SPZ. "Dynos" for animated splats.
- **Alternative:** drei `<Splat>` component (simpler but less capable)
- **Fit:** ADOPT in Phase 5. Start with one scene, validate interest.

### NASA APOD API
- **What:** Astronomy Picture of the Day
- **Endpoint:** `GET https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY`
- **Cost:** $0 (free, 1000 req/hr)
- **Use:** Daily space content, ambient inspiration.
- **Fit:** ADOPT in Phase 4. Easy integration, beautiful content.

### simplex-noise
- **What:** Seeded 2D/3D/4D noise generation
- **Package:** `simplex-noise` (npm, 2KB)
- **Cost:** $0
- **Use:** Daily generative art pieces, procedural backgrounds.
- **Fit:** ADOPT when daily generative art is prioritized.

---

## EVALUATE — Promising but needs validation

### PartyKit
- **What:** Serverless WebSocket rooms for real-time multiplayer
- **Docs:** docs.partykit.io
- **Cost:** Free tier (generous)
- **Use:** Visitor cursor presence, "3 people exploring" indicator, shared Glint reactions.
- **Risk:** Adds WebSocket complexity. Moderation burden. Premature until single-player loop is strong.
- **Fit:** EVALUATE. Deploy only after D7 retention exists.

### Liveblocks
- **What:** Structured real-time collaboration infrastructure
- **Cost:** Free tier (1000 connections)
- **Use:** Alternative to PartyKit for presence + shared state.
- **Fit:** EVALUATE alongside PartyKit. Pick one.

### ElevenLabs TTS
- **What:** High-quality text-to-speech with custom voice design
- **Cost:** $0.015-0.30/1K characters depending on plan
- **Use:** Glint's voice — custom "crystalline, cosmic" character voice.
- **Risk:** Monthly cost, API dependency. Web Speech API is free alternative.
- **Fit:** EVALUATE after Glint tool use is proven.

### OpenAI Realtime API
- **What:** Full-duplex voice conversation via WebRTC (<300ms latency)
- **Cost:** Per-use pricing
- **Use:** Voice-enabled Glint conversations.
- **Risk:** Cost, complexity, browser support.
- **Fit:** EVALUATE after text-based tool use and basic voice work.

### Tone.js
- **What:** Web Audio framework for generative music
- **Package:** `tone` (npm, ~150KB)
- **Cost:** $0
- **Use:** Procedural ambient soundscapes, generative music.
- **Risk:** Conflicts with existing Howler.js setup. Must coordinate AudioContext.
- **Fit:** EVALUATE. High impact but complex integration with existing audio system.

### Polycam / PostShot
- **What:** Gaussian splat capture from phone photos or video
- **Cost:** Polycam free tier (150 images). PostShot 17 EUR/mo for PLY export.
- **Use:** Creating splat scenes of real locations.
- **Fit:** EVALUATE when first splat scene is prioritized.

### SuperSplat
- **What:** Free browser-based gaussian splat editor
- **URL:** superspl.at/editor
- **Cost:** $0
- **Use:** Edit, optimize, publish splat scenes.
- **Fit:** EVALUATE alongside Polycam/PostShot.

---

## DEFER — Interesting but not now

### tldraw
- **What:** Infinite canvas SDK (more polished than Excalidraw)
- **Cost:** $6,000/year commercial license
- **Reason to defer:** MIT Excalidraw covers the need for free. tldraw only if revenue justifies it.

### MediaPipe (hand tracking)
- **What:** Browser-based hand/face/pose tracking at 30+ fps
- **Package:** `@mediapipe/tasks-vision`
- **Use:** Hand-tracked Glint interaction — wave, point, poke.
- **Reason to defer:** High viral potential but high effort. Build after core loop is magnetic.

### WebXR / @react-three/xr
- **What:** VR/AR mode for Three.js scenes
- **Use:** VR constellation mode, AR globe placement.
- **Reason to defer:** Limited browser support (~60%). Niche audience. Build for 2D first.

### Rapier Physics (WASM)
- **What:** GPU-accelerated rigid body physics
- **Package:** `@dimforge/rapier3d-compat` (~600KB)
- **Use:** Physics toys, marble runs, cloth simulation.
- **Reason to defer:** Fun but not core to the daily loop or world identity.

### CopilotKit
- **What:** Open-source framework for in-app AI copilots with React
- **Use:** Alternative to custom Glint tool-use implementation.
- **Reason to defer:** Custom implementation gives more character control. CopilotKit is more generic.

### Y.js
- **What:** CRDT library for real-time collaborative editing
- **Package:** `yjs` (npm, ~25KB)
- **Use:** Collaborative Starseed canvases.
- **Reason to defer:** No collaboration until single-player proves out.

### Transformers.js (Hugging Face)
- **What:** ML models in the browser (sentiment analysis, depth estimation, etc.)
- **Package:** `@huggingface/transformers`
- **Use:** Smart image effects, sentiment filtering for progress signals, background removal.
- **Reason to defer:** Heavy models (5-500MB). Niche applications. Not core.

### WebGPU Compute
- **What:** GPU compute shaders for massive particle/fluid simulations
- **Use:** 200K-particle physics, fluid signatures, GPU audio visualizers.
- **Reason to defer:** Incredible demos but R3F v10 WebGPU support still in development. Start with TSL shaders that work on current WebGL2 renderer.

---

## Package size budget

Current heavy dependencies (estimates):
- Three.js: ~600KB
- React + ReactDOM: ~140KB
- GSAP: ~100KB
- Framer Motion: ~100KB
- Howler.js: ~30KB

Proposed additions:
| Package | Gzipped | Route | Lazy? |
|---------|---------|-------|-------|
| seedrandom | 3KB | Global | No (tiny) |
| suncalc | 4KB | Global | No (tiny) |
| simplex-noise | 2KB | Global | No (tiny) |
| @excalidraw/excalidraw | ~400KB | /labs/* | Yes |
| @milkdown/* | ~40KB | /labs/* | Yes |
| @sparkjsdev/spark | ~100KB | Splat pages | Yes |
| tone | ~150KB | Music viz | Yes |

**Rule:** Anything over 50KB must be lazy-loaded behind a route or user interaction.

---

## Cost summary

| Item | Monthly cost |
|------|-------------|
| OpenAI (Glint chat + journal) | ~$0.12 |
| Open-Meteo weather | $0.00 |
| NASA APOD | $0.00 |
| SunCalc, seedrandom, simplex-noise | $0.00 |
| Supabase free tier | $0.00 |
| Vercel hobby tier | $0.00 |
| **Phase 1-4 total** | **~$0.12/month** |

| Optional additions | Monthly cost |
|--------------------|-------------|
| ElevenLabs voice | $5-20 |
| AI image generation (Replicate) | $0.12 |
| GNews API (progress signals) | $0.00 (free tier) |
| PartyKit (presence) | $0.00 (free tier) |
