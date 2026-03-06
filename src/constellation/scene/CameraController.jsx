import { useRef, useEffect, useMemo } from 'react';
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

  // Track previous focus for stepping detection
  const prevFocusRef = useRef(null);

  // Tunnel smooth scroll velocity for momentum
  const tunnelVelocity = useRef(0);

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

      // Start Y at current camera Y
      const startY = camera.position.y;
      setTunnelY(startY);
      tunnelVelocity.current = 0;

      const tl = gsap.timeline({
        onUpdate: () => controls.update(),
        onComplete: () => {
          isFlyingRef.current = false;
          // In tunnel: left-drag = look around (rotate), right-drag = zoom
          controls.enableRotate = true;
          controls.enablePan = false;
          controls.enableZoom = true;
          controls.autoRotate = false;
          // Remap: left button rotates, right button zooms (dolly)
          controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.DOLLY,
          };
          // Limit rotation range in tunnel so you can't flip upside down
          controls.minPolarAngle = Math.PI * 0.2;
          controls.maxPolarAngle = Math.PI * 0.8;
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
      controls.enablePan = false;
      controls.enableZoom = true;
      tunnelVelocity.current = 0;
      // Restore default mouse buttons and polar angles
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
      controls.minPolarAngle = Math.PI * (15 / 180);
      controls.maxPolarAngle = Math.PI * (165 / 180);

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

  // ---- Pre-compute sorted helix node list for scroll-to-next ----
  const sortedHelixNodes = useMemo(() => {
    if (!positions || positions.length === 0) return [];
    return [...positions].sort((a, b) => a.y - b.y);
  }, [positions]);

  // Debounce ref for scroll-to-next (prevent rapid-fire scrolling)
  const scrollCooldownRef = useRef(false);

  // ---- Scroll navigation: next/prev node when focused, tunnel scroll otherwise ----
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleWheel = (e) => {
      const state = useConstellationStore.getState();

      // Tunnel mode: smooth gentle scroll along Y axis
      if (state.cameraMode === 'tunnel') {
        e.preventDefault();
        // Gentle velocity accumulation — small impulse for smooth feel
        const impulse = e.deltaY * 0.012;
        tunnelVelocity.current += impulse;
        // Clamp max velocity to prevent overshooting
        tunnelVelocity.current = Math.max(-3, Math.min(3, tunnelVelocity.current));
        return;
      }

      // Helix mode with focused node: scroll-to-next/prev node on the rail
      if (state.focusedNodeId && sortedHelixNodes.length > 1) {
        e.preventDefault();

        // Cooldown to prevent rapid jumping
        if (scrollCooldownRef.current) return;
        scrollCooldownRef.current = true;
        setTimeout(() => { scrollCooldownRef.current = false; }, 600);

        const currentIdx = sortedHelixNodes.findIndex(
          (n) => n.id === state.focusedNodeId
        );
        if (currentIdx === -1) return;

        // Scroll down (deltaY > 0) = move forward in time (higher Y)
        const direction = e.deltaY > 0 ? 1 : -1;
        const nextIdx = currentIdx + direction;

        if (nextIdx >= 0 && nextIdx < sortedHelixNodes.length) {
          state.focusNode(sortedHelixNodes[nextIdx].id);
        }
        return;
      }

      // No focus: let default orbit controls handle zoom
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
  }, [controlsRef, helixBounds, sortedHelixNodes]);

  // ---- Keyboard navigation: tunnel + focused node stepping ----
  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = useConstellationStore.getState();

      // Tunnel mode: gentle Y movement
      if (state.cameraMode === 'tunnel') {
        if (e.key === 'ArrowUp' || e.key === 'w') {
          e.preventDefault();
          tunnelVelocity.current += 0.8;
        } else if (e.key === 'ArrowDown' || e.key === 's') {
          e.preventDefault();
          tunnelVelocity.current -= 0.8;
        }
        return;
      }

      // Helix mode with focused node: arrow keys step through nodes
      if (state.focusedNodeId && sortedHelixNodes.length > 1) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const currentIdx = sortedHelixNodes.findIndex(
            (n) => n.id === state.focusedNodeId
          );
          if (currentIdx === -1) return;

          const direction = e.key === 'ArrowUp' ? 1 : -1;
          const nextIdx = currentIdx + direction;
          if (nextIdx >= 0 && nextIdx < sortedHelixNodes.length) {
            state.focusNode(sortedHelixNodes[nextIdx].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [helixBounds, sortedHelixNodes]);

  // ---- Smooth tunnel camera follow with momentum ----
  useFrame(() => {
    const { cameraMode: mode } = useConstellationStore.getState();
    if (mode !== 'tunnel' || isFlyingRef.current) return;

    const controls = controlsRef.current;
    if (!controls) return;

    // Apply velocity with friction for momentum scrolling
    if (Math.abs(tunnelVelocity.current) > 0.01) {
      const state = useConstellationStore.getState();
      const newY = Math.max(
        helixBounds?.minY ?? -200,
        Math.min(helixBounds?.maxY ?? 200, state.tunnelY + tunnelVelocity.current)
      );
      state.setTunnelY(newY);
      // Friction: decelerate smoothly
      tunnelVelocity.current *= 0.92;
    } else {
      tunnelVelocity.current = 0;
    }

    const targetY = useConstellationStore.getState().tunnelY;
    const lerpFactor = 0.08;

    // Smoothly interpolate camera Y — always centered on axis
    camera.position.x += (0 - camera.position.x) * lerpFactor;
    camera.position.y += (targetY - camera.position.y) * lerpFactor;
    camera.position.z += (0 - camera.position.z) * lerpFactor;

    controls.target.x += (0 - controls.target.x) * lerpFactor;
    controls.target.y += (targetY + 50 - controls.target.y) * lerpFactor;
    controls.target.z += (0 - controls.target.z) * lerpFactor;

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

        // Shorter duration for stepping between nodes, longer for first focus
        const prevNode = prevFocusRef.current;
        const isStepping = prevNode && sortedHelixNodes.length > 1;
        const duration = isStepping ? 0.8 : 1.5;
        const ease = isStepping ? 'power3.inOut' : 'power2.inOut';

        // Animate BOTH camera.position AND controls.target simultaneously
        const tl = gsap.timeline({
          onUpdate: () => controls.update(),
          onComplete: () => {
            isFlyingRef.current = false;
          },
        });
        tl.to(
          camera.position,
          { x: camTarget.x, y: camTarget.y, z: camTarget.z, duration, ease },
          0
        );
        tl.to(
          controls.target,
          { x: node.x, y: node.y, z: node.z, duration, ease },
          0
        );
        flyTimeline.current = tl;
      }
      prevFocusRef.current = focusedNodeId;
    } else {
      prevFocusRef.current = null;

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
