import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import { useConstellationStore } from '../store';

const TUNNEL_FOV = 100;
const HELIX_FOV = 60;

/**
 * Camera controller for constellation scene.
 *
 * Responsibilities:
 * - GSAP fly-to animation when focusedNodeId changes (KEY LINK to store)
 * - Fly-back to initial position on clearFocus
 * - Timeline-driven camera repositioning along helix
 * - Auto-orbit pause/resume with idle timer and speed ramp
 * - Tunnel mode: camera inside the helix axis, looking forward
 */
export default function CameraController({ controlsRef, positions, helixBounds }) {
  const { camera } = useThree();

  // Store initial camera position on mount
  const initialCameraPos = useRef(null);
  const initialTarget = useRef(null);
  const autoRotateTimer = useRef(null);
  const rampInterval = useRef(null);
  const flyTimeline = useRef(null);

  // Track whether a focus is active to suppress auto-orbit resume during fly-to
  const isFlyingRef = useRef(false);

  // Tunnel mode scroll handling
  const tunnelScrollRef = useRef(null);

  // Capture initial camera state on mount
  useEffect(() => {
    initialCameraPos.current = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
    const controls = controlsRef.current;
    if (controls) {
      initialTarget.current = {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z,
      };
    }
  }, [camera, controlsRef]);

  // Helper: start auto-rotate ramp
  const startAutoRotateRamp = (controls) => {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0;
    rampInterval.current = setInterval(() => {
      if (controls.autoRotateSpeed < 0.35) {
        controls.autoRotateSpeed += 0.015;
      } else {
        controls.autoRotateSpeed = 0.35;
        clearInterval(rampInterval.current);
      }
    }, 50);
  };

  // ---- Auto-orbit pause/resume ----
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      if (isFlyingRef.current) return;
      controls.autoRotate = false;
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      if (rampInterval.current) clearInterval(rampInterval.current);
    };

    const handleEnd = () => {
      if (isFlyingRef.current) return;
      const { focusedNodeId, cameraMode } = useConstellationStore.getState();
      if (focusedNodeId || cameraMode === 'tunnel') return;

      autoRotateTimer.current = setTimeout(() => {
        startAutoRotateRamp(controls);
      }, 5000);
    };

    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);

    return () => {
      controls.removeEventListener('start', handleStart);
      controls.removeEventListener('end', handleEnd);
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      if (rampInterval.current) clearInterval(rampInterval.current);
    };
  }, [controlsRef]);

  // ---- Tunnel mode transitions ----
  const cameraMode = useConstellationStore((s) => s.cameraMode);
  const tunnelY = useConstellationStore((s) => s.tunnelY);
  const setTunnelY = useConstellationStore((s) => s.setTunnelY);
  const prevCameraMode = useRef('helix');

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !helixBounds) return;

    if (cameraMode === 'tunnel' && prevCameraMode.current === 'helix') {
      // ---- ENTER TUNNEL ----
      if (flyTimeline.current) {
        flyTimeline.current.kill();
        flyTimeline.current = null;
      }

      isFlyingRef.current = true;
      controls.autoRotate = false;
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      if (rampInterval.current) clearInterval(rampInterval.current);

      // Start Y at current camera Y or helix midpoint
      const startY = camera.position.y;
      setTunnelY(startY);

      const tl = gsap.timeline({
        onUpdate: () => controls.update(),
        onComplete: () => {
          isFlyingRef.current = false;
          // Lock orbit controls for tunnel
          controls.enableRotate = false;
          controls.autoRotate = false;
        },
      });

      // Phase 1: fly to axis center (1s)
      tl.to(
        camera.position,
        { x: 0, y: startY, z: 0, duration: 1, ease: 'power2.inOut' },
        0
      );
      // Phase 2: look forward along axis
      tl.to(
        controls.target,
        { x: 0, y: startY + 50, z: 0, duration: 1, ease: 'power2.inOut' },
        0
      );
      // FOV expansion
      tl.to(camera, { fov: TUNNEL_FOV, duration: 0.5, ease: 'power2.out',
        onUpdate: () => camera.updateProjectionMatrix(),
      }, 0.5);

      flyTimeline.current = tl;

    } else if (cameraMode === 'helix' && prevCameraMode.current === 'tunnel') {
      // ---- EXIT TUNNEL ----
      if (flyTimeline.current) {
        flyTimeline.current.kill();
        flyTimeline.current = null;
      }

      isFlyingRef.current = true;
      controls.enableRotate = true;

      const currentY = camera.position.y;
      const exitZ = initialCameraPos.current?.z || 110;

      const tl = gsap.timeline({
        onUpdate: () => controls.update(),
        onComplete: () => {
          isFlyingRef.current = false;
          startAutoRotateRamp(controls);
        },
      });

      // Pull back outward
      tl.to(
        camera.position,
        { x: 0, y: currentY, z: exitZ, duration: 1.5, ease: 'power2.inOut' },
        0
      );
      tl.to(
        controls.target,
        { x: 0, y: currentY, z: 0, duration: 1.5, ease: 'power2.inOut' },
        0
      );
      // FOV contraction
      tl.to(camera, { fov: HELIX_FOV, duration: 0.5, ease: 'power2.in',
        onUpdate: () => camera.updateProjectionMatrix(),
      }, 0);

      flyTimeline.current = tl;
    }

    prevCameraMode.current = cameraMode;
  }, [cameraMode, controlsRef, helixBounds, camera, setTunnelY]);

  // ---- Tunnel scroll navigation (wheel event) ----
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleWheel = (e) => {
      const { cameraMode: mode } = useConstellationStore.getState();
      if (mode !== 'tunnel') return;

      e.preventDefault();
      const state = useConstellationStore.getState();
      const speed = 2;
      const delta = e.deltaY * speed * 0.01;
      const newY = Math.max(
        helixBounds?.minY ?? -200,
        Math.min(helixBounds?.maxY ?? 200, state.tunnelY + delta)
      );

      state.setTunnelY(newY);
    };

    const canvas = controls.domElement;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
    };
  }, [controlsRef, helixBounds]);

  // ---- Tunnel keyboard navigation ----
  useEffect(() => {
    const handleKeyDown = (e) => {
      const { cameraMode: mode } = useConstellationStore.getState();
      if (mode !== 'tunnel') return;

      const state = useConstellationStore.getState();
      const step = 5;

      if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        const newY = Math.min(helixBounds?.maxY ?? 200, state.tunnelY + step);
        state.setTunnelY(newY);
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        const newY = Math.max(helixBounds?.minY ?? -200, state.tunnelY - step);
        state.setTunnelY(newY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [helixBounds]);

  // ---- Smooth tunnel camera follow ----
  useFrame(() => {
    const { cameraMode: mode } = useConstellationStore.getState();
    if (mode !== 'tunnel' || isFlyingRef.current) return;

    const controls = controlsRef.current;
    if (!controls) return;

    const targetY = useConstellationStore.getState().tunnelY;

    // Smoothly interpolate camera Y
    camera.position.x += (0 - camera.position.x) * 0.1;
    camera.position.y += (targetY - camera.position.y) * 0.1;
    camera.position.z += (0 - camera.position.z) * 0.1;

    controls.target.x += (0 - controls.target.x) * 0.1;
    controls.target.y += (targetY + 50 - controls.target.y) * 0.1;
    controls.target.z += (0 - controls.target.z) * 0.1;

    controls.update();
  });

  // ---- Fly-to on focusedNodeId change ----
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Kill any running fly animation
    if (flyTimeline.current) {
      flyTimeline.current.kill();
      flyTimeline.current = null;
    }

    const { cameraMode: mode } = useConstellationStore.getState();

    if (focusedNodeId) {
      // Find node position
      const node = positions.find((n) => n.id === focusedNodeId);
      if (!node) return;

      isFlyingRef.current = true;

      // Pause auto-rotate
      controls.autoRotate = false;
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      if (rampInterval.current) clearInterval(rampInterval.current);

      if (mode === 'tunnel') {
        // In tunnel mode: just slide Y to the node's position
        useConstellationStore.getState().setTunnelY(node.y);
        isFlyingRef.current = false;
      } else {
        // Compute camera offset: above-right looking at node
        const camTarget = { x: node.x + 15, y: node.y + 5, z: node.z + 15 };

        // Animate BOTH camera.position AND controls.target simultaneously
        const tl = gsap.timeline({
          onUpdate: () => controls.update(),
          onComplete: () => {
            isFlyingRef.current = false;
          },
        });
        tl.to(
          camera.position,
          {
            x: camTarget.x,
            y: camTarget.y,
            z: camTarget.z,
            duration: 1.5,
            ease: 'power2.inOut',
          },
          0
        );
        tl.to(
          controls.target,
          {
            x: node.x,
            y: node.y,
            z: node.z,
            duration: 1.5,
            ease: 'power2.inOut',
          },
          0
        );
        flyTimeline.current = tl;
      }
    } else {
      if (mode === 'tunnel') {
        // In tunnel mode: no fly-back, just stay where we are
        isFlyingRef.current = false;
        return;
      }

      // Fly back to initial position
      if (!initialCameraPos.current || !initialTarget.current) return;

      isFlyingRef.current = true;

      const tl = gsap.timeline({
        onUpdate: () => controls.update(),
        onComplete: () => {
          isFlyingRef.current = false;
          // Resume auto-rotate after flying back
          startAutoRotateRamp(controls);
        },
      });
      tl.to(
        camera.position,
        {
          x: initialCameraPos.current.x,
          y: initialCameraPos.current.y,
          z: initialCameraPos.current.z,
          duration: 1.5,
          ease: 'power2.inOut',
        },
        0
      );
      tl.to(
        controls.target,
        {
          x: initialTarget.current.x,
          y: initialTarget.current.y,
          z: initialTarget.current.z,
          duration: 1.5,
          ease: 'power2.inOut',
        },
        0
      );
      flyTimeline.current = tl;
    }
  }, [focusedNodeId, positions, camera, controlsRef]);

  // ---- Timeline-driven camera ----
  const timelinePosition = useConstellationStore((s) => s.timelinePosition);
  const prevTimelineRef = useRef(0);

  useEffect(() => {
    // Skip initial render and tiny changes
    if (Math.abs(timelinePosition - prevTimelineRef.current) < 0.001) return;
    prevTimelineRef.current = timelinePosition;

    const controls = controlsRef.current;
    if (!controls || !helixBounds) return;

    // Don't override focus fly-to
    const { focusedNodeId: currentFocus, cameraMode: mode } = useConstellationStore.getState();
    if (currentFocus) return;

    const mappedY =
      helixBounds.minY + timelinePosition * (helixBounds.maxY - helixBounds.minY);

    if (mode === 'tunnel') {
      // In tunnel mode: timeline directly maps to tunnelY
      useConstellationStore.getState().setTunnelY(mappedY);
      return;
    }

    // Pause auto-rotate during timeline scrub
    controls.autoRotate = false;
    if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);

    gsap.to(camera.position, {
      x: 0,
      y: mappedY,
      z: 110,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => controls.update(),
    });
    gsap.to(controls.target, {
      x: 0,
      y: mappedY,
      z: 0,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Resume auto-rotate after scrub settles
    autoRotateTimer.current = setTimeout(() => {
      const { focusedNodeId: f } = useConstellationStore.getState();
      if (!f) {
        startAutoRotateRamp(controls);
      }
    }, 2000);
  }, [timelinePosition, camera, controlsRef, helixBounds]);

  return null;
}
