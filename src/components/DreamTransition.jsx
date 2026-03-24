/**
 * DreamTransition — GSAP-based 3-phase dream portal transition orchestrator
 *
 * Replaces PortalVFX for particle-memory scenes with a morph-based transition:
 *   Phase 1 (Dissolve):  uMorphProgress 1→0 + uMorphStagger ramp + wire fade to 0
 *   Phase 2 (Tunnel):    Camera auto-advance, FOV→30deg, filament flashes (3 bursts)
 *   Phase 3 (Reform):    uMorphProgress 0→1 depth-staggered, FOV restore, wire restore
 *
 * Wire filament flashes (D-06): During tunnel void, 3 brief luminous wire bursts
 * (~60ms on at 0.35 alpha, ~120ms decay) create "directed memory current" character.
 *
 * Entry: particles dissolve from photo → scattered → tunnel → reform into photo
 * Exit:  reverse grammar — photo → scattered → tunnel → navigate away
 * Both share identical visual language: same wire fade, same flashes, same FOV convergence.
 *
 * Decisions: 16-CONTEXT D-01 through D-12
 * Requirements: DREAM-01, DREAM-02, DREAM-03, DREAM-04
 */

import { useRef, useCallback, useEffect } from 'react';
import gsap from 'gsap';

// ---------------------------------------------------------------------------
// Timeline durations (seconds)
// ---------------------------------------------------------------------------
const DISSOLVE_DURATION = 1.5;        // D-04: ~3s total, dissolve portion
const TUNNEL_DURATION = 1.0;          // D-08: brief luminous corridor
const REFORM_DURATION = 2.0;          // D-09: 1.5-3s for assembly
const STAGGER_RAMP_DURATION = 0.8;    // How fast stagger ramps up during dissolve
const STAGGER_MAX = 0.35;             // Max depth-stagger offset for reform convergence
const TUNNEL_FOV = 30;                // Vanishing point convergence FOV
const TUNNEL_CAMERA_SPEED = 0.15;     // Auto-advance speed during tunnel (progress/sec)

// ---------------------------------------------------------------------------
// sessionStorage keys
// ---------------------------------------------------------------------------
const DEPARTURE_KEY = 'jarowe_dream_departure';

/**
 * Build a GSAP entry timeline: dissolve → tunnel → reform
 *
 * @param {object} rendererRef - ParticleFieldRenderer ref with getUniforms, getWireUniforms, getCamera, setTunnelMode
 * @param {object} scene - Scene config from memoryScenes.js
 * @param {object} options - { onReform, onComplete }
 * @returns {gsap.core.Timeline | null}
 */
export function buildDreamEntryTimeline(rendererRef, scene, options = {}) {
  const uniforms = rendererRef?.getUniforms?.();
  const camera = rendererRef?.getCamera?.();
  const wireUniforms = rendererRef?.getWireUniforms?.();

  if (!uniforms) {
    console.warn('[DreamTransition] No particle uniforms available — skipping entry timeline');
    return null;
  }

  const defaultFov = scene?.flightPath?.fovRange?.[0] ?? 50;
  const tl = gsap.timeline({
    onComplete: () => {
      // Ensure tunnel mode is off after entry completes
      rendererRef?.setTunnelMode?.(false, 0);
      if (options.onComplete) options.onComplete();
    },
  });

  // === Phase 1: DISSOLVE (D-01, D-03) ===
  // Morph from photo-formed (1.0) to scattered (0.0)
  tl.addLabel('dissolve', 0);

  tl.to(uniforms.uMorphProgress, {
    value: 0,
    duration: DISSOLVE_DURATION,
    ease: 'power2.in',
  }, 'dissolve');

  // Ramp up stagger during dissolve — creates directional dissolve effect
  tl.to(uniforms.uMorphStagger, {
    value: STAGGER_MAX,
    duration: STAGGER_RAMP_DURATION,
    ease: 'power1.in',
  }, 'dissolve');

  // Fade wires during dissolve — they'd appear at wrong positions when scattered
  if (wireUniforms) {
    tl.to(wireUniforms.uWireTransitionAlpha, {
      value: 0,
      duration: 1.0,
      ease: 'power2.in',
    }, 'dissolve');
  }

  // === Phase 2: TUNNEL VOID (D-05, D-06, D-07) ===
  // Camera auto-advances through the scattered particle field
  tl.addLabel('tunnel', `dissolve+=${DISSOLVE_DURATION}`);

  // Enable tunnel mode on FlightCamera — auto-advance, no scroll, no FOV override
  tl.call(() => {
    rendererRef?.setTunnelMode?.(true, TUNNEL_CAMERA_SPEED);
  }, [], 'tunnel');

  // FOV convergence: narrow to vanishing point during tunnel (D-06)
  if (camera) {
    tl.to(camera, {
      fov: TUNNEL_FOV,
      duration: TUNNEL_DURATION * 0.8,
      ease: 'power2.in',
      onUpdate: () => camera.updateProjectionMatrix(),
    }, 'tunnel');
  }

  // Filament flashes during tunnel void — brief luminous wire structures appear and snap away (D-06)
  if (wireUniforms) {
    const flashTimes = [0.2, 0.5, 0.75]; // seconds into tunnel phase
    flashTimes.forEach(t => {
      tl.to(wireUniforms.uWireTransitionAlpha, {
        value: 0.35, duration: 0.06, ease: 'none',
      }, `tunnel+=${t}`);
      tl.to(wireUniforms.uWireTransitionAlpha, {
        value: 0, duration: 0.12, ease: 'power2.out',
      }, `tunnel+=${t + 0.06}`);
    });
  }

  // === Phase 3: REFORM (D-09, D-10) ===
  // Particles stream from scattered chaos into photo formation
  tl.addLabel('reform', `tunnel+=${TUNNEL_DURATION}`);

  // Disable tunnel mode — restore user scroll control
  tl.call(() => {
    rendererRef?.setTunnelMode?.(false, 0);
  }, [], 'reform');

  // Morph from scattered (0.0) back to photo-formed (1.0) with depth-stagger
  // Stagger is already at STAGGER_MAX — foreground arrives first (D-10)
  tl.to(uniforms.uMorphProgress, {
    value: 1.0,
    duration: REFORM_DURATION,
    ease: 'power2.out',
  }, 'reform');

  // Gradually reduce stagger to 0 as reform completes — settle into clean formation
  tl.to(uniforms.uMorphStagger, {
    value: 0,
    duration: REFORM_DURATION * 0.8,
    ease: 'power1.out',
  }, `reform+=${REFORM_DURATION * 0.3}`);

  // Restore FOV to scene default during reform
  if (camera) {
    tl.to(camera, {
      fov: defaultFov,
      duration: REFORM_DURATION * 0.6,
      ease: 'power2.out',
      onUpdate: () => camera.updateProjectionMatrix(),
    }, 'reform');
  }

  // Restore wires as particles reform — delayed start so wires appear after particles mostly reformed
  if (wireUniforms) {
    tl.to(wireUniforms.uWireTransitionAlpha, {
      value: 1.0,
      duration: 1.0,
      ease: 'power2.out',
    }, 'reform+=1.0');
  }

  // Notify reform start (for narrative gating, etc.)
  if (options.onReform) {
    tl.call(options.onReform, [], 'reform');
  }

  return tl;
}

/**
 * Build a GSAP exit timeline: dissolve → tunnel → navigate
 *
 * @param {object} rendererRef - ParticleFieldRenderer ref
 * @param {object} scene - Scene config from memoryScenes.js
 * @param {object} options - { onRupture (fires at tunnel midpoint for navigation) }
 * @returns {gsap.core.Timeline | null}
 */
export function buildDreamExitTimeline(rendererRef, scene, options = {}) {
  const uniforms = rendererRef?.getUniforms?.();
  const camera = rendererRef?.getCamera?.();
  const wireUniforms = rendererRef?.getWireUniforms?.();

  if (!uniforms) {
    console.warn('[DreamTransition] No particle uniforms available — skipping exit timeline');
    return null;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      rendererRef?.setTunnelMode?.(false, 0);
    },
  });

  // === Phase 1: EXIT DISSOLVE (D-11) ===
  // Reset stagger to 0 — exit dissolve is uniform, not depth-staggered
  tl.addLabel('dissolve', 0);
  tl.set(uniforms.uMorphStagger, { value: 0 }, 0);

  // Morph from photo-formed (1.0) to scattered (0.0)
  tl.to(uniforms.uMorphProgress, {
    value: 0,
    duration: DISSOLVE_DURATION,
    ease: 'power2.in',
  }, 'dissolve');

  // Fade wires during exit dissolve — same grammar as entry (D-11)
  if (wireUniforms) {
    tl.to(wireUniforms.uWireTransitionAlpha, {
      value: 0,
      duration: 1.0,
      ease: 'power2.in',
    }, 'dissolve');
  }

  // === Phase 2: EXIT TUNNEL VOID ===
  tl.addLabel('tunnel', `dissolve+=${DISSOLVE_DURATION}`);

  // Enable tunnel mode — auto-advance backward (negative speed for retreat feel)
  tl.call(() => {
    rendererRef?.setTunnelMode?.(true, -TUNNEL_CAMERA_SPEED);
  }, [], 'tunnel');

  // FOV convergence during exit tunnel
  if (camera) {
    tl.to(camera, {
      fov: TUNNEL_FOV,
      duration: TUNNEL_DURATION * 0.6,
      ease: 'power2.in',
      onUpdate: () => camera.updateProjectionMatrix(),
    }, 'tunnel');
  }

  // Filament flashes during exit tunnel void — same visual grammar as entry (D-11)
  if (wireUniforms) {
    const flashTimes = [0.2, 0.5, 0.75]; // seconds into tunnel phase
    flashTimes.forEach(t => {
      tl.to(wireUniforms.uWireTransitionAlpha, {
        value: 0.35, duration: 0.06, ease: 'none',
      }, `tunnel+=${t}`);
      tl.to(wireUniforms.uWireTransitionAlpha, {
        value: 0, duration: 0.12, ease: 'power2.out',
      }, `tunnel+=${t + 0.06}`);
    });
  }

  // Fire onRupture at tunnel midpoint — this is when navigation should happen (D-03)
  if (options.onRupture) {
    tl.call(options.onRupture, [], `tunnel+=${TUNNEL_DURATION * 0.5}`);
  }

  return tl;
}

/**
 * Store departure state in sessionStorage so return transitions feel intentional (D-12)
 */
export function storeDepartureState(sceneId) {
  try {
    const state = {
      sceneId,
      timestamp: Date.now(),
      fromPath: window.location.pathname,
    };
    sessionStorage.setItem(DEPARTURE_KEY, JSON.stringify(state));
  } catch (e) {
    // sessionStorage may be unavailable in some contexts
  }
}

/**
 * Retrieve and clear departure state from sessionStorage
 */
export function retrieveDepartureState() {
  try {
    const raw = sessionStorage.getItem(DEPARTURE_KEY);
    sessionStorage.removeItem(DEPARTURE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    // Expire after 5 minutes
    if (Date.now() - state.timestamp > 5 * 60 * 1000) return null;
    return state;
  } catch (e) {
    return null;
  }
}

/**
 * useDreamTransition — React hook for managing dream entry/exit state
 *
 * @param {object} rendererRef - React ref to ParticleFieldRenderer
 * @param {object} scene - Scene config from memoryScenes.js
 * @param {object} options - { directAccess, onExitNavigate }
 * @returns {{ triggerEntry, triggerExit, isTransitioning, phase }}
 */
export function useDreamTransition(rendererRef, scene, options = {}) {
  const entryTlRef = useRef(null);
  const exitTlRef = useRef(null);
  const phaseRef = useRef('idle'); // 'idle' | 'entering' | 'active' | 'exiting'

  // Cleanup timelines on unmount
  useEffect(() => {
    return () => {
      if (entryTlRef.current) {
        entryTlRef.current.kill();
        entryTlRef.current = null;
      }
      if (exitTlRef.current) {
        exitTlRef.current.kill();
        exitTlRef.current = null;
      }
    };
  }, []);

  const triggerEntry = useCallback(() => {
    if (phaseRef.current !== 'idle') return;
    const renderer = rendererRef?.current;
    if (!renderer) return;

    phaseRef.current = 'entering';

    const tl = buildDreamEntryTimeline(renderer, scene, {
      onReform: () => {
        // Reform phase started — particles are assembling
      },
      onComplete: () => {
        phaseRef.current = 'active';
        entryTlRef.current = null;
      },
    });

    if (tl) {
      entryTlRef.current = tl;
    } else {
      // No timeline built (missing uniforms) — skip directly to active
      phaseRef.current = 'active';
    }
  }, [rendererRef, scene]);

  const triggerExit = useCallback(() => {
    if (phaseRef.current === 'exiting') return;
    const renderer = rendererRef?.current;
    if (!renderer) {
      // No renderer — just navigate
      if (options.onExitNavigate) options.onExitNavigate();
      return;
    }

    phaseRef.current = 'exiting';

    const tl = buildDreamExitTimeline(renderer, scene, {
      onRupture: () => {
        // Navigate at rupture point (D-03)
        if (options.onExitNavigate) options.onExitNavigate();
      },
    });

    if (tl) {
      exitTlRef.current = tl;
    } else {
      // No timeline built — navigate immediately
      if (options.onExitNavigate) options.onExitNavigate();
    }
  }, [rendererRef, scene, options.onExitNavigate]);

  return {
    triggerEntry,
    triggerExit,
    isTransitioning: phaseRef.current === 'entering' || phaseRef.current === 'exiting',
    phase: phaseRef.current,
  };
}
