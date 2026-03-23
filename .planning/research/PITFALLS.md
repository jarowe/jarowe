# Pitfalls Research

**Domain:** Single-photo 3D memory experiences (displaced mesh rendering) added to an existing GPU-heavy site
**Researched:** 2026-03-23
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: WebGL Context Exhaustion from Competing Renderers

**What goes wrong:**
Browsers enforce a hard limit on simultaneous WebGL contexts (typically 8-16 per page, varies by browser/OS). The jarowe.com site already uses three WebGL-producing systems: react-globe.gl on the home page (creates its own THREE.WebGLRenderer internally via ThreeGlobeGen), Prism3D's R3F `<Canvas>` (always-mounted on home page), and ConstellationCanvas's R3F `<Canvas>` (on /constellation). Adding a Memory Capsule renderer creates a fourth context. When the limit is exceeded, the oldest context is silently lost — the globe goes black, Glint disappears, or the memory scene fails to initialize with no error thrown.

**Why it happens:**
react-globe.gl creates and owns its own WebGLRenderer internally — there is no option to share a renderer or pass one in. The Prism3D Canvas is intentionally always-mounted (never unmounts on peek show/hide) to avoid initialization lag. The existing MemoryPortal.jsx already works around this with a 600ms setTimeout before initializing the GaussianSplats3D viewer, hoping the globe's renderer releases on route navigation. But this is a race condition, not a solution. The globe's renderer does NOT call `dispose()` or `forceContextLoss()` on unmount — it just orphans the context and lets the browser eventually reclaim it.

**How to avoid:**
- Implement explicit renderer disposal on route exit: when navigating away from home page, call `globe.renderer().dispose()` and `globe.renderer().forceContextLoss()` in the cleanup function
- Memory Capsule route should wait for confirmation that previous contexts are released, not just a fixed timeout
- Use `navigator.gpu` or probe for available contexts before initializing (create a throwaway context, check for errors, release it)
- Consider sharing a single R3F `<Canvas>` between Prism3D and the Memory Capsule scene via portal or scene-swap pattern
- Cap the DPR on the memory scene renderer (`dpr={[1, 1.5]}`) to reduce GPU memory pressure from the framebuffer

**Warning signs:**
- `webglcontextlost` events firing on existing canvases when memory scene loads
- Globe goes black after returning from a memory capsule and refreshing doesn't immediately fix it
- Console warning: "Too many active WebGL contexts. Oldest context will be lost"
- Memory scene loads on desktop but fails silently on mobile (fewer allowed contexts)

**Phase to address:**
Phase 1 (Foundation) — renderer lifecycle management must be designed before building the displaced mesh scene, since it determines whether the scene uses its own Canvas, shares one, or uses an entirely separate rendering approach

---

### Pitfall 2: Depth Discontinuity Artifacts at Object Edges (The "Rubber Sheet" Problem)

**What goes wrong:**
When a single depth map is used to displace a plane mesh, edges where foreground objects meet background show extreme stretching. A person standing in front of a mountain produces a smooth depth gradient at the silhouette, but the displaced mesh creates a "rubber sheet" connecting the person's edge to the far background — visible as grotesque stretched triangles when the camera moves even slightly. This is the single most common visual artifact in displaced mesh rendering and is immediately obvious to viewers.

**Why it happens:**
A single photo has exactly one viewpoint. Depth estimation produces a continuous depth field, but at occlusion boundaries the true geometry has a discontinuity — the edge of a foreground object and the background behind it are at vastly different depths with nothing in between. The mesh tries to smoothly interpolate across this gap, creating stretched triangles. Monocular depth estimation models (MiDaS, ZoeDepth, Depth Anything) produce relative depth, not metric depth, making the discontinuities even harder to handle because the absolute scale is unknown.

**How to avoid:**
- Detect depth discontinuities in the depth map (Sobel/Canny edge detection on the depth channel) and either: (a) set those faces to transparent, (b) degenerate those triangles to zero area, or (c) insert a gap/seam
- Use a fragment shader that discards pixels where the depth gradient exceeds a threshold: `if (abs(dFdx(depth)) + abs(dFdy(depth)) > threshold) discard;`
- Increase mesh subdivision density (256x256 or higher) so stretched triangles are smaller and less visible
- Constrain camera movement to a narrow cone (15-20 degrees from center) so edge artifacts stay outside the visible frustum
- Apply depth-aware blur to the edges in a post-processing pass (bilateral filter preserving edges in the color but smoothing depth)
- Test with photos that have strong foreground/background separation — these are the worst case

**Warning signs:**
- Visible "fins" or "spikes" at the edges of people, objects, or architectural elements when camera moves
- Stretchy rubber-band triangles connecting foreground to background
- The scene looks fine from center but falls apart at any off-center camera angle
- Photos with isolated subjects on busy backgrounds look dramatically worse than landscape photos

**Phase to address:**
Phase 1 (Displaced Mesh Renderer) — the edge handling strategy must be implemented in the initial shader, not retrofitted. This is the #1 visual quality issue.

---

### Pitfall 3: Depth Map Quality Variance Across Photo Types

**What goes wrong:**
Monocular depth estimation works dramatically differently across photo categories. Landscape photos with clear foreground/midground/background layers produce excellent depth. But family group photos at arm's length, indoor scenes with flat walls, or photos with reflective surfaces (water, glass, cars) produce noisy, inconsistent depth maps that make the 3D effect look broken or uncanny. The developer builds and tests with their best-case photo, then every other photo looks terrible.

**Why it happens:**
Depth estimation models are trained predominantly on outdoor scenes with clear depth cues (convergence, scale, atmospheric perspective). They struggle with: flat surfaces at similar depths (indoor walls), reflective/transparent surfaces (model can't distinguish reflected depth from physical depth), small depth range scenes (group selfie where everyone is 1-2m away), and textureless regions (sky, blank walls) where the model hallucinates depth. Additionally, MiDaS/ZoeDepth output relative depth (ordinal), not metric — so the scale of displacement must be manually tuned per photo.

**How to avoid:**
- Establish a "capsule-worthy" photo checklist before accepting photos into the pipeline: (1) clear depth layering, (2) no large reflective surfaces, (3) sufficient texture for depth estimation, (4) subject not too close to camera
- Provide per-scene depth intensity/scale controls in the scene configuration: `depthScale`, `depthBias`, `depthContrast`
- Apply histogram equalization or contrast stretching to the depth map before use — many models produce depth values clustered in a narrow range
- Test with at least 5 different photo types during development: landscape, portrait-with-background, group, indoor, low-light
- Consider multiple depth estimation models and allow per-scene model selection (Depth Anything v2 handles indoor scenes better than MiDaS v3.1)
- Keep the displacement subtle by default — a slight parallax is more forgiving than extreme 3D extrusion

**Warning signs:**
- Depth map has large flat regions with no variation (will look like a flat cutout)
- Depth map shows noise/checkerboard patterns in reflective areas
- The 3D effect only looks good on the one photo used during development
- Per-scene tuning requires more than 2-3 parameter adjustments to look acceptable

**Phase to address:**
Phase 1 (Asset Pipeline) — photo selection criteria and depth map quality assessment should be established before building the renderer, not after. The manual workflow should include a depth map preview/validation step.

---

### Pitfall 4: Camera Choreography That Looks Cheap vs. Cinematic

**What goes wrong:**
Linear camera movements (constant speed, linear interpolation between points) feel mechanical and lifeless. Looping animations that reverse direction create an obvious "pendulum" feel. Sudden starts/stops are jarring. The memory scene transitions from immersive to screensaver in one bad easing curve. The developer adds more movement to compensate, making it worse.

**Why it happens:**
Cinematic camera work uses ease-in/ease-out, breathing rhythm, and motivated movement — the camera moves because something draws attention, not because a timer fired. Developers default to `THREE.Clock` linear interpolation or simple sine waves. The constrained camera cone (necessary to hide edge artifacts) makes the limited range of motion feel even more repetitive if the choreography is simple.

**How to avoid:**
- Use cubic bezier or spring-based easing for ALL camera transitions — never linear interpolation
- Layer multiple slow movements: (1) gentle drift on X/Y within the safe cone, (2) very slow dolly in/out (Z), (3) subtle focal length breathing. These should have different periods (e.g., drift 8s, dolly 12s, focal 20s) so the combined motion never repeats
- Apply Perlin noise to camera position at very low amplitude (0.01-0.03 units) for organic handheld feel
- "Ken Burns" is the baseline, not the ceiling — combine pan, zoom, and slight rotation simultaneously
- Sync camera beats to narrative cards: camera pushes in slightly when text appears, settles back when text fades
- Test at 2x speed — if it looks natural at 2x, the base speed is right. If it looks robotic at 2x, the easing is wrong
- Never let the camera fully stop — even "static" moments should have imperceptible micro-drift

**Warning signs:**
- Camera movement feels like a screensaver or a rotating product display
- You can predict exactly where the camera will be in 5 seconds
- The scene feels the same with eyes closed (no visual surprise from movement)
- Camera reverses direction visibly (pendulum/ping-pong)

**Phase to address:**
Phase 2 (Cinematic Polish) — basic camera drift can be linear in Phase 1 prototype, but cinematic choreography must be implemented before showing to anyone. This is the difference between "tech demo" and "experience."

---

### Pitfall 5: Performance Collapse on Mobile from Cumulative GPU Load

**What goes wrong:**
The existing site already pushes mobile GPUs: the globe shader (custom ShaderMaterial with day/night/clouds/atmosphere), constellation (instanced nodes + DOF + vignette postprocessing), and Prism3D (dual-layer glass shader with chromatic aberration). Adding a displaced mesh scene with its own shader, potentially plus atmospheric particles, bokeh, and light effects, pushes total GPU memory and shader complexity past mobile limits. The scene either: (a) drops to <15 FPS making it unusable, (b) triggers thermal throttling after 10 seconds, or (c) causes a WebGL context lost with no recovery.

**Why it happens:**
Each WebGL context allocates its own framebuffer (width * height * DPR^2 * bytes-per-pixel * 2 for double buffering). On a 1080p mobile screen at DPR 3, that's ~24MB per context just for the framebuffer. The displaced mesh texture (photo + depth map) adds another 4-16MB. Postprocessing effects double the framebuffer allocation. Mobile GPUs also have much lower fill rate — a full-screen displaced mesh with a complex fragment shader can exhaust the fragment pipeline budget in a single pass.

**How to avoid:**
- Memory Capsule page must run on a separate route (/memory/:id) that fully unmounts the home page — never render globe + capsule simultaneously
- Implement GPU tier detection (reuse/extend existing `canRenderSplat()` in `gpuCapability.js`) with three tiers for memory scenes: (1) full displaced mesh + particles + bokeh, (2) displaced mesh with simplified shader + no postprocessing, (3) parallax fallback (existing CSS-based approach in MemoryPortal.jsx)
- Cap DPR to 1.5 on the memory scene Canvas (the site already does this for Prism3D)
- Measure actual frame time budget: displaced mesh fragment shader must complete in <8ms on target mobile GPU
- Consider `requestIdleCallback` or `setTimeout` for non-critical particle spawning
- Profile on a real mid-range Android phone (not just iPhone) — the existing `canRenderSplat()` already detects Adreno 3/4 and Mali-T6 as low-end

**Warning signs:**
- FPS drops below 30 on any device within the first 5 seconds
- Device gets noticeably warm during the memory scene
- `webglcontextlost` fires within 30 seconds on mobile
- Battery drain visible in a 2-minute session
- The existing parallax fallback (MemoryPortal.jsx) triggers on devices that should be capable

**Phase to address:**
Phase 1 (Foundation) — GPU budget must be established before building the shader. Set a frame-time budget and performance gate that blocks Phase 2 polish features from being added to mobile tier.

---

### Pitfall 6: Portal Transition Disorientation (Jarring Entry/Exit)

**What goes wrong:**
The user clicks a memory marker on the globe, the screen flashes, and suddenly they're in an entirely different visual context with no spatial continuity. The existing PortalVFX provides a beautiful ring-and-vortex effect, but it covers the transition — it doesn't create continuity between the source (globe marker) and destination (3D memory). On exit, pressing "Back" snaps to the home page with the globe in a random orientation. The user feels teleported, not transported.

**Why it happens:**
Route-based navigation (`navigate('/memory/sceneId')`) is a hard cut — the old page unmounts, the new page mounts. The PortalVFX canvas overlay bridges the visual gap but doesn't connect the two experiences semantically. The globe doesn't remember where the user clicked, and the memory scene doesn't know where it was entered from. View Transitions API could help but requires careful choreography between the outgoing and incoming pages.

**How to avoid:**
- On entry: animate the globe marker → full-screen zoom (pinch toward the GPS coordinates on the globe) while PortalVFX builds the ring at that exact screen position, THEN crossfade into the memory scene already loaded behind the portal
- On exit: reverse — memory scene fades while portal ring contracts, globe re-enters with camera aimed at the same coordinates the user left from
- Store the departure globe camera state (position, target, zoom) in sessionStorage so the return navigation restores it exactly
- Pre-load the memory scene's photo texture while the portal animation plays (the portal animation takes 1-2 seconds — enough to fetch a compressed photo)
- If using View Transitions API: the shared element is the globe marker → memory scene thumbnail → memory scene

**Warning signs:**
- User feels "lost" after entering a memory (doesn't know how they got here or how to get back)
- Pressing Back produces a flash or blank screen before the globe re-renders
- The portal animation plays to completion but the memory scene isn't loaded yet (loading screen after immersive animation = mood killer)
- Globe restarts at default camera position instead of where the user was exploring

**Phase to address:**
Phase 2 (Portal Integration) — basic navigation works in Phase 1, but the entry/exit choreography is a Phase 2 concern that requires the renderer and globe both working first.

---

### Pitfall 7: Depth Map as Displacement Map Without UV/Geometry Alignment

**What goes wrong:**
The photo and its depth map must be pixel-aligned, but common mistakes create misalignment: (1) the depth estimation model outputs a different resolution than the source photo, (2) the depth map is generated from a cropped/resized version, (3) UV mapping on the displacement plane doesn't match the texture coordinates, (4) the depth map uses a different aspect ratio. The result is the displacement pushing vertices in wrong directions — a face floats above the body, buildings lean sideways, the ground curves up at edges.

**Why it happens:**
Depth estimation models typically resize images to their native resolution (e.g., 384x384, 512x512, 518x518) and output depth at that resolution. If the developer loads the original 4000x3000 photo as the color texture but uses the 512x512 depth map for displacement, the aspect ratios don't match and the displacement is spatially incorrect. Bilinear upsampling of the depth map to match the photo resolution introduces smoothing that hides the depth map's original resolution, creating a false sense of precision.

**How to avoid:**
- Always resize the depth map to EXACTLY match the photo texture dimensions before use (or vice versa)
- Use the same UV coordinates for both the color texture and displacement map sampling in the vertex shader
- Verify alignment visually: overlay the depth map at 50% opacity on the photo — edges should match exactly
- If the depth model outputs at fixed resolution (e.g., 518x518), resize the photo to match for displacement, then use the original resolution photo for the color texture with matching UVs
- Store photo dimensions and depth map dimensions in the scene config, validate they match at load time

**Warning signs:**
- Displacement appears shifted — high points don't correspond to foreground objects
- Vertical or horizontal offset between color and depth (photo subject displaced left/right/up/down)
- Correct displacement in center of frame but increasingly wrong toward edges
- Aspect ratio stretch visible in the 3D scene (circles become ovals)

**Phase to address:**
Phase 1 (Asset Pipeline) — the photo-to-depth-map alignment must be validated in the manual asset workflow before the renderer can be tested with real content.

---

### Pitfall 8: Holes and Z-Fighting from Mesh Self-Occlusion

**What goes wrong:**
When a displaced mesh is viewed from an angle, foreground-displaced vertices can occlude background-displaced vertices from the same mesh. Unlike real 3D geometry, the displaced mesh is a single surface — there is no "back" to foreground objects. This creates: (1) visible holes where the mesh can't cover the gap between foreground and background, (2) z-fighting where near and far parts of the same mesh compete for the same screen pixels, (3) back-faces of the displaced mesh becoming visible at steep viewing angles.

**Why it happens:**
A single displaced plane is fundamentally a 2.5D representation, not true 3D. It encodes depth from one viewpoint only. Any camera movement reveals that foreground objects are just bumps on a sheet, not solid geometry. At steep angles, the mesh folds over itself, creating self-intersection. The depth buffer treats the whole mesh as one surface, so z-fighting occurs where the mesh self-overlaps.

**How to avoid:**
- Constrain the camera to a narrow viewing cone (max 15-20 degrees from the original photo's viewpoint) — this is the single most effective mitigation
- Set `material.side = THREE.FrontSide` (never DoubleSide) to avoid rendering back-faces of displaced regions
- Use a polygon offset (`material.polygonOffset = true; material.polygonOffsetFactor = 1`) to reduce z-fighting
- For extreme foreground elements, consider layered planes: separate the foreground subject into its own displaced plane at a smaller depth, sitting in front of the background plane
- Apply a soft fade/blur at the edges of the safe viewing cone so the user never sees the artifacts — if the camera approaches the constraint boundary, blur increases and parallax reduces
- The existing MemoryPortal.jsx uses `useBuiltInControls: true` for the splat viewer — the displaced mesh version should NOT use OrbitControls, use a constrained drift controller instead

**Warning signs:**
- Visible "paper cutout" appearance when camera moves more than ~10 degrees
- Flickering pixels at depth transitions (z-fighting)
- Back of the mesh visible as dark/inverted triangles at edges
- The scene only looks correct from exactly the center viewpoint

**Phase to address:**
Phase 1 (Displaced Mesh Renderer) — camera constraints and front-face-only rendering must be in the initial implementation. If the developer first builds with free orbit controls "for testing," they'll spend days debugging artifacts that are inherent to the representation.

---

### Pitfall 9: Asset Size Bloat from Uncompressed Photos and Depth Maps

**What goes wrong:**
A single high-resolution photo (4000x3000 JPEG at quality 90) is 3-5MB. Its depth map at the same resolution as a 16-bit PNG is 20-30MB. Multiply by the number of memory capsules. The site's initial bundle is already significant (globe textures: earth-blue-marble.jpg + earth_lights_2048.png + cloud texture). Adding even 3-4 memory scenes can double the total asset weight. On mobile networks, the memory scene takes 10+ seconds to load, and the loading screen after the beautiful portal animation destroys the mood.

**Why it happens:**
Developers use the highest quality assets during development and forget to optimize for production. Depth maps are often saved as 16-bit PNGs for precision, but 8-bit is sufficient for displacement (256 depth levels is more than enough for the parallax effect). Photos are kept at original resolution even though the WebGL texture will be downsampled to the GPU's max texture size anyway.

**How to avoid:**
- Compress photos to WebP at quality 80, max 2048px on the longest side (the texture will be GPU-uploaded at this resolution regardless)
- Depth maps: 8-bit single-channel PNG or WebP, 1024px max (the displacement precision doesn't benefit from higher resolution, and vertex shader samples are interpolated anyway)
- Lazy-load memory scene assets: start loading photo + depth map when the portal animation begins (1-2s head start), show a minimal loading state only if assets aren't ready when animation completes
- Consider progressive loading: show the photo as a flat 2D image first (fast), then apply displacement once the depth map loads (feels like "the scene comes alive")
- Use `<link rel="preload">` for the photo of memory scenes that are visible as globe markers (predict user intent)
- Target: each memory capsule should be under 500KB total (photo + depth map + scene config)

**Warning signs:**
- Memory scene takes >3 seconds to become interactive on a fast connection
- The `/memory/:id` route has a visible loading spinner after the portal animation
- Total site asset size grows by >2MB per capsule added
- Lighthouse performance score drops when memory capsules are added

**Phase to address:**
Phase 1 (Asset Pipeline) — asset size targets and compression pipeline must be established as part of the manual workflow. "Optimize later" means "ship bloated."

---

### Pitfall 10: Audio Desynchronization with Visual Transitions

**What goes wrong:**
The memory scene's soundtrack starts too early (during loading), too late (after the visual is already established), or at the wrong volume (full blast instead of fade-in). The existing GlobalPlayer (Howler.js) may be playing site music when the user enters a memory — two audio sources compete. On iOS Safari, audio requires a user gesture to play, but the portal click may not qualify as a "recent enough" gesture by the time the audio attempts to play after async loading.

**Why it happens:**
The existing MemoryPortal.jsx creates a new `Howl` instance for the scene soundtrack and calls `.play()` immediately, relying on `volume: 0` and a fade-in. But Howler.js on iOS requires the play to happen within the call stack of a user gesture — if `play()` is called after an `await` (loading the scene), iOS blocks it silently. The GlobalPlayer uses a separate Howler instance, and there's no coordination between the two. The AudioContext (from `AudioContext.jsx`) manages the global music state, but the MemoryPortal doesn't participate in that system.

**How to avoid:**
- Integrate memory scene audio through the existing AudioContext/GlobalPlayer system rather than creating independent Howl instances
- On entry: fade out GlobalPlayer music via AudioContext (already has volume control), then fade in scene soundtrack using the same Howler mastering chain
- On exit: reverse — fade out scene music, restore GlobalPlayer state
- For iOS: trigger `Howler.ctx.resume()` synchronously in the portal click handler (before async loading), then set up the scene audio to play once loaded
- Use the existing `soundRef` pattern but coordinate with `useAudio()` context hook
- Scene audio should start with the first narrative card, not with the scene load — this gives a natural beat and avoids the "audio starting during loading screen" problem

**Warning signs:**
- Audio plays during the loading spinner (before the scene is visible)
- Two audio tracks overlap briefly during transition
- No audio on iOS Safari (silent fail — no error thrown)
- Audio continues playing after navigating back to the home page
- Volume jump when entering or leaving the memory scene

**Phase to address:**
Phase 2 (Audio Integration) — basic silent memory scenes work in Phase 1, audio choreography is Phase 2. But the AudioContext integration design should be planned in Phase 1 to avoid rewriting the audio approach.

---

### Pitfall 11: Premature Renderer Abstraction (Displaced Mesh vs. Gaussian Splat)

**What goes wrong:**
The project spec mentions a "renderer-agnostic portal shell (displaced mesh now, gaussian splats later)." Developers interpret this as building an abstract rendering interface that can swap between displaced mesh and gaussian splat implementations. This abstraction is premature — the two rendering approaches have fundamentally different APIs, camera models, asset formats, and interaction patterns. The abstraction either becomes a lowest-common-denominator that limits both, or becomes so leaky that it's just two separate implementations with a shared interface that helps nobody.

**Why it happens:**
"Renderer-agnostic" sounds like good architecture — SOLID principles, dependency inversion, future-proofing. But displaced mesh rendering (vertex shader displacement on a subdivided plane) and gaussian splatting (point-based rendering with learned opacity) share almost nothing. A displaced mesh uses standard WebGL geometry with a PlaneGeometry + vertex shader. Gaussian splats use custom sort-and-render pipelines. Camera controls, loading, disposal, and quality characteristics are all different. The only shared concept is "a scene you can look at."

**How to avoid:**
- Build the displaced mesh renderer as a concrete, self-contained component — no interfaces, no adapters, no strategy pattern
- The "portal shell" abstraction should be at the UX level only: consistent entry/exit animation, consistent narrative card system, consistent audio integration. The renderer inside the shell is a concrete implementation.
- When gaussian splats are added later, create a second concrete component and let the scene config's `renderMode` field select which component to render (simple if/else, not a plugin system)
- The existing code already shows this pattern: `MemoryPortal.jsx` has `showSplat` and `showFallback` as concrete branches, not an abstract renderer interface

**Warning signs:**
- Creating interfaces/types before having two concrete implementations to compare
- The abstraction has methods like `setDepthMap()` that only apply to one renderer
- Time spent on the abstraction layer exceeds time spent on the actual renderer
- The displaced mesh renderer can't use Three.js idioms naturally because the abstraction forces an unnatural API

**Phase to address:**
Phase 1 (Architecture Decision) — decide NOT to abstract at Phase 1. Revisit when gaussian splats are actually being added (likely Phase 4+). The decision to keep things concrete is itself an architectural decision worth documenting.

---

### Pitfall 12: Narrative Text Overlay Readability Against Dynamic 3D Background

**What goes wrong:**
White text on a moving 3D scene with varying brightness becomes unreadable when the camera drifts over a bright region of the photo. The existing MemoryPortal.jsx uses `memory-narrative-card` with Framer Motion, but the cards are styled for a static/slow-moving background. With displaced mesh parallax, bright spots move under the text unpredictably.

**Why it happens:**
Static text overlays work when the background is consistent. A displaced mesh scene with camera drift means the background brightness under any text region changes frame-to-frame. Designers test with one dark photo and declare it readable. The next photo has a bright sky that passes directly under the narrative text during camera drift.

**How to avoid:**
- Always render narrative cards on a semi-opaque glass panel (not directly on the 3D scene) — the existing site uses this pattern extensively for bento cells
- Add a localized vignette/darkening behind each text card that moves with it
- Position narrative cards in screen-space corners/edges that are naturally darker (bottom-left, bottom-center) rather than center-screen
- Consider a persistent bottom strip with frosted glass that narrative cards slide into — similar to subtitle tracks in cinema
- Test readability with at least 3 photos: dark scene, bright scene, high-contrast scene

**Warning signs:**
- Text is readable on the development test photo but unreadable on the second photo tested
- Narrative cards use `text-shadow` as the only readability measure (insufficient for bright backgrounds)
- Cards look readable in a static screenshot but become unreadable when the camera moves and brightness shifts under them

**Phase to address:**
Phase 2 (Narrative System) — Phase 1 can use simple positioned text, but the readability solution must be implemented before adding multiple scenes with varying brightness.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Fixed 600ms setTimeout before initializing new WebGL context (existing pattern in MemoryPortal.jsx) | Quick fix for context conflicts | Race condition — works on fast machines, fails on slow ones. No guarantee the old context is actually released. | Never — replace with event-driven context lifecycle |
| Hardcoded depth scale per scene | Fast per-scene tuning | Every new scene requires manual shader constant tuning. No consistent visual language across capsules. | Phase 1 only — establish auto-normalization by Phase 2 |
| Creating new Howl instances per memory scene | Simple audio per scene | Disconnected from GlobalPlayer, no volume coordination, iOS gesture issues, memory leaks if not unloaded | Phase 1 prototype only — must integrate with AudioContext by Phase 2 |
| Using OrbitControls for displaced mesh camera | Fast to implement, familiar | Reveals all the 2.5D artifacts (holes, rubber sheet, z-fighting). Users drag to angles that break the illusion. | Never for production — use constrained drift controller from day one |
| Storing depth maps as full-resolution 16-bit PNGs | Maximum precision | 20-30MB per scene, no perceptual benefit over 8-bit at 1024px. Kills mobile load times. | Never — 8-bit single-channel at 1024px is the production format |
| Skipping mobile GPU tier detection for memory scenes | Faster to ship | The existing `canRenderSplat()` only detects splat capability, not displaced mesh capability. Mobile devices that can render splats may still choke on displaced mesh + postprocessing. | Never — extend GPU detection to cover displaced mesh budget |

## Integration Gotchas

Common mistakes when integrating with existing jarowe.com systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Globe renderer lifecycle | Assuming the globe's WebGLRenderer is released when the Home component unmounts — it is NOT disposed, just orphaned | Add explicit `globe.renderer().dispose()` + `forceContextLoss()` in Home.jsx cleanup. Store disposal confirmation in a shared ref or custom event. |
| AudioContext / GlobalPlayer | Creating a standalone Howl instance for scene audio, ignoring the existing AudioProvider | Use `useAudio()` hook to fade out global music, then create scene audio within the same Howler mastering context. Restore on exit. |
| XP / Gamification | Not awarding XP for memory capsule interactions (visiting a scene, watching to completion) | Dispatch `add-xp` CustomEvent from the memory scene (existing pattern used by GameLauncher). Fire on "scene loaded" and "all narrative cards viewed." |
| Glint Autonomy | Glint autonomy system dispatching peeks while user is in an immersive memory scene | Call `getGlintAutonomy()?.pause()` on memory scene mount, `resume()` on unmount (same pattern used during game modals) |
| View Transitions API | Using `document.startViewTransition()` without checking support — crashes in Firefox/Safari | The existing `navigateWithTransition` utility in Home.jsx already handles this with feature detection. Use it for memory portal navigation. |
| PortalVFX | Running PortalVFX (2D canvas overlay) simultaneously with the memory scene's WebGL canvas — two overlapping full-screen canvases | Time the PortalVFX to fade out (`phase='residual'` then `null`) BEFORE the memory scene canvas starts rendering. Sequence, don't overlap. |

## Performance Traps

Patterns that work on development machines but fail on target devices.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full-resolution photo as WebGL texture | Scene loads and renders, just slowly | Resize to max 2048px, compress to WebP quality 80 | Mobile devices with <4GB RAM, any device on slow network |
| Postprocessing on displaced mesh (bloom, DOF, chromatic aberration) | Looks cinematic on desktop, freezes mobile | GPU tier gate: postprocessing only on tier 2+, max 1 effect on tier 1, none on tier 0 | Mobile GPUs below Adreno 6xx / Mali-G7x / Apple A13 |
| High subdivision displaced mesh (512x512 = 262K vertices) | Smooth displacement, accurate depth | Cap at 256x256 (65K vertices) for tier 1, 128x128 for mobile. Vertex count is the #1 mobile perf killer for displaced mesh. | Any mobile device, older integrated GPUs on laptops |
| Atmospheric particles (dust, light specks, bokeh) as individual meshes | Beautiful atmosphere, each particle is a plane with texture | Use InstancedMesh or Points for particles. 200 individual meshes = 200 draw calls. 200 instances = 1 draw call. | >50 particles as individual meshes on any GPU |
| Depth map sampled in vertex shader at high frequency | Smooth displacement with per-vertex depth lookup | Vertex texture fetch (VTF) is slow on mobile — many mobile GPUs don't support it at all or do it at 1/4 speed. Pre-compute displaced positions on CPU if VTF isn't supported. | Mobile GPUs without VTF support, older iOS devices |
| Multiple render targets for postprocessing | Each effect adds a framebuffer allocation | The site already uses EffectComposer in constellation — memory scene should NOT add another EffectComposer. If sharing isn't possible, skip postprocessing on the memory scene. | When total framebuffer allocations exceed GPU memory |

## Security Mistakes

Domain-specific security issues for memory capsules.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Serving high-resolution original photos with EXIF data intact | GPS coordinates in EXIF reveal exact locations of family memories — schools, home address, vacation rentals | Strip ALL EXIF before upload. The existing privacy policy applies to memory capsules too. Use build-time EXIF scanner. |
| Depth maps that encode precise room dimensions | Depth maps from indoor scenes can be reverse-engineered to extract room layouts and dimensions | Only serve relative (normalized 0-1) depth maps, never metric depth. This is the default for most models but verify. |
| User-uploaded photos in future iterations stored without validation | Malicious files disguised as images (polyglot files, oversized images for DoS) | Validate file type, dimensions, and size server-side. For now this is manual workflow only, but the validation should exist when automation comes. |

## UX Pitfalls

Common user experience mistakes in single-photo 3D memory experiences.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Giving users free camera control (orbit, zoom, pan) | Users immediately rotate to an angle that breaks the illusion, then judge the entire feature as "broken" | Constrained camera: gentle drift within safe cone, no user camera control. The experience is curated, not interactive. |
| No exit affordance visible during immersive scene | User feels trapped, especially on mobile where there's no browser back button visible | Always-visible minimal back button (existing `back-link` pill pattern) + swipe-down gesture on mobile to exit |
| Loading screen after portal animation | The portal builds anticipation, then a spinner deflates it. Emotional momentum is destroyed. | Pre-load scene assets during portal animation. Show the scene frozen (no camera movement) while final assets load — a still photo is better than a spinner. |
| Auto-playing audio without user action | Unexpected sound in a public setting embarrasses the user, who reflexively closes the tab | Default to muted. Show a tasteful "unmute for full experience" prompt. Respect the existing mute state from GlobalPlayer. |
| Narrative text appearing too fast | User is still absorbing the 3D environment and misses the text. Text and visual compete for attention. | First narrative card at 3-4 seconds (let the scene establish itself). Subsequent cards at 5-6 second intervals minimum. |
| Showing all memory capsules at once in a gallery | Dilutes the impact of each memory — becomes a photo viewer, not an experience | One flagship capsule first. Prove the experience is worth the load time. Add more only when the single capsule has proven its impact. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Displaced mesh renderer:** Often missing edge artifact handling (Pitfall 2) — verify depth discontinuity discard/fade is implemented and tested with high-contrast photos
- [ ] **Camera controller:** Often missing constraint limits — verify max angle from center is <20 degrees AND verify there are no code paths that bypass the constraint (e.g., debug controls left enabled)
- [ ] **Scene loading:** Often missing preload coordination with portal animation — verify scene assets start loading on portal click, not on route mount
- [ ] **Audio integration:** Often missing iOS Safari testing — verify audio plays on iPhone after portal click (the most common silent failure)
- [ ] **Mobile fallback:** Often missing graceful degradation — verify the parallax fallback (existing in MemoryPortal.jsx) activates cleanly when GPU tier is too low for displaced mesh
- [ ] **WebGL cleanup:** Often missing renderer disposal — verify `renderer.info.memory.textures` returns to pre-scene levels after navigating away from the memory scene
- [ ] **Back navigation:** Often missing globe camera restoration — verify the globe returns to the same position/zoom after exiting a memory scene, not the default view
- [ ] **Narrative timing:** Often missing synchronization with camera — verify text cards appear at moments that complement camera movement, not at fixed timeouts independent of visual state
- [ ] **Depth map alignment:** Often missing aspect ratio validation — verify depth map and photo have identical aspect ratios before applying displacement

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| WebGL context exhaustion | LOW | Add `webglcontextlost` event listener → auto-fallback to CSS parallax mode. Log the event for diagnostics. User sees degraded but functional experience. |
| Rubber sheet edge artifacts | MEDIUM | Add fragment shader `discard` for high depth gradients. Tighten camera constraints. May require re-tuning depth scale per scene. |
| Depth map quality issues on specific photos | LOW | Replace the depth map with one from a different model (Depth Anything v2 instead of MiDaS). Or manually paint/edit depth map in Photoshop. Per-scene fix, not systemic. |
| Cheap-looking camera movement | LOW | Replace linear interpolation with spring-based easing. Add Perlin noise micro-drift. Can be hot-fixed without changing any other code. |
| Mobile performance collapse | MEDIUM | Lower mesh subdivision, reduce DPR, disable particles and postprocessing for mobile tier. May require re-testing all scenes. |
| Portal disorientation | MEDIUM | Store globe camera state in sessionStorage before navigation. Restore on return. Add crossfade timing between portal animation and scene. Requires coordinating two pages. |
| Audio desync | LOW | Integrate with AudioContext system. Add fade-out/fade-in coordination. iOS fix requires moving Howler.ctx.resume() to click handler. |
| Asset size bloat | LOW | Run compression pipeline on all assets. WebP conversion, depth map downsample to 1024px 8-bit. One-time batch operation. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| WebGL context exhaustion | Phase 1: Foundation | `renderer.info.memory` shows 0 textures/geometries after leaving memory scene. No `webglcontextlost` events during normal navigation. |
| Rubber sheet edge artifacts | Phase 1: Displaced Mesh Renderer | Test with 5 different photo types — no visible stretched triangles within the camera's safe viewing cone. |
| Depth map quality variance | Phase 1: Asset Pipeline | Photo selection checklist exists. Per-scene `depthScale`/`depthContrast` config fields exist and are documented. |
| Cheap camera choreography | Phase 2: Cinematic Polish | Camera movement uses non-linear easing. Multiple layered motion periods. Perlin noise micro-drift. Sync with narrative beats. |
| Mobile performance collapse | Phase 1: Foundation | GPU tier detection extends to displaced mesh. Three fallback tiers tested on real devices. Frame time budget <16ms verified on mid-range Android. |
| Portal disorientation | Phase 2: Portal Integration | Globe camera state persists through round-trip navigation. Portal animation bridges entry/exit without loading screen. |
| Depth/UV misalignment | Phase 1: Asset Pipeline | Automated validation that depth map and photo dimensions match. Visual overlay check in the asset preparation workflow. |
| Holes and z-fighting | Phase 1: Displaced Mesh Renderer | Material uses FrontSide only, polygonOffset enabled, camera constraints enforced with no bypass. |
| Asset size bloat | Phase 1: Asset Pipeline | Per-capsule budget: <500KB total. Build-time warning if any capsule exceeds budget. |
| Audio desync | Phase 2: Audio Integration | AudioContext integration designed in Phase 1, implemented in Phase 2. iOS Safari tested on real device. |
| Premature abstraction | Phase 1: Architecture Decision | No renderer abstraction interfaces exist. Displaced mesh is a concrete component. Decision documented. |
| Text readability | Phase 2: Narrative System | Narrative cards have frosted glass backing. Tested against bright, dark, and high-contrast scenes. |

## Sources

- Three.js documentation: WebGLRenderer disposal, texture lifecycle, context loss handling
- react-globe.gl source: ThreeGlobeGen creates internal WebGLRenderer, not configurable
- Existing codebase analysis: `src/pages/Home.jsx` (7788 lines, globe renderer), `src/pages/MemoryPortal.jsx` (existing splat viewer with 600ms timeout hack), `src/components/PortalVFX.jsx` (2D canvas portal effect), `src/utils/gpuCapability.js` (GPU detection), `src/components/Prism3D.jsx` (always-mounted R3F Canvas), `src/constellation/scene/ConstellationCanvas.jsx` (R3F Canvas with postprocessing)
- Known codebase issues: globe renderer never calls dispose() on unmount, `sharedMemoryForWorkers: false` workaround for COOP/COEP headers, Prism3D always-mounted to avoid lag
- Depth estimation model documentation: MiDaS v3.1 (relative depth, fixed input resolution), ZoeDepth (metric depth), Depth Anything v2 (relative/metric, multiple resolutions)
- WebGL context limits: browser-specific, typically 8-16 per origin (Chrome 16, Firefox 16, Safari 8, mobile Safari 4-8)
- iOS Safari audio autoplay policy: requires user gesture in the same call stack, `await` breaks the gesture chain

---
*Pitfalls research for: Single-photo 3D memory experiences (displaced mesh) on GPU-heavy existing site*
*Researched: 2026-03-23*
