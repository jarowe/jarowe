# IMMERSIVE TECH — Splats, Shaders, Portals, WebGPU

## The principle

Immersive technology is the spectacle layer. It creates the "WTF is this?" moments that drive sharing and first impressions. But spectacle serves the world — the world does not serve spectacle.

Splats are memory capsules. Shaders are atmosphere. Portals are transitions between meaning. WebGPU is the engine under the hood.

---

## Gaussian Splats — Memory Theaters

### Strategic position
Use splats for **memory capsules**, not for global navigation. They are premium scenes — rare, curated, tied to personal story.

### Best use cases
| Use case | Description |
|----------|------------|
| **Memory portal** | Scan a real location from Jared's life. Attach a soundtrack + story. Hide inside the constellation as a rare unlock. |
| **Campaign feature** | A music release page with a splat scene of the recording space. |
| **Special exhibition** | A single curated splat experience, promoted as a standalone shareable URL. |
| **Globe integration** | Click a location on the globe → portal transition → enter the splat scene. |

### NOT recommended (yet)
- Splat-heavy homepage shell
- Multiple giant splat scenes loaded by default
- Betting the navigation model on splats

### Recommended stack

| Step | Tool | Notes |
|------|------|-------|
| **Capture** | Polycam (phone) or PostShot (desktop, NVIDIA) | Polycam: free tier, 150 images max. PostShot: 17 EUR/mo for PLY export. |
| **Edit** | SuperSplat (browser) | Free, open-source. Crop, clean, optimize, publish. superspl.at/editor |
| **Compress** | `@playcanvas/splat-transform` CLI | Convert PLY → SPZ (10x smaller, visually identical). |
| **Render** | Spark.js (`@sparkjsdev/spark`) | The leading 3DGS renderer for Three.js. World Labs. |
| **Simple alt** | drei `<Splat>` component | Drop-in R3F component, simpler but less capable. |

### Performance budget
- Keep scenes under **300K splats** for mobile compatibility
- Use **SPZ format** (~8MB per scene vs 118MB raw PLY)
- Progressive loading: KSPLAT shows first frame at 0.3s while rest streams
- Test on iPhone Safari as baseline

### Spark.js integration pattern
```jsx
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';

// Inside R3F scene
<SplatMesh url="/splats/greece-house.spz" position={[0, 0, 0]} />
```

Spark.js also has "Dynos" — a programmable splat engine for animating individual splats (position, color, scale per frame). This enables:
- Splats that pulse with music
- Morphing between two scanned states
- Interactive splat manipulation

### Scenes to capture first
1. **Home office / creative workspace** — the making-of space
2. **Syros Greece house** — worldschooling memories
3. **A meaningful Orlando location** — theme park, family spot
4. **Munich Elgato HQ** — professional world

Start with ONE. Ship it. See if it resonates. Then add more.

---

## Spatial Portals — Moving Between Worlds

### The vision
Navigating between spaces should feel like traveling through portals, not clicking links.

### drei MeshPortalMaterial
Renders an entirely different Three.js scene inside a mesh surface. A circle on the globe becomes a window into the constellation. A frame in the constellation becomes a gateway into a splat scene.

### Transition patterns

| Transition | Visual | Technical |
|------------|--------|-----------|
| Globe → Constellation | Camera dives into globe, stars streak past, constellation materializes | GSAP camera tween + particle speed ramp + crossfade |
| Constellation → Splat | Approach a node, light refracts, portal opens into scanned space | MeshPortalMaterial + camera flythrough |
| Any → Glint Space | Prism node grows, light splits, enter cosmic room | Scale animation + bloom + scene swap |
| Page → Page | Elements morph, content crossfades | View Transitions API (`startViewTransition()`) |

### Camera flythrough with GSAP + R3F
```js
// Already proven pattern in the codebase
const tl = gsap.timeline();
tl.to(camera.position, { x: 0, y: 0, z: 5, duration: 2, ease: 'power2.inOut' });
tl.to(lookTarget, { x: 0, y: 0, z: 0, duration: 2, ease: 'power2.inOut' }, '<');
// Disable OrbitControls during animation
controls.enabled = false;
tl.eventCallback('onComplete', () => { controls.enabled = true; });
```

### Transition shader
A full-screen quad with a custom ShaderMaterial can mask scene swaps:
- Portal spiral (radial distortion + chromatic aberration)
- Dimensional tear (noise-based rip in screenspace)
- Dissolve (threshold noise revealing the next scene)
- Wipe (directional sweep)

---

## Shader Art — Atmosphere and Gallery

### TSL (Three.js Shading Language)
The game-changer for shader development. Write shader logic in JavaScript that compiles to both WGSL (WebGPU) and GLSL (WebGL2). No more string-based GLSL.

### LYGIA shader library
Cross-platform shader function library (lygia.xyz). Modular GLSL/HLSL/WGSL functions for noise, SDF, lighting, color, distortion, generative patterns. Integrates with Three.js.

### Proven TSL effects (from Three.js examples)
| Effect | Example | Potential use |
|--------|---------|---------------|
| Tornado | `webgpu_tsl_vfx_tornado` | Special effect, campaign page |
| Flames | `webgpu_tsl_vfx_flames` | Holiday effect (campfire day?) |
| Galaxy | `webgpu_tsl_galaxy` | Constellation background alternative |
| Raging Sea | `webgpu_tsl_raging_sea` | Globe ocean enhancement |
| Halftone | `webgpu_tsl_halftone` | Artistic rendering mode |

### Living backgrounds
Replace static page backgrounds with subtle TSL shaders:
- Globe page: volumetric fog with day/night cycle
- Music page: audio-reactive waveform displacement
- Constellation page: nebula shader matching the 3D scene
- Garden page: flowing organic patterns

### Shader gallery (future)
A `/lab` route showcasing generative art experiments:
- Each piece is a live TSL shader
- Raymarched fractals, reaction-diffusion, volumetric clouds
- Three.js has a built-in Shadertoy transpiler (`ShaderToyNode`)
- Visitors can tweak parameters, download screenshots

---

## WebGPU — The Engine Upgrade

### Current state
- 82.7% global browser coverage (Chrome, Edge, Opera, Samsung Internet)
- Firefox behind a flag, Safari partial from v26+
- Three.js has 170+ WebGPU-specific examples
- TSL compiles to BOTH WGSL (WebGPU) and GLSL (WebGL2) — write once, run everywhere

### What WebGPU unlocks
| Capability | WebGL limit | WebGPU enables |
|------------|------------|----------------|
| Particles with physics | ~10K CPU-driven | 200K+ GPU compute |
| Fluid simulation | Not practical | 130K particles, MLS-MPM, 60fps |
| Audio visualization | ~1K particles | 100K+ reactive particles |
| Cloth simulation | CPU-limited | 961+ vertices, GPU wind/collision |
| Constellation nodes | CPU-positioned | GPU gravitational attraction between nodes |

### Migration path
1. **Now:** Write new shaders in TSL (works on current WebGL2 renderer)
2. **When R3F v10 ships:** Switch to WebGPURenderer
3. **Progressive enhancement:** Feature-detect `navigator.gpu`, unlock compute features only when available

### Concrete WebGPU projects (prioritized)
| Project | Impact | Effort | When |
|---------|--------|--------|------|
| Audio-reactive constellation (compute) | High | Medium | Phase 3 |
| Fluid signature landing | Very High (viral) | High | Phase 6+ |
| GPU-computed audio visualizer (100K particles) | High | Medium | Phase 6+ |
| Constellation gravitational physics | Medium | High | Phase 6+ |

---

## Audio-Reactive Visuals

### Current state
Howler.js in Web Audio mode: XHR → BufferSource → masterGain → destination.
AnalyserNode should be branch-connected to masterGain (documented in MEMORY).

### Integration
```js
// In useFrame() callback
analyser.getByteFrequencyData(dataArray);
// dataArray[0-3]: sub-bass → pulse helix spine
// dataArray[4-15]: bass/low-mid → ripple particle cloud
// dataArray[16-63]: mid/high → sparkle connections
// dataArray[64-127]: presence/brilliance → ambient glow
```

### What it feels like
When music plays, the constellation breathes. Low notes swell the spine. High notes sparkle the connections. Bass hits spawn particles. The 3D space becomes a visualizer without looking like a visualizer.

### Cost: $0. Uses existing Web Audio API infrastructure.

---

## View Transitions API

### Why this is a quick win
Adding `view-transition-name` to persistent elements + wrapping navigation in `document.startViewTransition()` makes page changes feel cinematic. This is production-ready in Chrome 111+, Edge, Firefox 144+, Safari 18+.

### Implementation
```css
/* Elements that persist across pages */
.navbar { view-transition-name: navbar; }
.globe-canvas { view-transition-name: globe; }
.music-player { view-transition-name: player; }

/* Transition animation */
::view-transition-old(root) { animation: fade-out 0.3s; }
::view-transition-new(root) { animation: fade-in 0.3s; }
```

```js
// In React Router navigation wrapper
function navigateWithTransition(to) {
  if (!document.startViewTransition) {
    navigate(to);
    return;
  }
  document.startViewTransition(() => navigate(to));
}
```

### Impact
Single biggest "this feels like an app, not a website" improvement. Low effort, high perceived quality.

---

## Priority order

1. **View Transitions** — Hours. Highest ratio of impact to effort.
2. **Audio-reactive constellation** — Days. High wow, uses existing audio infra.
3. **One gaussian splat scene** — 1-2 weeks. Flagship immersive moment.
4. **Spatial portal for splat entry** — 1 week after splat is ready.
5. **TSL living backgrounds** — Days each. Cumulative atmosphere improvement.
6. **WebGPU compute experiences** — Weeks. Wait for R3F v10 or progressive enhance.

## Challenge: Is immersive tech a trap?

Risk: Spending weeks on a fluid simulation that 5% of visitors see while the daily engine remains unbuilt.

**Counter-move:** The immersive tech serves TWO purposes:
1. **Retention atmosphere** — Weather, audio-reactive visuals, living backgrounds make the daily visit feel richer (worth the investment)
2. **Acquisition spectacle** — One splat scene, one fluid sim, one hand-tracked Glint interaction creates the viral screenshot moment (worth the investment, but only ONE at a time)

Build the daily engine first. Add spectacle second. The daily engine is what makes people come back. The spectacle is what makes them arrive.
