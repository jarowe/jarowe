/**
 * useSoundscape.js — Hook managing layered soundscape audio for memory capsules.
 *
 * Creates up to 3 independent Howl instances (ambient, detail, music) from a
 * scene's soundscape config. Each layer has its own volume, loop, and fade
 * envelope. The hook exposes start/stop/setActive controls, and automatically
 * cleans up on unmount.
 *
 * Usage:
 *   const { start, stop, isActive } = useSoundscape(scene?.soundscape);
 *
 * The `soundscapeActive` gate (from CapsuleShell) controls whether audio
 * actually plays — calling start() when the user hasn't interacted yet is
 * safe (Howler handles autoplay policy internally).
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { Howl, Howler } from 'howler';

/**
 * @param {object|null} soundscapeConfig - The `soundscape` object from a memoryScene entry
 * @returns {{ start: () => void, stop: () => void, isActive: boolean }}
 */
export default function useSoundscape(soundscapeConfig) {
  const howlsRef = useRef([]);
  const [isActive, setIsActive] = useState(false);
  const configRef = useRef(soundscapeConfig);
  configRef.current = soundscapeConfig;

  // Build Howl instances lazily on first start()
  const ensureHowls = useCallback(() => {
    if (howlsRef.current.length > 0) return howlsRef.current;
    const config = configRef.current;
    if (!config?.layers?.length) return [];

    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const howls = config.layers.map((layer) => {
      const src = layer.src.startsWith('/') ? `${base}${layer.src}` : layer.src;
      return {
        id: layer.id,
        howl: new Howl({
          src: [src],
          format: ['mp3'],
          loop: layer.loop ?? true,
          volume: 0, // start silent, fade in
          preload: true,
          onloaderror: (_id, err) => {
            console.warn(`[Soundscape] Load error for ${layer.id}:`, err);
          },
          onplayerror: () => {
            // Retry after resuming AudioContext
            if (Howler.ctx?.state === 'suspended') {
              Howler.ctx.resume();
            }
          },
        }),
        targetVolume: layer.volume ?? 0.5,
        fadeIn: layer.fadeIn ?? 2000,
        fadeOut: layer.fadeOut ?? 1500,
      };
    });

    howlsRef.current = howls;
    return howls;
  }, []);

  const start = useCallback(() => {
    // Resume Web Audio context if suspended
    if (Howler.ctx?.state === 'suspended') {
      Howler.ctx.resume();
    }

    const howls = ensureHowls();
    if (!howls.length) return;

    howls.forEach(({ howl, targetVolume, fadeIn }) => {
      if (!howl.playing()) {
        howl.volume(0);
        howl.play();
        howl.fade(0, targetVolume, fadeIn);
      }
    });

    setIsActive(true);
  }, [ensureHowls]);

  const stop = useCallback(() => {
    howlsRef.current.forEach(({ howl, fadeOut }) => {
      if (howl.playing()) {
        const current = howl.volume();
        howl.fade(current, 0, fadeOut);
        // Pause after fade completes
        setTimeout(() => {
          if (!howl._sounds?.some((s) => s._paused === false && s._ended === false)) return;
          howl.pause();
        }, fadeOut + 50);
      }
    });
    setIsActive(false);
  }, []);

  // Cleanup: unload all Howl instances on unmount
  useEffect(() => {
    return () => {
      howlsRef.current.forEach(({ howl }) => {
        try {
          howl.unload();
        } catch (_) {}
      });
      howlsRef.current = [];
    };
  }, []);

  return { start, stop, isActive };
}
