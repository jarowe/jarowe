import { motion } from 'framer-motion';
import { Sparkles, Globe2, BookOpen, ArrowRight, ChevronLeft, ChevronRight, Instagram, Github, Linkedin, Quote } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { photos } from '../data/photos';
import MusicCell from '../components/MusicCell';
import confetti from 'canvas-confetti';
// GSAP removed entirely from Home - using pure CSS animations to prevent black screen bugs
import { playHoverSound, playClickSound, playBopSound } from '../utils/sounds';
import DailyCipher from '../components/DailyCipher';
import SpeedPuzzle from '../components/SpeedPuzzle';
import PortalVFX from '../components/PortalVFX';
import './Home.css';
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLOBE_DEFAULTS } from '../utils/globeDefaults';
const Globe = lazy(() => import('react-globe.gl'));
const GlobeEditor = lazy(() => import('../components/GlobeEditor'));
const Prism3D = lazy(() => import('../components/Prism3D'));

// Real-time sun position based on UTC time (solar declination + hour angle)
// Uses three-globe's coordinate system: theta = (90 - lng), so lng=0 → +Z
// overrideHour: -1 = real time, 0-24 = manual UTC hour
function getSunDirection(overrideHour) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const declination = -23.4397 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const utcHours = (overrideHour >= 0)
    ? overrideHour
    : now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const solarLongitude = -((utcHours - 12) * 15);
  const latRad = declination * (Math.PI / 180);
  const lngRad = solarLongitude * (Math.PI / 180);
  // Must match three-globe polar2Cartesian: x=cos(lat)*sin(lng), y=sin(lat), z=cos(lat)*cos(lng)
  return new THREE.Vector3(
    Math.cos(latRad) * Math.sin(lngRad),
    Math.sin(latRad),
    Math.cos(latRad) * Math.cos(lngRad)
  ).normalize();
}

const quotes = [
  { text: "Build what shouldn't exist yet.", author: "Me, probably at 2am" },
  { text: "The best interface is no interface.", author: "Golden Krishna" },
  { text: "We don't stop playing because we grow old. We grow old because we stop playing.", author: "George Bernard Shaw" },
  { text: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke" },
  { text: "The future is already here. It's just not evenly distributed.", author: "William Gibson" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
];

const currentlyMessages = [
  "Currently fueled by espresso and synthwave",
  "The boys are probably breaking something right now",
  "Somewhere between genius and sleep deprivation",
  "If you're reading this, say hi on X",
  "Building the future one commit at a time",
  "Maria says I need to sleep more. She's right.",
  "Jace asked me to explain quantum computing today",
  "Three boys. Zero chill. Maximum adventure.",
];

const worldschoolMessages = [
  { from: 'Maria', text: "Found a gluten-free bakery in Athens!! The boys lost it" },
  { from: 'Jace', text: "Dad, glaciers move like 1 inch per day. I measured." },
  { from: 'Jax', text: "I negotiated in Greek today. Got 2 euros off." },
  { from: 'Dad', text: "Today's lesson: live volcano. No textbook needed." },
  { from: 'Jole', text: "Can gelato count as lunch? It's educational." },
  { from: 'Maria', text: "Did you pack the GF bread? ...Please say yes." },
  { from: 'Jace', text: "The Greek market lady taught me to count to 10!" },
  { from: 'Dad', text: "WiFi from the Austrian Alps: surprisingly excellent." },
  { from: 'Jax', text: "I navigated the whole city. I'm basically a GPS now." },
  { from: 'Jole', text: "Museum guard said I asked the best question today!" },
  { from: 'Maria', text: "3 countries, 2 weeks. The boys didn't even blink." },
  { from: 'Dad', text: "Celiac life hack: pack snacks for every timezone." },
  { from: 'Jace', text: "Can we homeschool on the beach? Asking for myself." },
  { from: 'Jax', text: "Spain has the BEST gluten-free pizza. Fight me." },
  { from: 'Jole', text: "I drew the Acropolis. It's better than the real one." },
  { from: 'Maria', text: "This is the 4th cafe. We WILL find GF waffles." },
];

const avatarEffects = ['float', 'glitch', 'spin', 'ripple'];

const avatarPhotos = [
  'headshot.jpg',
  'family-alps.jpg',
  'couple-golden-hour.jpg',
  'boys-selfie.jpg',
  'greek-island.jpg',
  '514485957_10106849219267053_8426182179315507744_n.jpg',
  '514538141_18508719016008994_6802406149798537855_n.jpg',
  'rooftop-social.jpg',
  'jaredIMG_4650-3smVbD.jpg',
];

const expeditions = [
  // Europe
  { lat: 36.43, lng: -5.15, name: 'Estepona, Spain', region: 'europe', color: '#38bdf8', photo: 'couple-golden-hour.jpg' },
  { lat: 47.27, lng: 13.33, name: 'Austrian Alps', region: 'europe', color: '#38bdf8', photo: 'family-alps.jpg' },
  { lat: 37.44, lng: 24.94, name: 'Greek Islands', region: 'europe', color: '#38bdf8', photo: 'greek-island.jpg' },
  { lat: 18.04, lng: -63.05, name: 'Sint Maarten', region: 'caribbean', color: '#fbbf24', photo: 'rooftop-social.jpg' },
  // US Adventures
  { lat: 35.61, lng: -83.43, name: 'Great Smoky Mountains', region: 'us', color: '#10b981', photo: 'boys-selfie.jpg' },
  { lat: 35.77, lng: -82.27, name: 'Blue Ridge Mountains', region: 'us', color: '#10b981', photo: 'boys-selfie.jpg' },
  { lat: 28.54, lng: -81.38, name: 'Orlando, FL', region: 'us', color: '#fbbf24', photo: null },
  { lat: 28.29, lng: -81.41, name: 'Kissimmee, FL', region: 'us', color: '#fbbf24', photo: null },
];

const arcsData = [
  { startLat: 40, startLng: -100, endLat: 47.27, endLng: 13.33, color: '#7c3aed' }, // US → Alps
  { startLat: 47.27, startLng: 13.33, endLat: 37.44, endLng: 24.94, color: '#38bdf8' }, // Alps → Greece
  { startLat: 37.44, startLng: 24.94, endLat: 36.43, endLng: -5.15, color: '#38bdf8' }, // Greece → Spain
];

export default function Home() {
  const BASE = import.meta.env.BASE_URL;
  const navigate = useNavigate();

  const [photoIndex, setPhotoIndex] = useState(0);
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [activeExpedition, setActiveExpedition] = useState(0);

  const globeRef = useRef();
  const mapContainerRef = useRef();
  const [globeSize, setGlobeSize] = useState({ width: 0, height: 0 });
  const [globeMounted, setGlobeMounted] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);

  // Overlay graphics params (state so Globe component re-renders on change)
  const [overlayParams, setOverlayParams] = useState({
    arcStroke: GLOBE_DEFAULTS.arcStroke,
    arcDashLength: GLOBE_DEFAULTS.arcDashLength,
    arcDashGap: GLOBE_DEFAULTS.arcDashGap,
    arcDashAnimateTime: GLOBE_DEFAULTS.arcDashAnimateTime,
    ringMaxRadius: GLOBE_DEFAULTS.ringMaxRadius,
    ringPropagationSpeed: GLOBE_DEFAULTS.ringPropagationSpeed,
    ringRepeatPeriod: GLOBE_DEFAULTS.ringRepeatPeriod,
    labelSize: GLOBE_DEFAULTS.labelSize,
    labelDotRadius: GLOBE_DEFAULTS.labelDotRadius,
  });

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setGlobeSize({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    if (mapContainerRef.current) observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Callback ref: fires when Globe actually mounts (after lazy load resolves)
  const handleGlobeRef = useCallback((el) => {
    globeRef.current = el;
    if (el) setGlobeMounted(true);
  }, []);

  // Check for editor mode via URL parameter
  const showEditor = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('editor') === 'jarowe';
  }, []);

  // Shared uniforms for all globe shaders (surface, clouds, atmosphere, particles)
  const sharedUniforms = useRef({
    time: { value: 0 },
    audioPulse: { value: 0 },
    prismPulse: { value: 0.0 },
    introIntensity: { value: 1.0 },
    sunDir: { value: getSunDirection() }
  });

  // All tunable parameters — defaults from globeDefaults.js, editor mutates these in-place
  const editorParams = useRef({ ...GLOBE_DEFAULTS });

  // Create globe surface ShaderMaterial once (passed via globeMaterial prop)
  // This is the CORRECT way to apply custom materials - via the official API,
  // NOT via scene.traverse() material replacement which can silently fail.
  // All tunable values are uniforms driven by editorParams for real-time tweaking.
  const globeShaderMaterial = useMemo(() => {
    const p = editorParams.current;
    const texLoader = new THREE.TextureLoader();
    const earthTex = texLoader.load('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
    const nightTex = texLoader.load('//cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_lights_2048.png');
    const waterTex = texLoader.load('//unpkg.com/three-globe/example/img/earth-water.png');
    const packedTex = texLoader.load('//cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_bump_roughness_clouds_4096.jpg');

    return new THREE.ShaderMaterial({
      uniforms: {
        earthMap: { value: earthTex },
        nightMap: { value: nightTex },
        waterMask: { value: waterTex },
        packedTex: { value: packedTex },
        time: sharedUniforms.current.time,
        audioPulse: sharedUniforms.current.audioPulse,
        prismPulse: sharedUniforms.current.prismPulse,
        sunDir: sharedUniforms.current.sunDir,
        // Surface Day/Night
        dayStrengthMin: { value: p.dayStrengthMin },
        dayStrengthMax: { value: p.dayStrengthMax },
        // City Lights
        cityGateMin: { value: p.cityGateMin },
        cityGateMax: { value: p.cityGateMax },
        cityLightColor: { value: new THREE.Vector3(...p.cityLightColor) },
        cityLightBoost: { value: new THREE.Vector3(...p.cityLightBoost) },
        cityGlowPow: { value: p.cityGlowPow },
        cityGlowMult: { value: p.cityGlowMult },
        // Land Material
        landFresnelPow: { value: p.landFresnelPow },
        landFresnelMult: { value: p.landFresnelMult },
        landSpecPow: { value: p.landSpecPow },
        landSpecMult: { value: p.landSpecMult },
        bumpStrength: { value: p.bumpStrength },
        // Water
        waterThresholdMin: { value: p.waterThresholdMin },
        waterThresholdMax: { value: p.waterThresholdMax },
        deepSeaColor: { value: new THREE.Vector3(...p.deepSeaColor) },
        midSeaColor: { value: new THREE.Vector3(...p.midSeaColor) },
        shallowSeaColor: { value: new THREE.Vector3(...p.shallowSeaColor) },
        waterSpecPow: { value: p.waterSpecPow },
        waterSpecMult: { value: p.waterSpecMult },
        waterGlarePow: { value: p.waterGlarePow },
        waterGlareMult: { value: p.waterGlareMult },
        waterFresnelPow: { value: p.waterFresnelPow },
        waterWaveSpeed: { value: p.waterWaveSpeed },
        waterWaveScale: { value: p.waterWaveScale },
        waterCurrentStrength: { value: p.waterCurrentStrength },
        waterNormalStrength: { value: p.waterNormalStrength },
        waterDetailScale: { value: p.waterDetailScale },
        waterBigWaveScale: { value: p.waterBigWaveScale },
        waterCausticsStrength: { value: p.waterCausticsStrength },
        waterSunGlitter: { value: p.waterSunGlitter },
        waterFoamStrength: { value: p.waterFoamStrength },
        waterSubsurfaceColor: { value: new THREE.Vector3(...p.waterSubsurfaceColor) },
        waterSubsurfaceStrength: { value: p.waterSubsurfaceStrength },
        bopWaterRipple: { value: p.bopWaterRipple },
        // Surface Atmosphere
        atmosDayColor: { value: new THREE.Vector3(...p.atmosDayColor) },
        atmosTwilightColor: { value: new THREE.Vector3(...p.atmosTwilightColor) },
        atmosBlendMin: { value: p.atmosBlendMin },
        atmosBlendMax: { value: p.atmosBlendMax },
        atmosMixMin: { value: p.atmosMixMin },
        atmosMixMax: { value: p.atmosMixMax },
        atmosFresnelPow: { value: p.atmosFresnelPow },
        atmosStrength: { value: p.atmosStrength },
        // Sunset
        sunsetColor: { value: new THREE.Vector3(...p.sunsetColor) },
        sunsetStrength: { value: p.sunsetStrength },
        terminatorSoftness: { value: p.terminatorSoftness },
        terminatorGlow: { value: p.terminatorGlow },
        // Shader lighting (affects ShaderMaterial directly)
        shaderAmbient: { value: p.shaderAmbient },
        shaderSunMult: { value: p.shaderSunMult },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewPos;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D earthMap;
        uniform sampler2D nightMap;
        uniform sampler2D waterMask;
        uniform sampler2D packedTex;
        uniform float time;
        uniform float audioPulse;
        uniform float prismPulse;
        uniform vec3 sunDir;
        // Surface uniforms
        uniform float dayStrengthMin;
        uniform float dayStrengthMax;
        uniform float cityGateMin;
        uniform float cityGateMax;
        uniform vec3 cityLightColor;
        uniform vec3 cityLightBoost;
        uniform float cityGlowPow;
        uniform float cityGlowMult;
        uniform float landFresnelPow;
        uniform float landFresnelMult;
        uniform float landSpecPow;
        uniform float landSpecMult;
        uniform float bumpStrength;
        // Water uniforms
        uniform float waterThresholdMin;
        uniform float waterThresholdMax;
        uniform vec3 deepSeaColor;
        uniform vec3 midSeaColor;
        uniform vec3 shallowSeaColor;
        uniform float waterSpecPow;
        uniform float waterSpecMult;
        uniform float waterGlarePow;
        uniform float waterGlareMult;
        uniform float waterFresnelPow;
        uniform float waterWaveSpeed;
        uniform float waterWaveScale;
        uniform float waterCurrentStrength;
        uniform float waterNormalStrength;
        uniform float waterDetailScale;
        uniform float waterBigWaveScale;
        uniform float waterCausticsStrength;
        uniform float waterSunGlitter;
        uniform float waterFoamStrength;
        uniform vec3 waterSubsurfaceColor;
        uniform float waterSubsurfaceStrength;
        uniform float bopWaterRipple;
        // Atmosphere uniforms
        uniform vec3 atmosDayColor;
        uniform vec3 atmosTwilightColor;
        uniform float atmosBlendMin;
        uniform float atmosBlendMax;
        uniform float atmosMixMin;
        uniform float atmosMixMax;
        uniform float atmosFresnelPow;
        uniform float atmosStrength;
        // Sunset uniforms
        uniform vec3 sunsetColor;
        uniform float sunsetStrength;
        uniform float terminatorSoftness;
        uniform float terminatorGlow;
        uniform float shaderAmbient;
        uniform float shaderSunMult;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewPos;

        float hash21(vec2 p) {
          p = fract(p * vec2(234.34, 435.345));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }
        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i), hash21(i + vec2(1,0)), f.x),
            mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x),
            f.y
          );
        }
        float fbm(vec2 p) {
          float v = 0.0; float a = 0.5;
          mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
          for (int i = 0; i < 5; i++) {
            v += a * vnoise(p);
            p = rot * p * 2.0;
            a *= 0.5;
          }
          return v;
        }

        // Animated caustics: two warped cell layers that create dancing light
        float caustic(vec2 uv, float t) {
          vec2 p1 = uv * 8.0 + vec2(t * 0.4, t * 0.3);
          vec2 p2 = uv * 11.0 - vec2(t * 0.3, t * 0.5);
          float c1 = length(fract(p1 + vec2(vnoise(p1 * 0.5), vnoise(p1 * 0.5 + 7.0))) - 0.5);
          float c2 = length(fract(p2 + vec2(vnoise(p2 * 0.5), vnoise(p2 * 0.5 + 13.0))) - 0.5);
          return pow(1.0 - min(c1, c2), 3.0);
        }

        void main() {
          vec4 dayCol = texture2D(earthMap, vUv);
          vec3 nightCol = texture2D(nightMap, vUv).rgb;
          float waterVal = texture2D(waterMask, vUv).r;
          float isWater = smoothstep(waterThresholdMin, waterThresholdMax, waterVal);
          vec3 packed = texture2D(packedTex, vUv).rgb;

          // All lighting in WORLD space so sun stays fixed as camera orbits
          vec3 worldViewDir = normalize(cameraPosition - vWorldPos);
          float NdotL = dot(vWorldNormal, sunDir);
          float dayStrength = smoothstep(dayStrengthMin, dayStrengthMax, NdotL);
          float dayLight = max(NdotL, 0.0) * shaderSunMult + shaderAmbient;
          float rawFresnel = clamp(1.0 - dot(worldViewDir, vWorldNormal), 0.0, 1.0);
          vec3 halfDir = normalize(sunDir + worldViewDir);

          // --- LAND: matte terrain + bump-to-normal detail + night lights ---
          float landFresnel = pow(rawFresnel, landFresnelPow);
          // Proper bump-to-normal using texture derivatives for topographic shading
          float bumpVal = packed.r;
          float bHx = texture2D(packedTex, vUv + vec2(1.0 / 4096.0, 0.0)).r;
          float bHy = texture2D(packedTex, vUv + vec2(0.0, 1.0 / 4096.0)).r;
          vec3 tangent = normalize(cross(vWorldNormal, vec3(0.0, 1.0, 0.0)));
          vec3 bitangent = normalize(cross(vWorldNormal, tangent));
          vec3 bumpNormal = normalize(
            vWorldNormal +
            tangent * (bHx - bumpVal) * bumpStrength * 8.0 +
            bitangent * (bHy - bumpVal) * bumpStrength * 8.0
          );
          float bumpDiffuse = max(dot(bumpNormal, sunDir), 0.0) * shaderSunMult + shaderAmbient;
          vec3 landDay = dayCol.rgb * bumpDiffuse + dayCol.rgb * landFresnel * landFresnelMult * dayStrength;
          float roughness = packed.g;
          float landSpec = (1.0 - roughness) * pow(max(dot(bumpNormal, halfDir), 0.0), landSpecPow) * landSpecMult;
          landDay += vec3(0.7, 0.75, 0.8) * landSpec;
          // City lights: only real city pixels visible, noise below threshold = pure black
          float lightPeak = max(max(nightCol.r, nightCol.g), nightCol.b);
          float cityGate = smoothstep(cityGateMin, cityGateMax, lightPeak);
          vec3 landNight = nightCol * cityLightBoost * cityGate;
          landNight += cityLightColor * pow(lightPeak, cityGlowPow) * cityGate * cityGlowMult;
          vec3 landColor = mix(landNight, landDay, dayStrength);

          // --- WATER: animated ocean + tidal currents + specular + Fresnel ---
          float lat = vUv.y * 3.14159 - 1.5708;
          vec2 currentFlow = vec2(
            sin(lat * 3.0) * 0.008 * waterCurrentStrength + sin(lat * 7.0 + time * 0.02 * waterWaveSpeed) * 0.003 * waterCurrentStrength,
            cos(vUv.x * 6.28 + time * 0.015 * waterWaveSpeed) * 0.004 * waterCurrentStrength
          );
          float tide = sin(time * 0.03 * waterWaveSpeed) * 0.003 + sin(time * 0.07 * waterWaveSpeed + vUv.x * 12.0) * 0.001;
          vec2 tidalUv = vUv + currentFlow + vec2(tide, tide * 0.5);

          vec2 waveUv = tidalUv * waterDetailScale * waterWaveScale;
          vec2 bigWaveUv = tidalUv * waterBigWaveScale * waterWaveScale;
          float t = time * 0.12 * waterWaveSpeed;

          float bigW1 = fbm(bigWaveUv + vec2(t * 0.8, t * 0.5));
          float bigW2 = fbm(bigWaveUv * 0.6 - vec2(t * 0.3, t * 0.6));
          float tidalSurge = sin(time * 0.05 + vUv.y * 8.0) * 0.15;
          float bigWaves = (bigW1 + bigW2) * 0.5 + tidalSurge * 0.1;

          float w1 = fbm(waveUv + vec2(t, t * 0.7));
          float w2 = fbm(waveUv * 0.7 - vec2(t * 0.5, t * 0.3));
          float w3 = fbm(waveUv * 1.3 + vec2(t * 0.2, -t * 0.4)) * 0.3;
          float waves = (w1 + w2) * 0.5 + w3;

          float dx = fbm(waveUv + vec2(0.01, 0.0) + vec2(t, t*0.7)) - w1;
          float dy = fbm(waveUv + vec2(0.0, 0.01) + vec2(t, t*0.7)) - w1;
          float bdx = fbm(bigWaveUv + vec2(0.02, 0.0) + vec2(t*0.8, t*0.5)) - bigW1;
          float bdy = fbm(bigWaveUv + vec2(0.0, 0.02) + vec2(t*0.8, t*0.5)) - bigW1;
          vec3 waveN = normalize(vWorldNormal + vec3(dx + bdx * 2.0, dy + bdy * 2.0, 0.0) * waterNormalStrength);

          float spec = pow(max(dot(waveN, halfDir), 0.0), waterSpecPow);
          float glare = pow(max(dot(waveN, halfDir), 0.0), waterGlarePow);
          float wFresnel = pow(1.0 - max(dot(worldViewDir, waveN), 0.0), waterFresnelPow);

          vec3 oceanBase = mix(deepSeaColor, midSeaColor, waves);
          oceanBase = mix(oceanBase, shallowSeaColor, bigWaves * 0.4);

          // Subsurface scattering: light transmitting through water
          float sssNdotL = pow(max(NdotL, 0.0), 2.0);
          vec3 subsurface = waterSubsurfaceColor * sssNdotL * waterSubsurfaceStrength;
          subsurface += waterSubsurfaceColor * 0.5 * pow(max(dot(worldViewDir, -sunDir), 0.0), 4.0) * waterSubsurfaceStrength;
          oceanBase += subsurface * (0.5 + bigWaves);

          // Caustics: dancing light patterns on sunlit water
          float caust = caustic(tidalUv * 80.0, t * 3.0) * waterCausticsStrength;
          oceanBase += vec3(0.6, 0.8, 1.0) * caust * sssNdotL * 0.8;

          vec3 oceanCol = mix(dayCol.rgb * 0.35, oceanBase, 0.65);

          vec3 skyReflection = mix(vec3(0.15, 0.3, 0.6), vec3(0.5, 0.65, 0.85), wFresnel);

          // Sun glitter: sparkling micro-reflections across the water
          float glitterNoise = hash21(floor(tidalUv * 4000.0 + time * 2.0));
          float glitter = pow(glitterNoise, 80.0) * spec * waterSunGlitter * 8.0;

          // Foam: whitecap hints at wave peaks
          float foamMask = smoothstep(waterFoamStrength > 0.0 ? 0.55 : 999.0, 0.75, waves + bigWaves * 0.3);
          vec3 foamColor = vec3(0.85, 0.9, 0.95) * foamMask * waterFoamStrength * dayLight;

          vec3 waterDay = oceanCol * dayLight
            + vec3(1.0, 0.95, 0.85) * spec * waterSpecMult
            + vec3(0.9, 0.85, 0.7) * glare * waterGlareMult
            + vec3(1.0, 0.98, 0.9) * glitter
            + skyReflection * wFresnel * 0.5
            + foamColor
            + vec3(0.3, 0.5, 0.8) * waves * audioPulse * 0.3;
          float cityGlow = max(max(nightCol.r, nightCol.g), nightCol.b);
          vec3 waterNight = vec3(0.5, 0.4, 0.2) * smoothstep(0.04, 0.15, cityGlow) * cityGlow * 0.1;
          vec3 waterColor = mix(waterNight, waterDay, dayStrength);

          vec3 prismWater = vec3(
            0.5 + 0.5 * sin(time * 2.0 + vUv.x * 20.0),
            0.5 + 0.5 * sin(time * 2.0 + vUv.x * 20.0 + 2.094),
            0.5 + 0.5 * sin(time * 2.0 + vUv.x * 20.0 + 4.189)
          );
          waterColor = mix(waterColor, prismWater * waterColor * 2.0, prismPulse * bopWaterRipple * isWater);

          vec3 finalColor = mix(landColor, waterColor, isWater);

          // Cloud shadows from packed blue channel
          float cloudDensity = smoothstep(0.2, 0.7, packed.b);
          finalColor *= (1.0 - cloudDensity * 0.3 * dayStrength);

          // --- TSL-style atmospheric blending on surface ---
          vec3 atmosphereColor = mix(atmosTwilightColor, atmosDayColor, smoothstep(atmosBlendMin, atmosBlendMax, NdotL));
          float atmosphereMix = clamp(smoothstep(atmosMixMin, atmosMixMax, NdotL) * pow(rawFresnel, atmosFresnelPow), 0.0, 1.0);
          finalColor = mix(finalColor, atmosphereColor, atmosphereMix * atmosStrength);

          // Sunset glow at terminator (soft natural falloff)
          float termLow = -0.05 - terminatorSoftness * 0.3;
          float termHi = 0.3 + terminatorSoftness * 0.4;
          float termFade = 0.5 + terminatorSoftness * 0.5;
          float sunsetGlow = smoothstep(termLow, termHi, NdotL) * smoothstep(termFade, 0.05, max(NdotL, 0.0));
          finalColor += sunsetColor * sunsetGlow * sunsetStrength;
          // Extra warm terminator glow band
          float warmBand = exp(-pow((NdotL + 0.05) / (terminatorSoftness + 0.1), 2.0)) * terminatorGlow;
          finalColor += sunsetColor * warmBand * 0.5;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoRotateTimer = useRef(null);

  // Auto-cycle through locations when globe is idle
  const globeCycleTimer = useRef(null);
  const isUserInteracting = useRef(false);
  const hasAnimatedIn = useRef(false);

  const startGlobeCycle = useCallback(() => {
    if (globeCycleTimer.current) clearInterval(globeCycleTimer.current);
    globeCycleTimer.current = setInterval(() => {
      if (!isUserInteracting.current && globeRef.current) {
        setActiveExpedition(prev => {
          const next = (prev + 1) % expeditions.length;
          const loc = expeditions[next];
          const controls = globeRef.current.controls();
          if (controls) controls.enableZoom = false; // Disable zoom during transit

          const ep = editorParams.current;
          globeRef.current.pointOfView({ lat: loc.lat, lng: loc.lng, altitude: ep.cameraLocationAlt ?? 1.2 }, ep.cameraLocationSpeed ?? 2500);
          setHoveredMarker(loc);

          // Clear marker tooltip after a moment
          setTimeout(() => {
            if (controls) controls.enableZoom = true;
            if (!isUserInteracting.current) setHoveredMarker(null);
          }, (ep.cameraLocationSpeed ?? 2500) + 1000);
          return next;
        });
      }
    }, editorParams.current.cameraCycleInterval ?? 8000);
  }, []);

  // Globe initialization via useEffect + globeMounted (proven reliable approach)
  useEffect(() => {
    if (!globeMounted || !globeRef.current) return;

    let handleStart, handleEnd;

    const initTimer = setTimeout(() => {
      const globe = globeRef.current;
      if (!globe) return;

      try {
        
        // ------------------------------------------------------------------
        // CONTROLS - weighted momentum spin
        // ------------------------------------------------------------------
        const controls = globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
        controls.enableZoom = false; // disabled during cinematic
        controls.minDistance = 110;
        controls.maxDistance = 600;
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.8;

        handleStart = () => {
          isUserInteracting.current = true;
          controls.autoRotate = false;
          if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
          if (globeCycleTimer.current) clearInterval(globeCycleTimer.current);
        };
        handleEnd = () => {
          autoRotateTimer.current = setTimeout(() => {
            isUserInteracting.current = false;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0;
            const ramp = setInterval(() => {
              if (controls.autoRotateSpeed < 0.8) {
                controls.autoRotateSpeed += 0.02;
              } else {
                controls.autoRotateSpeed = 0.8;
                clearInterval(ramp);
              }
            }, 50);
            startGlobeCycle();
          }, 5000);
        };
        controls.addEventListener('start', handleStart);
        controls.addEventListener('end', handleEnd);

        // ------------------------------------------------------------------
        // AUDIO ANALYSER
        // ------------------------------------------------------------------
        // Audio analyser is set up by AudioContext.jsx; just read from it here
        let audioDataArray = new Uint8Array(128); // fftSize=256 → 128 bins

        // ------------------------------------------------------------------
        // EXTREME MAGICAL SHADERS & EFFECTS
        // ------------------------------------------------------------------
        const scene = globe.scene();
        
        // --- A. Cinematic Lighting Setup ---
        // Clean out default lights to own the scene fully
        scene.children.filter(c => c.type === 'DirectionalLight' || c.type === 'AmbientLight').forEach(l => scene.remove(l));
        const lp = editorParams.current;
        const ambient = new THREE.AmbientLight(0xffffff, lp.ambientIntensity);
        const sunLight = new THREE.DirectionalLight(0xffffff, lp.sunIntensity);
        sunLight.position.set(200, 100, 200);
        scene.add(ambient, sunLight);

        // Connect shared uniforms to globe instance (used by cloud, atmos, particle shaders)
        if (!globe.customUniforms) {
          globe.customUniforms = sharedUniforms.current;
        }
        // Position lights to match real-time sun direction
        const initSunPos = globe.customUniforms.sunDir.value.clone().multiplyScalar(200);
        sunLight.position.copy(initSunPos);
        globe._sunLight = sunLight;
        globe._ambientLight = ambient;

        // Find the globe mesh for raycasting (lens flare occlusion)
        // Material is set via globeMaterial prop - no scene.traverse replacement needed
        if (!globe._globeMesh) {
          scene.traverse((child) => {
            if (child.isMesh && child.geometry && !child.userData?._custom) {
              const params = child.geometry.parameters;
              if (params && params.radius >= 99) {
                globe._globeMesh = child;
              }
            }
          });
        }

        // --- B2. Volumetric Cloud Layer (4K from packed texture blue channel) ---
        if (!globe.cloudMesh) {
          // Use the same 4K packed texture - blue channel has high-res cloud data
          const cloud4KTex = new THREE.TextureLoader().load(
            '//cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_bump_roughness_clouds_4096.jpg'
          );

          const cp = editorParams.current;
          const cloudMat = new THREE.ShaderMaterial({
            uniforms: {
              cloudsMap: { value: cloud4KTex },
              sunDir: globe.customUniforms.sunDir,
              time: globe.customUniforms.time,
              audioPulse: globe.customUniforms.audioPulse,
              cloudAlphaMin: { value: cp.cloudAlphaMin },
              cloudAlphaMax: { value: cp.cloudAlphaMax },
              cloudOpacity: { value: cp.cloudOpacity },
              cloudLitColor: { value: new THREE.Vector3(...cp.cloudLitColor) },
              cloudShadowColor: { value: new THREE.Vector3(...cp.cloudShadowColor) },
              cloudDayFactorMin: { value: cp.cloudDayFactorMin },
              cloudDayFactorMax: { value: cp.cloudDayFactorMax },
              cloudTerminatorColor: { value: new THREE.Vector3(...cp.cloudTerminatorColor) },
              cloudTerminatorMult: { value: cp.cloudTerminatorMult },
              cloudRimPow: { value: cp.cloudRimPow },
              cloudRimStrength: { value: cp.cloudRimStrength },
              cloudSubsurfaceColor: { value: new THREE.Vector3(...cp.cloudSubsurfaceColor) },
              cloudSilverLiningColor: { value: new THREE.Vector3(...cp.cloudSilverLiningColor) },
              prismPulse: globe.customUniforms.prismPulse,
              bopCloudFlash: { value: cp.bopCloudFlash },
            },
            vertexShader: `
              varying vec2 vUv;
              varying vec3 vNormal;
              varying vec3 vViewPos;
              varying vec3 vWorldNormal;
              void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform sampler2D cloudsMap;
              uniform vec3 sunDir;
              uniform float time;
              uniform float audioPulse;
              uniform float cloudAlphaMin;
              uniform float cloudAlphaMax;
              uniform float cloudOpacity;
              uniform vec3 cloudLitColor;
              uniform vec3 cloudShadowColor;
              uniform float cloudDayFactorMin;
              uniform float cloudDayFactorMax;
              uniform vec3 cloudTerminatorColor;
              uniform float cloudTerminatorMult;
              uniform float cloudRimPow;
              uniform float cloudRimStrength;
              uniform vec3 cloudSubsurfaceColor;
              uniform vec3 cloudSilverLiningColor;
              uniform float prismPulse;
              uniform float bopCloudFlash;
              varying vec2 vUv;
              varying vec3 vNormal;
              varying vec3 vViewPos;
              varying vec3 vWorldNormal;

              void main() {
                // Organic noise warp: clouds drift and distort subtly
                vec2 cloudUv = vUv;
                float warpX = sin(vUv.y * 10.0 + time * 0.15) * 0.004
                            + sin(vUv.y * 25.0 + time * 0.08) * 0.002;
                float warpY = cos(vUv.x * 8.0 + time * 0.12) * 0.003
                            + cos(vUv.x * 20.0 + time * 0.1) * 0.001;
                cloudUv += vec2(warpX, warpY);

                // BLUE channel = cloud density in packed texture (4096x2048)
                float cloudVal = texture2D(cloudsMap, cloudUv).b;

                // Smooth threshold: only show actual clouds, not noise floor
                float alpha = smoothstep(cloudAlphaMin, cloudAlphaMax, cloudVal);

                // Sun illumination
                float NdotL = dot(vWorldNormal, sunDir);
                float dayFactor = smoothstep(cloudDayFactorMin, cloudDayFactorMax, NdotL);
                float illumination = 0.02 + max(NdotL, 0.0) * 0.98;

                // Lit clouds are bright white, shadow side is blue-gray
                vec3 cloudColor = mix(cloudShadowColor, cloudLitColor, dayFactor) * illumination;

                // Self-shadowing: thicker cloud masses have darker cores
                float thickness = cloudVal * cloudVal;
                cloudColor *= (1.0 - thickness * 0.2);

                // Subsurface scattering: thick clouds glow slightly warm on sun-facing side
                cloudColor += cloudSubsurfaceColor * thickness * max(NdotL, 0.0);

                // Sunset/terminator scattering - golden edge glow
                float terminator = smoothstep(0.0, 0.1, max(NdotL, 0.0)) * smoothstep(0.22, 0.1, max(NdotL, 0.0));
                cloudColor += cloudTerminatorColor * terminator * cloudVal * cloudTerminatorMult;

                // Silver lining: bright rim light on cloud edges facing camera
                vec3 viewDir = normalize(-vViewPos);
                float rim = pow(1.0 - max(dot(viewDir, vNormal), 0.0), cloudRimPow);
                cloudColor += cloudSilverLiningColor * rim * cloudRimStrength * illumination;

                // Music-reactive + bop cloud brightness
                cloudColor += cloudColor * audioPulse * 0.15;
                cloudColor += cloudColor * prismPulse * bopCloudFlash;

                // Night side: clouds invisible (dark side should be clean black)
                alpha *= dayFactor;

                // Bump alpha based on cloud thickness for volumetric feel
                alpha = alpha * (0.7 + thickness * 0.3);

                gl_FragColor = vec4(cloudColor, alpha * cloudOpacity);
              }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            side: THREE.FrontSide
          });

          const cloudMesh = new THREE.Mesh(
            new THREE.SphereGeometry(100.8, 96, 96),  // Higher segments for 4K detail
            cloudMat
          );
          cloudMesh.renderOrder = 1;  // After globe surface (0), before aurora (2)
          scene.add(cloudMesh);
          globe.cloudMesh = cloudMesh;
        }

        // (B3 haze shell removed - surface shader handles atmosphere tinting)

        // --- C. Aurora Borealis/Australis (dark-side polar curtain glow) ---
        if (!globe.auroraMesh) {
          const ap = editorParams.current;
          const auroraMat = new THREE.ShaderMaterial({
            uniforms: {
              sunDir: globe.customUniforms.sunDir,
              time: globe.customUniforms.time,
              prismPulse: globe.customUniforms.prismPulse,
              bopAuroraBoost: { value: ap.bopAuroraBoost },
              auroraColor1: { value: new THREE.Vector3(...ap.auroraColor1) },
              auroraColor2: { value: new THREE.Vector3(...ap.auroraColor2) },
              auroraColor3: { value: new THREE.Vector3(...ap.auroraColor3) },
              auroraIntensity: { value: ap.auroraIntensity },
              auroraSpeed: { value: ap.auroraSpeed },
              auroraLatitude: { value: ap.auroraLatitude },
              auroraWidth: { value: ap.auroraWidth },
              auroraNoiseScale: { value: ap.auroraNoiseScale },
              auroraCurtainPow: { value: ap.auroraCurtainPow },
              auroraEvolution: { value: ap.auroraEvolution },
              auroraWaveSpeed: { value: ap.auroraWaveSpeed },
            },
            vertexShader: `
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              varying vec3 vViewPos;
              void main() {
                vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 sunDir;
              uniform float time;
              uniform vec3 auroraColor1;
              uniform vec3 auroraColor2;
              uniform vec3 auroraColor3;
              uniform float auroraIntensity;
              uniform float auroraSpeed;
              uniform float auroraLatitude;
              uniform float auroraWidth;
              uniform float auroraNoiseScale;
              uniform float auroraCurtainPow;
              uniform float auroraEvolution;
              uniform float auroraWaveSpeed;
              uniform float prismPulse;
              uniform float bopAuroraBoost;
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              varying vec3 vViewPos;

              // 3D noise for seamless spherical aurora (no UV seam)
              float hash(vec2 p) {
                p = fract(p * vec2(234.34, 435.345));
                p += dot(p, p + 34.23);
                return fract(p.x * p.y);
              }
              float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                  mix(hash(i), hash(i + vec2(1,0)), f.x),
                  mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
              }
              float fbm3(vec2 p) {
                float v = 0.0; float a = 0.5;
                mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
                for (int i = 0; i < 5; i++) {
                  v += a * noise(p);
                  p = rot * p * 2.1;
                  a *= 0.5;
                }
                return v;
              }

              void main() {
                // Seamless spherical coordinates from world position (NO UV seam!)
                vec3 nPos = normalize(vWorldPos);
                float lng = atan(nPos.z, nPos.x); // -PI to PI, seamless
                float lat = asin(clamp(nPos.y, -1.0, 1.0)); // -PI/2 to PI/2
                float latDeg = lat * 57.2958; // radians to degrees
                float absLat = abs(latDeg);

                // Aurora band: concentrated near auroraLatitude degrees
                float latDist = abs(absLat - auroraLatitude);
                float latMask = exp(-latDist * latDist / (auroraWidth * auroraWidth * 0.5));
                // Fix pole pinch: fade out within 12 degrees of poles
                float polarFade = smoothstep(0.0, 12.0, 90.0 - absLat);
                latMask *= polarFade;

                // Dark side only: aurora is a night phenomenon
                float NdotL = dot(vWorldNormal, sunDir);
                float nightMask = smoothstep(0.1, -0.2, NdotL);

                // Time variables for evolution
                float t = time * auroraSpeed;
                float evolve = time * auroraEvolution;
                float wave = time * auroraWaveSpeed;

                // Curtain pattern using TRULY seamless noise (sin/cos of longitude, not raw lng)
                // Raw lng has a -PI/+PI discontinuity that creates a visible seam
                float sinLng = sin(lng);
                float cosLng = cos(lng);

                vec2 curtainUv = vec2(
                  sinLng * auroraNoiseScale + cosLng * auroraNoiseScale * 0.7 + wave * 0.3,
                  absLat * 0.1 + t * 0.1 + evolve * 0.2
                );
                float curtain = fbm3(curtainUv);

                // Evolution: time-morphing noise that makes the curtain shape shift
                vec2 evolveUv = vec2(
                  cosLng * auroraNoiseScale * 0.7 - sinLng * auroraNoiseScale * 0.5 + evolve * 0.5,
                  absLat * 0.08 - evolve * 0.3
                );
                float evolution = fbm3(evolveUv);
                curtain = curtain * 0.6 + evolution * 0.4;
                curtain = pow(curtain, auroraCurtainPow);

                // Secondary swirl layer with lateral wave propagation
                vec2 swirlUv = vec2(
                  sinLng * auroraNoiseScale * 0.5 + cosLng * auroraNoiseScale * 0.3 - wave * 0.2 + sin(evolve) * 0.3,
                  absLat * 0.15 + t * 0.05 + cos(evolve * 0.7) * 0.2
                );
                float swirl = fbm3(swirlUv + vec2(curtain * 0.5));

                // Color: blend between green, blue, purple based on altitude in curtain
                float colorMix = curtain * 0.6 + swirl * 0.4;
                vec3 auroraCol = mix(auroraColor1, auroraColor2, smoothstep(0.3, 0.6, colorMix));
                auroraCol = mix(auroraCol, auroraColor3, smoothstep(0.6, 0.9, colorMix));

                // Fresnel edge glow (aurora more visible at limb)
                vec3 viewDir = normalize(-vViewPos);
                float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vWorldNormal))), 1.5);
                float edgeBoost = 0.6 + fresnel * 0.4;

                float bopBoost = 1.0 + prismPulse * bopAuroraBoost;
                float alpha = latMask * nightMask * curtain * auroraIntensity * edgeBoost * bopBoost;
                alpha = clamp(alpha, 0.0, 1.0);

                gl_FragColor = vec4(auroraCol * auroraIntensity * bopBoost, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.FrontSide,
          });
          const auroraMesh = new THREE.Mesh(
            new THREE.SphereGeometry(ap.auroraHeight, 96, 96),
            auroraMat
          );
          auroraMesh.renderOrder = 1;
          scene.add(auroraMesh);
          globe.auroraMesh = auroraMesh;
        }

        // --- C2. Prismatic Iridescent Glow Layer (magical fresnel noise aurora) ---
        if (!globe.prismGlowMesh && editorParams.current.prismGlowEnabled) {
          const pg = editorParams.current;
          const prismGlowMat = new THREE.ShaderMaterial({
            uniforms: {
              sunDir: globe.customUniforms.sunDir,
              time: globe.customUniforms.time,
              prismPulse: globe.customUniforms.prismPulse,
              prismGlowColor1: { value: new THREE.Vector3(...pg.prismGlowColor1) },
              prismGlowColor2: { value: new THREE.Vector3(...pg.prismGlowColor2) },
              prismGlowColor3: { value: new THREE.Vector3(...pg.prismGlowColor3) },
              prismGlowIntensity: { value: pg.prismGlowIntensity },
              prismGlowSpeed: { value: pg.prismGlowSpeed },
              prismGlowNoiseScale: { value: pg.prismGlowNoiseScale },
              prismGlowFresnelPow: { value: pg.prismGlowFresnelPow },
              bopGlowBoost: { value: pg.bopGlowBoost },
            },
            vertexShader: `
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              varying vec3 vViewPos;
              void main() {
                vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 sunDir;
              uniform float time;
              uniform float prismPulse;
              uniform vec3 prismGlowColor1;
              uniform vec3 prismGlowColor2;
              uniform vec3 prismGlowColor3;
              uniform float prismGlowIntensity;
              uniform float prismGlowSpeed;
              uniform float prismGlowNoiseScale;
              uniform float prismGlowFresnelPow;
              uniform float bopGlowBoost;
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              varying vec3 vViewPos;

              float hash(vec2 p) {
                p = fract(p * vec2(234.34, 435.345));
                p += dot(p, p + 34.23);
                return fract(p.x * p.y);
              }
              float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                  mix(hash(i), hash(i + vec2(1,0)), f.x),
                  mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
              }
              float fbm(vec2 p) {
                float v = 0.0; float a = 0.5;
                mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
                for (int i = 0; i < 4; i++) {
                  v += a * noise(p);
                  p = rot * p * 2.0;
                  a *= 0.5;
                }
                return v;
              }

              void main() {
                vec3 viewDir = normalize(-vViewPos);
                float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vWorldNormal))), prismGlowFresnelPow);

                // Sun interaction: glow orbits with sun, brighter on lit side
                float NdotL = dot(vWorldNormal, sunDir);
                float sunWrap = 0.5 + NdotL * 0.3;

                // Seamless 3D-projected noise (no atan2 seam)
                vec3 nPos = normalize(vWorldPos);
                float t = time * prismGlowSpeed;

                vec2 noiseUv = vec2(
                  nPos.x * prismGlowNoiseScale + nPos.z * 0.7 + t * 0.4,
                  nPos.y * prismGlowNoiseScale + nPos.x * 0.3 + t * 0.2
                );
                float n1 = fbm(noiseUv);
                float n2 = fbm(noiseUv * 1.5 + vec2(t * 0.3, -t * 0.1) + n1 * 0.5);

                float phase = n1 * 3.0 + n2 * 2.0 + t * 1.5;
                vec3 col = prismGlowColor1 * (0.5 + 0.5 * sin(phase));
                col += prismGlowColor2 * (0.5 + 0.5 * sin(phase + 2.094));
                col += prismGlowColor3 * (0.5 + 0.5 * sin(phase + 4.189));
                col = normalize(col) * length(col) * 0.5;

                float baseIntensity = prismGlowIntensity * 0.3 * sunWrap;
                float pulseBoost = prismPulse * prismGlowIntensity * bopGlowBoost;
                float intensity = (baseIntensity + pulseBoost) * fresnel * (0.5 + n2 * 0.5);

                float bandMask = smoothstep(0.2, 0.5, fresnel) * smoothstep(1.0, 0.7, fresnel);
                intensity *= (0.5 + bandMask * 1.5);

                float alpha = clamp(intensity, 0.0, 1.0);
                gl_FragColor = vec4(col * intensity, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.FrontSide,
          });
          const prismGlowMesh = new THREE.Mesh(
            new THREE.SphereGeometry(pg.prismGlowHeight, 64, 64),
            prismGlowMat
          );
          prismGlowMesh.renderOrder = 1;
          scene.add(prismGlowMesh);
          globe.prismGlowMesh = prismGlowMesh;
        }

        // --- C3. Environment Glow Layer (full-wrap prismatic noise field) ---
        if (!globe.envGlowMesh && editorParams.current.envGlowEnabled) {
          const eg = editorParams.current;
          const envGlowMat = new THREE.ShaderMaterial({
            uniforms: {
              sunDir: globe.customUniforms.sunDir,
              time: globe.customUniforms.time,
              prismPulse: globe.customUniforms.prismPulse,
              envGlowColor1: { value: new THREE.Vector3(...eg.envGlowColor1) },
              envGlowColor2: { value: new THREE.Vector3(...eg.envGlowColor2) },
              envGlowColor3: { value: new THREE.Vector3(...eg.envGlowColor3) },
              envGlowIntensity: { value: eg.envGlowIntensity },
              envGlowSpeed: { value: eg.envGlowSpeed },
              envGlowNoiseScale: { value: eg.envGlowNoiseScale },
              envGlowCoverage: { value: eg.envGlowCoverage },
              bopEnvGlowBoost: { value: eg.bopEnvGlowBoost },
            },
            vertexShader: `
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              varying vec3 vViewPos;
              void main() {
                vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 sunDir;
              uniform float time;
              uniform float prismPulse;
              uniform vec3 envGlowColor1;
              uniform vec3 envGlowColor2;
              uniform vec3 envGlowColor3;
              uniform float envGlowIntensity;
              uniform float envGlowSpeed;
              uniform float envGlowNoiseScale;
              uniform float envGlowCoverage;
              uniform float bopEnvGlowBoost;
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              varying vec3 vViewPos;

              float hash(vec2 p) {
                p = fract(p * vec2(234.34, 435.345));
                p += dot(p, p + 34.23);
                return fract(p.x * p.y);
              }
              float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                  mix(hash(i), hash(i + vec2(1,0)), f.x),
                  mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
              }
              float fbm(vec2 p) {
                float v = 0.0; float a = 0.5;
                mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
                for (int i = 0; i < 5; i++) {
                  v += a * noise(p);
                  p = rot * p * 2.0;
                  a *= 0.5;
                }
                return v;
              }

              void main() {
                vec3 viewDir = normalize(-vViewPos);
                float fresnel = 1.0 - abs(dot(viewDir, normalize(vWorldNormal)));

                // Coverage: 0 = limb only (like atmosphere), 1 = full sphere
                float coverageMask = smoothstep(1.0 - envGlowCoverage, 1.0, fresnel + envGlowCoverage * 0.5);

                // Seamless 3D-projected noise (no atan2 seam or pole pinch)
                vec3 nPos = normalize(vWorldPos);
                float t = time * envGlowSpeed;

                // Large-scale flowing noise pattern
                vec2 uv1 = vec2(
                  nPos.x * envGlowNoiseScale + nPos.z * 0.7 + t * 0.3,
                  nPos.y * envGlowNoiseScale + nPos.x * 0.3 + t * 0.15
                );
                float n1 = fbm(uv1);
                // Warped secondary layer for depth
                vec2 uv2 = vec2(
                  nPos.z * envGlowNoiseScale * 0.7 + nPos.x * 0.5 - t * 0.2,
                  nPos.y * envGlowNoiseScale * 1.3 - nPos.z * 0.4 + t * 0.1
                );
                float n2 = fbm(uv2 + n1 * 0.8);
                // Third layer for fine detail
                vec2 uv3 = vec2(
                  nPos.x * envGlowNoiseScale * 2.0 - nPos.y * 0.6 + t * 0.5,
                  nPos.z * envGlowNoiseScale * 1.5 + nPos.x * 0.8 - t * 0.25
                );
                float n3 = fbm(uv3 + n2 * 0.3);

                float pattern = n1 * 0.5 + n2 * 0.35 + n3 * 0.15;

                // Sun interaction: glow shifts color near terminator
                float NdotL = dot(vWorldNormal, sunDir);
                float sunFade = smoothstep(-0.3, 0.3, NdotL);

                // Prismatic color cycling
                float phase = pattern * 4.0 + t * 2.0;
                vec3 col = envGlowColor1 * (0.5 + 0.5 * sin(phase));
                col += envGlowColor2 * (0.5 + 0.5 * sin(phase + 2.094));
                col += envGlowColor3 * (0.5 + 0.5 * sin(phase + 4.189));
                col *= 0.5;

                // Warm shift near terminator
                col = mix(col, col * vec3(1.2, 0.8, 0.5), (1.0 - sunFade) * 0.3);

                float baseIntensity = envGlowIntensity;
                float pulseBoost = prismPulse * bopEnvGlowBoost;
                float intensity = (baseIntensity + pulseBoost) * coverageMask * pattern;

                float alpha = clamp(intensity, 0.0, 1.0);
                gl_FragColor = vec4(col * intensity, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.FrontSide,
          });
          const envGlowMesh = new THREE.Mesh(
            new THREE.SphereGeometry(eg.envGlowHeight, 64, 64),
            envGlowMat
          );
          envGlowMesh.renderOrder = 1;
          scene.add(envGlowMesh);
          globe.envGlowMesh = envGlowMesh;
        }

        // --- C4. Lava Lamp Layer (smooth morphing blob overlay) ---
        if (!globe.lavaLampMesh) {
          const ll = editorParams.current;
          const lavaLampMat = new THREE.ShaderMaterial({
            uniforms: {
              time: globe.customUniforms.time,
              prismPulse: globe.customUniforms.prismPulse,
              bopLavaLampBoost: { value: ll.bopLavaLampBoost },
              lavaLampColor1: { value: new THREE.Vector3(...ll.lavaLampColor1) },
              lavaLampColor2: { value: new THREE.Vector3(...ll.lavaLampColor2) },
              lavaLampColor3: { value: new THREE.Vector3(...ll.lavaLampColor3) },
              lavaLampIntensity: { value: ll.lavaLampIntensity },
              lavaLampSpeed: { value: ll.lavaLampSpeed },
              lavaLampScale: { value: ll.lavaLampScale },
              lavaLampBlobSize: { value: ll.lavaLampBlobSize },
              lavaLampFeather: { value: ll.lavaLampFeather },
            },
            vertexShader: `
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              varying vec3 vViewPos;
              void main() {
                vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                vViewPos = (modelViewMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform float time;
              uniform float prismPulse;
              uniform float bopLavaLampBoost;
              uniform vec3 lavaLampColor1;
              uniform vec3 lavaLampColor2;
              uniform vec3 lavaLampColor3;
              uniform float lavaLampIntensity;
              uniform float lavaLampSpeed;
              uniform float lavaLampScale;
              uniform float lavaLampBlobSize;
              uniform float lavaLampFeather;
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              varying vec3 vViewPos;

              // 3D simplex-like noise for smooth blobs
              vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
              vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
              vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
              vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
              float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod289(i);
                vec4 p = permute(permute(permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ * ns.x + ns.yyyy;
                vec4 y = y_ * ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
              }

              void main() {
                vec3 viewDir = normalize(-vViewPos);
                float fresnel = 1.0 - abs(dot(viewDir, normalize(vWorldNormal)));

                vec3 nPos = normalize(vWorldPos);
                float t = time * lavaLampSpeed;

                // Large smooth 3D blobs using simplex noise
                float n1 = snoise(nPos * lavaLampScale + vec3(t * 0.3, t * 0.2, t * 0.1));
                float n2 = snoise(nPos * lavaLampScale * 0.7 + vec3(-t * 0.15, t * 0.25, -t * 0.1));
                float n3 = snoise(nPos * lavaLampScale * 1.4 + vec3(t * 0.1, -t * 0.15, t * 0.2));

                // Create blob shapes with feathered edges
                float rawBlob = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
                float blobEdge = 0.5 / lavaLampBlobSize;
                float blob = smoothstep(blobEdge * (1.0 - lavaLampFeather), blobEdge * (1.0 + lavaLampFeather), rawBlob);
                blob *= blob;

                // Tri-color cycling through blobs
                float phase = n1 * 2.0 + t;
                vec3 col = lavaLampColor1 * (0.5 + 0.5 * sin(phase));
                col += lavaLampColor2 * (0.5 + 0.5 * sin(phase + 2.094));
                col += lavaLampColor3 * (0.5 + 0.5 * sin(phase + 4.189));
                col *= 0.5;

                float intensity = lavaLampIntensity * blob * (0.3 + fresnel * 0.7);
                intensity += prismPulse * lavaLampIntensity * bopLavaLampBoost * blob;

                float alpha = clamp(intensity, 0.0, 1.0);
                gl_FragColor = vec4(col * intensity, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.FrontSide,
          });
          const lavaLampMesh = new THREE.Mesh(
            new THREE.SphereGeometry(ll.lavaLampHeight, 64, 64),
            lavaLampMat
          );
          lavaLampMesh.renderOrder = 1;
          lavaLampMesh.visible = editorParams.current.lavaLampEnabled;
          scene.add(lavaLampMesh);
          globe.lavaLampMesh = lavaLampMesh;
        }

        // --- D. Atmospheric Glow (tight rim + soft feathered halo) ---
        if (!globe.atmosShell) {
          const atmosVert = `
            varying vec3 vWorldNormal;
            varying vec3 vWorldPos;
            void main() {
              vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
              vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `;

          // Layer 1: Tight rim glow hugging the globe (BackSide)
          const rp = editorParams.current;
          const rimMat = new THREE.ShaderMaterial({
            uniforms: {
              sunDir: globe.customUniforms.sunDir,
              rimFresnelPow: { value: rp.rimFresnelPow },
              rimGlowMult: { value: rp.rimGlowMult },
              rimDayColor: { value: new THREE.Vector3(...rp.rimDayColor) },
              rimTwilightColor: { value: new THREE.Vector3(...rp.rimTwilightColor) },
              rimNightColor: { value: new THREE.Vector3(...rp.rimNightColor) },
              rimNightToTwilightMin: { value: rp.rimNightToTwilightMin },
              rimNightToTwilightMax: { value: rp.rimNightToTwilightMax },
              rimTwilightToDayMin: { value: rp.rimTwilightToDayMin },
              rimTwilightToDayMax: { value: rp.rimTwilightToDayMax },
              rimSunMaskMin: { value: rp.rimSunMaskMin },
              rimSunMaskMax: { value: rp.rimSunMaskMax },
              rimBacklitMin: { value: rp.rimBacklitMin },
              rimBacklitMax: { value: rp.rimBacklitMax },
              rimBacklitFadeMin: { value: rp.rimBacklitFadeMin },
              rimBacklitFadeMax: { value: rp.rimBacklitFadeMax },
              rimBacklitWeight: { value: rp.rimBacklitWeight },
              rimFadeout: { value: rp.rimFadeout },
            },
            vertexShader: atmosVert,
            fragmentShader: `
              uniform vec3 sunDir;
              uniform float rimFresnelPow;
              uniform float rimGlowMult;
              uniform vec3 rimDayColor;
              uniform vec3 rimTwilightColor;
              uniform vec3 rimNightColor;
              uniform float rimNightToTwilightMin;
              uniform float rimNightToTwilightMax;
              uniform float rimTwilightToDayMin;
              uniform float rimTwilightToDayMax;
              uniform float rimSunMaskMin;
              uniform float rimSunMaskMax;
              uniform float rimBacklitMin;
              uniform float rimBacklitMax;
              uniform float rimBacklitFadeMin;
              uniform float rimBacklitFadeMax;
              uniform float rimBacklitWeight;
              uniform float rimFadeout;
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              void main() {
                vec3 viewDir = normalize(vWorldPos - cameraPosition);
                float fresnel = 1.0 - abs(dot(viewDir, vWorldNormal));

                // Soft outer edge fadeout (prevents hard stroke look)
                float edgeFade = smoothstep(1.0, 1.0 - rimFadeout, fresnel);

                // Concentrated rim glow (Franky pow technique)
                float rim = pow(fresnel, rimFresnelPow) * rimGlowMult * edgeFade;

                // Atmosphere colors: blue day + warm orange twilight
                float sunOri = dot(vWorldNormal, sunDir);
                // Blend through twilight band
                vec3 color = mix(rimNightColor, rimTwilightColor, smoothstep(rimNightToTwilightMin, rimNightToTwilightMax, sunOri));
                color = mix(color, rimDayColor, smoothstep(rimTwilightToDayMin, rimTwilightToDayMax, sunOri));

                // Sun mask: allows faint backlit rim on dark side edges
                float sunMask = smoothstep(rimSunMaskMin, rimSunMaskMax, sunOri);
                // Backlit edge: sun behind globe creates orange rim glow
                float backlit = smoothstep(rimBacklitMin, rimBacklitMax, sunOri) * smoothstep(rimBacklitFadeMin, rimBacklitFadeMax, sunOri);
                color += rimTwilightColor * backlit * rimBacklitWeight;

                float intensity = rim * max(sunMask, backlit * 0.4);

                gl_FragColor = vec4(color * intensity, intensity);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide
          });
          const rimMesh = new THREE.Mesh(new THREE.SphereGeometry(rp.rimRadius, 64, 64), rimMat);
          rimMesh.renderOrder = 3;
          scene.add(rimMesh);

          // Layer 2: Soft feathered outer glow (BackSide)
          const haloMat = new THREE.ShaderMaterial({
            uniforms: {
              sunDir: globe.customUniforms.sunDir,
              haloFresnelPow: { value: rp.haloFresnelPow },
              haloGlowMult: { value: rp.haloGlowMult },
              haloDayColor: { value: new THREE.Vector3(...rp.haloDayColor) },
              haloTwilightColor: { value: new THREE.Vector3(...rp.haloTwilightColor) },
              haloBlendMin: { value: rp.haloBlendMin },
              haloBlendMax: { value: rp.haloBlendMax },
              haloSunMaskMin: { value: rp.haloSunMaskMin },
              haloSunMaskMax: { value: rp.haloSunMaskMax },
              haloFadeout: { value: rp.haloFadeout },
            },
            vertexShader: atmosVert,
            fragmentShader: `
              uniform vec3 sunDir;
              uniform float haloFresnelPow;
              uniform float haloGlowMult;
              uniform vec3 haloDayColor;
              uniform vec3 haloTwilightColor;
              uniform float haloBlendMin;
              uniform float haloBlendMax;
              uniform float haloSunMaskMin;
              uniform float haloSunMaskMax;
              uniform float haloFadeout;
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              void main() {
                vec3 viewDir = normalize(vWorldPos - cameraPosition);
                float fresnel = 1.0 - abs(dot(viewDir, vWorldNormal));

                // Soft outer edge fadeout
                float edgeFade = smoothstep(1.0, 1.0 - haloFadeout, fresnel);

                // Very soft feathered falloff (not a hard ring)
                float glow = pow(fresnel, haloFresnelPow) * haloGlowMult * edgeFade;

                float sunOri = dot(vWorldNormal, sunDir);
                vec3 color = mix(haloTwilightColor, haloDayColor, smoothstep(haloBlendMin, haloBlendMax, sunOri));

                // Feathered sun mask with subtle dark-side backlit wrap
                float sunMask = smoothstep(haloSunMaskMin, haloSunMaskMax, sunOri);
                float intensity = glow * sunMask;

                gl_FragColor = vec4(color * intensity, intensity);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.BackSide
          });
          const haloMesh = new THREE.Mesh(new THREE.SphereGeometry(rp.haloRadius, 48, 48), haloMat);
          haloMesh.renderOrder = 2;
          scene.add(haloMesh);

          globe.atmosShell = { rim: rimMesh, halo: haloMesh };
        }

        // --- D2. Cinematic Lens Flare (procedural, at sun position) ---
        if (!globe.lensFlare) {
          const flareSunDir = globe.customUniforms.sunDir.value;

          // Generate radial gradient texture
          const makeFlareTexture = (size, stops) => {
            const c = document.createElement('canvas');
            c.width = c.height = size;
            const ctx = c.getContext('2d');
            const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
            stops.forEach(([pos, color]) => g.addColorStop(pos, color));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, size, size);
            return new THREE.CanvasTexture(c);
          };

          // Main warm sun glow
          const mainTex = makeFlareTexture(256, [
            [0, 'rgba(255,255,240,1)'],
            [0.05, 'rgba(255,245,220,0.9)'],
            [0.15, 'rgba(255,220,150,0.5)'],
            [0.4, 'rgba(255,180,80,0.15)'],
            [1, 'rgba(255,150,50,0)']
          ]);

          // Diffuse outer halo
          const haloTex = makeFlareTexture(256, [
            [0, 'rgba(255,200,100,0.3)'],
            [0.3, 'rgba(200,150,255,0.1)'],
            [0.6, 'rgba(100,150,255,0.05)'],
            [1, 'rgba(50,100,255,0)']
          ]);

          // Star-burst rays texture
          const rayTex = (() => {
            const c = document.createElement('canvas');
            c.width = c.height = 256;
            const ctx = c.getContext('2d');
            ctx.translate(128, 128);
            const rayCount = 8;
            for (let i = 0; i < rayCount; i++) {
              ctx.save();
              ctx.rotate((Math.PI * 2 / rayCount) * i);
              const g = ctx.createLinearGradient(0, 0, 120, 0);
              g.addColorStop(0, 'rgba(255,240,200,0.6)');
              g.addColorStop(0.3, 'rgba(255,220,150,0.2)');
              g.addColorStop(1, 'rgba(255,200,100,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.moveTo(0, -1.5);
              ctx.lineTo(120, -0.5);
              ctx.lineTo(120, 0.5);
              ctx.lineTo(0, 1.5);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
            return new THREE.CanvasTexture(c);
          })();

          const flarePos = flareSunDir.clone().multiplyScalar(800);

          // Layer 1: Main sun glow (massive cinematic star)
          const mainMat = new THREE.SpriteMaterial({
            map: mainTex, transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false, depthTest: false, opacity: 0.9
          });
          const mainFlare = new THREE.Sprite(mainMat);
          mainFlare.position.copy(flarePos);
          mainFlare.scale.set(150, 150, 1);
          scene.add(mainFlare);

          // Layer 2: Starburst rays
          const rayMat = new THREE.SpriteMaterial({
            map: rayTex, transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false, depthTest: false, opacity: 0.6
          });
          const rays = new THREE.Sprite(rayMat);
          rays.position.copy(flarePos);
          rays.scale.set(300, 300, 1);
          scene.add(rays);

          // Layer 3: Wide halo
          const haloMat = new THREE.SpriteMaterial({
            map: haloTex, transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false, depthTest: false, opacity: 0.35
          });
          const halo = new THREE.Sprite(haloMat);
          halo.position.copy(flarePos);
          halo.scale.set(550, 550, 1);
          scene.add(halo);

          // Layer 4: JJ Abrams anamorphic horizontal streak
          const anamorphicTex = (() => {
            const c = document.createElement('canvas');
            c.width = 512; c.height = 64;
            const ctx = c.getContext('2d');
            const g = ctx.createLinearGradient(0, 32, 512, 32);
            g.addColorStop(0, 'rgba(100,150,255,0)');
            g.addColorStop(0.15, 'rgba(150,180,255,0.03)');
            g.addColorStop(0.35, 'rgba(200,220,255,0.12)');
            g.addColorStop(0.5, 'rgba(255,250,240,0.4)');
            g.addColorStop(0.65, 'rgba(200,220,255,0.12)');
            g.addColorStop(0.85, 'rgba(150,180,255,0.03)');
            g.addColorStop(1, 'rgba(100,150,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 512, 64);
            // Vertical fade for thin streak
            const vg = ctx.createLinearGradient(0, 0, 0, 64);
            vg.addColorStop(0, 'rgba(255,255,255,0)');
            vg.addColorStop(0.3, 'rgba(255,255,255,1)');
            vg.addColorStop(0.7, 'rgba(255,255,255,1)');
            vg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.globalCompositeOperation = 'destination-in';
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, 512, 64);
            return new THREE.CanvasTexture(c);
          })();
          const anamorphicMat = new THREE.SpriteMaterial({
            map: anamorphicTex, transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false, depthTest: false, opacity: 0.45
          });
          const anamorphic = new THREE.Sprite(anamorphicMat);
          anamorphic.position.copy(flarePos);
          anamorphic.scale.set(900, 40, 1);
          scene.add(anamorphic);

          // Lens artifacts along sun-to-center line
          const hexTex = (() => {
            const c = document.createElement('canvas');
            c.width = c.height = 64;
            const ctx = c.getContext('2d');
            const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 28);
            g.addColorStop(0, 'rgba(120,180,255,0.35)');
            g.addColorStop(0.6, 'rgba(160,100,255,0.1)');
            g.addColorStop(1, 'rgba(100,150,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (Math.PI / 3) * i - Math.PI / 6;
              const x = 32 + 26 * Math.cos(a);
              const y = 32 + 26 * Math.sin(a);
              i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            return new THREE.CanvasTexture(c);
          })();

          const artifacts = [];
          [0.3, 0.55, -0.15, -0.4, -0.7].forEach((t, i) => {
            const mat = new THREE.SpriteMaterial({
              map: hexTex, transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false, depthTest: false,
              opacity: 0.2 - i * 0.02,
              color: i % 2 === 0 ? 0x88aaff : 0xcc88ff
            });
            const s = new THREE.Sprite(mat);
            s.position.copy(flareSunDir.clone().multiplyScalar(800 * (1 - t)));
            const size = 12 + i * 8;
            s.scale.set(size, size, 1);
            scene.add(s);
            artifacts.push(s);
          });

          globe.lensFlare = { main: mainFlare, rays, halo, anamorphic, artifacts };
        }

        // --- D3. Sun Rays (animated volumetric light beams from sun) ---
        if (!globe.sunRaysMesh) {
          const srp = editorParams.current;
          const sunRaysGeo = new THREE.PlaneGeometry(1, 1);
          const sunRaysMat = new THREE.ShaderMaterial({
            uniforms: {
              time: globe.customUniforms.time,
              rayIntensity: { value: srp.sunRaysIntensity },
              rayLength: { value: srp.sunRaysLength },
              rayCount: { value: srp.sunRaysCount },
              rayColor: { value: new THREE.Vector3(...srp.sunRaysColor) },
            },
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform float time;
              uniform float rayIntensity;
              uniform float rayLength;
              uniform float rayCount;
              uniform vec3 rayColor;
              varying vec2 vUv;

              // Hash for noise
              float hash(float n) { return fract(sin(n) * 43758.5453); }
              float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

              // 1D noise
              float noise(float p) {
                float i = floor(p);
                float f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(hash(i), hash(i + 1.0), f);
              }

              void main() {
                vec2 centered = vUv - 0.5;
                float dist = length(centered);
                float angle = atan(centered.y, centered.x);

                // Variable-width animated rays with noise modulation
                float rays = 0.0;
                float nRays = max(rayCount, 4.0);

                // Primary rays: thick, slow-moving
                for (float i = 0.0; i < 24.0; i++) {
                  if (i >= nRays) break;
                  float rayAngle = i * 6.2831853 / nRays;
                  float width = 0.02 + 0.015 * hash(i * 7.3); // varying widths
                  float shimmer = 1.0 + 0.3 * noise(time * 0.5 + i * 3.7); // animated flicker
                  float intensity = (1.0 + 0.5 * sin(i * 2.4)) * shimmer; // brightness variation
                  float angleDiff = abs(mod(angle - rayAngle + 3.14159, 6.28318) - 3.14159);
                  rays += intensity * exp(-angleDiff * angleDiff / (width * width));
                }
                rays /= nRays * 0.5; // normalize

                // Secondary fine rays: thin, faster shimmer
                float fineRays = 0.0;
                fineRays += pow(abs(cos(angle * nRays * 0.5 + time * 0.1)), 60.0) * 0.4;
                fineRays += pow(abs(cos(angle * nRays + time * 0.06)), 120.0) * 0.2;
                fineRays *= (1.0 + 0.5 * noise(time * 0.8 + angle * 3.0)); // noise modulation
                rays += fineRays;

                // Radial falloff with noise-modulated edge
                float noiseEdge = 1.0 + 0.15 * noise(angle * 5.0 + time * 0.2);
                float falloff = exp(-dist * rayLength * noiseEdge);

                // Bright core glow
                float core = exp(-dist * 15.0) * 0.6;
                float halo = exp(-dist * 4.0) * 0.15;

                float alpha = (rays * falloff + core + halo) * rayIntensity;
                alpha *= smoothstep(0.5, 0.0, dist);

                // Warm color gradient: hotter near center, cooler at edges
                vec3 col = mix(rayColor * 1.3, rayColor * 0.7, dist * 2.0);
                col += vec3(0.1, 0.05, 0.0) * core * 3.0; // warm core

                gl_FragColor = vec4(col * alpha, alpha);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide,
          });
          const sunRaysMesh = new THREE.Mesh(sunRaysGeo, sunRaysMat);
          sunRaysMesh.renderOrder = 999;
          const sunPos = globe.customUniforms.sunDir.value.clone().multiplyScalar(800);
          sunRaysMesh.position.copy(sunPos);
          sunRaysMesh.scale.set(600, 600, 1);
          // Billboard: always face camera
          sunRaysMesh.onBeforeRender = function(renderer, scene, camera) {
            this.quaternion.copy(camera.quaternion);
          };
          scene.add(sunRaysMesh);
          globe.sunRaysMesh = sunRaysMesh;
          globe.sunRaysMat = sunRaysMat;
        }

        // --- E. Tri-Layer Particles (TINY twinkling magic + deep stars + reaction bursts) ---
        if (!globe.particleSystem) {
          const bgStarCount = 8000;
          const dustCount = 5000;
          const totalCount = bgStarCount + dustCount;
          const posArr = new Float32Array(totalCount * 3);
          const scaleArr = new Float32Array(totalCount);
          const colorArr = new Float32Array(totalCount * 3);
          const typeArr = new Float32Array(totalCount);
          const burstOffsetArr = new Float32Array(totalCount * 3); // for crazy hit bursts

          for (let i = 0; i < totalCount; i++) {
            const isDust = i >= bgStarCount;
            // Magically hugging the atmosphere
            const r = isDust ? (101.5 + Math.random() * 8) : (400 + Math.random() * 800);
            const theta = 2 * Math.PI * Math.random();
            const phi = Math.acos(2 * Math.random() - 1);
            posArr[i*3] = r * Math.sin(phi) * Math.cos(theta);
            posArr[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
            posArr[i*3+2] = r * Math.cos(phi);
            scaleArr[i] = Math.random();
            typeArr[i] = isDust ? 1.0 : 0.0;

            // Random burst offsets (outwards)
            burstOffsetArr[i*3] = posArr[i*3] * (Math.random() * 0.2);
            burstOffsetArr[i*3+1] = posArr[i*3+1] * (Math.random() * 0.2);
            burstOffsetArr[i*3+2] = posArr[i*3+2] * (Math.random() * 0.2);

            if (isDust) {
              const m = Math.random();
              (m > 0.66 ? new THREE.Color(0x7c3aed) : m > 0.33 ? new THREE.Color(0x38bdf8) : new THREE.Color(0xf472b6)).toArray(colorArr, i*3);
            } else {
              (Math.random() > 0.8 ? new THREE.Color(0xaae3ff) : new THREE.Color(0xffffff)).toArray(colorArr, i*3);
            }
          }

          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
          geo.setAttribute('aScale', new THREE.BufferAttribute(scaleArr, 1));
          geo.setAttribute('customColor', new THREE.BufferAttribute(colorArr, 3));
          geo.setAttribute('pType', new THREE.BufferAttribute(typeArr, 1));
          geo.setAttribute('burstOffset', new THREE.BufferAttribute(burstOffsetArr, 3));

          // Mouse tracking for particle ripples
          const mouseWorld = new THREE.Vector3(0, 0, 0);
          const mouseUniforms = { value: mouseWorld };
          globe._particleMousePos = mouseWorld;
          const globeEl = mapContainerRef.current;
          if (globeEl) {
            const onMouseMove = (e) => {
              const rect = globeEl.getBoundingClientRect();
              const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
              const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
              // Project mouse into 3D space near the globe surface
              const cam = globe.camera();
              if (cam) {
                const ray = new THREE.Vector3(nx, ny, 0.5).unproject(cam);
                const dir = ray.sub(cam.position).normalize();
                // Intersect with sphere of radius ~105 (dust cloud region)
                const a = dir.dot(dir);
                const b = 2 * cam.position.dot(dir);
                const c = cam.position.dot(cam.position) - 105 * 105;
                const disc = b * b - 4 * a * c;
                if (disc > 0) {
                  const t = (-b - Math.sqrt(disc)) / (2 * a);
                  if (t > 0) {
                    mouseWorld.copy(cam.position).add(dir.multiplyScalar(t));
                  }
                }
              }
            };
            globeEl.addEventListener('mousemove', onMouseMove);
            globe._particleMouseCleanup = () => globeEl.removeEventListener('mousemove', onMouseMove);
          }

          const pp = editorParams.current;
          const pMat = new THREE.ShaderMaterial({
            uniforms: {
              time: globe.customUniforms.time,
              audioPulse: globe.customUniforms.audioPulse,
              prismPulse: globe.customUniforms.prismPulse,
              pixelRatio: { value: window.devicePixelRatio || 1 },
              mousePos: mouseUniforms,
              starTwinkleBase: { value: pp.starTwinkleBase },
              starTwinkleDepth: { value: pp.starTwinkleDepth },
              starTwinkleSpeed: { value: pp.starTwinkleSpeed },
              starSize: { value: pp.starSize },
              dustSize: { value: pp.dustSize },
              dustSpeed: { value: pp.dustSpeed },
              dustAmplitude: { value: pp.dustAmplitude },
              mouseRippleRadius: { value: pp.mouseRippleRadius },
              bopParticleBurst: { value: pp.bopParticleBurst },
              bopColorShift: { value: pp.bopColorShift },
              bopStarBurst: { value: pp.bopStarBurst },
            },
            vertexShader: `
              uniform float time; uniform float audioPulse; uniform float prismPulse; uniform float pixelRatio;
              uniform vec3 mousePos;
              uniform float starTwinkleBase;
              uniform float starTwinkleDepth;
              uniform float starTwinkleSpeed;
              uniform float starSize;
              uniform float dustSize;
              uniform float dustSpeed;
              uniform float dustAmplitude;
              uniform float mouseRippleRadius;
              uniform float bopParticleBurst;
              uniform float bopStarBurst;
              attribute float aScale; attribute vec3 customColor; attribute float pType; attribute vec3 burstOffset;
              varying vec3 vColor; varying float vType; varying float vMouseDist;
              void main() {
                vColor = customColor; vType = pType;
                vec3 pos = position;
                if (pType > 0.5) {
                  float speed = time * (dustSpeed + prismPulse * 0.3);
                  // Gentle orbital drift
                  pos.x += sin(speed*0.5+pos.y*0.05)*(dustAmplitude+audioPulse*4.0);
                  pos.y += cos(speed*0.3+pos.x*0.05)*(dustAmplitude+audioPulse*4.0);
                  pos.z += sin(speed*0.4+pos.z*0.05)*(dustAmplitude+audioPulse*4.0);
                  // Gentle breathing on bop, no explosion
                  pos += burstOffset * prismPulse * 0.05;

                  // Mouse ripple: particles near mouse get pushed outward like water
                  float mouseDist = distance(pos, mousePos);
                  if (mouseDist < mouseRippleRadius && length(mousePos) > 1.0) {
                    vec3 pushDir = normalize(pos - mousePos);
                    float rippleStr = (1.0 - mouseDist / mouseRippleRadius);
                    rippleStr = rippleStr * rippleStr * 3.0;
                    // Ripple wave - particles oscillate as the ripple passes through
                    float wave = sin(mouseDist * 0.5 - time * 4.0) * 0.5 + 0.5;
                    pos += pushDir * rippleStr * wave;
                  }
                  vMouseDist = mouseDist;
                } else {
                  vMouseDist = 999.0;
                }
                vec4 mv = modelViewMatrix * vec4(pos,1.0);
                gl_Position = projectionMatrix * mv;
                // Stars twinkle: each star gets unique flicker based on position
                float twinkle = 1.0;
                if (pType < 0.5) {
                  float starId = position.x * 73.1 + position.y * 127.3 + position.z * 57.7;
                  twinkle = starTwinkleBase + starTwinkleDepth * (0.5 + 0.5 * sin(time * (starTwinkleSpeed + fract(starId) * 3.0) + starId));
                }
                float baseSize = (pType>0.5) ? aScale*dustSize*(1.0 + audioPulse*3.0 + prismPulse*bopParticleBurst) : aScale*starSize*(1.0+audioPulse*1.0 + prismPulse*bopStarBurst) * twinkle;
                gl_PointSize = baseSize * pixelRatio * (300.0 / -mv.z);
              }
            `,
            fragmentShader: `
              varying vec3 vColor; varying float vType; varying float vMouseDist;
              uniform float audioPulse; uniform float prismPulse; uniform float time;
              uniform float mouseRippleRadius;
              uniform float bopColorShift;
              void main() {
                vec2 xy = gl_PointCoord.xy - vec2(0.5);
                float ll = length(xy);
                if(ll>0.5) discard;
                float glow = (vType>0.5) ? smoothstep(0.5,0.0,ll) : smoothstep(0.5,0.4,ll);
                float alpha = glow * (0.6 + audioPulse*0.4 + prismPulse*0.3);

                // Mouse proximity glow - particles near cursor glow brighter
                float mouseGlow = (vMouseDist < mouseRippleRadius) ? (1.0 - vMouseDist / mouseRippleRadius) * 0.5 : 0.0;

                // Prismatic color shift (intensity controlled by bopColorShift)
                vec3 prismatic = vec3(
                  0.5 + 0.5 * sin(time * 3.0),
                  0.5 + 0.5 * sin(time * 3.0 + 2.094),
                  0.5 + 0.5 * sin(time * 3.0 + 4.189)
                );
                vec3 shimmer = mix(vColor, prismatic, prismPulse * bopColorShift);
                // Mouse makes nearby particles glow white/bright
                shimmer += vec3(0.3, 0.5, 1.0) * mouseGlow;
                gl_FragColor = vec4(shimmer*(1.0 + audioPulse*0.8 + prismPulse*0.3 + mouseGlow), alpha + mouseGlow * 0.3);
              }
            `,
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
          });
          const pts = new THREE.Points(geo, pMat);
          scene.add(pts);
          globe.particleSystem = pts;
        }

        // --- E2. Wind Particles (interactive fluid physics around globe) ---
        if (!globe.windParticles) {
          const windCount = 30000;
          const windPos = new Float32Array(windCount * 3);
          const windVel = new Float32Array(windCount * 3);
          const windCol = new Float32Array(windCount * 3);
          const windOrigPos = new Float32Array(windCount * 3);
          const windHomeR = new Float32Array(windCount); // store home radius per particle

          for (let i = 0; i < windCount; i++) {
            const idx = i * 3;
            // Wider shell distribution weighted toward inner (near-surface) region
            const t = Math.random();
            const r = 101.2 + t * t * 14; // bias toward surface, spread to r=115
            const theta = Math.PI * 2 * Math.random();
            const phi = Math.acos(2 * Math.random() - 1);
            windPos[idx]     = r * Math.sin(phi) * Math.cos(theta);
            windPos[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
            windPos[idx + 2] = r * Math.cos(phi);
            windOrigPos[idx]     = windPos[idx];
            windOrigPos[idx + 1] = windPos[idx + 1];
            windOrigPos[idx + 2] = windPos[idx + 2];
            windHomeR[i] = r;
            // Random gentle tangential initial velocity (varied directions)
            const nx = windPos[idx]/r, ny = windPos[idx+1]/r, nz = windPos[idx+2]/r;
            // Pick random perpendicular direction
            const ax = Math.random() - 0.5, ay = Math.random() - 0.5, az = Math.random() - 0.5;
            let tx = ay * nz - az * ny, ty = az * nx - ax * nz, tz = ax * ny - ay * nx;
            const tl = Math.sqrt(tx*tx + ty*ty + tz*tz) || 1;
            const initSpeed = 0.005 + Math.random() * 0.015;
            windVel[idx]     = (tx/tl) * initSpeed;
            windVel[idx + 1] = (ty/tl) * initSpeed;
            windVel[idx + 2] = (tz/tl) * initSpeed;
            // Warm-cool spectrum: inner particles warm, outer particles cool
            const depthFrac = (r - 101.2) / 14;
            const hue = 0.55 + depthFrac * 0.35; // blue→purple range
            const sat = 0.3 + Math.random() * 0.3;
            const lit = 0.25 + Math.random() * 0.2;
            const color = new THREE.Color().setHSL(hue, sat, lit);
            windCol[idx]     = color.r;
            windCol[idx + 1] = color.g;
            windCol[idx + 2] = color.b;
          }

          const windGeo = new THREE.BufferGeometry();
          windGeo.setAttribute('position', new THREE.BufferAttribute(windPos, 3));
          windGeo.setAttribute('color', new THREE.BufferAttribute(windCol, 3));

          const windMat = new THREE.PointsMaterial({
            size: 0.05,
            blending: THREE.AdditiveBlending,
            transparent: true,
            sizeAttenuation: true,
            vertexColors: true,
            depthWrite: false,
            opacity: 0.5,
          });

          const windPts = new THREE.Points(windGeo, windMat);
          scene.add(windPts);
          globe.windParticles = windPts;
          globe._windVel = windVel;
          globe._windOrigPos = windOrigPos;
          globe._windHomeR = windHomeR;
          globe._windCount = windCount;
          // Spin tracking state
          globe._prevCamPos = new THREE.Vector3();
          globe._angularVel = new THREE.Vector3(0, 0, 0);
          globe._spinMagnitude = 0;
        }

        // --- F. Orbiting Objects + Micro Hidden Gems ---
        if (!globe.satellitesGroup) {
          globe.satellitesGroup = new THREE.Group();
          scene.add(globe.satellitesGroup);

          const satColors = [0xffffff, 0x38bdf8, 0xfbbf24, 0xf472b6];
          // Satellites with solar panels
          for(let i=0; i<15; i++) {
            const satGroup = new THREE.Group();
            // Main body
            const body = new THREE.Mesh(
              new THREE.BoxGeometry(0.8, 0.4, 0.8),
              new THREE.MeshBasicMaterial({ color: satColors[i % satColors.length], wireframe: true })
            );
            satGroup.add(body);
            // Solar panels (two wings)
            const panelMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.7 });
            const panel1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.6), panelMat);
            panel1.position.x = 1.3;
            satGroup.add(panel1);
            const panel2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.6), panelMat);
            panel2.position.x = -1.3;
            satGroup.add(panel2);
            // Antenna
            const ant = new THREE.Mesh(
              new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4),
              new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
            );
            ant.position.y = 0.5;
            satGroup.add(ant);
            satGroup.userData = {
              r: 112 + Math.random() * 15,
              lat: (Math.random() - 0.5) * Math.PI,
              lng: (Math.random() - 0.5) * Math.PI * 2,
              speedLat: (Math.random() - 0.5) * 0.05,
              speedLng: (Math.random() - 0.5) * 0.08 + 0.02
            };
            globe.satellitesGroup.add(satGroup);
          }

          // Airplane shapes (visible at normal zoom)
          for(let i=0; i<12; i++) {
            const planeGroup = new THREE.Group();
            // Fuselage
            const body = new THREE.Mesh(
              new THREE.CylinderGeometry(0.08, 0.05, 0.8, 6),
              new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.7 })
            );
            body.rotation.z = Math.PI / 2;
            planeGroup.add(body);
            // Wings
            const wing = new THREE.Mesh(
              new THREE.BoxGeometry(0.15, 0.02, 0.7),
              new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.6 })
            );
            planeGroup.add(wing);
            // Tail
            const tail = new THREE.Mesh(
              new THREE.BoxGeometry(0.08, 0.25, 0.02),
              new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.5 })
            );
            tail.position.set(-0.35, 0.1, 0);
            planeGroup.add(tail);
            // Contrail (thin trailing line)
            const trailGeo = new THREE.CylinderGeometry(0.01, 0.0, 1.5, 4);
            const trailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
            const trail = new THREE.Mesh(trailGeo, trailMat);
            trail.rotation.z = Math.PI / 2;
            trail.position.x = -1.1;
            planeGroup.add(trail);
            planeGroup.userData = {
              r: 100.6 + Math.random() * 0.8,
              lat: (Math.random() - 0.5) * Math.PI * 0.8,
              lng: Math.random() * Math.PI * 2,
              speedLat: (Math.random() - 0.5) * 0.01,
              speedLng: 0.03 + Math.random() * 0.04,
              type: 'plane'
            };
            globe.satellitesGroup.add(planeGroup);
          }

          // Cars on the surface (small glowing boxes with headlights)
          for(let i=0; i<8; i++) {
            const carGroup = new THREE.Group();
            const carColor = [0xef4444, 0xfbbf24, 0x22c55e, 0x38bdf8][i%4];
            const carBody = new THREE.Mesh(
              new THREE.BoxGeometry(0.2, 0.08, 0.1),
              new THREE.MeshBasicMaterial({ color: carColor, wireframe: true, transparent: true, opacity: 0.6 })
            );
            carGroup.add(carBody);
            // Headlights (tiny bright dots)
            const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.9 });
            const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), hlMat);
            hl1.position.set(0.1, 0, 0.04);
            carGroup.add(hl1);
            const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), hlMat);
            hl2.position.set(0.1, 0, -0.04);
            carGroup.add(hl2);
            carGroup.userData = {
              r: 100.15,
              lat: (Math.random() - 0.5) * Math.PI * 0.6,
              lng: Math.random() * Math.PI * 2,
              speedLat: 0,
              speedLng: 0.005 + Math.random() * 0.01,
              type: 'car'
            };
            globe.satellitesGroup.add(carGroup);
          }

          // Spirit wisps (glowing orbs near surface)
          for(let i=0; i<20; i++) {
            const wispGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 6, 6);
            const wispMat = new THREE.MeshBasicMaterial({
              color: [0x7c3aed, 0x38bdf8, 0xf472b6, 0x22c55e, 0xfbbf24][i%5],
              wireframe: true,
              transparent: true,
              opacity: 0.4 + Math.random() * 0.3
            });
            const wisp = new THREE.Mesh(wispGeo, wispMat);
            wisp.userData = {
              r: 100.3 + Math.random() * 1.0,
              lat: (Math.random() - 0.5) * Math.PI,
              lng: Math.random() * Math.PI * 2,
              speedLat: (Math.random() - 0.5) * 0.02,
              speedLng: (Math.random() - 0.5) * 0.03,
              type: 'wisp',
              bobPhase: Math.random() * Math.PI * 2,
              bobSpeed: 1.0 + Math.random() * 2.0
            };
            globe.satellitesGroup.add(wisp);
          }
        }

        // ------------------------------------------------------------------
        // CINEMATIC ENTRANCE - fade reveal + sweeping camera
        // ------------------------------------------------------------------
        window._expeditions = expeditions; // expose for editor preview buttons
        if (!hasAnimatedIn.current) {
          hasAnimatedIn.current = true;
          const first = expeditions[0];
          // Position camera BEFORE revealing (container starts at opacity 0)
          const ep0 = editorParams.current;
          globe.pointOfView({ lat: first.lat + (ep0.cameraStartLatOffset ?? 25), lng: first.lng + (ep0.cameraStartLngOffset ?? -50), altitude: ep0.cameraStartAlt ?? 3.0 }, 0);

          // Reveal the globe (CSS opacity transition handles the fade)
          requestAnimationFrame(() => setGlobeReady(true));

          // Begin cinematic sweep
          setTimeout(() => {
            if (!globeRef.current) return;
            globeRef.current.pointOfView({ lat: first.lat, lng: first.lng, altitude: ep0.cameraIntroAlt ?? 1.5 }, ep0.cameraIntroSpeed ?? 4000);

            setTimeout(() => {
              if (globeRef.current) {
                const c = globeRef.current.controls();
                if (c) c.enableZoom = true;
              }
              startGlobeCycle();
            }, 4500);
          }, 200);
        }

        // --- G0. Post-Processing Pipeline (via library's EffectComposer) ---
        if (!globe.ppPass) {
          const renderer = globe.renderer();
          const composer = globe.postProcessingComposer();
          const ppShader = {
            uniforms: {
              tDiffuse: { value: null }, // auto-set by ShaderPass from previous pass
              time: sharedUniforms.current.time,
              resolution: { value: new THREE.Vector2(renderer.domElement.width, renderer.domElement.height) },
              chromaticAberration: { value: editorParams.current.ppChromaticAberration },
              vignetteStrength: { value: editorParams.current.ppVignetteStrength },
              vignetteRadius: { value: editorParams.current.ppVignetteRadius },
              brightness: { value: editorParams.current.ppBrightness },
              contrast: { value: editorParams.current.ppContrast },
              saturation: { value: editorParams.current.ppSaturation },
              gamma: { value: editorParams.current.ppGamma },
              tint: { value: new THREE.Vector3(...editorParams.current.ppTint) },
              filmGrain: { value: editorParams.current.ppFilmGrain },
              scanLines: { value: editorParams.current.ppScanLines },
              scanLineSpeed: { value: editorParams.current.ppScanLineSpeed },
              glitch: { value: editorParams.current.tvGlitch },
              glitchSpeed: { value: editorParams.current.tvGlitchSpeed },
              staticNoise: { value: editorParams.current.tvStaticNoise },
              barrelDistortion: { value: editorParams.current.tvBarrelDistortion },
              rgbShift: { value: editorParams.current.tvRGBShift },
              scanLineJitter: { value: editorParams.current.tvScanLineJitter },
              colorBleed: { value: editorParams.current.tvColorBleed },
              // God rays
              sunScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
              godRaysEnabled: { value: editorParams.current.godRaysEnabled ? 1.0 : 0.0 },
              godRaysDensity: { value: editorParams.current.godRaysDensity },
              godRaysWeight: { value: editorParams.current.godRaysWeight },
              godRaysDecay: { value: editorParams.current.godRaysDecay },
              godRaysExposure: { value: editorParams.current.godRaysExposure },
              // Breakout masking (open-top card rect — dome extends freely above)
              breakoutEnabled: { value: 0.0 },
              cardRect: { value: new THREE.Vector4(0, 0, 1, 1) },
              cardRadius: { value: 28.0 },
              breakoutSoftBlend: { value: 30.0 },
              breakoutContentThresh: { value: 0.1 },
            },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `
              uniform sampler2D tDiffuse;
              uniform float time;
              uniform vec2 resolution;
              uniform float chromaticAberration;
              uniform float vignetteStrength;
              uniform float vignetteRadius;
              uniform float brightness;
              uniform float contrast;
              uniform float saturation;
              uniform float gamma;
              uniform vec3 tint;
              uniform float filmGrain;
              uniform float scanLines;
              uniform float scanLineSpeed;
              uniform float glitch;
              uniform float glitchSpeed;
              uniform float staticNoise;
              uniform float barrelDistortion;
              uniform float rgbShift;
              uniform float scanLineJitter;
              uniform float colorBleed;
              uniform vec2 sunScreenPos;
              uniform float godRaysEnabled;
              uniform float godRaysDensity;
              uniform float godRaysWeight;
              uniform float godRaysDecay;
              uniform float godRaysExposure;
              uniform float breakoutEnabled;
              uniform vec4 cardRect;
              uniform float cardRadius;
              uniform float breakoutSoftBlend;
              uniform float breakoutContentThresh;
              varying vec2 vUv;

              float hash12(vec2 p) {
                p = fract(p * vec2(234.34, 435.345));
                p += dot(p, p + 34.23);
                return fract(p.x * p.y);
              }

              vec2 barrelDistort(vec2 uv, float amount) {
                vec2 c = uv * 2.0 - 1.0;
                float r2 = dot(c, c);
                c *= 1.0 + amount * r2;
                return c * 0.5 + 0.5;
              }

              // Signed distance to rounded rectangle
              float sdRoundedBox(vec2 p, vec2 center, vec2 halfSize, float r) {
                vec2 d = abs(p - center) - halfSize + r;
                return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
              }

              void main() {
                vec2 uv = vUv;

                // Barrel distortion (CRT/lens curve)
                if (barrelDistortion > 0.001) {
                  uv = barrelDistort(uv, barrelDistortion);
                  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                    gl_FragColor = vec4(0.0); return;
                  }
                }

                // Glitch horizontal displacement
                float glitchOffset = 0.0;
                if (glitch > 0.001) {
                  float gt = time * glitchSpeed;
                  float glitchBlock = floor(uv.y * 20.0 + gt * 3.0);
                  float r = hash12(vec2(glitchBlock, floor(gt * 10.0)));
                  if (r > (1.0 - glitch * 0.3)) {
                    glitchOffset = (hash12(vec2(glitchBlock * 0.3, gt)) - 0.5) * glitch * 0.1;
                  }
                  uv.x += glitchOffset;
                }

                // Scan line jitter (TV wobble)
                if (scanLineJitter > 0.001) {
                  float jLine = floor(uv.y * resolution.y * 0.5);
                  float jitter = (hash12(vec2(jLine, floor(time * 30.0))) - 0.5) * scanLineJitter * 0.01;
                  uv.x += jitter;
                }

                // Chromatic aberration + RGB shift
                vec2 dir = (uv - 0.5) * chromaticAberration;
                vec2 rgbOff = vec2(rgbShift * 0.01, 0.0);
                vec3 col;
                col.r = texture2D(tDiffuse, uv + dir + rgbOff).r;
                col.g = texture2D(tDiffuse, uv).g;
                col.b = texture2D(tDiffuse, uv - dir - rgbOff).b;

                // Color bleed (TV ghosting)
                if (colorBleed > 0.001) {
                  vec3 bleed = texture2D(tDiffuse, uv + vec2(colorBleed * 0.01, 0.0)).rgb;
                  col = mix(col, bleed, colorBleed * 0.3);
                }

                // God rays: noise-modulated volumetric radial blur
                if (godRaysEnabled > 0.5) {
                  vec2 sunToUv = uv - sunScreenPos;
                  float sunDist = length(sunToUv);
                  float sunAngle = atan(sunToUv.y, sunToUv.x);
                  vec2 delta = sunToUv * (1.0 / 60.0 * godRaysDensity);
                  vec2 tc = uv;
                  float illumDecay = 1.0;
                  vec3 godRayColor = vec3(0.0);
                  for (int i = 0; i < 60; i++) {
                    tc -= delta;
                    // Noise modulation: organic ray density variation
                    float fi = float(i);
                    float noiseVal = fract(sin(dot(tc * 100.0 + fi * 0.1, vec2(12.9898, 78.233))) * 43758.5453);
                    float rayNoise = 0.7 + 0.3 * noiseVal;
                    vec3 s = texture2D(tDiffuse, clamp(tc, 0.0, 1.0)).rgb;
                    s *= illumDecay * godRaysWeight * rayNoise;
                    godRayColor += s;
                    illumDecay *= godRaysDecay;
                  }
                  // Warm atmospheric color tint near sun
                  vec3 warmTint = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.7, 0.4), smoothstep(0.0, 0.6, sunDist));
                  col += godRayColor * godRaysExposure * warmTint;
                }

                // Color grading: brightness, contrast, saturation
                col += brightness;
                col = (col - 0.5) * contrast + 0.5;
                float luma = dot(col, vec3(0.299, 0.587, 0.114));
                col = mix(vec3(luma), col, saturation);
                col *= tint;

                // Gamma
                col = pow(max(col, 0.0), vec3(1.0 / gamma));

                // Vignette
                float dist = distance(uv, vec2(0.5));
                float vig = smoothstep(vignetteRadius, vignetteRadius - vignetteStrength, dist);
                col *= vig;

                // Film grain
                if (filmGrain > 0.001) {
                  float grain = hash12(uv * resolution + time * 1000.0) * 2.0 - 1.0;
                  col += grain * filmGrain;
                }

                // Scan lines
                if (scanLines > 0.001) {
                  float scanLine = sin((uv.y * resolution.y + time * scanLineSpeed * 100.0) * 3.14159) * 0.5 + 0.5;
                  col *= 1.0 - scanLines * scanLine * 0.15;
                }

                // Static noise (TV snow)
                if (staticNoise > 0.001) {
                  float noise = hash12(uv * resolution + fract(time * 43.7));
                  col = mix(col, vec3(noise), staticNoise * 0.3);
                }

                // ── Breakout alpha mask: clip left/right/bottom to card, top is open ──
                if (breakoutEnabled > 0.5) {
                  // DOM coords are top-down (y=0 at top), GL UVs are bottom-up — flip Y
                  vec2 pixel = vec2(vUv.x * resolution.x, (1.0 - vUv.y) * resolution.y);

                  // Card SDF
                  vec2 cardCenter = vec2((cardRect.x + cardRect.z) * 0.5, (cardRect.y + cardRect.w) * 0.5);
                  vec2 cardHalf = vec2((cardRect.z - cardRect.x) * 0.5, (cardRect.w - cardRect.y) * 0.5);
                  float dOrigCard = sdRoundedBox(pixel, cardCenter, cardHalf, cardRadius);

                  // Open-top SDF: card rect extended far above (never clips the dome)
                  float cardMidX = cardCenter.x;
                  float cardHalfW = cardHalf.x;
                  float cardBottom = cardRect.w;
                  vec2 extCenter = vec2(cardMidX, (cardBottom - 2000.0) * 0.5);
                  vec2 extHalf = vec2(cardHalfW, (cardBottom + 2000.0) * 0.5);
                  float dRect = sdRoundedBox(pixel, extCenter, extHalf, cardRadius);
                  float maskAlpha = 1.0 - smoothstep(-0.5, 0.5, dRect);

                  // Scene alpha: 1.0 for globe surface, <1.0 for atmosphere glow, ~0 for empty space
                  float sceneAlpha = texture2D(tDiffuse, uv).a;

                  // Soft inside-card blend: gradually force alpha to 1.0 deeper inside card
                  float edgeDist = max(-dOrigCard, 0.0);
                  float softInside = smoothstep(0.0, breakoutSoftBlend, edgeDist);

                  // Content detection: any pixel with scene content stays fully opaque
                  // in the dome area — prevents the visible line where col *= finalAlpha
                  // would dim atmosphere glow differently at the card boundary
                  float domeContent = smoothstep(0.0, breakoutContentThresh, sceneAlpha);

                  // Final alpha: opaque if inside card OR has scene content, transparent only for empty dome space
                  float finalAlpha = maskAlpha * max(domeContent, softInside);

                  col *= finalAlpha;
                  gl_FragColor = vec4(clamp(col, 0.0, 1.0), finalAlpha);
                } else {
                  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
                }
              }
            `,
          };
          const ppPass = new ShaderPass(ppShader);
          composer.addPass(ppPass);
          globe.ppPass = ppPass;
        }

        // --- G. Animation loop for shaders & motion ---
        // HSL→RGB helper for wind particle color (zero-allocation)
        function _hsl2rgb(h, s, l) {
          let r, g, b;
          if (s === 0) { r = g = b = l; }
          else {
            const hue2rgb = (p, q, t) => {
              if (t < 0) t += 1; if (t > 1) t -= 1;
              if (t < 1/6) return p + (q - p) * 6 * t;
              if (t < 1/2) return q;
              if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
              return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
          }
          return [r, g, b];
        }

        const clock = new THREE.Clock();
        if (!globe.animateTick) {
          globe.animateTick = true;
          const tick = () => {
            if (globeRef.current && globe.customUniforms) {
              const ep = editorParams.current;
              const dt = clock.getDelta();
              const elTs = clock.getElapsedTime();

              // Animation pause: freeze time uniform
              if (!ep.animationPaused) {
                globe.customUniforms.time.value = elTs;
              }

              // Update sun position (supports manual time override)
              const newSunDir = getSunDirection(ep.timeOverrideHour);
              globe.customUniforms.sunDir.value.copy(newSunDir);
              if (globe._sunLight) globe._sunLight.position.copy(newSunDir.clone().multiplyScalar(200));

              // Visibility toggles
              if (globe.cloudMesh) globe.cloudMesh.visible = ep.cloudsVisible;
              if (globe.auroraMesh) globe.auroraMesh.visible = ep.auroraEnabled;
              if (globe.prismGlowMesh) {
                globe.prismGlowMesh.visible = ep.prismGlowEnabled;
                if (!ep.animationPaused && ep.prismGlowRotSpeed) {
                  globe.prismGlowMesh.rotation.y += dt * ep.prismGlowRotSpeed;
                }
                // Apply tilt alignment from editor
                globe.prismGlowMesh.rotation.x = ep.prismGlowTiltX + Math.sin(elTs * 0.05) * 0.05;
                globe.prismGlowMesh.rotation.z = ep.prismGlowTiltZ;
              }
              if (globe.envGlowMesh) {
                globe.envGlowMesh.visible = ep.envGlowEnabled;
                globe.envGlowMesh.rotation.x = ep.envGlowTiltX;
                globe.envGlowMesh.rotation.z = ep.envGlowTiltZ;
              }
              if (globe.lavaLampMesh) globe.lavaLampMesh.visible = ep.lavaLampEnabled;
              if (globe.lensFlare) {
                const lfVis = ep.lensFlareVisible;
                if (globe.lensFlare.main) globe.lensFlare.main.visible = lfVis && ep.flareMainVisible;
                if (globe.lensFlare.rays) globe.lensFlare.rays.visible = lfVis && ep.flareRaysVisible;
                if (globe.lensFlare.halo) globe.lensFlare.halo.visible = lfVis && ep.flareHaloVisible;
                if (globe.lensFlare.anamorphic) globe.lensFlare.anamorphic.visible = lfVis && ep.flareAnamorphicVisible;
                if (globe.lensFlare.artifacts) globe.lensFlare.artifacts.forEach(a => { a.visible = lfVis && ep.flareArtifactsVisible; });
              }
              if (globe.particleSystem) globe.particleSystem.visible = ep.starsVisible || ep.dustVisible;
              if (globe.windParticles) {
                globe.windParticles.visible = ep.windParticlesVisible !== false;
                // Rebuild if particle count changed
                const targetCount = ep.windParticleCount ?? 30000;
                if (globe._windCount !== targetCount) {
                  const scene = globe.scene();
                  scene.remove(globe.windParticles);
                  globe.windParticles.geometry.dispose();
                  globe.windParticles.material.dispose();
                  const wc = targetCount;
                  const wPos = new Float32Array(wc * 3);
                  const wVel = new Float32Array(wc * 3);
                  const wCol = new Float32Array(wc * 3);
                  const wOrig = new Float32Array(wc * 3);
                  const wHomeR = new Float32Array(wc);
                  for (let i = 0; i < wc; i++) {
                    const ix = i * 3;
                    const t2 = Math.random();
                    const r = 101.2 + t2 * t2 * 14;
                    const th = Math.PI * 2 * Math.random();
                    const ph = Math.acos(2 * Math.random() - 1);
                    wPos[ix] = r * Math.sin(ph) * Math.cos(th);
                    wPos[ix+1] = r * Math.sin(ph) * Math.sin(th);
                    wPos[ix+2] = r * Math.cos(ph);
                    wOrig[ix] = wPos[ix]; wOrig[ix+1] = wPos[ix+1]; wOrig[ix+2] = wPos[ix+2];
                    wHomeR[i] = r;
                    const nn = 1/r;
                    const ax2 = Math.random()-0.5, ay2 = Math.random()-0.5, az2 = Math.random()-0.5;
                    let tx2 = ay2*wPos[ix+2]*nn - az2*wPos[ix+1]*nn;
                    let ty2 = az2*wPos[ix]*nn - ax2*wPos[ix+2]*nn;
                    let tz2 = ax2*wPos[ix+1]*nn - ay2*wPos[ix]*nn;
                    const tl2 = Math.sqrt(tx2*tx2+ty2*ty2+tz2*tz2)||1;
                    const spd = 0.005 + Math.random()*0.015;
                    wVel[ix] = tx2/tl2*spd; wVel[ix+1] = ty2/tl2*spd; wVel[ix+2] = tz2/tl2*spd;
                    const df = (r-101.2)/14;
                    const h = 0.55+df*0.35, s = 0.3+Math.random()*0.3, l = 0.25+Math.random()*0.2;
                    const c = new THREE.Color().setHSL(h,s,l);
                    wCol[ix] = c.r; wCol[ix+1] = c.g; wCol[ix+2] = c.b;
                  }
                  const wGeo = new THREE.BufferGeometry();
                  wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
                  wGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 3));
                  const wMat = new THREE.PointsMaterial({
                    size: ep.windParticleSize ?? 0.35,
                    blending: THREE.AdditiveBlending, transparent: true,
                    sizeAttenuation: true, vertexColors: true, depthWrite: false,
                    opacity: ep.windParticleOpacity ?? 0.8,
                  });
                  const wPts = new THREE.Points(wGeo, wMat);
                  scene.add(wPts);
                  globe.windParticles = wPts;
                  globe._windVel = wVel;
                  globe._windOrigPos = wOrig;
                  globe._windHomeR = wHomeR;
                  globe._windCount = wc;
                }
              }
              if (globe.satellitesGroup) {
                globe.satellitesGroup.children.forEach(m => {
                  const ud = m.userData;
                  if (ud.type === 'plane') m.visible = ep.planesVisible;
                  else if (ud.type === 'car') m.visible = ep.carsVisible;
                  else if (ud.type === 'wisp') m.visible = ep.wispsVisible;
                  else m.visible = ep.satellitesVisible;
                });
              }


              // Decay intro aurora (swirling orb fades over ~5 seconds)
              if (globe.customUniforms.introIntensity.value > 0) {
                globe.customUniforms.introIntensity.value = Math.max(0, globe.customUniforms.introIntensity.value - dt * 0.5);
              }

              // Sync post-processing uniforms from editor params
              if (globe.ppPass) {
                globe.ppPass.enabled = ep.ppEnabled;
                const ppu = globe.ppPass.uniforms;
                ppu.time.value = elTs;
                // Update resolution to match current canvas
                const renderer = globe.renderer();
                ppu.resolution.value.set(renderer.domElement.width, renderer.domElement.height);
                ppu.chromaticAberration.value = ep.ppChromaticAberration;
                ppu.vignetteStrength.value = ep.ppVignetteStrength;
                ppu.vignetteRadius.value = ep.ppVignetteRadius;
                ppu.brightness.value = ep.ppBrightness;
                ppu.contrast.value = ep.ppContrast;
                ppu.saturation.value = ep.ppSaturation;
                ppu.gamma.value = ep.ppGamma;
                ppu.filmGrain.value = ep.ppFilmGrain;
                ppu.scanLines.value = ep.ppScanLines;
                ppu.scanLineSpeed.value = ep.ppScanLineSpeed;
                ppu.glitch.value = ep.tvEnabled ? ep.tvGlitch : 0;
                ppu.glitchSpeed.value = ep.tvGlitchSpeed;
                ppu.staticNoise.value = ep.tvEnabled ? ep.tvStaticNoise : 0;
                ppu.barrelDistortion.value = ep.tvEnabled ? ep.tvBarrelDistortion : 0;
                ppu.rgbShift.value = ep.tvEnabled ? ep.tvRGBShift : 0;
                ppu.scanLineJitter.value = ep.tvEnabled ? ep.tvScanLineJitter : 0;
                ppu.colorBleed.value = ep.tvEnabled ? ep.tvColorBleed : 0;
                // God rays uniforms
                ppu.godRaysEnabled.value = ep.godRaysEnabled ? 1.0 : 0.0;
                ppu.godRaysDensity.value = ep.godRaysDensity;
                ppu.godRaysWeight.value = ep.godRaysWeight;
                ppu.godRaysDecay.value = ep.godRaysDecay;
                ppu.godRaysExposure.value = ep.godRaysExposure;
                // Project sun position to screen space for god rays
                const cam = globe.camera();
                if (cam) {
                  const sunWorld = newSunDir.clone().multiplyScalar(800);
                  const projected = sunWorld.clone().project(cam);
                  ppu.sunScreenPos.value.set(
                    (projected.x + 1) * 0.5,
                    (projected.y + 1) * 0.5
                  );
                }
              }

              // Decay Prism Pulse (configurable via bopDecayRate)
              if (globe.customUniforms.prismPulse.value > 0) {
                 const ppv = globe.customUniforms.prismPulse.value;
                 const decay = ep.bopDecayRate || 0.08;
                 globe.customUniforms.prismPulse.value = Math.max(0, ppv - dt * (decay + ppv * (decay * 0.75)));

                 // Camera bop effects: zoom punch + shake
                 const cam = globe.camera();
                 if (cam) {
                   const zoomPunch = (ep.cameraBopZoomPunch ?? 0.15) * ppv;
                   cam.fov = 50 - zoomPunch * 8; // subtle FOV punch (default 50)
                   cam.updateProjectionMatrix();

                   const shakeInt = (ep.cameraBopShakeIntensity ?? 0.3) * ppv * ppv;
                   if (shakeInt > 0.001) {
                     cam.position.x += (Math.random() - 0.5) * shakeInt;
                     cam.position.y += (Math.random() - 0.5) * shakeInt;
                   }
                 }
              } else {
                // Reset FOV when no bop
                const cam = globe.camera();
                if (cam && Math.abs(cam.fov - 50) > 0.01) {
                  cam.fov += (50 - cam.fov) * 0.1;
                  cam.updateProjectionMatrix();
                }
              }

              // Read audio data from global analyser (set up by AudioContext.jsx)
              if (window.globalAnalyser) {
                window.globalAnalyser.getByteFrequencyData(audioDataArray);
                let sum = 0;
                for (let k = 0; k < 32; k++) sum += audioDataArray[k];
                globe.customUniforms.audioPulse.value = (sum / 32) / 255.0;
              }

              // Rotate cloud layer slowly (counter to globe rotation) + subtle tilt
              if (globe.cloudMesh && !ep.animationPaused) {
                globe.cloudMesh.rotation.y += dt * ep.cloudRotationSpeed;
                globe.cloudMesh.rotation.x = Math.sin(elTs * 0.03) * 0.005;
              }

              // Animate sun rays (volumetric shader beams) — uses flare occlusion for hiding behind globe
              if (globe.sunRaysMesh) {
                const sunRayVis = 1.0 - (globe._flareOcclusion || 0);
                globe.sunRaysMesh.visible = ep.sunRaysEnabled && sunRayVis > 0.01;
                globe.sunRaysMesh.position.copy(newSunDir.clone().multiplyScalar(800));
                // Update shader uniforms
                const srm = globe.sunRaysMat;
                if (srm) {
                  srm.uniforms.rayIntensity.value = ep.sunRaysIntensity * sunRayVis;
                  srm.uniforms.rayLength.value = ep.sunRaysLength;
                  srm.uniforms.rayCount.value = ep.sunRaysCount;
                  if (Array.isArray(ep.sunRaysColor)) srm.uniforms.rayColor.value.set(...ep.sunRaysColor);
                }
                const breathe = 1.0 + Math.sin(elTs * 0.3) * 0.05;
                const baseScale = ep.sunRaysLength * 200;
                globe.sunRaysMesh.scale.set(baseScale * breathe, baseScale * breathe, 1);
              }

              // Animate lens flare with occlusion (fades behind globe)
              if (globe.lensFlare) {
                const lf = globe.lensFlare;
                // Update flare positions to match dynamic sun direction
                const flareBasePos = newSunDir.clone().multiplyScalar(800);
                lf.main.position.copy(flareBasePos);
                if (lf.rays) lf.rays.position.copy(flareBasePos);
                if (lf.halo) lf.halo.position.copy(flareBasePos);
                if (lf.anamorphic) lf.anamorphic.position.copy(flareBasePos);
                if (lf.artifacts) {
                  const offsets = [0.3, 0.55, -0.15, -0.4, -0.7];
                  lf.artifacts.forEach((a, i) => {
                    a.position.copy(newSunDir.clone().multiplyScalar(800 * (1 - offsets[i])));
                  });
                }

                const camera = globe.camera();
                const flareWorldPos = lf.main.position.clone();

                // Occlusion: raycast from camera toward sun, check if globe blocks it
                let occlusionTarget = 0;
                if (camera && !globe._flareRaycaster) {
                  globe._flareRaycaster = new THREE.Raycaster();
                  globe._flareOcclusion = 0;
                }
                if (globe._flareRaycaster && camera) {
                  // Multi-ray occlusion for softer, more realistic eclipse
                  const sunDir = flareWorldPos.clone().sub(camera.position).normalize();
                  globe._flareRaycaster.set(camera.position, sunDir);
                  const hits = globe._globeMesh ? globe._flareRaycaster.intersectObjects([globe._globeMesh], false) : [];
                  const sunDist = camera.position.distanceTo(flareWorldPos);
                  occlusionTarget = (hits.length > 0 && hits[0].distance < sunDist) ? 1.0 : 0.0;

                  // Soft edge detection: check neighboring rays for partial occlusion
                  let edgeRays = 0;
                  const edgeOffsets = [0.015, -0.015, 0.008, -0.008];
                  const camRight = new THREE.Vector3().crossVectors(sunDir, camera.up).normalize();
                  const camUp = new THREE.Vector3().crossVectors(camRight, sunDir).normalize();
                  for (const off of edgeOffsets) {
                    const offsetDir = sunDir.clone().add(camRight.clone().multiplyScalar(off)).normalize();
                    globe._flareRaycaster.set(camera.position, offsetDir);
                    const h = globe._globeMesh ? globe._flareRaycaster.intersectObjects([globe._globeMesh], false) : [];
                    if (h.length > 0 && h[0].distance < sunDist) edgeRays++;
                  }
                  const partialOcclusion = edgeRays / edgeOffsets.length;
                  const isEdge = occlusionTarget > 0.5 && partialOcclusion < 0.8;

                  // Slower, more cinematic occlusion transition
                  globe._flareOcclusion += (occlusionTarget - globe._flareOcclusion) * Math.min(dt * 6.0, 1.0);
                  globe._flareEdge = isEdge ? Math.min((globe._flareEdge || 0) + dt * 3.0, 1.0)
                    : Math.max((globe._flareEdge || 0) - dt * 2.0, 0.0);
                }
                const flareVis = 1.0 - (globe._flareOcclusion || 0);
                const edgeEffect = globe._flareEdge || 0;
                const edgeDiff = ep.flareEdgeDiffraction * edgeEffect;

                if (lf.rays) {
                  lf.rays.material.rotation = elTs * 0.04;
                  // Edge diffraction: rays get BRIGHTER and more colorful at eclipse edge
                  const rayEdgeBoost = 1.0 + edgeDiff * 3.0;
                  lf.rays.material.opacity = (0.45 + Math.sin(elTs * 0.8) * 0.15) * ep.flareStarburstStrength * Math.max(flareVis, edgeDiff * 0.6) * rayEdgeBoost;
                  if (edgeEffect > 0.1) {
                    // Prismatic color shift during edge diffraction
                    const hue = elTs * 0.5;
                    lf.rays.material.color.setHSL((hue % 1.0), 0.3 + edgeEffect * 0.5, 0.7 + edgeEffect * 0.3);
                  } else {
                    lf.rays.material.color.setHex(0xffffff);
                  }
                }
                if (lf.main) {
                  const breathe = 1.0 + Math.sin(elTs * 1.2) * 0.12;
                  // Sun persists slightly even when partially occluded
                  const mainVis = Math.max(flareVis, edgeDiff * 0.4);
                  lf.main.scale.set(150 * breathe * (1.0 + edgeDiff * 0.5), 150 * breathe * (1.0 + edgeDiff * 0.5), 1);
                  lf.main.material.opacity = 0.9 * mainVis;
                }
                if (lf.halo) {
                  const hBreath = 1.0 + Math.sin(elTs * 0.5) * 0.08;
                  lf.halo.scale.set(550 * hBreath, 550 * hBreath, 1);
                  lf.halo.material.opacity = 0.4 * Math.max(flareVis, edgeDiff * 0.3);
                }
                if (lf.anamorphic) {
                  const streakBreath = 1.0 + Math.sin(elTs * 0.6) * 0.08;
                  // Anamorphic streak GROWS during edge occlusion (real optical flare behavior)
                  const anamVis = Math.max(flareVis, edgeDiff * 0.8);
                  const anamStretch = 1.0 + edgeDiff * 2.0;
                  lf.anamorphic.scale.set(900 * streakBreath * anamStretch * ep.flareAnamorphicStrength, 40, 1);
                  lf.anamorphic.material.opacity = 0.5 * anamVis;
                  if (edgeEffect > 0.1) {
                    lf.anamorphic.material.color.setHSL(0.6 + edgeEffect * 0.2, 0.5, 0.8);
                  } else {
                    lf.anamorphic.material.color.setHex(0xffffff);
                  }
                }
                if (lf.artifacts) {
                  lf.artifacts.forEach((a, i) => {
                    const baseOp = 0.2 - i * 0.02;
                    a.material.opacity = baseOp * Math.max(flareVis, edgeDiff * 0.5);
                    // Edge diffraction makes artifacts prismatic
                    if (edgeEffect > 0.1) {
                      a.material.color.setHSL((elTs * 0.3 + i * 0.15) % 1.0, 0.6 + edgeEffect * 0.3, 0.7);
                    }
                  });
                }
              }

              // Animate Satellites & Planes (respects speed multipliers + pause)
              if (globe.satellitesGroup && !ep.animationPaused) {
                const pp = globe.customUniforms.prismPulse.value;
                const globalPrismMultiplier = 1.0 + pp * 1.5;
                globe.satellitesGroup.children.forEach(m => {
                  if (!m.visible) return;
                  const ud = m.userData;
                  const speedMult = ud.type === 'plane' ? ep.planeSpeed
                    : ud.type === 'wisp' ? ep.wispSpeed
                    : ud.type === 'car' ? 1.0 : ep.satelliteSpeed;
                  ud.lat += ud.speedLat * dt * globalPrismMultiplier * speedMult;
                  ud.lng += ud.speedLng * dt * globalPrismMultiplier * speedMult;

                  // Apply editor scale multipliers
                  const scaleMult = ud.type === 'plane' ? ep.planeScale
                    : ud.type === 'car' ? ep.carScale
                    : ud.type === 'wisp' ? ep.wispScale
                    : ep.satelliteScale;
                  m.scale.set(scaleMult, scaleMult, scaleMult);

                  const phi = Math.PI / 2 - ud.lat;
                  const theta = ud.lng;
                  // Wisps bob up and down gently
                  const bobR = ud.type === 'wisp'
                    ? ud.r + Math.sin(elTs * ud.bobSpeed + ud.bobPhase) * 0.15
                    : ud.r;

                  m.position.x = bobR * Math.sin(phi) * Math.cos(theta);
                  m.position.y = bobR * Math.cos(phi);
                  m.position.z = bobR * Math.sin(phi) * Math.sin(theta);

                  if (ud.type === 'plane') {
                    // Planes orient in direction of travel
                    const fwdTheta = theta + ud.speedLng * 10;
                    const fwdX = ud.r * Math.sin(phi) * Math.cos(fwdTheta);
                    const fwdY = ud.r * Math.cos(phi);
                    const fwdZ = ud.r * Math.sin(phi) * Math.sin(fwdTheta);
                    m.lookAt(fwdX, fwdY, fwdZ);
                  } else if (ud.type === 'wisp') {
                    // Wisps pulse opacity
                    m.material.opacity = 0.3 + Math.sin(elTs * ud.bobSpeed + ud.bobPhase) * 0.2;
                  } else {
                    m.lookAt(0, 0, 0);
                  }
                });
              }

              // Wind particle physics (CPU-side fluid simulation with spin coupling)
              if (globe.windParticles && globe.windParticles.visible) {
                const wp = editorParams.current;
                const windGravity = wp.windGravity ?? 3.0;
                const windInfluenceRadius = wp.windInfluenceRadius ?? 18;
                const windDamping = wp.windDamping ?? 0.97;
                const windEscapeVel = wp.windEscapeVelocity ?? 0.5;
                const windColorSpeed = wp.windColorSpeed ?? 0.015;
                const windTrail = wp.windTrailEffect ?? 0.92;
                const windSpinInfluence = wp.windSpinInfluence ?? 0.4;
                const windTurbulence = wp.windTurbulence ?? 0.6;
                const windVortexStrength = wp.windVortexStrength ?? 0.5;
                const windHomeForce = wp.windHomeForce ?? 0.15;
                const windMaxSpeed = wp.windMaxSpeed ?? 0.8;
                const windShellInner = wp.windShellInner ?? 101.0;
                const windShellOuter = wp.windShellOuter ?? 116.0;
                const safeDt = Math.min(dt, 0.05); // cap dt to prevent explosion on tab-switch

                // --- Compute globe spin angular velocity from camera movement ---
                const cam = globe.camera();
                if (cam && globe._prevCamPos) {
                  const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
                  const px = globe._prevCamPos.x, py = globe._prevCamPos.y, pz = globe._prevCamPos.z;
                  const prevLenSq = px*px + py*py + pz*pz;
                  if (prevLenSq > 1.0 && safeDt > 0.0001) {
                    const curLen = Math.sqrt(cx*cx + cy*cy + cz*cz);
                    const prevLen = Math.sqrt(prevLenSq);
                    const cnx = cx/curLen, cny = cy/curLen, cnz = cz/curLen;
                    const pnx = px/prevLen, pny = py/prevLen, pnz = pz/prevLen;
                    const dotVal = Math.min(1, Math.max(-1, cnx*pnx + cny*pny + cnz*pnz));
                    const angle = Math.acos(dotVal);
                    if (angle > 0.000005) {
                      // Rotation axis = cross(prev, cur), negated for globe-relative
                      let axX = pny * cnz - pnz * cny;
                      let axY = pnz * cnx - pnx * cnz;
                      let axZ = pnx * cny - pny * cnx;
                      const axLen = Math.sqrt(axX*axX + axY*axY + axZ*axZ) || 1;
                      axX /= axLen; axY /= axLen; axZ /= axLen;
                      const spinSmooth = wp.windSpinSmoothing ?? 5.0;
                      const spinDecay = wp.windSpinDecay ?? 0.92;
                      const angSpeed = Math.min(angle / safeDt, (wp.windSpinMax ?? 6.0) * 1.5);
                      const smoothing = Math.min(safeDt * spinSmooth, 0.85);
                      const keep = 1 - smoothing;
                      globe._angularVel.x = globe._angularVel.x * keep + (-axX * angSpeed) * smoothing;
                      globe._angularVel.y = globe._angularVel.y * keep + (-axY * angSpeed) * smoothing;
                      globe._angularVel.z = globe._angularVel.z * keep + (-axZ * angSpeed) * smoothing;
                      globe._spinMagnitude = globe._spinMagnitude * keep + angSpeed * smoothing;
                    } else {
                      const spinDecay = wp.windSpinDecay ?? 0.92;
                      globe._angularVel.multiplyScalar(spinDecay);
                      globe._spinMagnitude *= spinDecay;
                    }
                  }
                  globe._prevCamPos.set(cx, cy, cz);
                }
                // Clamp spin magnitude to prevent runaway
                const spinMaxCap = wp.windSpinMax ?? 6.0;
                if (globe._spinMagnitude > spinMaxCap) {
                  const clampScale = spinMaxCap / globe._spinMagnitude;
                  globe._angularVel.multiplyScalar(clampScale);
                  globe._spinMagnitude = spinMaxCap;
                }
                const spinActive = globe._spinMagnitude > 0.02;
                const avx = globe._angularVel.x, avy = globe._angularVel.y, avz = globe._angularVel.z;

                const wPos = globe.windParticles.geometry.attributes.position.array;
                const wCol = globe.windParticles.geometry.attributes.color.array;
                const wVel = globe._windVel;
                const wOrig = globe._windOrigPos;
                const wHomeR = globe._windHomeR;
                const wCount = globe._windCount;
                const mouseHit = globe._particleMousePos;
                const mouseValid = mouseHit && mouseHit.lengthSq() > 1.0;
                const dt60 = safeDt * 60;

                for (let i = 0; i < wCount; i++) {
                  const idx = i * 3;
                  const x = wPos[idx], y = wPos[idx+1], z = wPos[idx+2];
                  const cDist = Math.sqrt(x*x + y*y + z*z) || 1;
                  const invDist = 1.0 / cDist;
                  const nx = x * invDist, ny = y * invDist, nz = z * invDist; // surface normal

                  // === Globe spin → surface-tangent atmospheric drag ===
                  if (spinActive && windSpinInfluence > 0) {
                    // Raw tangential velocity = cross(angularVel, position)
                    let svx = avy * z - avz * y;
                    let svy = avz * x - avx * z;
                    let svz = avx * y - avy * x;
                    // PROJECT onto sphere tangent plane (remove radial component!)
                    // This prevents particles from being pushed into a band
                    const radialComp = svx * nx + svy * ny + svz * nz;
                    svx -= radialComp * nx;
                    svy -= radialComp * ny;
                    svz -= radialComp * nz;
                    // Force falls off with distance from surface
                    const surfaceDist = cDist - 100;
                    const proximity = Math.max(0, 1.0 - surfaceDist / 12.0);
                    const spinForce = windSpinInfluence * proximity * proximity * safeDt;
                    wVel[idx]     += svx * spinForce;
                    wVel[idx + 1] += svy * spinForce;
                    wVel[idx + 2] += svz * spinForce;

                    // Vortex shedding — turbulent surface-tangent eddies
                    if (windVortexStrength > 0 && globe._spinMagnitude > 0.15) {
                      const vp = elTs * 2.5 + i * 0.37;
                      const vScale = windVortexStrength * proximity * Math.min(globe._spinMagnitude * 0.5, 1.0) * safeDt;
                      // Cross product of spin direction with normal → tangent perturbation
                      let px2 = svy * nz - svz * ny;
                      let py2 = svz * nx - svx * nz;
                      let pz2 = svx * ny - svy * nx;
                      const pl = Math.sqrt(px2*px2 + py2*py2 + pz2*pz2) || 1;
                      px2 /= pl; py2 /= pl; pz2 /= pl;
                      wVel[idx]     += px2 * Math.sin(vp) * vScale;
                      wVel[idx + 1] += py2 * Math.cos(vp * 0.7) * vScale;
                      wVel[idx + 2] += pz2 * Math.sin(vp * 1.3) * vScale;
                    }
                  }

                  // === Turbulence (coherent surface-tangent noise) ===
                  if (windTurbulence > 0) {
                    const s = 0.025;
                    const t = elTs * 0.6;
                    const noiseX = Math.sin(y*s*2.1 + t) * Math.cos(z*s*1.7 + t*0.6) + Math.sin(z*s*3.3 - t*0.4) * 0.5;
                    const noiseY = Math.cos(x*s*1.9 + t*0.7) * Math.sin(z*s*2.3 - t) + Math.cos(x*s*2.7 + t*0.3) * 0.5;
                    const noiseZ = Math.sin(x*s*2.5 + t*0.5) * Math.cos(y*s*1.3 + t*0.9) + Math.sin(y*s*3.1 - t*0.6) * 0.5;
                    // Project turbulence onto tangent plane too
                    const turbRad = noiseX * nx + noiseY * ny + noiseZ * nz;
                    const turbForce = windTurbulence * safeDt * 0.15;
                    wVel[idx]     += (noiseX - turbRad * nx) * turbForce;
                    wVel[idx + 1] += (noiseY - turbRad * ny) * turbForce;
                    wVel[idx + 2] += (noiseZ - turbRad * nz) * turbForce;
                  }

                  // === Mouse gravitational pull + swirl ===
                  let mouseInfluenced = false;
                  if (mouseValid) {
                    const dx = x - mouseHit.x;
                    const dy = y - mouseHit.y;
                    const dz = z - mouseHit.z;
                    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

                    if (dist < windInfluenceRadius && dist > 0.3) {
                      mouseInfluenced = true;
                      const force = windGravity / (dist * dist + 0.5);
                      const acc = force * safeDt;
                      const id = 1.0 / dist;
                      const rx = -dx * id, ry = -dy * id, rz = -dz * id;
                      // Tangential swirl direction
                      let stx = ry * nz - rz * ny;
                      let sty = rz * nx - rx * nz;
                      let stz = rx * ny - ry * nx;
                      const tLen = Math.sqrt(stx*stx + sty*sty + stz*stz) || 1;
                      stx /= tLen; sty /= tLen; stz /= tLen;
                      wVel[idx]     += rx * acc * 0.7 + stx * acc * 1.2;
                      wVel[idx + 1] += ry * acc * 0.7 + sty * acc * 1.2;
                      wVel[idx + 2] += rz * acc * 0.7 + stz * acc * 1.2;

                      // Dynamic color based on speed + distance
                      const speed = Math.sqrt(wVel[idx]*wVel[idx] + wVel[idx+1]*wVel[idx+1] + wVel[idx+2]*wVel[idx+2]);
                      const speedI = Math.min(speed / windEscapeVel, 1.0);
                      const distI = 1.0 - dist / windInfluenceRadius;
                      const hue = ((elTs * windColorSpeed + i * 0.0008) % 1.0 + speedI * 0.3) % 1.0;
                      const c = _hsl2rgb(hue, 0.7 + distI * 0.3, 0.35 + speedI * 0.5);
                      const blend = 0.3 + distI * 0.4;
                      wCol[idx]     = wCol[idx] * (1-blend) + Math.min(c[0] * (1 + speedI * 0.5), 1.0) * blend;
                      wCol[idx + 1] = wCol[idx+1] * (1-blend) + Math.min(c[1] * (1 + distI * 0.3), 1.0) * blend;
                      wCol[idx + 2] = wCol[idx+2] * (1-blend) + Math.min(c[2] * (1 + speedI * 0.4), 1.0) * blend;
                    }
                  }

                  // === Spin-driven color glow ===
                  if (spinActive && globe._spinMagnitude > 0.08) {
                    const speed = Math.sqrt(wVel[idx]*wVel[idx] + wVel[idx+1]*wVel[idx+1] + wVel[idx+2]*wVel[idx+2]);
                    const spinGlow = Math.min(globe._spinMagnitude * 0.15, 0.7);
                    const speedGlow = Math.min(speed / windEscapeVel, 1.0);
                    const spinHue = (elTs * windColorSpeed * 1.5 + i * 0.0002) % 1.0;
                    const sc = _hsl2rgb(spinHue, 0.5 + speedGlow * 0.4, 0.3 + spinGlow * 0.35);
                    const blend = spinGlow * 0.4;
                    wCol[idx]     = wCol[idx] * (1 - blend) + sc[0] * blend;
                    wCol[idx + 1] = wCol[idx+1] * (1 - blend) + sc[1] * blend;
                    wCol[idx + 2] = wCol[idx+2] * (1 - blend) + sc[2] * blend;
                  }

                  // === Ambient color drift (when not influenced by mouse) ===
                  if (!mouseInfluenced) {
                    const ambHue = (elTs * windColorSpeed * 0.2 + i * 0.00004) % 1.0;
                    const ac = _hsl2rgb(ambHue, 0.3, 0.22);
                    wCol[idx]     = wCol[idx] * windTrail + ac[0] * (1 - windTrail);
                    wCol[idx + 1] = wCol[idx+1] * windTrail + ac[1] * (1 - windTrail);
                    wCol[idx + 2] = wCol[idx+2] * windTrail + ac[2] * (1 - windTrail);
                  }

                  // === Home force — gentle spring back to original position ===
                  if (windHomeForce > 0) {
                    const homeX = wOrig[idx] - x, homeY = wOrig[idx+1] - y, homeZ = wOrig[idx+2] - z;
                    const homeDist = Math.sqrt(homeX*homeX + homeY*homeY + homeZ*homeZ);
                    if (homeDist > 2.0) {
                      const pull = windHomeForce * Math.min(homeDist * 0.01, 0.5) * safeDt;
                      wVel[idx]     += homeX / homeDist * pull;
                      wVel[idx + 1] += homeY / homeDist * pull;
                      wVel[idx + 2] += homeZ / homeDist * pull;
                    }
                  }

                  // === Subtle ambient drift (organic breathing) ===
                  const driftT = elTs * 0.3;
                  wVel[idx]   += Math.sin(driftT + wOrig[idx] * 0.08) * 0.0003;
                  wVel[idx+1] += Math.cos(driftT * 0.7 + wOrig[idx+1] * 0.08) * 0.0003;
                  wVel[idx+2] += Math.sin(driftT * 0.5 + wOrig[idx+2] * 0.08) * 0.0003;

                  // === Velocity clamping ===
                  const speed = Math.sqrt(wVel[idx]*wVel[idx] + wVel[idx+1]*wVel[idx+1] + wVel[idx+2]*wVel[idx+2]);
                  if (speed > windMaxSpeed) {
                    const clamp = windMaxSpeed / speed;
                    wVel[idx] *= clamp; wVel[idx+1] *= clamp; wVel[idx+2] *= clamp;
                  }

                  // === Integrate velocity → position ===
                  wPos[idx]     += wVel[idx] * dt60;
                  wPos[idx + 1] += wVel[idx+1] * dt60;
                  wPos[idx + 2] += wVel[idx+2] * dt60;

                  // === Damping ===
                  wVel[idx]   *= windDamping;
                  wVel[idx+1] *= windDamping;
                  wVel[idx+2] *= windDamping;

                  // === Shell constraint — soft radial spring at boundaries ===
                  const newDist = Math.sqrt(wPos[idx]*wPos[idx] + wPos[idx+1]*wPos[idx+1] + wPos[idx+2]*wPos[idx+2]) || 1;
                  if (newDist > windShellOuter) {
                    // Soft push inward (not hard clamp)
                    const over = newDist - windShellOuter;
                    const pushStrength = Math.min(over * 0.3, 2.0);
                    const bnx = wPos[idx]/newDist, bny = wPos[idx+1]/newDist, bnz = wPos[idx+2]/newDist;
                    wVel[idx]   -= bnx * pushStrength * safeDt * 60;
                    wVel[idx+1] -= bny * pushStrength * safeDt * 60;
                    wVel[idx+2] -= bnz * pushStrength * safeDt * 60;
                    // Hard limit if way out
                    if (newDist > windShellOuter + 5) {
                      const s = (windShellOuter + 2) / newDist;
                      wPos[idx] *= s; wPos[idx+1] *= s; wPos[idx+2] *= s;
                      wVel[idx] *= 0.3; wVel[idx+1] *= 0.3; wVel[idx+2] *= 0.3;
                    }
                  } else if (newDist < windShellInner) {
                    const under = windShellInner - newDist;
                    const pushStrength = Math.min(under * 0.5, 3.0);
                    const bnx = wPos[idx]/newDist, bny = wPos[idx+1]/newDist, bnz = wPos[idx+2]/newDist;
                    wVel[idx]   += bnx * pushStrength * safeDt * 60;
                    wVel[idx+1] += bny * pushStrength * safeDt * 60;
                    wVel[idx+2] += bnz * pushStrength * safeDt * 60;
                    if (newDist < windShellInner - 3) {
                      const s = (windShellInner + 1) / newDist;
                      wPos[idx] *= s; wPos[idx+1] *= s; wPos[idx+2] *= s;
                      wVel[idx] *= 0.3; wVel[idx+1] *= 0.3; wVel[idx+2] *= 0.3;
                    }
                  }
                }

                globe.windParticles.geometry.attributes.position.needsUpdate = true;
                globe.windParticles.geometry.attributes.color.needsUpdate = true;
              }

              // Globe breakout: update PP shader + camera offset
              if (globe.ppPass) {
                const ppu2 = globe.ppPass.uniforms;
                const cam = globe.camera();
                if (ep.globeBreakout && mapContainerRef.current && cam) {
                  const renderer = globe.renderer();
                  const canvasW = renderer.domElement.width;
                  const canvasH = renderer.domElement.height;
                  const mapRect = mapContainerRef.current.getBoundingClientRect();
                  const cellEl = mapContainerRef.current.parentElement;
                  const cellRect = cellEl.getBoundingClientRect();

                  // Card body in canvas pixel coordinates
                  const offsetX = cellRect.left - mapRect.left;
                  const offsetY = cellRect.top - mapRect.top;
                  const scaleX = canvasW / mapRect.width;
                  const scaleY = canvasH / mapRect.height;

                  ppu2.breakoutEnabled.value = 1.0;
                  ppu2.cardRect.value.set(
                    offsetX * scaleX,
                    offsetY * scaleY,
                    (offsetX + cellRect.width) * scaleX,
                    (offsetY + cellRect.height) * scaleY
                  );
                  ppu2.cardRadius.value = 28 * scaleX;
                  ppu2.breakoutSoftBlend.value = (ep.breakoutSoftBlend != null ? ep.breakoutSoftBlend : 30) * scaleY;
                  ppu2.breakoutContentThresh.value = ep.breakoutContentThreshold != null ? ep.breakoutContentThreshold : 0.1;

                  // Camera view offset: compensate for asymmetric canvas extension above card.
                  // Canvas is taller than card by breakoutPx at top and 10px at bottom.
                  // Shift the frustum DOWN so the globe renders centered in the card area, not canvas center.
                  const breakoutPx = ep.globeBreakoutPx || 60;
                  const extraAbove = breakoutPx - 10; // how much more canvas above vs below
                  const shiftPx = extraAbove / 2; // half the asymmetry
                  const dpr = renderer.getPixelRatio();
                  cam.setViewOffset(canvasW, canvasH, 0, Math.round(-shiftPx * dpr), canvasW, canvasH);

                  // Glass overlay clip: set CSS vars for mask-image gradient
                  cellEl.style.setProperty('--glass-clip-top', (ep.glassClipTop || 0) + 'px');
                  cellEl.style.setProperty('--glass-clip-feather', (ep.glassClipFeather || 30) + 'px');

                } else if (cam) {
                  ppu2.breakoutEnabled.value = 0.0;
                  // Clear view offset when breakout is off
                  cam.clearViewOffset();
                }
              }
            }
            requestAnimationFrame(tick);
          };
          tick();
        }

    } catch (e) {
        console.warn('Globe init error:', e);
      }
    }, 500);

    return () => {
      clearTimeout(initTimer);
      if (globeRef.current && handleStart) {
        try {
          const c = globeRef.current.controls();
          c.removeEventListener('start', handleStart);
          c.removeEventListener('end', handleEnd);
        } catch (_) {}
      }
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
      if (globeCycleTimer.current) clearInterval(globeCycleTimer.current);
      if (globeRef.current?._particleMouseCleanup) globeRef.current._particleMouseCleanup();
    };
  }, [globeMounted, startGlobeCycle]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % photos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const container = useRef();
  const [showBrand, setShowBrand] = useState(() => { try { return !sessionStorage.getItem('jarowe_visited'); } catch { return false; } });

  // Brand reveal - pure CSS animation handles visuals, this just dismisses the overlay
  useEffect(() => {
    if (!showBrand) return;
    const timer = setTimeout(() => {
      try { sessionStorage.setItem('jarowe_visited', 'true'); } catch {}
      setShowBrand(false);
    }, 3300);
    return () => clearTimeout(timer);
  }, [showBrand]);

  // 3D cell tracking
  useEffect(() => {
    const cells = document.querySelectorAll('.bento-cell.tilt-enabled');

    const handleMouseMove = (e) => {
      const cell = e.currentTarget;
      const rect = cell.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      cell.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = (e) => {
      const cell = e.currentTarget;
      // Step 1: restore transition
      cell.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      // Step 2: force reflow so browser registers the transition BEFORE the transform change
      void cell.offsetHeight;
      // Step 3: now animate back to neutral
      cell.style.transform = '';
    };

    const handleMouseEnter = (e) => {
      const cell = e.currentTarget;
      cell.style.transition = 'none';
      playHoverSound();
    };

    cells.forEach(cell => {
      cell.addEventListener('mousemove', handleMouseMove);
      cell.addEventListener('mouseleave', handleMouseLeave);
      cell.addEventListener('mouseenter', handleMouseEnter);
    });

    return () => {
      cells.forEach(cell => {
        cell.removeEventListener('mousemove', handleMouseMove);
        cell.removeEventListener('mouseleave', handleMouseLeave);
        cell.removeEventListener('mouseenter', handleMouseEnter);
      });
    };
  }, []);

  useEffect(() => {
    const handleCellClick = () => playClickSound();
    const clickables = document.querySelectorAll('.clickable, .back-link');
    clickables.forEach(c => c.addEventListener('click', handleCellClick));
    return () => clickables.forEach(c => c.removeEventListener('click', handleCellClick));
  }, []);

  useEffect(() => {
    let keySequence = '';
    const handleKeyDown = (e) => {
      keySequence += e.key;
      if (keySequence.length > 5) {
        keySequence = keySequence.slice(-5);
      }
      if (keySequence.toLowerCase() === 'vault') {
        navigate('/vault');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Globe location navigation
  const navigateGlobe = useCallback((direction) => {
    const newIdx = direction === 'next'
      ? (activeExpedition + 1) % expeditions.length
      : (activeExpedition - 1 + expeditions.length) % expeditions.length;
    setActiveExpedition(newIdx);
    const loc = expeditions[newIdx];
    if (globeRef.current) {
      const ep = editorParams.current;
      globeRef.current.pointOfView({ lat: loc.lat, lng: loc.lng, altitude: ep.cameraLocationAlt ?? 1.2 }, Math.round((ep.cameraLocationSpeed ?? 2500) * 0.6));
    }
    setHoveredMarker(loc);
    playClickSound();
  }, [activeExpedition]);

  // Avatar click effects + photo cycling
  const [avatarEffect, setAvatarEffect] = useState(null);
  const [avatarPhotoIdx, setAvatarPhotoIdx] = useState(0);
  const avatarClickCount = useRef(0);
  const avatarDiscovered = useRef((() => { try { return localStorage.getItem('jarowe_avatar_discovered') === 'true'; } catch { return false; } })());

  // Auto-cycle avatar photos every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setAvatarPhotoIdx(prev => (prev + 1) % avatarPhotos.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleAvatarClick = useCallback((e) => {
    e.stopPropagation();
    const effectIndex = avatarClickCount.current % avatarEffects.length;
    setAvatarEffect(avatarEffects[effectIndex]);
    avatarClickCount.current++;
    playClickSound();

    // Advance to next photo on click
    setAvatarPhotoIdx(prev => (prev + 1) % avatarPhotos.length);

    if (avatarEffects[effectIndex] === 'ripple') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { x: 0.15, y: 0.25 },
        colors: ['#7c3aed', '#38bdf8', '#f472b6'],
        gravity: 0.8,
        scalar: 0.8,
      });
    }

    if (!avatarDiscovered.current) {
      avatarDiscovered.current = true;
      localStorage.setItem('jarowe_avatar_discovered', 'true');
    }

    setTimeout(() => setAvatarEffect(null), 1000);
  }, []);

  // Currently cell hover messages
  const [currentlyMsg, setCurrentlyMsg] = useState(null);
  const currentlyMsgIndex = useRef(0);

  const handleCurrentlyHover = useCallback(() => {
    setCurrentlyMsg(currentlyMessages[currentlyMsgIndex.current % currentlyMessages.length]);
    currentlyMsgIndex.current++;
  }, []);

  const handleCurrentlyLeave = useCallback(() => {
    setCurrentlyMsg(null);
  }, []);

  // Rotating quotes
  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Globe text message blurbs
  const [globeMessage, setGlobeMessage] = useState(null);
  const globeMsgIdx = useRef(0);

  useEffect(() => {
    const cycle = () => {
      const msg = worldschoolMessages[globeMsgIdx.current % worldschoolMessages.length];
      globeMsgIdx.current++;
      setGlobeMessage({ phase: 'typing', from: msg.from });
      setTimeout(() => setGlobeMessage({ phase: 'visible', ...msg }), 1800);
      setTimeout(() => setGlobeMessage(null), 7000);
    };
    const delay = setTimeout(cycle, 3000);
    const interval = setInterval(cycle, 10000);
    return () => { clearTimeout(delay); clearInterval(interval); };
  }, []);

  // Hidden character peek-a-boo
  const [peekVisible, setPeekVisible] = useState(false);
  const [peekPosition, setPeekPosition] = useState({ cell: 0, side: 'right' });
  const [peekStyle, setPeekStyle] = useState('slide');
  const [prismBops, setPrismBops] = useState(0);
  const [prismBubble, setPrismBubble] = useState(null);
  const [bubblePhase, setBubblePhase] = useState(null); // null | 'thinking' | 'speaking'
  const bubbleThinkTimerRef = useRef(null);
  const [prismSparkles, setPrismSparkles] = useState([]);
  const [showSpeedGame, setShowSpeedGame] = useState(false);
  const [editorDragMode, setEditorDragMode] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: null, y: null });
  const dragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  // Bop phases: null | 'impact' | 'reaction' | 'exit'
  const [bopPhase, setBopPhase] = useState(null);
  const [exitStyle, setExitStyle] = useState(null);
  const [bopRipple, setBopRipple] = useState(null); // { x, y } in viewport px
  const bubbleElRef = useRef(null); // ref for active bubble/thinking-dots element
  // connectorPathRef + connectorPulseRef declared inside connector rAF effect
  const prismHitRef = useRef(null); // floating hit-target div that follows prism screen pos
  const connectorDot1Ref = useRef(null); // SVG circle at bubble end
  const connectorDot2Ref = useRef(null); // SVG circle at character end
  // Portal phases: null | 'seep' | 'gathering' | 'rupture' | 'emerging' | 'residual'
  const [portalPhase, setPortalPhase] = useState(null);
  const [portalOrigin, setPortalOrigin] = useState({ x: '50%', y: '50%' });
  const peekStyleRef = useRef('slide');
  const portalExitingRef = useRef(false);
  const [showSpawnMarkers, setShowSpawnMarkers] = useState(false);

  // Track viewport size to force re-render on resize (spawn markers + character positioning)
  const [viewportKey, setViewportKey] = useState(0);
  useEffect(() => {
    const onResize = () => setViewportKey(k => k + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Spawn points from localStorage
  const [spawnPoints, setSpawnPoints] = useState(() => {
    try {
      const saved = localStorage.getItem('prism_spawn_points');
      return saved ? JSON.parse(saved) : [
        { label: 'Right Edge', side: 'right' },
        { label: 'Left Edge', side: 'left' },
        { label: 'Top', side: 'top' },
      ];
    } catch { return [{ label: 'Right Edge', side: 'right' }, { label: 'Left Edge', side: 'left' }, { label: 'Top', side: 'top' }]; }
  });

  // Responsive spawn point helpers — store as viewport % for resize tolerance
  const spawnToPixels = (sp) => {
    if (sp.xPct != null && sp.yPct != null) {
      return { x: sp.xPct * window.innerWidth, y: sp.yPct * window.innerHeight };
    }
    // Legacy pixel format (pre-responsive migration)
    if (sp.x != null && sp.y != null) {
      return { x: sp.x, y: sp.y };
    }
    return null;
  };

  // Keep peekStyleRef in sync for stale-closure-safe access
  useEffect(() => { peekStyleRef.current = peekStyle; }, [peekStyle]);

  const glintCatchPhrases = [
    "Hey! You found me!",
    "Boop! Again!",
    "One more... I dare you!",
    "WHOA! Secret time!",
    "Can't catch Glint!",
    "Did you try the cipher?",
    "Go explore the universe!",
    "Refraction is my cardio",
    "Click the avatar... trust me",
    "Type 'vault' for a surprise!",
    "Your vibes are immaculate",
    "I'm basically a disco ball",
  ];

  // Glint — the spark of an idea, the vessel for creativity
  const glintIdeas = [
    "What if we raised our kids on curiosity instead of curriculum?",
    "The best classroom is a foreign country you've never heard of",
    "Technology should feel like magic. If it doesn't, we're not done yet.",
    "What if the internet remembered how to feel wonder?",
    "Every great product started as someone's obsession that nobody understood",
    "The future is being built by parents who refuse to sit still",
    "Code is just thought made tangible",
    "Somewhere between Athens and Bali, the world taught us more than any school",
    "What separates a dreamer from a builder? Hitting 'deploy'.",
    "The best UI is the one that makes someone forget they're using technology",
    "Creativity is just connecting dots nobody else can see",
    "Your kids don't need a roadmap. They need permission to explore.",
    "The most dangerous phrase in innovation: 'That's how it's always been done'",
    "What if play is the highest form of research?",
    "Every masterpiece started as a ridiculous side project",
    "The gap between impossible and shipped is one stubborn weekend",
    "Constraints don't limit creativity — they ARE creativity",
    "The universe runs on patterns. So does great design.",
    "What if we built companies the way we build adventures — fearlessly?",
    "Light doesn't ask permission to refract. Neither should your ideas.",
  ];

  // ── Thinking dots → speech bubble helpers ──
  const showBubbleWithThinking = useCallback((text) => {
    const cfg = window.__prismConfig || {};
    const thinkingEnabled = cfg.bubbleThinkingEnabled !== false;
    const thinkMs = cfg.bubbleThinkingMs ?? 1200;

    // Clear any pending think timer
    if (bubbleThinkTimerRef.current) clearTimeout(bubbleThinkTimerRef.current);

    if (!thinkingEnabled) {
      // Skip straight to speaking
      setBubblePhase('speaking');
      setPrismBubble(text);
      return;
    }

    // Phase 1: thinking dots
    setPrismBubble(null);
    setBubblePhase('thinking');
    window.__prismExpression = 'thinking';

    // Phase 2: speaking
    bubbleThinkTimerRef.current = setTimeout(() => {
      setBubblePhase('speaking');
      setPrismBubble(text);
      bubbleThinkTimerRef.current = null;
    }, thinkMs);
  }, []);

  const clearBubble = useCallback(() => {
    if (bubbleThinkTimerRef.current) clearTimeout(bubbleThinkTimerRef.current);
    bubbleThinkTimerRef.current = null;
    setBubblePhase(null);
    setPrismBubble(null);
  }, []);

  // Portal entrance ref for CSS glow class
  const peekCharRef = useRef(null);

  // ── Portal sequence helper (reads config from window.__prismConfig) ──
  const runPortalSequence = (ox, oy, showCharCallback) => {
    if (portalExitingRef.current) return 0; // don't start entrance while exiting
    const cfg = window.__prismConfig || {};
    const cOx = parseFloat(ox) / 100;
    const cOy = parseFloat(oy) / 100;
    setPortalOrigin({ x: ox, y: oy });

    // Convert portal colors from [r,g,b] (0-1) to hex strings
    const toHex = (arr) => '#' + arr.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
    const c1 = cfg.portalColor1 ? toHex(cfg.portalColor1) : '#7c3aed';
    const c2 = cfg.portalColor2 ? toHex(cfg.portalColor2) : '#38bdf8';
    const c3 = cfg.portalColor3 ? toHex(cfg.portalColor3) : '#f472b6';
    const confettiEnabled = cfg.portalConfettiEnabled !== false;
    const confettiCount = cfg.portalConfettiCount ?? 60;
    const gatherMs = cfg.portalGatherMs ?? 500;
    const ruptureMs = cfg.portalRuptureMs ?? 500;
    const emergeMs = cfg.portalEmergeMs ?? 900;
    const residualMs = cfg.portalResidualMs ?? 1800;
    const seepEnabled = cfg.portalSeepEnabled !== false;
    const seepDuration = cfg.portalSeepDuration ?? 800;

    // Time offset: seep adds time before gathering
    const t0 = seepEnabled ? seepDuration : 0;

    // Seep phase (canvas handles the visual)
    if (seepEnabled) {
      setPortalPhase('seep');
    }

    // Phase 1: Sling ring draws
    setTimeout(() => {
      setPortalPhase('gathering');
    }, t0);

    // Phase 2: Portal ruptures open
    setTimeout(() => {
      setPortalPhase('rupture');
      if (confettiEnabled) {
        confetti({ particleCount: Math.round(confettiCount * 0.5), spread: 40, startVelocity: 25, gravity: 0.2, origin: { x: cOx, y: cOy }, colors: [c1, c2, c3, '#a78bfa', '#c4b5fd'], scalar: 0.5, ticks: 60, shapes: ['circle'] });
      }
    }, t0 + gatherMs);

    // Phase 3: Character emerges through rift
    setTimeout(() => {
      setPortalPhase('emerging');
      showCharCallback();
      // Re-center portal on actual character DOM position (fixes drift from calculated positions)
      snapPortalToCharacter();
      if (peekCharRef.current) {
        peekCharRef.current.classList.add('portal-entering');
        setTimeout(() => peekCharRef.current?.classList.remove('portal-entering'), 1200);
      }
      if (confettiEnabled) {
        confetti({ particleCount: confettiCount, spread: 160, startVelocity: 18, gravity: 0.2, origin: { x: cOx, y: cOy }, colors: [c1, c2, c3, '#a78bfa', '#22c55e', '#fbbf24', '#c4b5fd'], scalar: 0.6, ticks: 140, shapes: ['circle'] });
        setTimeout(() => {
          confetti({ particleCount: Math.round(confettiCount * 0.58), spread: 360, startVelocity: 12, gravity: 0.15, origin: { x: cOx, y: cOy }, colors: [c1, c2, c3], scalar: 0.4, ticks: 180, shapes: ['circle'] });
        }, 200);
      }
    }, t0 + gatherMs + ruptureMs);

    // Phase 4: Residual glow
    setTimeout(() => {
      setPortalPhase('residual');
      if (confettiEnabled) {
        confetti({ particleCount: Math.round(confettiCount * 0.33), spread: 360, startVelocity: 6, gravity: 0.1, origin: { x: cOx, y: cOy }, colors: [c1, c2, c3, '#c4b5fd'], scalar: 0.35, ticks: 250, shapes: ['circle'] });
      }
    }, t0 + gatherMs + ruptureMs + emergeMs);

    // Cleanup
    const totalMs = t0 + gatherMs + ruptureMs + emergeMs + residualMs;
    setTimeout(() => {
      setPortalPhase(null);
    }, totalMs);

    // Return total duration for callers that need to schedule follow-ups
    return totalMs;
  };

  // ── Compute portal origin from spawn point (matches CSS peek-* positions) ──
  // Character layout is always 420x420 (canvasSize - 2*margin = 420), visual center = +210
  const CHAR_HALF = 210;
  const getPortalOrigin = (sp) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Responsive percentage format
    const px = spawnToPixels(sp);
    if (px) {
      // px = div top-left corner; visual center is offset by CHAR_HALF
      return {
        x: `${((px.x + CHAR_HALF) / W) * 100}%`,
        y: `${((px.y + CHAR_HALF) / H) * 100}%`,
      };
    }
    // Character visual center for each CSS-positioned side:
    // .peek-right: right:-80px, top:50% → right-edge at W+80, left-edge W-340, center (W-130, H*0.5+210)
    // .peek-left:  left:-80px, top:40%  → left-edge -80, center (-80+210, H*0.4+210) = (130, H*0.4+210)
    // .peek-top:   left:50%, top:20px   → center (W*0.5+210, 20+210) = (W*0.5+210, 230)
    const side = sp.side || 'right';
    if (side === 'right') return { x: `${((W - 130) / W) * 100}%`, y: `${((H * 0.5 + CHAR_HALF) / H) * 100}%` };
    if (side === 'left') return { x: `${(130 / W) * 100}%`, y: `${((H * 0.4 + CHAR_HALF) / H) * 100}%` };
    return { x: `${((W * 0.5 + CHAR_HALF) / W) * 100}%`, y: `${(230 / H) * 100}%` };
  };

  // Snap portal origin to actual character DOM position (runs after React render)
  const snapPortalToCharacter = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!peekCharRef.current) return;
        const rect = peekCharRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        // Only update if we got valid coordinates
        if (cx !== 0 || cy !== 0) {
          setPortalOrigin({
            x: `${(cx / window.innerWidth) * 100}%`,
            y: `${(cy / window.innerHeight) * 100}%`,
          });
        }
      });
    });
  };

  // ── Portal EXIT sequence – re-opens portal at character pos, sucks it back in ──
  const runPortalExitSequence = useCallback(() => {
    if (portalExitingRef.current) return; // already exiting
    portalExitingRef.current = true;

    const cfg = window.__prismConfig || {};
    const residualMs = cfg.portalResidualMs ?? 1800;

    // Get character's current DOM center
    let ox = '50%', oy = '50%';
    if (peekCharRef.current) {
      const rect = peekCharRef.current.getBoundingClientRect();
      ox = `${((rect.left + rect.width / 2) / window.innerWidth) * 100}%`;
      oy = `${((rect.top + rect.height / 2) / window.innerHeight) * 100}%`;
    }

    // Open portal at character position — rupture immediately
    setPortalOrigin({ x: ox, y: oy });
    setPortalPhase('emerging');

    // Confetti burst as portal opens
    const cOx = parseFloat(ox) / 100;
    const cOy = parseFloat(oy) / 100;
    confetti({ particleCount: 30, spread: 360, origin: { x: cOx, y: cOy }, colors: ['#7c3aed', '#38bdf8', '#f472b6', '#c4b5fd'], startVelocity: 12, gravity: 0.1, scalar: 0.4, ticks: 120, shapes: ['circle'] });

    // After 300ms, suck character in (hide via framer-motion)
    setTimeout(() => {
      setPeekVisible(false);
      clearBubble();
      peekCharRef.current?.classList.remove('portal-suck');
    }, 300);

    // After 800ms, begin fading the portal
    setTimeout(() => {
      setPortalPhase('residual');
    }, 800);

    // Cleanup
    setTimeout(() => {
      setPortalPhase(null);
      portalExitingRef.current = false;
    }, 800 + residualMs);
  }, [clearBubble]);

  useEffect(() => {
    const peekStyles = ['portal', 'portal', 'portal', 'bounce', 'pop', 'roll'];
    const scheduleNext = () => {
      const delay = 12000 + Math.random() * 20000;
      return setTimeout(() => {
        // Pick from spawn points
        const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        const spPx = spawnToPixels(sp);
        if (spPx) {
          setDragPosition({ x: spPx.x, y: spPx.y });
          setPeekPosition({ cell: 0, side: 'custom' });
        } else {
          setPeekPosition({
            cell: Math.floor(Math.random() * 4),
            side: sp.side || 'right'
          });
        }
        const lockedStyle = window.__prismConfig?.lockedPeekStyle;
        const style = lockedStyle || peekStyles[Math.floor(Math.random() * peekStyles.length)];
        setPeekStyle(style);

        if (style === 'portal') {
          // ─── CINEMATIC DIMENSIONAL RIFT ───
          const origin = getPortalOrigin(sp);
          runPortalSequence(origin.x, origin.y, () => setPeekVisible(true));
        } else {
          setPeekVisible(true);
        }

        // Show a Glint idea after character settles
        const ideaDelay = setTimeout(() => {
          const idea = glintIdeas[Math.floor(Math.random() * glintIdeas.length)];
          window.__prismTalking = true;
          showBubbleWithThinking(idea);
          setTimeout(() => { window.__prismTalking = false; window.__prismExpression = 'happy'; }, 1800);
          setTimeout(() => { clearBubble(); window.__prismExpression = 'normal'; }, 5000);
        }, style === 'portal' ? 2000 : 1200);
        setTimeout(() => {
          clearTimeout(ideaDelay);
          if (peekStyleRef.current === 'portal') {
            runPortalExitSequence();
          } else {
            setPeekVisible(false);
          }
        }, 8000);
        timerId = scheduleNext();
      }, delay);
    };

    let timerId = scheduleNext();
    return () => clearTimeout(timerId);
  }, [spawnPoints]);

  // Editor prism peek control (supports detail: { side, cell, duration, pinned, style })
  const peekPinnedRef = useRef(false);
  const peekTimerRef = useRef(null);
  useEffect(() => {
    const peekStyles = ['portal', 'slide', 'bounce', 'swing', 'pop', 'roll'];
    const showHandler = (e) => {
      const d = e.detail || {};
      const sides = ['right', 'left', 'top'];
      const hasCustomPos = d.x != null && d.y != null;
      const side = hasCustomPos ? 'custom' : (d.side || sides[Math.floor(Math.random() * sides.length)]);

      if (hasCustomPos) {
        setDragPosition({ x: d.x, y: d.y });
        setPeekPosition({ cell: 0, side: 'custom' });
      } else {
        setDragPosition({ x: null, y: null }); // clear stale custom position
        setPeekPosition({
          cell: d.cell ?? Math.floor(Math.random() * 4),
          side,
        });
      }

      const lockedStyle = window.__prismConfig?.lockedPeekStyle;
      const style = d.style || lockedStyle || peekStyles[Math.floor(Math.random() * peekStyles.length)];
      setPeekStyle(style);
      peekPinnedRef.current = !!d.pinned;

      if (style === 'portal') {
        // ─── CINEMATIC DIMENSIONAL RIFT ───
        const sp = hasCustomPos ? { x: d.x, y: d.y } : { side };
        const origin = getPortalOrigin(sp);
        runPortalSequence(origin.x, origin.y, () => setPeekVisible(true));
      } else {
        setPeekVisible(true);
      }

      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      if (!d.pinned) {
        peekTimerRef.current = setTimeout(() => {
          if (peekStyleRef.current === 'portal') {
            runPortalExitSequence();
          } else {
            setPeekVisible(false);
          }
        }, d.duration || 8000);
      }
    };
    const hideHandler = () => {
      peekPinnedRef.current = false;
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      if (peekStyleRef.current === 'portal') {
        runPortalExitSequence();
      } else {
        setPeekVisible(false);
      }
    };
    // Drag mode listener
    const dragModeHandler = (e) => setEditorDragMode(e.detail?.enabled ?? false);
    // Spawn point management
    const spawnHandler = (e) => {
      const d = e.detail || {};
      if (d.action === 'add' && dragPosition.x != null) {
        // Store as viewport percentages for responsive scaling
        const newPoints = [...spawnPoints, { label: d.label || `Point ${spawnPoints.length + 1}`, xPct: dragPosition.x / window.innerWidth, yPct: dragPosition.y / window.innerHeight, side: 'custom' }];
        setSpawnPoints(newPoints);
        localStorage.setItem('prism_spawn_points', JSON.stringify(newPoints));
      } else if (d.action === 'remove' && d.index != null) {
        const newPoints = spawnPoints.filter((_, i) => i !== d.index);
        setSpawnPoints(newPoints);
        localStorage.setItem('prism_spawn_points', JSON.stringify(newPoints));
      } else if (d.action === 'clear') {
        const defaults = [{ side: 'right' }, { side: 'left' }, { side: 'top' }];
        setSpawnPoints(defaults);
        localStorage.setItem('prism_spawn_points', JSON.stringify(defaults));
      } else if (d.action === 'reset' && d.points) {
        setSpawnPoints(d.points);
        localStorage.setItem('prism_spawn_points', JSON.stringify(d.points));
      }
    };

    // Spawn marker toggle
    const spawnMarkerHandler = (e) => setShowSpawnMarkers(e.detail?.enabled ?? false);
    // Live marker position updates from editor sliders (no folder rebuild)
    const spawnMarkersUpdateHandler = (e) => {
      if (e.detail?.points) {
        setSpawnPoints(e.detail.points);
      }
    };

    window.addEventListener('trigger-prism-peek', showHandler);
    window.addEventListener('hide-prism-peek', hideHandler);
    window.addEventListener('prism-drag-mode', dragModeHandler);
    window.addEventListener('prism-spawn-point', spawnHandler);
    window.addEventListener('prism-spawn-markers', spawnMarkerHandler);
    window.addEventListener('prism-spawn-markers-update', spawnMarkersUpdateHandler);
    return () => {
      window.removeEventListener('trigger-prism-peek', showHandler);
      window.removeEventListener('hide-prism-peek', hideHandler);
      window.removeEventListener('prism-drag-mode', dragModeHandler);
      window.removeEventListener('prism-spawn-point', spawnHandler);
      window.removeEventListener('prism-spawn-markers', spawnMarkerHandler);
      window.removeEventListener('prism-spawn-markers-update', spawnMarkersUpdateHandler);
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
  }, [spawnPoints, dragPosition]);

  // Dynamic bubble-to-character connector — rAF loop updates SVG path directly (no re-renders)
  const connectorPathRef = useRef(null); // main curved path
  const connectorPulseRef = useRef(null); // glowing pulse path overlay
  const connectorBirthRef = useRef(0); // timestamp when connector appeared (for draw-in animation)
  const connectorWasVisible = useRef(false);
  useEffect(() => {
    if (!peekVisible) {
      // Hide all connector elements
      [connectorPathRef, connectorPulseRef, connectorDot1Ref, connectorDot2Ref].forEach(r => {
        if (r.current) r.current.style.display = 'none';
      });
      connectorWasVisible.current = false;
      return;
    }
    let rafId;
    const update = () => {
      const bubbleEl = bubbleElRef.current;
      const prismPos = window.__prismScreenPos;
      const path = connectorPathRef.current;
      const pulse = connectorPulseRef.current;
      const d1 = connectorDot1Ref.current;
      const d2 = connectorDot2Ref.current;
      // Check bubble is still in the DOM and has dimensions
      const inDom = bubbleEl && document.body.contains(bubbleEl);
      const bRect = inDom ? bubbleEl.getBoundingClientRect() : null;
      const visible = bRect && bRect.width > 0 && prismPos && path;
      if (visible) {
        const below = bubbleEl.classList.contains('bubble-below');
        const bx = bRect.left + bRect.width * 0.35;
        const by = below ? bRect.top : bRect.bottom;
        const cx = prismPos.x;
        const cy = prismPos.y;
        // Quadratic bezier control point — offset sideways for a nice arc
        const mx = (bx + cx) / 2 + (by - cy) * 0.25;
        const my = (by + cy) / 2 - (bx - cx) * 0.15;
        const d = `M${bx},${by} Q${mx},${my} ${cx},${cy}`;
        path.setAttribute('d', d);
        if (pulse) pulse.setAttribute('d', d);
        // Draw-in animation on first appearance
        if (!connectorWasVisible.current) {
          connectorBirthRef.current = Date.now();
          connectorWasVisible.current = true;
        }
        const age = Date.now() - connectorBirthRef.current;
        const pathLen = path.getTotalLength?.() || 200;
        // Draw-in: 400ms from prism→bubble
        if (age < 400) {
          const progress = Math.min(age / 400, 1);
          const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          path.style.strokeDasharray = `${pathLen}`;
          path.style.strokeDashoffset = `${pathLen * (1 - ease)}`;
          if (pulse) pulse.style.display = 'none';
        } else {
          // Flowing dash animation
          path.style.strokeDasharray = '8 5';
          path.style.strokeDashoffset = `${-((age - 400) * 0.04) % 26}`;
          if (pulse) {
            pulse.style.display = '';
            pulse.style.strokeDasharray = `${pathLen * 0.15} ${pathLen * 0.85}`;
            pulse.style.strokeDashoffset = `${-((age - 400) * 0.08) % (pathLen * 2)}`;
          }
        }
        path.style.display = '';
        // Dot pop-in (spring from 0)
        const dotAge = Math.min(age / 300, 1);
        const dotEase = dotAge < 1 ? 1 + Math.sin(dotAge * Math.PI) * 0.6 : 1;
        if (d1) { d1.setAttribute('cx', bx); d1.setAttribute('cy', by); d1.setAttribute('r', 3.5 * dotEase); d1.style.display = ''; d1.style.opacity = dotAge; }
        if (d2) { d2.setAttribute('cx', cx); d2.setAttribute('cy', cy); d2.setAttribute('r', 5 * dotEase); d2.style.display = ''; d2.style.opacity = Math.min(dotAge, 0.5); }
      } else {
        // Hide connector when bubble not visible
        if (connectorWasVisible.current) {
          [path, pulse, d1, d2].forEach(el => { if (el) el.style.display = 'none'; });
          connectorWasVisible.current = false;
        }
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [peekVisible]);

  // Floating hit-target tracks prism's projected screen position every frame
  useEffect(() => {
    if (!peekVisible) return;
    let rafId;
    const update = () => {
      const el = prismHitRef.current;
      const pos = window.__prismScreenPos;
      if (el && pos) {
        const cfg = window.__prismConfig || {};
        const offX = cfg.hitboxOffsetX ?? 0;
        const offY = cfg.hitboxOffsetY ?? 0;
        const shape = cfg.hitboxShape ?? 'circle';
        const debug = cfg.hitboxDebug ?? false;
        const w = shape === 'rect' ? (cfg.hitboxWidth ?? 90) : (cfg.hitboxSize ?? 90);
        const h = shape === 'rect' ? (cfg.hitboxHeight ?? 120) : (cfg.hitboxSize ?? 90);
        const br = shape === 'rect' ? `${cfg.hitboxBorderRadius ?? 16}px` : '50%';
        el.style.left = `${pos.x + offX}px`;
        el.style.top = `${pos.y + offY}px`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        el.style.borderRadius = br;
        el.style.outline = debug ? '2px solid rgba(255,0,0,0.7)' : 'none';
        el.style.background = debug ? 'rgba(255,0,0,0.15)' : 'transparent';
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [peekVisible]);

  // One bop per reveal guard
  const boppedThisRevealRef = useRef(false);
  // Reset when peek becomes visible
  useEffect(() => {
    if (peekVisible) boppedThisRevealRef.current = false;
  }, [peekVisible]);

  const handleCatchCharacter = useCallback((e) => {
    // One bop per reveal only
    if (boppedThisRevealRef.current) return;
    boppedThisRevealRef.current = true;

    playBopSound();
    const newBops = prismBops + 1;
    if (globeRef.current?.customUniforms) {
      globeRef.current.customUniforms.prismPulse.value = 1.0;
    }

    // Get character center for confetti origin
    let confettiOrigin = { x: 0.5, y: 0.5 };
    if (peekCharRef.current) {
      const rect = peekCharRef.current.getBoundingClientRect();
      confettiOrigin = {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      };
    }

    // ── BONK — shocked face, screen shake, confetti burst, ripple ──
    setBopPhase('impact');
    window.__prismSquash = Date.now();
    setPrismBops(newBops);
    window.__prismExpression = 'surprised';

    // Ripple overlay at exact click position (not getBoundingClientRect which drifts)
    if (e && e.clientX != null) {
      setBopRipple({ x: e.clientX, y: e.clientY });
      setTimeout(() => setBopRipple(null), 600);
    } else if (peekCharRef.current) {
      const rect = peekCharRef.current.getBoundingClientRect();
      setBopRipple({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setTimeout(() => setBopRipple(null), 600);
    }

    // Confetti burst from character
    confetti({ particleCount: 40, spread: 90, origin: confettiOrigin, colors: ['#fff', '#fbbf24', '#38bdf8', '#7c3aed', '#f472b6'], gravity: 0.3, scalar: 0.7, startVelocity: 35, ticks: 100, shapes: ['circle'] });

    // Screen shake
    const bento = document.querySelector('.bento-container');
    if (bento) {
      bento.classList.add('screen-shake');
      setTimeout(() => bento.classList.remove('screen-shake'), 400);
    }

    // ── PORTAL EXIT (600ms) — same as Hide Glint but with bonk face ──
    setTimeout(() => {
      setBopPhase(null);
      setExitStyle(null);
      clearBubble();
      runPortalExitSequence();
    }, 600);

    // Every 3 bops, trigger the speed puzzle game
    if (newBops % 3 === 0) {
      setTimeout(() => setShowSpeedGame(true), 2500);
    }
  }, [prismBops, clearBubble, runPortalExitSequence]);

  // Hit-target click handler — dispatched from the floating div that tracks prism screen pos
  const handleHitTargetClick = useCallback((e) => {
    if (!peekVisible || editorDragMode || bopPhase != null) return;
    handleCatchCharacter({ clientX: e.clientX, clientY: e.clientY });
  }, [peekVisible, editorDragMode, bopPhase, handleCatchCharacter]);

  // Drag mode: global mouse handlers
  useEffect(() => {
    if (!editorDragMode) return;
    const handleMouseMove = (e) => {
      if (!dragRef.current.dragging) return;
      setDragPosition({
        x: e.clientX - dragRef.current.offsetX,
        y: e.clientY - dragRef.current.offsetY,
      });
      window.dispatchEvent(new CustomEvent('prism-drag-position', { detail: { x: e.clientX - dragRef.current.offsetX, y: e.clientY - dragRef.current.offsetY } }));
    };
    const handleMouseUp = () => {
      dragRef.current.dragging = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editorDragMode]);

  return (
    <div className="home-wrapper" ref={container}>
      <AnimatePresence>
        {showBrand && (
          <motion.div
            className="brand-reveal-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#050510' }}
          >
            <div style={{ display: 'flex', gap: '8px', fontSize: '4rem', fontWeight: 'bold', fontFamily: 'var(--font-display)', color: 'white' }}>
              {"JAROWE.".split('').map((char, i) => (
                <span key={i} className="brand-char" style={{ display: 'inline-block' }}>{char}</span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="bento-container">
        <div className="bento-grid">
          {/* HERO IDENTITY CELL */}
          <div className="bento-cell cell-hero tilt-enabled">
            <div className="bento-content">
              <div className="hero-header">
                <div
                  className={`hero-avatar ${avatarEffect ? `avatar-${avatarEffect}` : ''}`}
                  onClick={handleAvatarClick}
                  role="button"
                  tabIndex={0}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={avatarPhotoIdx}
                      className="avatar-photo-inner"
                      style={{ backgroundImage: `url(${BASE}images/${avatarPhotos[avatarPhotoIdx]})` }}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.8 }}
                    />
                  </AnimatePresence>
                </div>
                <div className="hero-titles">
                  <h1>Jared Rowe</h1>
                  <h2>Dad. Builder. Noise Maker.</h2>
                </div>
              </div>
              <p className="hero-bio">
                Worldschooling dad of three. Maria and I traded the traditional classroom for the Austrian Alps, Greek islands, and everywhere in between. By day I shape creative tools at Elgato, by night I build at Starseed Labs. The whole world is our school.
              </p>
            </div>
          </div>

          {/* WORLD MAP CELL */}
          <div className={`bento-cell cell-map${editorParams.current.globeBreakout ? ' globe-breakout' : ''}${!editorParams.current.glassSweepEnabled ? ' glass-sweep-off' : ''}${!editorParams.current.glassShimmerEnabled ? ' glass-shimmer-off' : ''}${!editorParams.current.innerGlowEnabled ? ' inner-glow-off' : ''}`}
            style={{
              ...(editorParams.current.globeBreakout ? { '--globe-breakout-px': `${editorParams.current.globeBreakoutPx}px` } : {}),
              ...(editorParams.current.glassSweepOpacity !== undefined ? { '--glass-sweep-opacity': editorParams.current.glassSweepOpacity } : {}),
              ...(editorParams.current.glassShimmerOpacity !== undefined ? { '--glass-shimmer-opacity': editorParams.current.glassShimmerOpacity } : {}),
              '--badge-bg-opacity': editorParams.current.badgeBgOpacity,
              '--badge-blur': `${editorParams.current.badgeBlur}px`,
              '--badge-border-opacity': editorParams.current.badgeBorderOpacity,
              '--badge-radius': `${editorParams.current.badgeRadius}px`,
              '--badge-font-size': `${editorParams.current.badgeFontSize}rem`,
              '--badge-padding': `${editorParams.current.badgePadding}rem`,
              '--badge-padding-x': `${editorParams.current.badgePadding * 1.4}rem`,
              '--badge-bottom': `${editorParams.current.badgeBottom}rem`,
              '--badge-inset': `${editorParams.current.badgeInset}rem`,
            }}>
            <div className="map-container" ref={mapContainerRef} style={{ opacity: globeReady ? 1 : 0, transition: 'opacity 1.5s ease-in' }}>
              <Suspense fallback={<div style={{ color: '#fff', padding: '2rem' }}>Loading globe...</div>}>
                {globeSize.width > 0 && (
                  <Globe
                    ref={handleGlobeRef}
                    width={globeSize.width}
                    height={globeSize.height}
                    globeMaterial={globeShaderMaterial}
                    backgroundColor="rgba(0,0,0,0)"
                    showAtmosphere={false}

                    arcsData={arcsData}
                    arcColor="color"
                    arcDashLength={overlayParams.arcDashLength}
                    arcDashGap={overlayParams.arcDashGap}
                    arcDashAnimateTime={overlayParams.arcDashAnimateTime}
                    arcStroke={overlayParams.arcStroke}
                    ringsData={expeditions}
                    ringColor={(d) => d.color}
                    ringMaxRadius={overlayParams.ringMaxRadius}
                    ringPropagationSpeed={overlayParams.ringPropagationSpeed}
                    ringRepeatPeriod={overlayParams.ringRepeatPeriod}
                    labelsData={expeditions}
                    labelLat="lat"
                    labelLng="lng"
                    labelText={(d) => (d === hoveredMarker || expeditions.indexOf(d) === activeExpedition) ? d.name : ''}
                    labelSize={overlayParams.labelSize}
                    labelDotRadius={overlayParams.labelDotRadius}
                    labelColor={() => '#ffffff'}
                    labelAltitude={0.01}
                    labelResolution={2}
                    onLabelHover={(label) => setHoveredMarker(label)}
                    onRingHover={(ring) => setHoveredMarker(ring)}
                  />
                )}
              </Suspense>
            </div>
            {/* Expedition photo card — anchored to cell-map, not map-container */}
            <AnimatePresence>
              {hoveredMarker && (
                <motion.div
                  className="expedition-photo-card"
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    top: `${editorParams.current.photoCardTop}px`,
                    right: `${editorParams.current.photoCardRight}px`,
                    background: 'rgba(10, 10, 20, 0.85)',
                    backdropFilter: 'blur(16px)',
                    padding: '12px',
                    borderRadius: '14px',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    zIndex: 100,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <strong style={{ color: '#fff', fontSize: '13px', letterSpacing: '0.5px' }}>{hoveredMarker.name}</strong>
                  {hoveredMarker.photo && (
                    <motion.img
                      key={hoveredMarker.photo}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      src={`${BASE}images/${hoveredMarker.photo}`}
                      alt={hoveredMarker.name}
                      style={{ width: `${editorParams.current.photoCardWidth}px`, height: `${Math.round(editorParams.current.photoCardWidth * 0.625)}px`, objectFit: 'cover', borderRadius: '8px' }}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {/* Fog / particle overlay (controllable via editor) */}
            {editorParams.current.fogLayerEnabled && <div className="globe-fog-layer" />}
            {editorParams.current.particlesLayerEnabled && <div className="globe-particles-layer" />}
            {/* WORLDSCHOOLING FAMILY badge */}
            <div className="worldschool-badge">
              <span className="ws-dot" />
              WORLDSCHOOLING FAMILY
            </div>
            {/* Text message blurbs */}
            <AnimatePresence>
              {globeMessage && (
                <motion.div
                  className="globe-msg-bubble"
                  key={globeMsgIdx.current}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  style={{
                    bottom: `${editorParams.current.msgBubbleBottom}px`,
                    right: `${editorParams.current.msgBubbleRight}px`,
                  }}
                >
                  {globeMessage.phase === 'typing' ? (
                    <>
                      <span className="msg-sender">{globeMessage.from}</span>
                      <div className="typing-dots"><span /><span /><span /></div>
                    </>
                  ) : (
                    <>
                      <span className="msg-sender">{globeMessage.from}</span>
                      <span className="msg-text">{globeMessage.text}</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="map-badge">
              <button className="globe-nav-btn" onClick={(e) => { e.stopPropagation(); navigateGlobe('prev'); }} aria-label="Previous location">
                <ChevronLeft size={14} />
              </button>
              <div className="map-badge-center">
                <Globe2 size={14} />
                <span className="map-badge-location">
                  {hoveredMarker ? hoveredMarker.name : expeditions[activeExpedition].name}
                </span>
              </div>
              <button className="globe-nav-btn" onClick={(e) => { e.stopPropagation(); navigateGlobe('next'); }} aria-label="Next location">
                <ChevronRight size={14} />
              </button>
            </div>
            {/* Liquid glass edge overlay */}
            <div className="liquid-glass-edge" />
          </div>

          <div className="bento-cell cell-music">
            <MusicCell />
          </div>

          {/* WORKSHOP CELL */}
          <div className="bento-cell cell-project clickable" onClick={() => navigate('/workshop')}>
            <div className="project-image" style={{ backgroundImage: `url(${BASE}images/tools-builds-bg.png)`, filter: 'brightness(0.7) contrast(1.1)' }}></div>
            <div className="featured-badge">Tools & Builds</div>
            <div className="bento-content" style={{ zIndex: 1 }}>
              <h3 className="project-title" style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>The Workshop</h3>
              <p style={{ color: '#eee', fontSize: '0.95rem' }}>SD Patcher, BEAMY, & Experiments.</p>
            </div>
          </div>

          {/* NOW PAGE CELL */}
          <div
            className="bento-cell cell-now clickable tilt-enabled"
            onClick={() => navigate('/now')}
            onMouseEnter={handleCurrentlyHover}
            onMouseLeave={handleCurrentlyLeave}
          >
            <div className="bento-content">
              <div className="now-header">
                <div className="now-pulse"></div>
                Currently
              </div>
              <p style={{ color: '#ddd', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Living in the US, hacking on WebAudio, and exploring GenAI paradigms for creatives.
              </p>
              <AnimatePresence>
                {currentlyMsg && (
                  <motion.div
                    className="currently-bubble"
                    initial={{ opacity: 0, scale: 0, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {currentlyMsg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* SOCIALS CELL */}
          <div className="bento-cell cell-socials">
            <div className="bento-content" style={{ padding: '1.5rem' }}>
              <div className="socials-grid">
                <a href="https://x.com/jaredalanrowe" target="_blank" rel="noreferrer" className="social-link">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="https://github.com/jarowe" target="_blank" rel="noreferrer" className="social-link"><Github size={24} /></a>
                <a href="https://linkedin.com/in/jaredalanrowe" target="_blank" rel="noreferrer" className="social-link"><Linkedin size={24} /></a>
                <a href="https://www.instagram.com/jaredrowe/" target="_blank" rel="noreferrer" className="social-link"><Instagram size={24} /></a>
              </div>
            </div>
          </div>

          {/* INSTAGRAM CELL */}
          <div className="bento-cell cell-instagram clickable" onClick={() => window.open('https://www.instagram.com/jaredrowe/', '_blank')}>
            <div className="insta-carousel">
              <AnimatePresence mode="wait">
                <motion.div
                  key={photoIndex}
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{ opacity: 1, scale: 1.1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 4, ease: "linear" }}
                  className="insta-photo"
                  style={{ backgroundImage: `url(${photos[photoIndex].src})` }}
                />
              </AnimatePresence>
            </div>
            <div className="insta-overlay">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                <div className="insta-text">Life in Photos</div>
                <Instagram size={20} color="#fff" />
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={photoIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.5 }}
                  style={{ fontSize: '0.85rem', color: '#ccc', letterSpacing: '0.5px' }}
                >
                  {photos[photoIndex].caption}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* DIGITAL GARDEN CELL */}
          <div className="bento-cell cell-garden clickable" onClick={() => navigate('/garden')}>
            <div className="bento-content" style={{ justifyContent: 'center' }}>
              <div className="garden-header"><BookOpen size={20} /> Brain Dump</div>
              <p style={{ color: '#aaa', fontSize: '0.95rem' }}>
                Half-baked ideas I'm thinking out loud about.
              </p>
            </div>
          </div>

          {/* ENTER THE UNIVERSE CELL */}
          <div className="bento-cell cell-universe clickable" onClick={() => navigate('/universe')}>
            <div className="bento-content">
              <div className="universe-content">
                <div>
                  <div className="universe-text">Go Deeper</div>
                  <p style={{ color: 'var(--accent-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>See how everything connects.</p>
                </div>
                <div className="enter-btn">
                  Explore <ArrowRight size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* INTO RIGHT NOW CELL */}
          <div className="bento-cell cell-into clickable" onClick={() => navigate('/favorites')}>
            <div className="bento-content" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.8), rgba(15, 15, 20, 0.4))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f472b6', fontWeight: 'bold', marginBottom: '10px' }}>
                <Sparkles size={18} /> Into Right Now
              </div>
              <p style={{ color: '#eee', fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                The Three-Body Problem
              </p>
              <p style={{ color: '#999', fontSize: '0.85rem' }}>Cannot put it down.</p>
            </div>
          </div>

          {/* FAVORITE QUOTES CELL */}
          <div className="bento-cell cell-quotes">
            <div className="bento-content quotes-content">
              <div className="quotes-decoration">"</div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={quoteIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  className="quote-inner"
                >
                  <p className="quote-text">{quotes[quoteIndex].text}</p>
                  <p className="quote-author">— {quotes[quoteIndex].author}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* DAILY CIPHER + VAULT CELL */}
          <div className="bento-cell cell-game-vault">
            <DailyCipher showVault={true} />
          </div>

        </div>

        {/* SPAWN POINT MARKERS (editor toggle) — click to preview, drag to reposition */}
        {showSpawnMarkers && (
          <div className="spawn-markers-overlay" data-viewport={viewportKey}>
            {spawnPoints.map((sp, i) => {
              const W = window.innerWidth;
              const H = window.innerHeight;
              let px, py;
              const isCustom = sp.side === 'custom' || (sp.xPct != null || sp.x != null);
              const spPx = spawnToPixels(sp);
              if (spPx) {
                // spPx = div corner; show marker at visual center (+CHAR_HALF)
                px = spPx.x + CHAR_HALF; py = spPx.y + CHAR_HALF;
              } else {
                const side = sp.side || 'right';
                if (side === 'right') { px = W - 130; py = H * 0.5; }
                else if (side === 'left') { px = 130; py = H * 0.4; }
                else { px = W * 0.5; py = 230; }
              }
              return (
                <div
                  key={`${i}-${sp.label || sp.side}`}
                  className={`spawn-marker ${isCustom ? 'spawn-marker-draggable' : ''}`}
                  style={{ left: px, top: py }}
                  onClick={(e) => {
                    if (e.defaultPrevented) return; // skip if drag just ended
                    const origin = getPortalOrigin(sp);
                    runPortalSequence(origin.x, origin.y, () => {});
                  }}
                  onMouseDown={isCustom ? (e) => {
                    e.preventDefault();
                    const startX = e.clientX, startY = e.clientY;
                    const startPx = spawnToPixels(sp) || { x: 0, y: 0 };
                    let moved = false;
                    const onMove = (ev) => {
                      moved = true;
                      const dx = ev.clientX - startX;
                      const dy = ev.clientY - startY;
                      const marker = ev.target.closest?.('.spawn-marker');
                      marker?.style?.setProperty?.('left', `${startPx.x + CHAR_HALF + dx}px`);
                      marker?.style?.setProperty?.('top', `${startPx.y + CHAR_HALF + dy}px`);
                    };
                    const onUp = (ev) => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                      if (!moved) return;
                      ev.preventDefault();
                      // Store as viewport percentage for responsive positioning
                      const newX = startPx.x + (ev.clientX - startX);
                      const newY = startPx.y + (ev.clientY - startY);
                      const updated = [...spawnPoints];
                      updated[i] = { ...updated[i], xPct: newX / window.innerWidth, yPct: newY / window.innerHeight, x: undefined, y: undefined, side: 'custom' };
                      setSpawnPoints(updated);
                      localStorage.setItem('prism_spawn_points', JSON.stringify(updated));
                      window.dispatchEvent(new CustomEvent('prism-spawn-point', { detail: { action: 'reset', points: updated } }));
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  } : undefined}
                >
                  <div className="spawn-marker-dot" />
                  <div className="spawn-marker-label">{sp.label || sp.side || `#${i + 1}`}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOP RIPPLE — fixed-position at exact click point */}
        {bopRipple && (
          <div className="bop-ripple-overlay" style={{ left: bopRipple.x, top: bopRipple.y }}>
            <div className="bop-ripple-ring" />
            <div className="bop-ripple-core" />
          </div>
        )}

        {/* DYNAMIC BUBBLE CONNECTOR — SVG line between bubble and character, updates every frame */}
        <svg className="bubble-connector-svg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 501, overflow: 'visible' }}>
          <defs>
            <filter id="connGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="connPulseGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Main curved connector path */}
          <path ref={connectorPathRef} fill="none" stroke="rgba(167,139,250,0.55)" strokeWidth="2" strokeLinecap="round" filter="url(#connGlow)" style={{ display: 'none' }} />
          {/* Bright pulse that travels along the path */}
          <path ref={connectorPulseRef} fill="none" stroke="rgba(56,189,248,0.7)" strokeWidth="3" strokeLinecap="round" filter="url(#connPulseGlow)" style={{ display: 'none' }} />
          {/* Endpoint dots */}
          <circle ref={connectorDot1Ref} r="3.5" fill="rgba(167,139,250,0.9)" filter="url(#connGlow)" style={{ display: 'none' }} />
          <circle ref={connectorDot2Ref} r="5" fill="rgba(56,189,248,0.5)" filter="url(#connGlow)" style={{ display: 'none' }} />
        </svg>

        {/* CINEMATIC PORTAL EFFECTS – Canvas-based */}
        <PortalVFX phase={portalPhase} originX={portalOrigin.x} originY={portalOrigin.y} />

        {/* HIDDEN CHARACTER - always mounted so Canvas never remounts (no lag) */}
        {(() => {
          const isDragCustom = editorDragMode && dragPosition.x != null;
          const isCustomPos = peekPosition.side === 'custom' && dragPosition.x != null;
          const offX = peekPosition.side === 'right' ? 120 : peekPosition.side === 'left' ? -120 : 0;
          const offY = peekPosition.side === 'top' ? -120 : 0;
          const hiddenState =
            peekStyle === 'portal' ? { opacity: 0, x: 0, y: 0, scale: 0, rotate: 0 }
            : peekStyle === 'bounce' ? { opacity: 0, x: 0, y: -120, scale: 1, rotate: 0 }
            : peekStyle === 'swing' ? { opacity: 0, x: 0, y: 0, scale: 1, rotate: peekPosition.side === 'left' ? 90 : -90 }
            : peekStyle === 'pop' ? { opacity: 0, x: 0, y: 0, scale: 0, rotate: 0 }
            : peekStyle === 'roll' ? { opacity: 0, x: offX || 80, y: 0, scale: 1, rotate: 360 }
            : { opacity: 0, x: offX, y: offY, scale: 1, rotate: 0 };
          const peekTransition =
            peekStyle === 'portal' ? { type: 'spring', stiffness: 120, damping: 8, mass: 1.2 }
            : peekStyle === 'bounce' ? { type: 'spring', bounce: 0.7, stiffness: 300 }
            : peekStyle === 'swing' ? { type: 'spring', stiffness: 200, damping: 15 }
            : peekStyle === 'pop' ? { type: 'spring', stiffness: 400, damping: 15 }
            : { type: 'spring', stiffness: 300, damping: 20 };
          // Exit animation states
          const exitAnimState =
            bopPhase === 'exit' && exitStyle === 'spin-shrink' ? { opacity: 0, x: 0, y: 0, scale: 0, rotate: 720 }
            : bopPhase === 'exit' && exitStyle === 'tumble-fall' ? { opacity: 0, x: 0, y: 800, scale: 1, rotate: 45 }
            : bopPhase === 'exit' && exitStyle === 'pop-burst' ? { opacity: 0, x: 0, y: 0, scale: 1.3, rotate: 0 }
            : bopPhase === 'exit' && exitStyle === 'melt' ? { opacity: 0, x: 0, y: 0, scaleX: 2, scaleY: 0, rotate: 0 }
            : null;
          const spawnScale = window.__prismConfig?.spawnScale ?? 1.0;
          const animateState = exitAnimState
            ? exitAnimState
            : peekVisible ? { opacity: 1, x: 0, y: 0, scale: spawnScale, rotate: 0 }
            : hiddenState;
          const exitTransition = bopPhase === 'exit'
            ? { type: 'tween', duration: 0.8, ease: 'easeIn' }
            : peekTransition;
          return (
            <motion.div
              ref={peekCharRef}
              className={`peek-character ${editorDragMode ? 'drag-mode' : ''} ${isDragCustom || isCustomPos ? '' : `peek-${peekPosition.side}`}`}
              animate={animateState}
              initial={false}
              transition={exitTransition}
              onMouseDown={editorDragMode ? (e) => {
                dragRef.current.dragging = true;
                const rect = e.currentTarget.getBoundingClientRect();
                dragRef.current.offsetX = e.clientX - rect.left;
                dragRef.current.offsetY = e.clientY - rect.top;
                e.preventDefault();
              } : undefined}
              style={{
                cursor: 'default',
                pointerEvents: editorDragMode ? 'auto' : 'none',
                ...(isDragCustom || isCustomPos ? { left: dragPosition.x, top: dragPosition.y, right: 'auto' } : {}),
              }}
            >
              {/* Talk bubble – thinking dots → speech bubble (auto-flips below when at top) */}
              {(() => {
                const cfg = window.__prismConfig || {};
                const pos = cfg.bubblePosition || 'auto';
                // Check if character visual center is in top 35% of viewport
                const isNearTop = peekPosition.side === 'top' ||
                  (isCustomPos && dragPosition.y != null && (dragPosition.y + CHAR_HALF) < window.innerHeight * 0.35);
                const below = pos === 'below' || (pos === 'auto' && isNearTop);
                const offX = cfg.bubbleOffsetX || 0;
                const offY = cfg.bubbleOffsetY || 0;
                const locked = cfg.bubbleLocked !== false; // default true
                // Locked: position tight to character center (50% of 420px layout)
                // Unlocked: position at container edge (old behavior)
                const bubblePos = locked
                  ? (below
                    ? { top: `calc(50% + 50px + ${offY}px)`, bottom: 'auto' }
                    : { bottom: `calc(50% + 50px + ${offY}px)`, top: 'auto' })
                  : (below
                    ? { top: `calc(100% + 10px + ${offY}px)`, bottom: 'auto' }
                    : { bottom: `calc(100% - 30px + ${offY}px)`, top: 'auto' });
                const counterPos = locked
                  ? (below
                    ? { top: `calc(50% + 45px + ${cfg.bopCounterOffsetY || 0}px)`, bottom: 'auto' }
                    : { bottom: `calc(50% + 45px + ${cfg.bopCounterOffsetY || 0}px)`, top: 'auto' })
                  : (below
                    ? { top: `calc(100% + 5px + ${cfg.bopCounterOffsetY || 0}px)`, bottom: 'auto' }
                    : { bottom: `calc(100% - 40px + ${cfg.bopCounterOffsetY || 0}px)`, top: 'auto' });
                return (
                  <>
                    <AnimatePresence mode="wait">
                      {bubblePhase === 'thinking' && (
                        <motion.div
                          ref={bubbleElRef}
                          key="thinking"
                          className={`prism-thinking-dots ${below ? 'bubble-below' : ''}`}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5, y: below ? 20 : -20 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          style={{
                            transform: `translateX(calc(-50% + ${offX}px))`,
                            ...bubblePos,
                          }}
                        >
                          <span className="thinking-dot" style={{ animationDelay: '0s' }} />
                          <span className="thinking-dot" style={{ animationDelay: '0.2s' }} />
                          <span className="thinking-dot" style={{ animationDelay: '0.4s' }} />
                        </motion.div>
                      )}
                      {bubblePhase === 'speaking' && prismBubble && (
                        <motion.div
                          ref={bubbleElRef}
                          key="speaking"
                          className={`prism-bubble ${below ? 'bubble-below' : ''}`}
                          initial={{ opacity: 0, scale: 0, y: below ? -30 : 30 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          style={{
                            transform: `translateX(calc(-50% + ${offX}px))`,
                            ...bubblePos,
                            fontSize: `${cfg.bubbleFontSize || 0.8}rem`,
                            maxWidth: `${cfg.bubbleMaxWidth || 260}px`,
                            padding: `${cfg.bubblePadding || 14}px ${(cfg.bubblePadding || 14) + 2}px`,
                          }}
                        >
                          {prismBubble}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Bop counter badge — follows bubble direction */}
                    {prismBops > 0 && (
                      <motion.div
                        className="prism-bop-counter"
                        key={prismBops}
                        initial={{ scale: 1.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        style={{
                          ...counterPos,
                          right: `calc(-8px + ${-(cfg.bopCounterOffsetX || 0)}px)`,
                        }}
                      >
                        {prismBops}
                      </motion.div>
                    )}
                  </>
                );
              })()}
              <div
                className="prism-3d"
                style={{ cursor: 'default' }}
              >
                <Suspense fallback={<div className="prism-loading-glow" />}>
                  <Prism3D />
                </Suspense>
                {/* Sparkle trail particles */}
                {prismSparkles.map(s => (
                  <div
                    key={s.id}
                    className="prism-sparkle"
                    style={{
                      '--sparkle-x': `${s.x}px`,
                      '--sparkle-y': `${s.y}px`,
                      '--sparkle-color': s.color,
                      '--sparkle-delay': `${s.delay}s`,
                      '--sparkle-size': `${s.size}px`,
                      '--sparkle-duration': `${s.duration}s`,
                    }}
                  />
                ))}
              </div>
              {/* Drag position indicator (editor only) */}
              {editorDragMode && dragPosition.x != null && (
                <div className="drag-position-indicator">
                  {Math.round(dragPosition.x)}, {Math.round(dragPosition.y)}
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* PRISM HIT TARGET — follows the prism's 3D-projected screen pos, size/offset from editor config */}
        {peekVisible && (
          <div
            ref={prismHitRef}
            onClick={handleHitTargetClick}
            onMouseEnter={() => {
              window.__prismHovered = true;
              const expr = (window.__prismConfig || {}).hoverExpression || 'surprised';
              window.__prismExpression = expr;
            }}
            onMouseLeave={() => {
              window.__prismHovered = false;
            }}
            style={{
              position: 'fixed',
              width: 90,
              height: 90,
              borderRadius: '50%', // overridden by rAF loop based on hitboxShape
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              pointerEvents: 'auto',
              zIndex: 502,
            }}
          />
        )}

        {/* SPEED PUZZLE GAME */}
        <AnimatePresence>
          {showSpeedGame && (
            <SpeedPuzzle onClose={() => setShowSpeedGame(false)} />
          )}
        </AnimatePresence>
      </section>

      {/* Globe Debug Editor — hidden behind ?editor=jarowe */}
      {showEditor && (
        <Suspense fallback={null}>
          <GlobeEditor
            editorParams={editorParams}
            globeRef={globeRef}
            globeShaderMaterial={globeShaderMaterial}
            setOverlayParams={setOverlayParams}
          />
        </Suspense>
      )}
    </div>
  );
}
