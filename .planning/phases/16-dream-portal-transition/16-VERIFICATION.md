# Phase 16 — Dream Portal Transition: Goal Verification

**Phase goal:** Entry dissolves reality into scattered particles, streams through directed memory current void, reforms into photo formation — exit reverses grammar

**Verification date:** 2026-03-24

---

## DREAM-01: Entry Dissolves — uMorphProgress 1→0

**Status: PASS**

`src/components/DreamTransition.jsx` — `buildDreamEntryTimeline`, Phase 1:

```js
tl.to(uniforms.uMorphProgress, {
  value: 0,
  duration: DISSOLVE_DURATION,  // 1.5s
  ease: 'power2.in',
}, 'dissolve');
```

The morph starts at 1.0 (photo-formed) and tweens to 0.0 (fully scattered) over 1.5s. `uMorphStagger` ramps up simultaneously to 0.35 to create a directional dissolve front.

Supporting evidence:
- `particleShaders.js` vertex shader: `float effectiveMorph = clamp(uMorphProgress - staggerOffset, 0.0, 1.0)` — particles interpolate between `aPhotoPosition` and `aScatteredPosition` based on effective morph
- `particleSampler.js`: scattered positions are an elongated Z-axis ellipsoid (`tunnelStretch=3.5`, `tunnelForwardBias=0.3`) so dissolve visually reads as falling into a dream corridor
- `wireShaders.js`: `uWireTransitionAlpha` is faded to 0 during dissolve — wires can't persist at incorrect positions when particles scatter

---

## DREAM-02: Tunnel Void — setTunnelMode + tunnel phase

**Status: PASS**

**FlightCamera** (`src/components/particleMemory/FlightCamera.jsx`) exposes `setTunnelMode` via `useImperativeHandle`:

```js
setTunnelMode: (enabled, speed = 0.0) => {
  tunnelMode.current = enabled;
  tunnelSpeed.current = speed;
  if (enabled) {
    velocity.current = 0;  // Kill user scroll — GSAP controls now
  }
},
```

When tunnel mode is active, `useFrame` auto-advances camera progress at `tunnelSpeed * dt` and skips the FOV bell-curve (comment: "Phase 16: skip FOV bell-curve — let external GSAP tween control FOV").

**DreamTransition** (`src/components/DreamTransition.jsx`) — Phase 2 of `buildDreamEntryTimeline`:

```js
tl.call(() => {
  rendererRef?.setTunnelMode?.(true, TUNNEL_CAMERA_SPEED);  // 0.15 progress/sec
}, [], 'tunnel');
```

FOV narrows to 30 degrees during tunnel for vanishing-point convergence. 3 wire filament flash bursts fire at 0.2s, 0.5s, 0.75s into the tunnel phase (60ms on at 0.35 alpha, 120ms decay), creating the "directed memory current" character described in the goal.

The tunnel phase is accessible through the delegation chain: `CapsuleShell → particleRendererRef → ParticleFieldRenderer.setTunnelMode → FlightCamera.setTunnelMode`.

---

## DREAM-03: Reform — uMorphProgress 0→1 with stagger

**Status: PASS**

`buildDreamEntryTimeline`, Phase 3:

```js
// Morph from scattered (0.0) back to photo-formed (1.0) with depth-stagger
tl.to(uniforms.uMorphProgress, {
  value: 1.0,
  duration: REFORM_DURATION,  // 2.0s
  ease: 'power2.out',
}, 'reform');

// Gradually reduce stagger to 0 as reform completes
tl.to(uniforms.uMorphStagger, {
  value: 0,
  duration: REFORM_DURATION * 0.8,
  ease: 'power1.out',
}, `reform+=${REFORM_DURATION * 0.3}`);
```

Stagger is already at STAGGER_MAX (0.35) from the dissolve phase. Because the vertex shader applies `staggerOffset = aDepthValue * uMorphStagger`, foreground particles (low depth) have lower offset and converge into position first — background particles lag behind, producing the wave-like assembly described in the goal.

FOV restores to scene default during reform. Wires restore to full alpha after 1.0s delay into reform (appears after particles are mostly assembled). `onReform` callback fires at the start of Phase 3 for narrative gating.

---

## DREAM-04: Exit Reverses Grammar — buildDreamExitTimeline mirrors entry

**Status: PASS**

`buildDreamExitTimeline` applies the same three-beat grammar in reverse:

| Step | Entry | Exit |
|------|-------|------|
| Stagger | Ramps up (0→0.35, directional) | Reset to 0 at start (`tl.set`), uniform dissolve |
| Morph | 1→0 over 1.5s, power2.in | 1→0 over 1.5s, power2.in |
| Wire fade | Fade to 0 over 1.0s | Fade to 0 over 1.0s |
| Tunnel mode | `setTunnelMode(true, +0.15)` — forward | `setTunnelMode(true, -0.15)` — retreat (negative speed) |
| FOV | Narrows to 30deg over 0.8s | Narrows to 30deg over 0.6s |
| Filament flashes | [0.2, 0.5, 0.75]s in tunnel | [0.2, 0.5, 0.75]s in tunnel |
| Navigation | Wired to `onReform` | `onRupture` fires at tunnel midpoint (`TUNNEL_DURATION * 0.5`) |
| Wire restore | Yes, after reform | No (component unmounts after navigation) |

Intentional differences: exit uses uniform dissolve (no stagger ramp) because the user is departing — depth-staggered convergence is specific to arrival. Negative tunnel speed reverses the camera direction for a "retreat" feel. Navigation fires at the tunnel midpoint (`onRupture`) rather than waiting for reform (there is no reform phase on exit).

**CapsuleShell integration** confirms both paths are wired:
- Entry: `setTimeout(() => dreamTransition.triggerEntry(), 100)` on particle awakening
- Exit (back button + portal enter): `dreamTransition.triggerExit()`
- `isParticleMemory` flag gates all dream transition behavior; non-particle scenes retain PortalVFX

---

## Overall Result: ALL 4 REQUIREMENTS PASS

| Requirement | Status | Key Evidence |
|-------------|--------|--------------|
| DREAM-01 | PASS | `uMorphProgress` 1→0, stagger ramp, wire fade in `buildDreamEntryTimeline` |
| DREAM-02 | PASS | `setTunnelMode` in FlightCamera + tunnel phase in DreamTransition, 3 filament flashes |
| DREAM-03 | PASS | `uMorphProgress` 0→1, stagger 0.35→0, depth-staggered vertex shader |
| DREAM-04 | PASS | `buildDreamExitTimeline` mirrors grammar, negative tunnel speed, rupture-point navigation |

Phase 16 is complete. Build verified at end of each task (26.95s – 30.38s, no errors).
