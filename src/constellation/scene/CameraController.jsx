import { useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { useConstellationStore } from '../store';
import { getCfg } from '../constellationDefaults';

const TUNNEL_FOV = 100;
const HELIX_FOV = 60;

function clearCameraOffset(camera) {
  camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

function applyCameraOffset(camera, viewportWidth, viewportHeight, offsetX, offsetY) {
  const x = Math.round(offsetX);
  const y = Math.round(offsetY);

  if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) {
    camera.setViewOffset(viewportWidth, viewportHeight, x, y, viewportWidth, viewportHeight);
  } else {
    camera.clearViewOffset();
  }

  camera.updateProjectionMatrix();
}

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
export default function CameraController({
  controlsRef,
  positions,
  helixBounds,
  introEnabled = false,
  introRef = null,
}) {
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

  // Helix timeline scroll velocity for smooth momentum
  const helixScrollVelocity = useRef(0);

  // Animated view offset proxy for panel shift
  const viewOffsetProxy = useRef({ x: 0, y: 0 });

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

  // Helper: start auto-rotate ramp — exponential ease-in for smooth feel
  function startAutoRotateRamp(controls) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0;
    if (rampInterval.current) clearInterval(rampInterval.current);
    rampInterval.current = setInterval(() => {
      const target = getCfg('autoRotateSpeed');
      const diff = target - controls.autoRotateSpeed;
      if (diff > 0.001) {
        controls.autoRotateSpeed += diff * 0.04;
      } else {
        controls.autoRotateSpeed = target;
        clearInterval(rampInterval.current);
      }
    }, 16);
  }

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !introEnabled || !initialCameraPos.current || !initialTarget.current) {
      return undefined;
    }

    if (flyTimeline.current) {
      flyTimeline.current.kill();
      flyTimeline.current = null;
    }

    isFlyingRef.current = true;
    controls.enabled = false;
    controls.autoRotate = false;
    if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
    if (rampInterval.current) clearInterval(rampInterval.current);

    viewOffsetProxy.current.x = 0;
    viewOffsetProxy.current.y = 0;
    clearCameraOffset(camera);

    const startCamera = {
      x: initialCameraPos.current.x * 0.2,
      y: initialCameraPos.current.y + 26,
      z: Math.max(initialCameraPos.current.z + 240, 320),
    };
    const startTarget = {
      x: initialTarget.current.x,
      y: initialTarget.current.y + 12,
      z: initialTarget.current.z,
    };

    camera.position.set(startCamera.x, startCamera.y, startCamera.z);
    controls.target.set(startTarget.x, startTarget.y, startTarget.z);
    camera.fov = 48;
    camera.updateProjectionMatrix();
    controls.update();

    const tl = gsap.timeline({
      onUpdate: () => controls.update(),
      onComplete: () => {
        isFlyingRef.current = false;
        controls.enabled = true;
        startAutoRotateRamp(controls);
      },
    });

    tl.to(
      camera.position,
      {
        x: initialCameraPos.current.x,
        y: initialCameraPos.current.y,
        z: initialCameraPos.current.z,
        duration: 3.2,
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
        duration: 3.2,
        ease: 'power2.inOut',
      },
      0
    );
    tl.to(
      camera,
      {
        fov: HELIX_FOV,
        duration: 2.8,
        ease: 'power2.out',
        onUpdate: () => camera.updateProjectionMatrix(),
      },
      0
    );

    flyTimeline.current = tl;

    return () => {
      tl.kill();
      controls.enabled = true;
    };
  }, [camera, controlsRef, introEnabled]);

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
      if (cameraMode === 'tunnel') return;

      if (focusedNodeId) {
        // Resume gentle cinematic orbit after user interaction while focused
        autoRotateTimer.current = setTimeout(() => {
          controls.autoRotate = true;
          controls.autoRotateSpeed = getCfg('focusedRotateSpeed');
        }, 2000);
      } else {
        autoRotateTimer.current = setTimeout(() => {
          startAutoRotateRamp(controls);
        }, 5000);
      }
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
  const setTunnelY = useConstellationStore((s) => s.setTunnelY);
  const prevCameraMode = useRef('helix');

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !helixBounds) return;
    if (introRef?.current?.active) return;

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
          // Disable ALL OrbitControls in tunnel — we handle everything manually
          controls.enabled = false;
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
      tunnelVelocity.current = 0;
      // Re-enable OrbitControls with default settings
      controls.enabled = true;
      controls.enableRotate = true;
      controls.enablePan = false;
      controls.enableZoom = true;
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
  // Only helix-tier nodes participate in scroll navigation;
  // particles are focusable via deep-link/click but not scrollable
  const sortedHelixNodes = useMemo(() => {
    if (!positions || positions.length === 0) return [];
    return positions.filter((n) => n.tier !== 'particle').sort((a, b) => a.y - b.y);
  }, [positions]);

  // Debounce ref for scroll-to-next (prevent rapid-fire scrolling)
  const scrollCooldownRef = useRef(false);

  // ---- Scroll navigation: next/prev node when focused, tunnel scroll otherwise ----
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleWheel = (e) => {
      if (introRef?.current?.active) {
        e.preventDefault();
        return;
      }

      const state = useConstellationStore.getState();

      // Tunnel mode: smooth gentle scroll along Y axis
      if (state.cameraMode === 'tunnel') {
        e.preventDefault();
        // Negate: scroll-down (deltaY>0) = move down (lower Y = older)
        const impulse = -e.deltaY * 0.005;
        tunnelVelocity.current += impulse;
        // Clamp max velocity to prevent overshooting
        tunnelVelocity.current = Math.max(-1.8, Math.min(1.8, tunnelVelocity.current));
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

      // No focus in helix mode: behavior depends on cursor position.
      // Center zone (near helix) = scrub timeline. Edge zone = zoom.
      const rect = controls.domElement.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width;  // 0-1 normalized
      const cy = (e.clientY - rect.top) / rect.height;
      const distFromCenter = Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2);
      const isCenter = distFromCenter < 0.35;

      if (isCenter) {
        // Center zone: scrub timeline (scroll down = forward in time = higher Y)
        e.preventDefault();
        const impulse = (e.deltaY > 0 ? -1 : 1) * 0.008;
        helixScrollVelocity.current += impulse;
        helixScrollVelocity.current = Math.max(-0.06, Math.min(0.06, helixScrollVelocity.current));
      }
      // Edge zone: let OrbitControls handle zoom (don't preventDefault)
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
      if (introRef?.current?.active) return;

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
    if (mode !== 'tunnel' || isFlyingRef.current || introRef?.current?.active) return;

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

    // Sync timeline scrubber with tunnel scroll position
    if (helixBounds) {
      const range = helixBounds.maxY - helixBounds.minY;
      if (range > 0) {
        const normalized = (targetY - helixBounds.minY) / range;
        useConstellationStore.getState().setTimelinePosition(
          Math.max(0, Math.min(1, normalized))
        );
      }
    }
  });

  // ---- Smooth helix scroll momentum ----
  useFrame(() => {
    const { cameraMode: mode, focusedNodeId: focused } = useConstellationStore.getState();
    if (mode === 'tunnel' || focused || isFlyingRef.current || introRef?.current?.active) {
      helixScrollVelocity.current = 0;
      return;
    }

    if (Math.abs(helixScrollVelocity.current) > 0.0002) {
      const state = useConstellationStore.getState();
      const current = state.timelinePosition ?? 0.5;
      const next = Math.max(0, Math.min(1, current + helixScrollVelocity.current));
      state.setTimelinePosition(next);
      helixScrollVelocity.current *= 0.93;
    } else {
      helixScrollVelocity.current = 0;
    }
  });

  // ---- Fly-to on focusedNodeId change ----
  const focusedNodeId = useConstellationStore((s) => s.focusedNodeId);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (introRef?.current?.active) return;

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

      // Disable zoom so scroll always navigates nodes, never zooms
      controls.enableZoom = false;

      // Pause auto-rotate during fly-to; will resume at gentle speed on complete
      controls.autoRotate = false;
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      if (rampInterval.current) clearInterval(rampInterval.current);

      // Camera positioning differs by mode:
      // Tunnel: stay on axis, slide to node's Y, look outward at node
      // Helix: fly to an offset position near the node
      let camTarget;
      if (mode === 'tunnel') {
        camTarget = { x: 0, y: node.y, z: 0 };
      } else {
        const dist = getCfg('focusDistance');
        const yLift = getCfg('focusYLift');
        camTarget = { x: node.x + dist, y: node.y + yLift, z: node.z + dist };
      }

      // Shorter duration for stepping between nodes, longer for first focus
      const prevNode = prevFocusRef.current;
      const isStepping = prevNode && sortedHelixNodes.length > 1;
      const duration = isStepping ? getCfg('flyToStepDuration') : getCfg('flyToDuration');
      const ease = isStepping ? 'power3.inOut' : 'power2.inOut';

      // In tunnel mode: stay on the axis, slide to node Y, keep wide FOV.
      // controls.enabled stays false so user can't drag off-axis, but we
      // still call controls.update() each frame so the camera smoothly
      // re-orients toward the target during the tween.
      if (mode === 'tunnel') {
        const tl = gsap.timeline({
          onUpdate: () => controls.update(),
          onComplete: () => {
            isFlyingRef.current = false;
            // Restore forward-looking target after panel closes
          },
        });
        tl.to(
          camera.position,
          { x: 0, y: node.y, z: 0, duration, ease },
          0
        );
        tl.to(
          controls.target,
          { x: node.x, y: node.y, z: node.z, duration, ease },
          0
        );
        flyTimeline.current = tl;
        prevFocusRef.current = focusedNodeId;
        useConstellationStore.getState().setTunnelY(node.y);
        return;
      }

      // ---- Shift frustum center so helix appears in the left viewport area ----
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobileView = vw <= 768;
      const panelEl = document.querySelector('.story-panel');
      const panelRect = panelEl?.getBoundingClientRect();
      const targetOffsetX = isMobileView
        ? 0
        : Math.min(
            (panelRect?.width ?? Math.min(720, Math.max(380, vw * 0.48))) * 0.66,
            Math.max(120, (vw - (panelRect?.width ?? 0)) * 0.58)
          );
      const targetOffsetY = isMobileView
        ? Math.min((panelRect?.height ?? vh * 0.75) * 0.24, vh * 0.18)
        : 0;

      gsap.to(viewOffsetProxy.current, {
        x: targetOffsetX,
        y: targetOffsetY,
        duration: duration * 0.8,
        ease,
        onUpdate: () => {
          applyCameraOffset(
            camera,
            vw,
            vh,
            viewOffsetProxy.current.x,
            viewOffsetProxy.current.y
          );
        },
      });

      // In tunnel mode: contract FOV back to normal for the pulled-back view
      if (mode === 'tunnel') {
        gsap.to(camera, {
          fov: HELIX_FOV,
          duration: duration * 0.6,
          ease: 'power2.out',
          onUpdate: () => camera.updateProjectionMatrix(),
        });
      }

      // Animate BOTH camera.position AND controls.target simultaneously
      const tl = gsap.timeline({
        onUpdate: () => controls.update(),
        onComplete: () => {
          isFlyingRef.current = false;
          // Gentle cinematic orbit around focused node
          controls.autoRotate = true;
          controls.autoRotateSpeed = getCfg('focusedRotateSpeed');
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
      prevFocusRef.current = focusedNodeId;
    } else {
      prevFocusRef.current = null;

      // Re-enable zoom
      controls.enableZoom = true;

      // Animate view offset back to center
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (Math.abs(viewOffsetProxy.current.x) > 0.5 || Math.abs(viewOffsetProxy.current.y) > 0.5) {
        gsap.to(viewOffsetProxy.current, {
          x: 0,
          y: 0,
          duration: 0.8,
          ease: 'power2.inOut',
          onUpdate: () => {
            applyCameraOffset(
              camera,
              vw,
              vh,
              viewOffsetProxy.current.x,
              viewOffsetProxy.current.y
            );
          },
          onComplete: () => {
            clearCameraOffset(camera);
          },
        });
      }

      if (mode === 'tunnel') {
        // Fly back into the tunnel axis, restore wide FOV, disable controls
        isFlyingRef.current = true;
        const currentY = useConstellationStore.getState().tunnelY;

        const tl = gsap.timeline({
          onUpdate: () => controls.update(),
          onComplete: () => {
            isFlyingRef.current = false;
            controls.enabled = false;
            controls.autoRotate = false;
          },
        });

        // Fly camera back to axis center
        tl.to(
          camera.position,
          { x: 0, y: currentY, z: 0, duration: 1, ease: 'power2.inOut' },
          0
        );
        // Look forward along axis
        tl.to(
          controls.target,
          { x: 0, y: currentY + 50, z: 0, duration: 1, ease: 'power2.inOut' },
          0
        );
        // Restore wide FOV
        tl.to(camera, {
          fov: TUNNEL_FOV, duration: 0.5, ease: 'power2.out',
          onUpdate: () => camera.updateProjectionMatrix(),
        }, 0.3);

        flyTimeline.current = tl;
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
  // Uses smooth lerp for scroll-driven changes, GSAP for click-driven scrubber.
  // Only activates when timelinePosition actually changes (not every frame).
  const timelinePosition = useConstellationStore((s) => s.timelinePosition);
  const prevTimelineRef = useRef(0);

  useEffect(() => {
    if (Math.abs(timelinePosition - prevTimelineRef.current) < 0.001) return;
    prevTimelineRef.current = timelinePosition;

    const controls = controlsRef.current;
    if (!controls || !helixBounds) return;
    if (introRef?.current?.active || isFlyingRef.current) return;

    const { focusedNodeId: currentFocus, cameraMode: mode } = useConstellationStore.getState();
    if (currentFocus) return;

    // Allow 15% overshoot beyond helix bounds so edges don't feel clamped
    const range = helixBounds.maxY - helixBounds.minY;
    const padding = range * 0.15;
    const mappedY =
      (helixBounds.minY - padding) + timelinePosition * (range + padding * 2);

    if (mode === 'tunnel') {
      // Tunnel camera is driven by its own useFrame via tunnelVelocity.
      // Don't interfere — the tunnel useFrame already syncs timelinePosition.
      return;
    }

    // Pause auto-rotate during scrub
    controls.autoRotate = false;
    if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);

    // Zoom in closer when actively scrubbing (70% of landing distance)
    const scrubZ = (initialCameraPos.current?.z ?? 110) * 0.7;

    gsap.to(camera.position, {
      y: mappedY,
      z: scrubZ,
      duration: 0.5,
      ease: 'power2.out',
      overwrite: true,
      onUpdate: () => controls.update(),
    });
    gsap.to(controls.target, {
      y: mappedY,
      duration: 0.5,
      ease: 'power2.out',
      overwrite: true,
    });

    // Resume auto-rotate after scrub settles
    autoRotateTimer.current = setTimeout(() => {
      const { focusedNodeId: f } = useConstellationStore.getState();
      if (!f) startAutoRotateRamp(controls);
    }, 2000);
  }, [timelinePosition, camera, controlsRef, helixBounds, introRef]);

  return null;
}
