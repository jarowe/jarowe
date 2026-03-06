// Globe Glint — Prism character inside the globe renderer
// Singleton module following glintAutonomy.js pattern.
// State machine: HIDDEN → CRUISING → IDLE
import * as THREE from 'three';
import { createPrismGeometry, createGlassMaterial } from './prismGeometry';
import { GLOBE_DEFAULTS } from './globeDefaults';

const STATES = { HIDDEN: 0, CRUISING: 1, IDLE: 2 };

let instance = null;

function getEp(key, fallback) {
  // Check for live editor overrides first, then defaults
  if (instance && instance._editorParams) {
    return instance._editorParams[key] ?? GLOBE_DEFAULTS[key] ?? fallback;
  }
  return GLOBE_DEFAULTS[key] ?? fallback;
}

// ── Costume Builders ──

function buildBeret() {
  const group = new THREE.Group();
  // Flat disc base
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.06, 16),
    new THREE.MeshBasicMaterial({ color: 0x2d1b69, transparent: true, opacity: 0.9 })
  );
  group.add(brim);
  // Dome top
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x2d1b69, transparent: true, opacity: 0.9 })
  );
  dome.position.y = 0.03;
  group.add(dome);
  // Nub on top
  const nub = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x1a0f40 })
  );
  nub.position.y = 0.45;
  group.add(nub);
  return group;
}

function buildSunhat() {
  const group = new THREE.Group();
  // Wide brim
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.85, 0.05, 20),
    new THREE.MeshBasicMaterial({ color: 0xf5deb3, transparent: true, opacity: 0.9 })
  );
  group.add(brim);
  // Dome
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xf5deb3, transparent: true, opacity: 0.9 })
  );
  dome.position.y = 0.025;
  group.add(dome);
  // Ribbon band
  const ribbon = new THREE.Mesh(
    new THREE.TorusGeometry(0.41, 0.04, 6, 20),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
  );
  ribbon.rotation.x = Math.PI / 2;
  ribbon.position.y = 0.08;
  group.add(ribbon);
  return group;
}

function buildCowboy() {
  const group = new THREE.Group();
  // Torus brim
  const brim = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.12, 6, 20),
    new THREE.MeshBasicMaterial({ color: 0x8b4513, transparent: true, opacity: 0.9 })
  );
  brim.rotation.x = Math.PI / 2;
  group.add(brim);
  // Flat fill disc for brim center
  const brimFill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.58, 0.04, 16),
    new THREE.MeshBasicMaterial({ color: 0x8b4513, transparent: true, opacity: 0.9 })
  );
  group.add(brimFill);
  // Tapered crown
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8),
    new THREE.MeshBasicMaterial({ color: 0xa0522d, transparent: true, opacity: 0.9 })
  );
  crown.position.y = 0.27;
  group.add(crown);
  return group;
}

const COSTUME_BUILDERS = {
  europe: buildBeret,
  caribbean: buildSunhat,
  us: buildCowboy,
};

// ── SLERP Helpers ──

function latLngToVec3(latRad, lngRad) {
  return new THREE.Vector3(
    Math.cos(latRad) * Math.cos(lngRad),
    Math.sin(latRad),
    Math.cos(latRad) * Math.sin(lngRad)
  );
}

function slerp(v0, v1, t) {
  const dot = Math.max(-1, Math.min(1, v0.dot(v1)));
  const omega = Math.acos(dot);
  if (omega < 0.001) {
    // Nearly identical — just lerp
    return v0.clone().lerp(v1, t).normalize();
  }
  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - t) * omega) / sinOmega;
  const b = Math.sin(t * omega) / sinOmega;
  return new THREE.Vector3(
    v0.x * a + v1.x * b,
    v0.y * a + v1.y * b,
    v0.z * a + v1.z * b
  ).normalize();
}

function smoothstepEase(t) {
  // Cubic ease-in-out
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothBell(t) {
  return 4 * t * (1 - t);
}

// ── Main Module ──

export function createGlobeGlint(config) {
  if (instance) destroyGlobeGlint();

  const { satellitesGroup, pointOfView, pauseCycle, resumeCycle, getActiveExpedition, editorParams } = config;
  const shape = (window.__prismConfig || {}).shape || 'rounded-prism';
  const geo = createPrismGeometry(shape);

  // Inner mesh (BackSide)
  const innerMat = createGlassMaterial({ side: THREE.BackSide, isSide: 1 });
  const innerMesh = new THREE.Mesh(geo, innerMat);
  innerMesh.scale.setScalar(0.82);

  // Outer mesh (FrontSide)
  const outerMat = createGlassMaterial({ side: THREE.FrontSide, isSide: 0 });
  const outerMesh = new THREE.Mesh(geo, outerMat);
  outerMesh.scale.setScalar(0.99);

  // Edge wireframe glow
  const edgeGeo = new THREE.EdgesGeometry(geo, 15);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x7c3aed,
    transparent: true,
    opacity: 0.6,
  });
  const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);

  // Costume slot (above apex)
  const costumeSlot = new THREE.Group();
  costumeSlot.position.y = 0.9;

  // Main group
  const group = new THREE.Group();
  group.add(innerMesh);
  group.add(outerMesh);
  group.add(edgeLines);
  group.add(costumeSlot);

  const targetScale = getEp('globeGlintScale', 2.5);
  group.scale.setScalar(0); // start at 0 for grow-in
  group.visible = false;
  group.userData = { type: 'globe-glint', r: getEp('globeGlintSurfaceAlt', 102), lat: 0, lng: 0 };

  satellitesGroup.add(group);

  instance = {
    group,
    innerMesh,
    outerMesh,
    edgeLines,
    costumeSlot,
    innerMat,
    outerMat,
    edgeMat,
    geo,
    edgeGeo,
    state: STATES.HIDDEN,
    // Flight state
    flightProgress: 0,
    flightDuration: 4000,
    startVec: null,
    endVec: null,
    startAlt: 102,
    endAlt: 102,
    destination: null,
    currentRegion: null,
    // Spawn animation
    spawnProgress: 1, // 1 = fully grown
    targetScale,
    // Camera tracking
    cameraTrackFrame: 0,
    // Idle state
    idlePhase: Math.random() * Math.PI * 2,
    idleBaseLat: 0,
    idleBaseLng: 0,
    // Config callbacks
    satellitesGroup,
    pointOfView,
    pauseCycle,
    resumeCycle,
    getActiveExpedition,
    _editorParams: editorParams,
  };

  return instance;
}

export function flyToLocation(expedition, opts = {}) {
  if (!instance) return;
  const ep = (instance && instance._editorParams) || GLOBE_DEFAULTS;
  if (!(ep.globeGlintEnabled ?? true)) return;

  const g = instance;
  const surfaceAlt = getEp('globeGlintSurfaceAlt', 102);
  const cruiseAlt = getEp('globeGlintCruiseAlt', 112);

  // Determine start position
  let startLat, startLng;
  if (g.state === STATES.HIDDEN) {
    // Spawn at current active expedition position
    const active = g.getActiveExpedition ? g.getActiveExpedition() : 0;
    const expeditions = window.__globeExpeditions || [];
    const startExp = expeditions[active] || { lat: 0, lng: 0 };
    startLat = startExp.lat * Math.PI / 180;
    startLng = startExp.lng * Math.PI / 180;
    // Start grow-in animation
    g.spawnProgress = 0;
    g.group.scale.setScalar(0);
  } else {
    startLat = g.group.userData.lat;
    startLng = g.group.userData.lng;
  }

  const endLat = expedition.lat * Math.PI / 180;
  const endLng = expedition.lng * Math.PI / 180;

  g.startVec = latLngToVec3(startLat, startLng);
  g.endVec = latLngToVec3(endLat, endLng);
  g.startAlt = surfaceAlt;
  g.endAlt = surfaceAlt;
  g.flightProgress = 0;
  g.flightDuration = opts.duration || getEp('globeGlintFlightDuration', 4000);
  g.destination = expedition;
  g.state = STATES.CRUISING;
  g.cameraTrackFrame = 0;
  g.group.visible = true;

  // Set excited expression during flight
  window.__prismExpression = 'excited';

  // Pause auto-cycle
  if (g.pauseCycle) g.pauseCycle();

  // Swap costume
  if (expedition.region && (getEp('globeGlintCostumesEnabled', true))) {
    swapCostume(expedition.region);
  }

  window.dispatchEvent(new CustomEvent('globe-glint-flight-start', {
    detail: { destination: expedition }
  }));
}

export function showGlobeGlint(expedition) {
  if (!instance) return;
  const g = instance;
  const surfaceAlt = getEp('globeGlintSurfaceAlt', 102);

  const lat = expedition.lat * Math.PI / 180;
  const lng = expedition.lng * Math.PI / 180;

  g.group.userData.lat = lat;
  g.group.userData.lng = lng;
  g.group.userData.r = surfaceAlt;
  g.state = STATES.IDLE;
  g.idleBaseLat = lat;
  g.idleBaseLng = lng;
  g.destination = expedition;
  g.spawnProgress = 0;
  g.group.scale.setScalar(0);
  g.group.visible = true;

  if (expedition.region && (getEp('globeGlintCostumesEnabled', true))) {
    swapCostume(expedition.region);
  }

  updatePosition(g);
}

export function hideGlobeGlint() {
  if (!instance) return;
  instance.group.visible = false;
  instance.state = STATES.HIDDEN;
  if (instance.resumeCycle) instance.resumeCycle();
}

function swapCostume(region) {
  if (!instance) return;
  const slot = instance.costumeSlot;

  // Dispose old
  while (slot.children.length > 0) {
    const child = slot.children[0];
    slot.remove(child);
    child.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  instance.currentRegion = region;
  const builder = COSTUME_BUILDERS[region];
  if (builder) {
    slot.add(builder());
  }
}

function updatePosition(g) {
  const ud = g.group.userData;
  const phi = Math.PI / 2 - ud.lat;
  const theta = ud.lng;
  const r = ud.r;
  g.group.position.x = r * Math.sin(phi) * Math.cos(theta);
  g.group.position.y = r * Math.cos(phi);
  g.group.position.z = r * Math.sin(phi) * Math.sin(theta);

  // Face outward from globe center
  g.group.lookAt(0, 0, 0);
  g.group.rotateY(Math.PI);
}

export function tickGlobeGlint(dt, elapsedTime) {
  if (!instance) return;
  const g = instance;
  const ep = (instance && instance._editorParams) || GLOBE_DEFAULTS;
  if (!(ep.globeGlintEnabled ?? true)) {
    if (g.group.visible) g.group.visible = false;
    return;
  }

  // Update shader uTime
  g.innerMat.uniforms.uTime.value = elapsedTime;
  g.outerMat.uniforms.uTime.value = elapsedTime;

  // Self-rotation on inner/outer meshes
  const spinSpeed = getEp('globeGlintSpinSpeed', 0.3);
  g.innerMesh.rotation.y += dt * spinSpeed;
  g.outerMesh.rotation.y += dt * spinSpeed * 0.7;

  // Spawn grow-in animation
  if (g.spawnProgress < 1) {
    g.spawnProgress = Math.min(1, g.spawnProgress + dt / 0.3);
    const ease = smoothstepEase(g.spawnProgress);
    g.group.scale.setScalar(g.targetScale * ease);
  }

  if (g.state === STATES.CRUISING) {
    // Advance flight progress
    g.flightProgress += (dt * 1000) / g.flightDuration;
    if (g.flightProgress >= 1.0) {
      g.flightProgress = 1.0;
    }

    const easedT = smoothstepEase(g.flightProgress);

    // SLERP position on unit sphere
    const pos = slerp(g.startVec, g.endVec, easedT);

    // Altitude curve: parabolic arc peaking at midpoint
    const surfaceAlt = getEp('globeGlintSurfaceAlt', 102);
    const cruiseAlt = getEp('globeGlintCruiseAlt', 112);
    const alt = surfaceAlt + (cruiseAlt - surfaceAlt) * smoothBell(easedT);

    // Convert back to lat/lng
    const lat = Math.asin(Math.max(-1, Math.min(1, pos.y)));
    const lng = Math.atan2(pos.z, pos.x);

    g.group.userData.lat = lat;
    g.group.userData.lng = lng;
    g.group.userData.r = alt;

    updatePosition(g);

    // Camera tracking (~every 10 frames / ~300ms cadence)
    g.cameraTrackFrame++;
    if (g.cameraTrackFrame % 10 === 0 && g.pointOfView) {
      g.pointOfView({
        lat: lat * 180 / Math.PI,
        lng: lng * 180 / Math.PI,
        altitude: 2.5,
      }, 600);
    }

    // Check arrival
    if (g.flightProgress >= 1.0) {
      g.state = STATES.IDLE;
      g.idleBaseLat = lat;
      g.idleBaseLng = lng;
      g.idlePhase = elapsedTime;
      // Set happy expression on arrival
      window.__prismExpression = 'happy';
      window.dispatchEvent(new CustomEvent('globe-glint-arrived', {
        detail: {
          destination: g.destination,
          region: g.destination?.region || null,
          name: g.destination?.name || null,
        }
      }));
    }
  } else if (g.state === STATES.IDLE) {
    // Gentle orbit around destination
    const orbitSpeed = getEp('globeGlintIdleOrbitSpeed', 0.5);
    const bobAmp = getEp('globeGlintIdleBobAmp', 0.5);
    const phase = (elapsedTime - g.idlePhase) * orbitSpeed;
    const surfaceAlt = getEp('globeGlintSurfaceAlt', 102);

    g.group.userData.lat = g.idleBaseLat + Math.sin(phase) * 0.02;
    g.group.userData.lng = g.idleBaseLng + Math.cos(phase * 0.7) * 0.02;
    g.group.userData.r = surfaceAlt + Math.sin(phase * 1.3) * bobAmp;

    updatePosition(g);
  }
}

export function destroyGlobeGlint() {
  if (!instance) return;
  const g = instance;

  // Remove from parent
  if (g.group.parent) g.group.parent.remove(g.group);

  // Dispose costume
  g.costumeSlot.traverse(c => {
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  });

  // Dispose materials/geometries
  g.innerMat.dispose();
  g.outerMat.dispose();
  g.edgeMat.dispose();
  g.geo.dispose();
  g.edgeGeo.dispose();

  instance = null;
}

export function getGlobeGlint() {
  return instance;
}
