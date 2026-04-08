/**
 * useSoundscape.js — Ambient soundscape hook for memory scenes
 *
 * Manages multi-layer ambient audio playback with gain envelope transitions.
 * Uses Howler.js in Web Audio mode (never html5:true, never createMediaElementSource).
 *
 * Features:
 *   - Staggered layer entry with per-layer fade-in/delay
 *   - Coordinated fade-out on unmount or scene change
 *   - Ducks site music via AudioContext.duckForNodeAudio/restoreFromDuck
 *   - Respects global mute state from sounds.js getMuted()
 *   - Graceful error handling (missing audio files don't crash the scene)
 *
 * Usage:
 *   const { isPlaying, isLoading, error, stop } = useSoundscape('syros-cave');
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { getSceneById } from '../data/memoryScenes';
import { getMuted } from '../utils/sounds';

/**
 * @param {string|null} sceneId — ID from memoryScenes registry, or null to stop
 * @param {object} [options]
 * @param {function} [options.duckSiteMusic]    — called when soundscape starts (e.g. audioCtx.duckForNodeAudio)
 * @param {function} [options.restoreSiteMusic]  — called when soundscape stops (e.g. audioCtx.restoreFromDuck)
 * @param {boolean}  [options.enabled=true]      — master enable toggle
 * @returns {{ isPlaying: boolean, isLoading: boolean, error: string|null, stop: function }}
 */
export function useSoundscape(sceneId, options = {}) {
  const {
    duckSiteMusic,
    restoreSiteMusic,
    enabled = true,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs to track Howl instances and timers across renders
  const howlsRef = useRef([]); // Array of { id, howl, delayTimer }
  const activeRef = useRef(false);
  const duckedRef = useRef(false);
  const fadeOutTimerRef = useRef(null);

  /**
   * Tear down all Howl instances with fade-out.
   * @param {number} [fadeMs] — override fade-out duration (uses layer config if omitted)
   * @returns {Promise<void>} resolves when all fades complete
   */
  const teardown = useCallback((fadeMs) => {
    activeRef.current = false;
    setIsPlaying(false);

    // Clear any pending delay timers
    howlsRef.current.forEach(({ delayTimer }) => {
      if (delayTimer) clearTimeout(delayTimer);
    });

    // Fade out and unload each layer
    const promises = howlsRef.current.map(({ howl, fadeOut: layerFadeOut }) => {
      const dur = fadeMs ?? layerFadeOut ?? 2000;
      return new Promise((resolve) => {
        if (!howl || !howl.playing()) {
          if (howl) howl.unload();
          resolve();
          return;
        }
        howl.fade(howl.volume(), 0, dur);
        const timer = setTimeout(() => {
          howl.stop();
          howl.unload();
          resolve();
        }, dur + 100);
        // Store timer ref for cleanup
        fadeOutTimerRef.current = timer;
      });
    });

    howlsRef.current = [];

    // Restore site music after fade-out
    if (duckedRef.current && restoreSiteMusic) {
      const maxFade = fadeMs ?? 3000;
      setTimeout(() => {
        restoreSiteMusic();
        duckedRef.current = false;
      }, maxFade);
    }

    return Promise.all(promises);
  }, [restoreSiteMusic]);

  /**
   * Stop the soundscape (callable from outside).
   */
  const stop = useCallback(() => {
    teardown();
  }, [teardown]);

  // Main effect: start/stop soundscape when sceneId changes
  useEffect(() => {
    // Bail early
    if (!sceneId || !enabled || getMuted()) {
      if (activeRef.current) teardown();
      return;
    }

    const scene = getSceneById(sceneId);
    if (!scene?.soundscape) {
      setError(`Scene "${sceneId}" not found or has no soundscape config`);
      return;
    }

    const { soundscape } = scene;
    const { layers, masterVolume = 1, masterFadeIn = 2000 } = soundscape;

    if (!layers || layers.length === 0) {
      setError(`Scene "${sceneId}" has no audio layers`);
      return;
    }

    // Resume Howler AudioContext if suspended (must be in user gesture callstack
    // or after first interaction)
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }

    setError(null);
    setIsLoading(true);
    activeRef.current = true;

    // Duck site music before starting ambient layers
    if (duckSiteMusic && !duckedRef.current) {
      duckSiteMusic();
      duckedRef.current = true;
    }

    let loadedCount = 0;
    const totalLayers = layers.length;

    layers.forEach((layer) => {
      const {
        id,
        src,
        volume: layerVol = 0.5,
        loop = true,
        fadeIn: layerFadeIn = masterFadeIn,
        fadeOut: layerFadeOut = 2000,
        delay = 0,
      } = layer;

      // Effective volume = layer volume * master volume
      const targetVolume = layerVol * masterVolume;

      // Howler.js src accepts an array of fallback URLs.
      // Normalize: if src is already an array use it, otherwise wrap it.
      const srcArray = Array.isArray(src) ? src : [src];

      const howl = new Howl({
        src: srcArray,
        // Web Audio mode (default) — never use html5:true
        loop,
        volume: 0, // Start silent, fade in via gain envelope
        preload: true,

        onload: () => {
          loadedCount++;
          if (loadedCount >= totalLayers) {
            setIsLoading(false);
          }

          // Only start if we're still active (user might have navigated away during load)
          if (!activeRef.current) {
            howl.unload();
            return;
          }

          // Staggered entry via delay timer
          const delayTimer = setTimeout(() => {
            if (!activeRef.current) {
              howl.unload();
              return;
            }
            howl.play();
            // Gain envelope: fade from 0 to target volume
            howl.fade(0, targetVolume, layerFadeIn);
            setIsPlaying(true);
          }, delay);

          // Store the delay timer for cleanup
          const entry = howlsRef.current.find((h) => h.id === id);
          if (entry) entry.delayTimer = delayTimer;
        },

        onloaderror: (_id, err) => {
          loadedCount++;
          if (loadedCount >= totalLayers) {
            setIsLoading(false);
          }
          console.warn(`[useSoundscape] Failed to load layer "${id}":`, err);
          // Don't set error state for individual layers — other layers may work
          // Only set error if ALL layers fail
          if (loadedCount >= totalLayers && howlsRef.current.every((h) => !h.howl.state || h.howl.state() === 'unloaded')) {
            setError(`All soundscape layers failed to load for "${sceneId}"`);
          }
        },

        onplayerror: () => {
          // Try to resume AudioContext and retry
          if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume().then(() => {
              if (activeRef.current) howl.play();
            });
          }
        },
      });

      howlsRef.current.push({
        id,
        howl,
        fadeOut: layerFadeOut,
        delayTimer: null,
      });
    });

    // Cleanup on unmount or scene change
    return () => {
      teardown();
    };
  }, [sceneId, enabled, duckSiteMusic, teardown]);

  // Watch for mute changes
  useEffect(() => {
    const checkMute = () => {
      if (getMuted() && activeRef.current) {
        // Fade out quickly when muted
        howlsRef.current.forEach(({ howl }) => {
          if (howl && howl.playing()) {
            howl.fade(howl.volume(), 0, 500);
          }
        });
      }
    };

    // Listen for custom mute event if dispatched elsewhere
    window.addEventListener('jarowe-mute-changed', checkMute);
    return () => window.removeEventListener('jarowe-mute-changed', checkMute);
  }, []);

  // Cleanup on full unmount
  useEffect(() => {
    return () => {
      // Force cleanup any lingering timers
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current);
      }
      howlsRef.current.forEach(({ howl, delayTimer }) => {
        if (delayTimer) clearTimeout(delayTimer);
        if (howl) {
          howl.stop();
          howl.unload();
        }
      });
      howlsRef.current = [];
      if (duckedRef.current && restoreSiteMusic) {
        restoreSiteMusic();
        duckedRef.current = false;
      }
    };
  }, [restoreSiteMusic]);

  return { isPlaying, isLoading, error, stop };
}

export default useSoundscape;
