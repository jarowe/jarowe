/**
 * FlightCamera — Scroll-driven flight camera along a CatmullRom spline
 *
 * Replaces CinematicCamera for particle-memory scenes with flightPath config.
 * Scroll/trackpad/touch input drives a spring-smoothed progress (0→1) that
 * interpolates the camera along a 3D spline through the particle field.
 *
 * Layers of motion:
 *   1. Spline progress (scroll-driven, spring-smoothed)
 *   2. Mouse/gyro parallax (15-30ms response)
 *   3. Sine-wave micro-drift (8-20s period, when idle)
 *
 * Decisions: 15-CONTEXT D-01 through D-12
 * Requirements: FLIGHT-01, FLIGHT-02, FLIGHT-03, FLIGHT-04
 */

import { forwardRef, useRef, useEffect, useImperativeHandle, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Spring / physics constants
// ---------------------------------------------------------------------------
const SCROLL_SENSITIVITY = 0.0008;   // wheel delta → velocity multiplier
const TOUCH_SENSITIVITY = 0.003;     // touch Y-delta → velocity multiplier
const VELOCITY_DECAY = 0.95;         // exponential decay per frame (D-02)
const VELOCITY_EPSILON = 0.00005;    // below this, velocity is zero
const MAX_VELOCITY = 0.04;           // velocity clamp

// Micro-drift (D-11)
const DRIFT_AMPLITUDE = 0.003;       // tiny position offset
const DRIFT_PERIOD = 12;             // seconds for one full sine cycle
const DRIFT_ACTIVATION_DELAY = 2.0;  // seconds of near-zero velocity before drift kicks in

// Parallax (D-08)
const PARALLAX_STRENGTH = 0.04;
const PARALLAX_LERP = 0.08;          // ~15-30ms at 60fps

// FOV (D-06)
const FOV_EASE_POWER = 2.0;          // smoothstep-like easing for FOV

const FlightCamera = forwardRef(function FlightCamera({ flightPath, onProgress }, ref) {
  const { camera, gl } = useThree();

  // Refs for mutable state (no re-renders)
  const progress = useRef(0);
  const velocity = useRef(0);
  const idleTime = useRef(0);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });
  const touchStartY = useRef(null);
  const domElement = useRef(null);

  // Build CatmullRom splines from flightPath keypoints
  const positionSpline = useMemo(() => {
    if (!flightPath?.keypoints?.length) return null;
    const points = flightPath.keypoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }, [flightPath]);

  const lookAtSpline = useMemo(() => {
    if (!flightPath?.lookAtKeypoints?.length) return null;
    const points = flightPath.lookAtKeypoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }, [flightPath]);

  // FOV range
  const fovStart = flightPath?.fovRange?.[0] ?? 50;
  const fovMin = flightPath?.fovRange?.[1] ?? 40;

  // Expose progress via ref (for narrative cards, soundscape)
  useImperativeHandle(ref, () => ({
    getProgress: () => progress.current,
    progress,
  }));

  // -------------------------------------------------------------------------
  // Input handlers
  // -------------------------------------------------------------------------
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Wheel down (positive deltaY) = forward = deeper into memory (D-03)
    const delta = e.deltaY * SCROLL_SENSITIVITY;
    velocity.current = THREE.MathUtils.clamp(
      velocity.current + delta,
      -MAX_VELOCITY,
      MAX_VELOCITY,
    );
    idleTime.current = 0;
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (e.pointerType === 'touch') {
      touchStartY.current = e.clientY;
    }
  }, []);

  const handlePointerMove = useCallback((e) => {
    // Mouse parallax (all pointer types)
    mouseTarget.current.x = (e.clientX / window.innerWidth - 0.5) * PARALLAX_STRENGTH;
    mouseTarget.current.y = (e.clientY / window.innerHeight - 0.5) * PARALLAX_STRENGTH;

    // Touch scroll (D-04)
    if (e.pointerType === 'touch' && touchStartY.current !== null) {
      const deltaY = e.clientY - touchStartY.current;
      touchStartY.current = e.clientY;
      velocity.current = THREE.MathUtils.clamp(
        velocity.current - deltaY * TOUCH_SENSITIVITY,
        -MAX_VELOCITY,
        MAX_VELOCITY,
      );
      idleTime.current = 0;
    }
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (e.pointerType === 'touch') {
      touchStartY.current = null;
    }
  }, []);

  // Gyro for mobile parallax
  const handleGyro = useCallback((e) => {
    if (e.gamma != null && e.beta != null) {
      mouseTarget.current.x = (e.gamma / 90) * PARALLAX_STRENGTH;
      mouseTarget.current.y = ((e.beta - 45) / 90) * PARALLAX_STRENGTH;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Event listener setup
  // -------------------------------------------------------------------------
  useEffect(() => {
    const dom = gl.domElement;
    domElement.current = dom;

    // Wheel — must be passive:false to preventDefault
    dom.addEventListener('wheel', handleWheel, { passive: false });
    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerup', handlePointerUp);
    dom.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('deviceorientation', handleGyro);

    return () => {
      dom.removeEventListener('wheel', handleWheel);
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerup', handlePointerUp);
      dom.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('deviceorientation', handleGyro);
    };
  }, [gl, handleWheel, handlePointerDown, handlePointerMove, handlePointerUp, handleGyro]);

  // Initialize camera position from spline start
  useEffect(() => {
    if (!positionSpline || !lookAtSpline) return;
    const startPos = positionSpline.getPointAt(0);
    const startLookAt = lookAtSpline.getPointAt(0);
    camera.position.copy(startPos);
    camera.lookAt(startLookAt);
    camera.fov = fovStart;
    camera.updateProjectionMatrix();
  }, [positionSpline, lookAtSpline, camera, fovStart]);

  // -------------------------------------------------------------------------
  // Per-frame update
  // -------------------------------------------------------------------------
  useFrame((_, delta) => {
    if (!positionSpline || !lookAtSpline) return;

    const dt = Math.min(delta, 0.05); // cap large frame spikes

    // --- 1. Apply velocity to progress ---
    progress.current = THREE.MathUtils.clamp(
      progress.current + velocity.current,
      0,
      1,
    );

    // Exponential decay (D-02)
    velocity.current *= VELOCITY_DECAY;
    if (Math.abs(velocity.current) < VELOCITY_EPSILON) {
      velocity.current = 0;
    }

    // Clamp at boundaries — kill velocity when hitting 0 or 1
    if (progress.current <= 0 && velocity.current < 0) velocity.current = 0;
    if (progress.current >= 1 && velocity.current > 0) velocity.current = 0;

    // --- 2. Track idle time for micro-drift ---
    if (Math.abs(velocity.current) < VELOCITY_EPSILON * 10) {
      idleTime.current += dt;
    } else {
      idleTime.current = 0;
    }

    // --- 3. Compute spline position and look-at ---
    const t = progress.current;
    const splinePos = positionSpline.getPointAt(t);
    const splineLookAt = lookAtSpline.getPointAt(t);

    // --- 4. Micro-drift when idle (D-11) ---
    let driftX = 0, driftY = 0;
    if (idleTime.current > DRIFT_ACTIVATION_DELAY) {
      const driftFade = Math.min((idleTime.current - DRIFT_ACTIVATION_DELAY) / 1.5, 1);
      const now = performance.now() / 1000;
      driftX = Math.sin(now * (2 * Math.PI / DRIFT_PERIOD)) * DRIFT_AMPLITUDE * driftFade;
      driftY = Math.cos(now * (2 * Math.PI / (DRIFT_PERIOD * 0.7))) * DRIFT_AMPLITUDE * 0.6 * driftFade;
    }

    // --- 5. Mouse parallax with lerp (D-08) ---
    mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * PARALLAX_LERP;
    mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * PARALLAX_LERP;

    // --- 6. Compose final camera position ---
    camera.position.set(
      splinePos.x + mouseCurrent.current.x + driftX,
      splinePos.y - mouseCurrent.current.y + driftY,
      splinePos.z,
    );

    // --- 7. Look-at with reduced parallax ---
    const lookAtTarget = new THREE.Vector3(
      splineLookAt.x + mouseCurrent.current.x * 0.3,
      splineLookAt.y - mouseCurrent.current.y * 0.3,
      splineLookAt.z,
    );
    camera.lookAt(lookAtTarget);

    // --- 8. FOV narrowing (D-06) ---
    // Bell curve: narrows at midpoint (t=0.5), widens at ends
    const fovT = 1 - Math.pow(2 * Math.abs(t - 0.5), FOV_EASE_POWER);
    const fov = fovStart - (fovStart - fovMin) * fovT;
    if (Math.abs(camera.fov - fov) > 0.1) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // --- 9. Notify progress consumers ---
    if (onProgress) {
      onProgress(progress.current);
    }
  });

  return null;
});

export default FlightCamera;
