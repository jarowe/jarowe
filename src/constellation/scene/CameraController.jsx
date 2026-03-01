import { useRef, useEffect, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useConstellationStore } from '../store';

/**
 * Camera controller for constellation scene.
 *
 * Responsibilities:
 * - GSAP fly-to animation when focusedNodeId changes (KEY LINK to store)
 * - Fly-back to initial position on clearFocus
 * - Timeline-driven camera repositioning along helix
 * - Auto-orbit pause/resume with idle timer and speed ramp
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

  // ---- Auto-orbit pause/resume ----
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      if (isFlyingRef.current) return; // Don't interfere during fly-to
      controls.autoRotate = false;
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      if (rampInterval.current) clearInterval(rampInterval.current);
    };

    const handleEnd = () => {
      if (isFlyingRef.current) return; // Don't resume during fly-to
      // Only resume auto-rotate if no node is focused
      const { focusedNodeId } = useConstellationStore.getState();
      if (focusedNodeId) return;

      autoRotateTimer.current = setTimeout(() => {
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

    if (focusedNodeId) {
      // Find node position
      const node = positions.find((n) => n.id === focusedNodeId);
      if (!node) return;

      isFlyingRef.current = true;

      // Pause auto-rotate
      controls.autoRotate = false;
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      if (rampInterval.current) clearInterval(rampInterval.current);

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
    } else {
      // Fly back to initial position
      if (!initialCameraPos.current || !initialTarget.current) return;

      isFlyingRef.current = true;

      const tl = gsap.timeline({
        onUpdate: () => controls.update(),
        onComplete: () => {
          isFlyingRef.current = false;
          // Resume auto-rotate after flying back
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
    const { focusedNodeId: currentFocus } = useConstellationStore.getState();
    if (currentFocus) return;

    const mappedY =
      helixBounds.minY + timelinePosition * (helixBounds.maxY - helixBounds.minY);

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
      }
    }, 2000);
  }, [timelinePosition, camera, controlsRef, helixBounds]);

  return null;
}
