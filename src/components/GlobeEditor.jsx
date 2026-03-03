import { useEffect, useRef } from 'react';
import GUI from 'lil-gui';
import * as THREE from 'three';
import { GLOBE_DEFAULTS } from '../utils/globeDefaults';
import { PRISM_DEFAULTS } from '../utils/prismDefaults';
import { GLASS_PRESETS } from './Prism3D';

const STORAGE_KEY = 'jarowe_globe_editor_preset';
const GLASS_PRESET_STORAGE_KEY = 'jarowe_glass_presets';

function rgbToHex(arr) {
  const r = Math.round(Math.min(1, Math.max(0, arr[0])) * 255);
  const g = Math.round(Math.min(1, Math.max(0, arr[1])) * 255);
  const b = Math.round(Math.min(1, Math.max(0, arr[2])) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export default function GlobeEditor({ editorParams, globeRef, globeShaderMaterial, setOverlayParams }) {
  const guiRef = useRef(null);

  useEffect(() => {
    if (guiRef.current) return;

    const p = editorParams.current;

    // Build proxy: scalars direct, colors as hex, booleans as-is
    const proxy = {};
    for (const [key, val] of Object.entries(p)) {
      if (Array.isArray(val)) {
        proxy[key] = rgbToHex(val);
      } else {
        proxy[key] = val;
      }
    }

    const gui = new GUI({ title: 'Globe Editor', width: 320 });
    gui.domElement.style.position = 'fixed';
    gui.domElement.style.top = '10px';
    gui.domElement.style.right = '10px';
    gui.domElement.style.zIndex = '10000';
    gui.domElement.style.maxHeight = '92vh';
    gui.domElement.style.overflowY = 'auto';
    guiRef.current = gui;

    // ── Helpers ──
    const updateSurfaceUniform = (key) => (v) => {
      p[key] = v;
      if (globeShaderMaterial?.uniforms?.[key]) globeShaderMaterial.uniforms[key].value = v;
    };
    const updateSurfaceColor = (key) => (hex) => {
      const rgb = hexToRgb(hex);
      p[key] = rgb;
      if (globeShaderMaterial?.uniforms?.[key]) globeShaderMaterial.uniforms[key].value.set(...rgb);
    };
    const updateShaderUniform = (getMat, key) => (v) => {
      p[key] = v;
      const mat = getMat();
      if (mat?.uniforms?.[key]) mat.uniforms[key].value = v;
    };
    const updateShaderColor = (getMat, key) => (hex) => {
      const rgb = hexToRgb(hex);
      p[key] = rgb;
      const mat = getMat();
      if (mat?.uniforms?.[key]) mat.uniforms[key].value.set(...rgb);
    };
    const updateParam = (key) => (v) => { p[key] = v; };
    const updatePPColor = (key) => (hex) => {
      const rgb = hexToRgb(hex);
      p[key] = rgb;
      const pp = globeRef.current?.ppPass;
      if (pp?.uniforms?.tint) pp.uniforms.tint.value.set(...rgb);
    };

    // Material accessors
    const getCloudMat = () => globeRef.current?.cloudMesh?.material;
    const getRimMat = () => globeRef.current?.atmosShell?.rim?.material;
    const getHaloMat = () => globeRef.current?.atmosShell?.halo?.material;
    const getParticleMat = () => globeRef.current?.particleSystem?.material;
    const getAuroraMat = () => globeRef.current?.auroraMesh?.material;
    const getPrismGlowMat = () => globeRef.current?.prismGlowMesh?.material;
    const getEnvGlowMat = () => globeRef.current?.envGlowMesh?.material;
    const getLavaLampMat = () => globeRef.current?.lavaLampMesh?.material;

    // ══════════════════════════════════════════
    // CONTROLS / TIME
    // ══════════════════════════════════════════
    const controlsFolder = gui.addFolder('Controls');
    controlsFolder.add(proxy, 'animationPaused').name('Pause Animation').onChange(updateParam('animationPaused'));
    controlsFolder.add(proxy, 'timeOverrideHour', -1, 24, 0.25).name('Time of Day (UTC)').onChange(updateParam('timeOverrideHour'))
      .listen();

    // Timezone quick-presets: sets UTC hour so noon falls over that region
    // Formula: UTC hour = 12 + longitude/15 (solar noon at longitude)
    const tzPresets = {
      'Real-time': -1,
      'Noon in New York (EST)': 17,      // -75° → 12+5=17
      'Noon in Chicago (CST)': 18,       // -90° → 12+6=18
      'Noon in Denver (MST)': 19,        // -105° → 12+7=19
      'Noon in LA (PST)': 20,            // -120° → 12+8=20
      'Noon in London (GMT)': 12,        // 0° → 12
      'Noon in Paris (CET)': 11,         // 15° → 12-1=11
      'Noon in Dubai (GST)': 8,          // 60° → 12-4=8
      'Noon in Mumbai (IST)': 6.5,       // 82.5° → 12-5.5=6.5
      'Noon in Tokyo (JST)': 3,          // 135° → 12-9=3
      'Noon in Sydney (AEST)': 2,        // 150° → 12-10=2
      'Noon in Auckland (NZST)': 0,      // 180° → 12-12=0
    };
    const tzProxy = { timezone: 'Real-time' };
    controlsFolder.add(tzProxy, 'timezone', Object.keys(tzPresets)).name('Timezone Presets').onChange((tz) => {
      const utcHour = tzPresets[tz];
      proxy.timeOverrideHour = utcHour;
      p.timeOverrideHour = utcHour;
    });

    controlsFolder.add(proxy, 'globeBreakout').name('Globe Breakout').onChange((v) => {
      p.globeBreakout = v;
      const cell = document.querySelector('.cell-map');
      if (cell) {
        cell.classList.toggle('globe-breakout', v);
        if (v) cell.style.setProperty('--globe-breakout-px', `${p.globeBreakoutPx}px`);
      }
    });
    controlsFolder.add(proxy, 'globeBreakoutPx', 0, 400, 10).name('Breakout Height (px)').onChange((v) => {
      p.globeBreakoutPx = v;
      const cell = document.querySelector('.cell-map');
      if (cell && p.globeBreakout) cell.style.setProperty('--globe-breakout-px', `${v}px`);
    });
    controlsFolder.add(proxy, 'glassClipTop', 0, 300, 1).name('Glass Clip Top (px)').onChange(updateParam('glassClipTop'));
    controlsFolder.add(proxy, 'glassClipFeather', 0, 200, 1).name('Glass Clip Feather').onChange(updateParam('glassClipFeather'));
    controlsFolder.add(proxy, 'breakoutSoftBlend', 0, 200, 1).name('PP Mask Blend (px)').onChange(updateParam('breakoutSoftBlend'));
    controlsFolder.add(proxy, 'breakoutContentThreshold', 0, 1.0, 0.01).name('PP Content Thresh').onChange(updateParam('breakoutContentThreshold'));

    // ── Camera ──
    const cameraFolder = controlsFolder.addFolder('Camera');
    cameraFolder.add(proxy, 'cameraStartAlt', 0.5, 8.0, 0.1).name('Start Altitude').onChange(updateParam('cameraStartAlt'));
    cameraFolder.add(proxy, 'cameraStartLatOffset', -90, 90, 1).name('Start Lat Offset').onChange(updateParam('cameraStartLatOffset'));
    cameraFolder.add(proxy, 'cameraStartLngOffset', -180, 180, 1).name('Start Lng Offset').onChange(updateParam('cameraStartLngOffset'));
    cameraFolder.add(proxy, 'cameraIntroAlt', 0.5, 5.0, 0.1).name('Intro Altitude').onChange(updateParam('cameraIntroAlt'));
    cameraFolder.add(proxy, 'cameraIntroSpeed', 500, 10000, 100).name('Intro Speed (ms)').onChange(updateParam('cameraIntroSpeed'));
    cameraFolder.add(proxy, 'cameraLocationAlt', 0.3, 5.0, 0.05).name('Location Altitude').onChange(updateParam('cameraLocationAlt'));
    cameraFolder.add(proxy, 'cameraLocationSpeed', 500, 8000, 100).name('Location Fly Speed').onChange(updateParam('cameraLocationSpeed'));
    cameraFolder.add(proxy, 'cameraCycleInterval', 3000, 30000, 500).name('Cycle Interval (ms)').onChange((v) => {
      p.cameraCycleInterval = v;
      // Restart cycle with new interval
      const g = globeRef.current;
      if (g) {
        if (g._cycleTimer) clearInterval(g._cycleTimer);
      }
    });
    cameraFolder.add(proxy, 'cameraBopZoomPunch', 0.0, 1.0, 0.01).name('Bop Zoom Punch').onChange(updateParam('cameraBopZoomPunch'));
    cameraFolder.add(proxy, 'cameraBopShakeIntensity', 0.0, 2.0, 0.05).name('Bop Shake').onChange(updateParam('cameraBopShakeIntensity'));
    cameraFolder.add({ flyToStart() {
      const g = globeRef.current;
      if (!g) return;
      const ep = editorParams.current;
      const first = window._expeditions?.[0];
      if (first) g.pointOfView({ lat: first.lat + (ep.cameraStartLatOffset ?? 25), lng: first.lng + (ep.cameraStartLngOffset ?? -50), altitude: ep.cameraStartAlt ?? 3.0 }, 0);
    } }, 'flyToStart').name('Preview Start Position');
    cameraFolder.add({ flyIntro() {
      const g = globeRef.current;
      if (!g) return;
      const ep = editorParams.current;
      const first = window._expeditions?.[0];
      if (first) {
        g.pointOfView({ lat: first.lat + (ep.cameraStartLatOffset ?? 25), lng: first.lng + (ep.cameraStartLngOffset ?? -50), altitude: ep.cameraStartAlt ?? 3.0 }, 0);
        setTimeout(() => g.pointOfView({ lat: first.lat, lng: first.lng, altitude: ep.cameraIntroAlt ?? 1.5 }, ep.cameraIntroSpeed ?? 4000), 200);
      }
    } }, 'flyIntro').name('Replay Intro');
    cameraFolder.close();

    // ── Expedition Photo Card ──
    const photoFolder = controlsFolder.addFolder('Photo Card');
    photoFolder.add(proxy, 'photoCardTop', -40, 80, 1).name('Top (px)').onChange(updateParam('photoCardTop'));
    photoFolder.add(proxy, 'photoCardRight', -60, 40, 1).name('Right (px)').onChange(updateParam('photoCardRight'));
    photoFolder.add(proxy, 'photoCardWidth', 80, 260, 5).name('Width (px)').onChange(updateParam('photoCardWidth'));

    // ── Message Bubble ──
    const msgFolder = controlsFolder.addFolder('Message Bubble');
    msgFolder.add(proxy, 'msgBubbleBottom', 20, 200, 1).name('Bottom (px)').onChange(updateParam('msgBubbleBottom'));
    msgFolder.add(proxy, 'msgBubbleRight', -60, 40, 1).name('Right (px)').onChange(updateParam('msgBubbleRight'));

    // ── Visibility Toggles ──
    const visFolder = controlsFolder.addFolder('Visibility');
    visFolder.add(proxy, 'cloudsVisible').name('Clouds').onChange(updateParam('cloudsVisible'));
    visFolder.add(proxy, 'auroraEnabled').name('Aurora').onChange(updateParam('auroraEnabled'));
    visFolder.add(proxy, 'prismGlowEnabled').name('Prismatic Glow').onChange(updateParam('prismGlowEnabled'));
    visFolder.add(proxy, 'envGlowEnabled').name('Env Glow').onChange(updateParam('envGlowEnabled'));
    visFolder.add(proxy, 'lavaLampEnabled').name('Lava Lamp').onChange(updateParam('lavaLampEnabled'));
    visFolder.add(proxy, 'sunRaysEnabled').name('Sun Rays').onChange(updateParam('sunRaysEnabled'));
    visFolder.add(proxy, 'lensFlareVisible').name('Lens Flare').onChange(updateParam('lensFlareVisible'));
    visFolder.add(proxy, 'starsVisible').name('Stars').onChange(updateParam('starsVisible'));
    visFolder.add(proxy, 'dustVisible').name('Dust').onChange(updateParam('dustVisible'));
    visFolder.add(proxy, 'windParticlesVisible').name('Wind Particles').onChange(updateParam('windParticlesVisible'));
    visFolder.add(proxy, 'satellitesVisible').name('Satellites').onChange(updateParam('satellitesVisible'));
    visFolder.add(proxy, 'planesVisible').name('Planes').onChange(updateParam('planesVisible'));
    visFolder.add(proxy, 'carsVisible').name('Cars').onChange(updateParam('carsVisible'));
    visFolder.add(proxy, 'wispsVisible').name('Wisps').onChange(updateParam('wispsVisible'));

    // ── CSS Overlay Layers (the mystery diagonal gradients!) ──
    const overlayLayersFolder = visFolder.addFolder('CSS Overlay Layers');
    overlayLayersFolder.add(proxy, 'fogLayerEnabled').name('Fog Gradient Layer').onChange(updateParam('fogLayerEnabled'));
    overlayLayersFolder.add(proxy, 'particlesLayerEnabled').name('CSS Particles Layer').onChange(updateParam('particlesLayerEnabled'));
    overlayLayersFolder.add(proxy, 'innerGlowEnabled').name('Inner Glow (::after)').onChange((v) => {
      p.innerGlowEnabled = v;
      const cell = document.querySelector('.cell-map');
      if (cell) { cell.classList.toggle('inner-glow-off', !v); }
    });

    // ── Glass Edge Effect ──
    const glassFolder = visFolder.addFolder('Glass Edge Effect');
    glassFolder.add(proxy, 'glassSweepEnabled').name('Sweep (Rotating)').onChange((v) => {
      p.glassSweepEnabled = v;
      const cell = document.querySelector('.cell-map');
      if (cell) { cell.classList.toggle('glass-sweep-off', !v); }
    });
    glassFolder.add(proxy, 'glassShimmerEnabled').name('Shimmer (Iridescent)').onChange((v) => {
      p.glassShimmerEnabled = v;
      const cell = document.querySelector('.cell-map');
      if (cell) { cell.classList.toggle('glass-shimmer-off', !v); }
    });
    glassFolder.add(proxy, 'glassSweepOpacity', 0.0, 1.0, 0.01).name('Sweep Opacity').onChange((v) => {
      p.glassSweepOpacity = v;
      const cell = document.querySelector('.cell-map');
      if (cell) cell.style.setProperty('--glass-sweep-opacity', v);
    });
    glassFolder.add(proxy, 'glassShimmerOpacity', 0.0, 1.0, 0.01).name('Shimmer Opacity').onChange((v) => {
      p.glassShimmerOpacity = v;
      const cell = document.querySelector('.cell-map');
      if (cell) cell.style.setProperty('--glass-shimmer-opacity', v);
    });

    // ══════════════════════════════════════════
    // SHADER LIGHTING
    // ══════════════════════════════════════════
    const lightFolder = gui.addFolder('Lighting');
    lightFolder.add(proxy, 'shaderAmbient', 0.0, 0.5, 0.005).name('Shader Ambient').onChange(updateSurfaceUniform('shaderAmbient'));
    lightFolder.add(proxy, 'shaderSunMult', 0.0, 5.0, 0.05).name('Shader Sun Mult').onChange(updateSurfaceUniform('shaderSunMult'));
    lightFolder.add(proxy, 'ambientIntensity', 0.0, 2.0, 0.01).name('Scene Ambient').onChange((v) => {
      p.ambientIntensity = v;
      if (globeRef.current?._ambientLight) globeRef.current._ambientLight.intensity = v;
    });
    lightFolder.add(proxy, 'sunIntensity', 0.0, 10.0, 0.1).name('Scene Sun').onChange((v) => {
      p.sunIntensity = v;
      if (globeRef.current?._sunLight) globeRef.current._sunLight.intensity = v;
    });
    lightFolder.close();

    // ══════════════════════════════════════════
    // SURFACE
    // ══════════════════════════════════════════
    const surfaceFolder = gui.addFolder('Surface');

    const dayNightFolder = surfaceFolder.addFolder('Day/Night Blend');
    dayNightFolder.add(proxy, 'dayStrengthMin', -1.0, 0.5, 0.01).name('Day Min').onChange(updateSurfaceUniform('dayStrengthMin'));
    dayNightFolder.add(proxy, 'dayStrengthMax', 0.0, 2.0, 0.01).name('Day Max').onChange(updateSurfaceUniform('dayStrengthMax'));

    const cityFolder = surfaceFolder.addFolder('City Lights');
    cityFolder.add(proxy, 'cityGateMin', 0.0, 0.5, 0.005).name('Gate Min').onChange(updateSurfaceUniform('cityGateMin'));
    cityFolder.add(proxy, 'cityGateMax', 0.0, 1.0, 0.01).name('Gate Max').onChange(updateSurfaceUniform('cityGateMax'));
    cityFolder.addColor(proxy, 'cityLightColor').name('Light Color').onChange(updateSurfaceColor('cityLightColor'));
    cityFolder.addColor(proxy, 'cityLightBoost').name('Boost Color').onChange(updateSurfaceColor('cityLightBoost'));
    cityFolder.add(proxy, 'cityGlowPow', 0.5, 8.0, 0.1).name('Glow Power').onChange(updateSurfaceUniform('cityGlowPow'));
    cityFolder.add(proxy, 'cityGlowMult', 0.0, 10.0, 0.1).name('Glow Mult').onChange(updateSurfaceUniform('cityGlowMult'));

    const landFolder = surfaceFolder.addFolder('Land Material');
    landFolder.add(proxy, 'landFresnelPow', 0.5, 10.0, 0.1).name('Fresnel Pow').onChange(updateSurfaceUniform('landFresnelPow'));
    landFolder.add(proxy, 'landFresnelMult', 0.0, 1.0, 0.01).name('Fresnel Mult').onChange(updateSurfaceUniform('landFresnelMult'));
    landFolder.add(proxy, 'landSpecPow', 1.0, 200.0, 1.0).name('Spec Power').onChange(updateSurfaceUniform('landSpecPow'));
    landFolder.add(proxy, 'landSpecMult', 0.0, 1.0, 0.01).name('Spec Mult').onChange(updateSurfaceUniform('landSpecMult'));
    landFolder.add(proxy, 'bumpStrength', 0.0, 2.0, 0.01).name('Bump').onChange(updateSurfaceUniform('bumpStrength'));

    const surfAtmosFolder = surfaceFolder.addFolder('Surface Atmosphere');
    surfAtmosFolder.addColor(proxy, 'atmosDayColor').name('Day Color').onChange(updateSurfaceColor('atmosDayColor'));
    surfAtmosFolder.addColor(proxy, 'atmosTwilightColor').name('Twilight Color').onChange(updateSurfaceColor('atmosTwilightColor'));
    surfAtmosFolder.add(proxy, 'atmosBlendMin', -1.0, 1.0, 0.01).name('Blend Min').onChange(updateSurfaceUniform('atmosBlendMin'));
    surfAtmosFolder.add(proxy, 'atmosBlendMax', -0.5, 2.0, 0.01).name('Blend Max').onChange(updateSurfaceUniform('atmosBlendMax'));
    surfAtmosFolder.add(proxy, 'atmosMixMin', -2.0, 1.0, 0.01).name('Mix Min').onChange(updateSurfaceUniform('atmosMixMin'));
    surfAtmosFolder.add(proxy, 'atmosMixMax', 0.0, 3.0, 0.01).name('Mix Max').onChange(updateSurfaceUniform('atmosMixMax'));
    surfAtmosFolder.add(proxy, 'atmosFresnelPow', 0.5, 8.0, 0.1).name('Fresnel Pow').onChange(updateSurfaceUniform('atmosFresnelPow'));
    surfAtmosFolder.add(proxy, 'atmosStrength', 0.0, 1.0, 0.01).name('Strength').onChange(updateSurfaceUniform('atmosStrength'));

    const sunsetFolder = surfaceFolder.addFolder('Sunset / Terminator');
    sunsetFolder.addColor(proxy, 'sunsetColor').name('Color').onChange(updateSurfaceColor('sunsetColor'));
    sunsetFolder.add(proxy, 'sunsetStrength', 0.0, 1.0, 0.01).name('Strength').onChange(updateSurfaceUniform('sunsetStrength'));
    sunsetFolder.add(proxy, 'terminatorSoftness', 0.0, 1.0, 0.01).name('Softness').onChange(updateSurfaceUniform('terminatorSoftness'));
    sunsetFolder.add(proxy, 'terminatorGlow', 0.0, 1.0, 0.01).name('Glow Band').onChange(updateSurfaceUniform('terminatorGlow'));
    surfaceFolder.close();

    // ══════════════════════════════════════════
    // WATER
    // ══════════════════════════════════════════
    const waterFolder = gui.addFolder('Water');
    waterFolder.add(proxy, 'waterThresholdMin', 0.0, 1.0, 0.01).name('Detect Min').onChange(updateSurfaceUniform('waterThresholdMin'));
    waterFolder.add(proxy, 'waterThresholdMax', 0.0, 1.0, 0.01).name('Detect Max').onChange(updateSurfaceUniform('waterThresholdMax'));
    waterFolder.addColor(proxy, 'deepSeaColor').name('Deep Sea').onChange(updateSurfaceColor('deepSeaColor'));
    waterFolder.addColor(proxy, 'midSeaColor').name('Mid Sea').onChange(updateSurfaceColor('midSeaColor'));
    waterFolder.addColor(proxy, 'shallowSeaColor').name('Shallow Sea').onChange(updateSurfaceColor('shallowSeaColor'));
    waterFolder.add(proxy, 'waterSpecPow', 1.0, 300.0, 1.0).name('Spec Power').onChange(updateSurfaceUniform('waterSpecPow'));
    waterFolder.add(proxy, 'waterSpecMult', 0.0, 10.0, 0.1).name('Spec Mult').onChange(updateSurfaceUniform('waterSpecMult'));
    waterFolder.add(proxy, 'waterGlarePow', 1.0, 50.0, 0.5).name('Glare Power').onChange(updateSurfaceUniform('waterGlarePow'));
    waterFolder.add(proxy, 'waterGlareMult', 0.0, 5.0, 0.05).name('Glare Mult').onChange(updateSurfaceUniform('waterGlareMult'));
    waterFolder.add(proxy, 'waterFresnelPow', 0.5, 10.0, 0.1).name('Fresnel Pow').onChange(updateSurfaceUniform('waterFresnelPow'));
    waterFolder.add(proxy, 'waterWaveSpeed', 0.0, 5.0, 0.05).name('Wave Speed').onChange(updateSurfaceUniform('waterWaveSpeed'));
    waterFolder.add(proxy, 'waterWaveScale', 0.1, 3.0, 0.05).name('Wave Scale').onChange(updateSurfaceUniform('waterWaveScale'));
    waterFolder.add(proxy, 'waterCurrentStrength', 0.0, 3.0, 0.05).name('Current Strength').onChange(updateSurfaceUniform('waterCurrentStrength'));
    waterFolder.add(proxy, 'waterNormalStrength', 0.0, 20.0, 0.1).name('Normal Strength').onChange(updateSurfaceUniform('waterNormalStrength'));
    waterFolder.add(proxy, 'waterDetailScale', 100.0, 2000.0, 10).name('Detail Scale').onChange(updateSurfaceUniform('waterDetailScale'));
    waterFolder.add(proxy, 'waterBigWaveScale', 50.0, 800.0, 5).name('Big Wave Scale').onChange(updateSurfaceUniform('waterBigWaveScale'));
    waterFolder.add(proxy, 'waterCausticsStrength', 0.0, 1.0, 0.01).name('Caustics').onChange(updateSurfaceUniform('waterCausticsStrength'));
    waterFolder.add(proxy, 'waterSunGlitter', 0.0, 2.0, 0.05).name('Sun Glitter').onChange(updateSurfaceUniform('waterSunGlitter'));
    waterFolder.add(proxy, 'waterFoamStrength', 0.0, 1.0, 0.01).name('Foam / Whitecaps').onChange(updateSurfaceUniform('waterFoamStrength'));
    waterFolder.addColor(proxy, 'waterSubsurfaceColor').name('Subsurface Color').onChange(updateSurfaceColor('waterSubsurfaceColor'));
    waterFolder.add(proxy, 'waterSubsurfaceStrength', 0.0, 1.0, 0.01).name('Subsurface Strength').onChange(updateSurfaceUniform('waterSubsurfaceStrength'));
    waterFolder.close();

    // ══════════════════════════════════════════
    // CLOUDS
    // ══════════════════════════════════════════
    const cloudFolder = gui.addFolder('Clouds');
    cloudFolder.add(proxy, 'cloudAlphaMin', 0.0, 1.0, 0.01).name('Alpha Min').onChange(updateShaderUniform(getCloudMat, 'cloudAlphaMin'));
    cloudFolder.add(proxy, 'cloudAlphaMax', 0.0, 1.0, 0.01).name('Alpha Max').onChange(updateShaderUniform(getCloudMat, 'cloudAlphaMax'));
    cloudFolder.add(proxy, 'cloudOpacity', 0.0, 1.0, 0.01).name('Opacity').onChange(updateShaderUniform(getCloudMat, 'cloudOpacity'));
    cloudFolder.addColor(proxy, 'cloudLitColor').name('Lit Color').onChange(updateShaderColor(getCloudMat, 'cloudLitColor'));
    cloudFolder.addColor(proxy, 'cloudShadowColor').name('Shadow Color').onChange(updateShaderColor(getCloudMat, 'cloudShadowColor'));
    cloudFolder.add(proxy, 'cloudDayFactorMin', -1.0, 1.0, 0.01).name('Day Min').onChange(updateShaderUniform(getCloudMat, 'cloudDayFactorMin'));
    cloudFolder.add(proxy, 'cloudDayFactorMax', 0.0, 2.0, 0.01).name('Day Max').onChange(updateShaderUniform(getCloudMat, 'cloudDayFactorMax'));
    cloudFolder.addColor(proxy, 'cloudTerminatorColor').name('Terminator').onChange(updateShaderColor(getCloudMat, 'cloudTerminatorColor'));
    cloudFolder.add(proxy, 'cloudTerminatorMult', 0.0, 10.0, 0.1).name('Term. Mult').onChange(updateShaderUniform(getCloudMat, 'cloudTerminatorMult'));
    cloudFolder.add(proxy, 'cloudRimPow', 0.5, 10.0, 0.1).name('Rim Power').onChange(updateShaderUniform(getCloudMat, 'cloudRimPow'));
    cloudFolder.add(proxy, 'cloudRimStrength', 0.0, 2.0, 0.01).name('Rim Strength').onChange(updateShaderUniform(getCloudMat, 'cloudRimStrength'));
    cloudFolder.addColor(proxy, 'cloudSubsurfaceColor').name('Subsurface').onChange(updateShaderColor(getCloudMat, 'cloudSubsurfaceColor'));
    cloudFolder.addColor(proxy, 'cloudSilverLiningColor').name('Silver Lining').onChange(updateShaderColor(getCloudMat, 'cloudSilverLiningColor'));
    cloudFolder.add(proxy, 'cloudRotationSpeed', 0.0, 0.1, 0.001).name('Rotation Speed');
    cloudFolder.close();

    // ══════════════════════════════════════════
    // AURORA BOREALIS
    // ══════════════════════════════════════════
    const auroraFolder = gui.addFolder('Aurora Borealis');
    auroraFolder.addColor(proxy, 'auroraColor1').name('Primary (Green)').onChange(updateShaderColor(getAuroraMat, 'auroraColor1'));
    auroraFolder.addColor(proxy, 'auroraColor2').name('Secondary (Blue)').onChange(updateShaderColor(getAuroraMat, 'auroraColor2'));
    auroraFolder.addColor(proxy, 'auroraColor3').name('Tertiary (Purple)').onChange(updateShaderColor(getAuroraMat, 'auroraColor3'));
    auroraFolder.add(proxy, 'auroraIntensity', 0.0, 5.0, 0.05).name('Intensity').onChange(updateShaderUniform(getAuroraMat, 'auroraIntensity'));
    auroraFolder.add(proxy, 'auroraSpeed', 0.0, 3.0, 0.05).name('Speed').onChange(updateShaderUniform(getAuroraMat, 'auroraSpeed'));
    auroraFolder.add(proxy, 'auroraLatitude', 40, 85, 1).name('Latitude (deg)').onChange(updateShaderUniform(getAuroraMat, 'auroraLatitude'));
    auroraFolder.add(proxy, 'auroraWidth', 5, 40, 1).name('Width (deg)').onChange(updateShaderUniform(getAuroraMat, 'auroraWidth'));
    auroraFolder.add(proxy, 'auroraNoiseScale', 0.5, 10.0, 0.1).name('Noise Scale').onChange(updateShaderUniform(getAuroraMat, 'auroraNoiseScale'));
    auroraFolder.add(proxy, 'auroraCurtainPow', 0.5, 5.0, 0.1).name('Curtain Power').onChange(updateShaderUniform(getAuroraMat, 'auroraCurtainPow'));
    auroraFolder.add(proxy, 'auroraEvolution', 0.0, 2.0, 0.05).name('Evolution Speed').onChange(updateShaderUniform(getAuroraMat, 'auroraEvolution'));
    auroraFolder.add(proxy, 'auroraWaveSpeed', 0.0, 3.0, 0.05).name('Wave Speed').onChange(updateShaderUniform(getAuroraMat, 'auroraWaveSpeed'));
    auroraFolder.close();

    // ══════════════════════════════════════════
    // PRISMATIC GLOW LAYER
    // ══════════════════════════════════════════
    const prismFolder = gui.addFolder('Prismatic Glow');
    prismFolder.addColor(proxy, 'prismGlowColor1').name('Color 1 (Blue)').onChange(updateShaderColor(getPrismGlowMat, 'prismGlowColor1'));
    prismFolder.addColor(proxy, 'prismGlowColor2').name('Color 2 (Purple)').onChange(updateShaderColor(getPrismGlowMat, 'prismGlowColor2'));
    prismFolder.addColor(proxy, 'prismGlowColor3').name('Color 3 (Green)').onChange(updateShaderColor(getPrismGlowMat, 'prismGlowColor3'));
    prismFolder.add(proxy, 'prismGlowIntensity', 0.0, 3.0, 0.01).name('Intensity').onChange(updateShaderUniform(getPrismGlowMat, 'prismGlowIntensity'));
    prismFolder.add(proxy, 'prismGlowSpeed', 0.0, 3.0, 0.05).name('Speed').onChange(updateShaderUniform(getPrismGlowMat, 'prismGlowSpeed'));
    prismFolder.add(proxy, 'prismGlowNoiseScale', 0.5, 10.0, 0.1).name('Noise Scale').onChange(updateShaderUniform(getPrismGlowMat, 'prismGlowNoiseScale'));
    prismFolder.add(proxy, 'prismGlowFresnelPow', 0.5, 8.0, 0.1).name('Fresnel Power').onChange(updateShaderUniform(getPrismGlowMat, 'prismGlowFresnelPow'));
    prismFolder.add(proxy, 'prismGlowRotSpeed', -0.5, 0.5, 0.005).name('Rotation Speed').onChange(updateParam('prismGlowRotSpeed'));
    prismFolder.add(proxy, 'prismGlowTiltX', -3.14, 3.14, 0.01).name('Tilt X').onChange(updateParam('prismGlowTiltX'));
    prismFolder.add(proxy, 'prismGlowTiltZ', -3.14, 3.14, 0.01).name('Tilt Z').onChange(updateParam('prismGlowTiltZ'));
    prismFolder.close();

    // ══════════════════════════════════════════
    // ENVIRONMENT GLOW LAYER
    // ══════════════════════════════════════════
    const envFolder = gui.addFolder('Environment Glow');
    envFolder.addColor(proxy, 'envGlowColor1').name('Color 1').onChange(updateShaderColor(getEnvGlowMat, 'envGlowColor1'));
    envFolder.addColor(proxy, 'envGlowColor2').name('Color 2').onChange(updateShaderColor(getEnvGlowMat, 'envGlowColor2'));
    envFolder.addColor(proxy, 'envGlowColor3').name('Color 3').onChange(updateShaderColor(getEnvGlowMat, 'envGlowColor3'));
    envFolder.add(proxy, 'envGlowIntensity', 0.0, 1.0, 0.005).name('Intensity').onChange(updateShaderUniform(getEnvGlowMat, 'envGlowIntensity'));
    envFolder.add(proxy, 'envGlowSpeed', 0.0, 2.0, 0.01).name('Speed').onChange(updateShaderUniform(getEnvGlowMat, 'envGlowSpeed'));
    envFolder.add(proxy, 'envGlowNoiseScale', 0.5, 10.0, 0.1).name('Noise Scale').onChange(updateShaderUniform(getEnvGlowMat, 'envGlowNoiseScale'));
    envFolder.add(proxy, 'envGlowCoverage', 0.0, 1.0, 0.01).name('Coverage').onChange(updateShaderUniform(getEnvGlowMat, 'envGlowCoverage'));
    envFolder.add(proxy, 'envGlowTiltX', -3.14, 3.14, 0.01).name('Tilt X').onChange(updateParam('envGlowTiltX'));
    envFolder.add(proxy, 'envGlowTiltZ', -3.14, 3.14, 0.01).name('Tilt Z').onChange(updateParam('envGlowTiltZ'));
    envFolder.close();

    // ══════════════════════════════════════════
    // LAVA LAMP LAYER
    // ══════════════════════════════════════════
    const lavaFolder = gui.addFolder('Lava Lamp');
    lavaFolder.addColor(proxy, 'lavaLampColor1').name('Color 1').onChange(updateShaderColor(getLavaLampMat, 'lavaLampColor1'));
    lavaFolder.addColor(proxy, 'lavaLampColor2').name('Color 2').onChange(updateShaderColor(getLavaLampMat, 'lavaLampColor2'));
    lavaFolder.addColor(proxy, 'lavaLampColor3').name('Color 3').onChange(updateShaderColor(getLavaLampMat, 'lavaLampColor3'));
    lavaFolder.add(proxy, 'lavaLampIntensity', 0.0, 0.5, 0.005).name('Intensity').onChange(updateShaderUniform(getLavaLampMat, 'lavaLampIntensity'));
    lavaFolder.add(proxy, 'lavaLampSpeed', 0.0, 1.0, 0.01).name('Speed').onChange(updateShaderUniform(getLavaLampMat, 'lavaLampSpeed'));
    lavaFolder.add(proxy, 'lavaLampScale', 0.5, 5.0, 0.1).name('Scale').onChange(updateShaderUniform(getLavaLampMat, 'lavaLampScale'));
    lavaFolder.add(proxy, 'lavaLampBlobSize', 0.5, 10.0, 0.1).name('Blob Size').onChange(updateShaderUniform(getLavaLampMat, 'lavaLampBlobSize'));
    lavaFolder.add(proxy, 'lavaLampFeather', 0.0, 5.0, 0.01).name('Feather (Softness)').onChange(updateShaderUniform(getLavaLampMat, 'lavaLampFeather'));
    lavaFolder.close();

    // ══════════════════════════════════════════
    // ATMOSPHERE RIM
    // ══════════════════════════════════════════
    const rimFolder = gui.addFolder('Atmosphere Rim');
    rimFolder.add(proxy, 'rimFresnelPow', 0.5, 10.0, 0.1).name('Fresnel Pow').onChange(updateShaderUniform(getRimMat, 'rimFresnelPow'));
    rimFolder.add(proxy, 'rimGlowMult', 0.0, 20.0, 0.1).name('Glow Mult').onChange(updateShaderUniform(getRimMat, 'rimGlowMult'));
    rimFolder.add(proxy, 'rimFadeout', 0.0, 1.0, 0.01).name('Soft Edge').onChange(updateShaderUniform(getRimMat, 'rimFadeout'));
    rimFolder.addColor(proxy, 'rimDayColor').name('Day Color').onChange(updateShaderColor(getRimMat, 'rimDayColor'));
    rimFolder.addColor(proxy, 'rimTwilightColor').name('Twilight').onChange(updateShaderColor(getRimMat, 'rimTwilightColor'));
    rimFolder.addColor(proxy, 'rimNightColor').name('Night Color').onChange(updateShaderColor(getRimMat, 'rimNightColor'));
    rimFolder.add(proxy, 'rimNightToTwilightMin', -2.0, 1.0, 0.01).name('N>T Min').onChange(updateShaderUniform(getRimMat, 'rimNightToTwilightMin'));
    rimFolder.add(proxy, 'rimNightToTwilightMax', -1.0, 2.0, 0.01).name('N>T Max').onChange(updateShaderUniform(getRimMat, 'rimNightToTwilightMax'));
    rimFolder.add(proxy, 'rimTwilightToDayMin', -1.0, 1.0, 0.01).name('T>D Min').onChange(updateShaderUniform(getRimMat, 'rimTwilightToDayMin'));
    rimFolder.add(proxy, 'rimTwilightToDayMax', 0.0, 2.0, 0.01).name('T>D Max').onChange(updateShaderUniform(getRimMat, 'rimTwilightToDayMax'));
    rimFolder.add(proxy, 'rimSunMaskMin', -2.0, 1.0, 0.01).name('Sun Mask Min').onChange(updateShaderUniform(getRimMat, 'rimSunMaskMin'));
    rimFolder.add(proxy, 'rimSunMaskMax', -1.0, 2.0, 0.01).name('Sun Mask Max').onChange(updateShaderUniform(getRimMat, 'rimSunMaskMax'));
    rimFolder.add(proxy, 'rimBacklitMin', -1.0, 0.5, 0.01).name('Backlit Min').onChange(updateShaderUniform(getRimMat, 'rimBacklitMin'));
    rimFolder.add(proxy, 'rimBacklitMax', -1.0, 0.5, 0.01).name('Backlit Max').onChange(updateShaderUniform(getRimMat, 'rimBacklitMax'));
    rimFolder.add(proxy, 'rimBacklitFadeMin', -2.0, 0.5, 0.01).name('Backlit Fade Min').onChange(updateShaderUniform(getRimMat, 'rimBacklitFadeMin'));
    rimFolder.add(proxy, 'rimBacklitFadeMax', -1.0, 0.5, 0.01).name('Backlit Fade Max').onChange(updateShaderUniform(getRimMat, 'rimBacklitFadeMax'));
    rimFolder.add(proxy, 'rimBacklitWeight', 0.0, 3.0, 0.01).name('Backlit Weight').onChange(updateShaderUniform(getRimMat, 'rimBacklitWeight'));
    rimFolder.close();

    // ══════════════════════════════════════════
    // ATMOSPHERE HALO
    // ══════════════════════════════════════════
    const haloFolder = gui.addFolder('Atmosphere Halo');
    haloFolder.add(proxy, 'haloFresnelPow', 0.1, 8.0, 0.1).name('Fresnel Pow').onChange(updateShaderUniform(getHaloMat, 'haloFresnelPow'));
    haloFolder.add(proxy, 'haloGlowMult', 0.0, 3.0, 0.01).name('Glow Mult').onChange(updateShaderUniform(getHaloMat, 'haloGlowMult'));
    haloFolder.add(proxy, 'haloFadeout', 0.0, 1.0, 0.01).name('Soft Edge').onChange(updateShaderUniform(getHaloMat, 'haloFadeout'));
    haloFolder.addColor(proxy, 'haloDayColor').name('Day Color').onChange(updateShaderColor(getHaloMat, 'haloDayColor'));
    haloFolder.addColor(proxy, 'haloTwilightColor').name('Twilight').onChange(updateShaderColor(getHaloMat, 'haloTwilightColor'));
    haloFolder.add(proxy, 'haloBlendMin', -1.0, 1.0, 0.01).name('Blend Min').onChange(updateShaderUniform(getHaloMat, 'haloBlendMin'));
    haloFolder.add(proxy, 'haloBlendMax', 0.0, 2.0, 0.01).name('Blend Max').onChange(updateShaderUniform(getHaloMat, 'haloBlendMax'));
    haloFolder.add(proxy, 'haloSunMaskMin', -2.0, 1.0, 0.01).name('Sun Mask Min').onChange(updateShaderUniform(getHaloMat, 'haloSunMaskMin'));
    haloFolder.add(proxy, 'haloSunMaskMax', -1.0, 2.0, 0.01).name('Sun Mask Max').onChange(updateShaderUniform(getHaloMat, 'haloSunMaskMax'));
    haloFolder.close();

    // ══════════════════════════════════════════
    // SUN RAYS (3D volumetric light beams)
    // ══════════════════════════════════════════
    const sunRaysFolder = gui.addFolder('Sun Rays');
    sunRaysFolder.add(proxy, 'sunRaysEnabled').name('Enabled').onChange(updateParam('sunRaysEnabled'));
    sunRaysFolder.add(proxy, 'sunRaysIntensity', 0.0, 2.0, 0.01).name('Intensity').onChange((v) => {
      p.sunRaysIntensity = v;
      const srm = globeRef.current?.sunRaysMat;
      if (srm) srm.uniforms.rayIntensity.value = v;
    });
    sunRaysFolder.add(proxy, 'sunRaysLength', 0.5, 10.0, 0.1).name('Ray Length').onChange((v) => {
      p.sunRaysLength = v;
      const srm = globeRef.current?.sunRaysMat;
      if (srm) srm.uniforms.rayLength.value = v;
    });
    sunRaysFolder.add(proxy, 'sunRaysCount', 4, 24, 1).name('Ray Count').onChange((v) => {
      p.sunRaysCount = v;
      const srm = globeRef.current?.sunRaysMat;
      if (srm) srm.uniforms.rayCount.value = v;
    });
    sunRaysFolder.addColor(proxy, 'sunRaysColor').name('Ray Color').onChange((hex) => {
      const rgb = hexToRgb(hex);
      p.sunRaysColor = rgb;
      const srm = globeRef.current?.sunRaysMat;
      if (srm) srm.uniforms.rayColor.value.set(...rgb);
    });
    sunRaysFolder.close();

    // ══════════════════════════════════════════
    // LENS FLARE
    // ══════════════════════════════════════════
    const flareFolder = gui.addFolder('Lens Flare');
    flareFolder.add(proxy, 'flareEdgeDiffraction', 0.0, 2.0, 0.01).name('Edge Diffraction').onChange(updateParam('flareEdgeDiffraction'));
    flareFolder.add(proxy, 'flareStarburstStrength', 0.0, 2.0, 0.01).name('Starburst').onChange(updateParam('flareStarburstStrength'));
    flareFolder.add(proxy, 'flareAnamorphicStrength', 0.0, 2.0, 0.01).name('Anamorphic').onChange(updateParam('flareAnamorphicStrength'));
    const flareCompFolder = flareFolder.addFolder('Component Toggles');
    flareCompFolder.add(proxy, 'flareMainVisible').name('Main Glow').onChange(updateParam('flareMainVisible'));
    flareCompFolder.add(proxy, 'flareRaysVisible').name('Starburst Rays').onChange(updateParam('flareRaysVisible'));
    flareCompFolder.add(proxy, 'flareHaloVisible').name('Halo').onChange(updateParam('flareHaloVisible'));
    flareCompFolder.add(proxy, 'flareAnamorphicVisible').name('Anamorphic Streak').onChange(updateParam('flareAnamorphicVisible'));
    flareCompFolder.add(proxy, 'flareArtifactsVisible').name('Artifacts').onChange(updateParam('flareArtifactsVisible'));
    flareFolder.close();

    // ══════════════════════════════════════════
    // PARTICLES
    // ══════════════════════════════════════════
    const particleFolder = gui.addFolder('Particles');
    const starFolder = particleFolder.addFolder('Stars');
    starFolder.add(proxy, 'starTwinkleBase', 0.0, 1.0, 0.01).name('Twinkle Base').onChange(updateShaderUniform(getParticleMat, 'starTwinkleBase'));
    starFolder.add(proxy, 'starTwinkleDepth', 0.0, 1.0, 0.01).name('Twinkle Depth').onChange(updateShaderUniform(getParticleMat, 'starTwinkleDepth'));
    starFolder.add(proxy, 'starTwinkleSpeed', 0.0, 10.0, 0.1).name('Twinkle Speed').onChange(updateShaderUniform(getParticleMat, 'starTwinkleSpeed'));
    starFolder.add(proxy, 'starSize', 0.1, 10.0, 0.1).name('Size').onChange(updateShaderUniform(getParticleMat, 'starSize'));
    const dustFolder2 = particleFolder.addFolder('Dust');
    dustFolder2.add(proxy, 'dustSize', 0.1, 5.0, 0.1).name('Size').onChange(updateShaderUniform(getParticleMat, 'dustSize'));
    dustFolder2.add(proxy, 'dustSpeed', 0.0, 5.0, 0.1).name('Speed').onChange(updateShaderUniform(getParticleMat, 'dustSpeed'));
    dustFolder2.add(proxy, 'dustAmplitude', 0.0, 10.0, 0.1).name('Amplitude').onChange(updateShaderUniform(getParticleMat, 'dustAmplitude'));
    const mouseFolder = particleFolder.addFolder('Mouse');
    mouseFolder.add(proxy, 'mouseRippleRadius', 1.0, 30.0, 0.5).name('Ripple Radius').onChange(updateShaderUniform(getParticleMat, 'mouseRippleRadius'));
    const windFolder = particleFolder.addFolder('Wind Particles');
    windFolder.add(proxy, 'windParticlesVisible').name('Enabled').onChange(updateParam('windParticlesVisible'));
    windFolder.add(proxy, 'windParticleCount', 1000, 30000, 500).name('Particle Count').onChange(updateParam('windParticleCount'));
    windFolder.add(proxy, 'windParticleSize', 0.05, 2.0, 0.05).name('Particle Size').onChange((v) => {
      p.windParticleSize = v;
      const wm = globeRef.current?.windParticles?.material;
      if (wm) wm.size = v;
    });
    windFolder.add(proxy, 'windParticleOpacity', 0.1, 1.0, 0.05).name('Opacity').onChange((v) => {
      p.windParticleOpacity = v;
      const wm = globeRef.current?.windParticles?.material;
      if (wm) wm.opacity = v;
    });
    const windPhysicsFolder = windFolder.addFolder('Physics');
    windPhysicsFolder.add(proxy, 'windGravity', 0, 15, 0.1).name('Mouse Gravity').onChange(updateParam('windGravity'));
    windPhysicsFolder.add(proxy, 'windInfluenceRadius', 1, 40, 0.5).name('Mouse Radius').onChange(updateParam('windInfluenceRadius'));
    windPhysicsFolder.add(proxy, 'windDamping', 0.9, 0.999, 0.001).name('Damping').onChange(updateParam('windDamping'));
    windPhysicsFolder.add(proxy, 'windEscapeVelocity', 0.1, 2.0, 0.01).name('Escape Velocity').onChange(updateParam('windEscapeVelocity'));
    windPhysicsFolder.add(proxy, 'windMaxSpeed', 0.1, 10.0, 0.1).name('Max Speed').onChange(updateParam('windMaxSpeed'));
    windPhysicsFolder.add(proxy, 'windHomeForce', 0, 1.0, 0.01).name('Home Spring').onChange(updateParam('windHomeForce'));
    windPhysicsFolder.add(proxy, 'windShellInner', 100.0, 108.0, 0.5).name('Shell Inner R').onChange(updateParam('windShellInner'));
    windPhysicsFolder.add(proxy, 'windShellOuter', 108.0, 130.0, 0.5).name('Shell Outer R').onChange(updateParam('windShellOuter'));
    const windFluidFolder = windFolder.addFolder('Fluid Dynamics');
    windFluidFolder.add(proxy, 'windSpinInfluence', 0, 5.0, 0.05).name('Spin Coupling').onChange(updateParam('windSpinInfluence'));
    windFluidFolder.add(proxy, 'windSpinSmoothing', 0.5, 15.0, 0.5).name('Spin Tightness').onChange(updateParam('windSpinSmoothing'));
    windFluidFolder.add(proxy, 'windSpinDecay', 0.8, 0.999, 0.001).name('Spin Momentum').onChange(updateParam('windSpinDecay'));
    windFluidFolder.add(proxy, 'windSpinMax', 1.0, 15.0, 0.5).name('Spin Max').onChange(updateParam('windSpinMax'));
    windFluidFolder.add(proxy, 'windTurbulence', 0, 3.0, 0.05).name('Turbulence').onChange(updateParam('windTurbulence'));
    windFluidFolder.add(proxy, 'windVortexStrength', 0, 3.0, 0.05).name('Vortex Shedding').onChange(updateParam('windVortexStrength'));
    const windColorFolder = windFolder.addFolder('Color');
    windColorFolder.add(proxy, 'windColorSpeed', 0, 0.1, 0.001).name('Color Cycle').onChange(updateParam('windColorSpeed'));
    windColorFolder.add(proxy, 'windTrailEffect', 0.8, 0.999, 0.001).name('Trail Effect').onChange(updateParam('windTrailEffect'));
    particleFolder.close();

    // ══════════════════════════════════════════
    // OBJECTS (satellites, planes, wisps)
    // ══════════════════════════════════════════
    const objectsFolder = gui.addFolder('Orbiting Objects');
    objectsFolder.add(proxy, 'satelliteSpeed', 0.0, 5.0, 0.1).name('Satellite Speed').onChange(updateParam('satelliteSpeed'));
    objectsFolder.add(proxy, 'planeSpeed', 0.0, 5.0, 0.1).name('Plane Speed').onChange(updateParam('planeSpeed'));
    objectsFolder.add(proxy, 'wispSpeed', 0.0, 5.0, 0.1).name('Wisp Speed').onChange(updateParam('wispSpeed'));
    objectsFolder.add(proxy, 'satelliteScale', 0.1, 15.0, 0.1).name('Satellite Scale').onChange(updateParam('satelliteScale'));
    objectsFolder.add(proxy, 'planeScale', 0.1, 15.0, 0.1).name('Plane Scale').onChange(updateParam('planeScale'));
    objectsFolder.add(proxy, 'carScale', 0.1, 15.0, 0.1).name('Car Scale').onChange(updateParam('carScale'));
    objectsFolder.add(proxy, 'wispScale', 0.1, 15.0, 0.1).name('Wisp Scale').onChange(updateParam('wispScale'));
    objectsFolder.close();

    // ══════════════════════════════════════════
    // PRISM BOP EFFECTOR
    // ══════════════════════════════════════════
    const bopFolder = gui.addFolder('Glint Effects');
    bopFolder.add(proxy, 'bopDecayRate', 0.01, 0.5, 0.005).name('Decay Rate').onChange(updateParam('bopDecayRate'));
    bopFolder.add(proxy, 'bopParticleBurst', 0.0, 5.0, 0.1).name('Particle Burst').onChange(updateShaderUniform(getParticleMat, 'bopParticleBurst'));
    bopFolder.add(proxy, 'bopColorShift', 0.0, 1.0, 0.01).name('Color Shift').onChange(updateShaderUniform(getParticleMat, 'bopColorShift'));
    bopFolder.add(proxy, 'bopStarBurst', 0.0, 5.0, 0.1).name('Star Burst').onChange(updateShaderUniform(getParticleMat, 'bopStarBurst'));
    bopFolder.add(proxy, 'bopGlowBoost', 0.0, 10.0, 0.1).name('Prismatic Glow Boost').onChange(updateShaderUniform(getPrismGlowMat, 'bopGlowBoost'));
    bopFolder.add(proxy, 'bopLavaLampBoost', 0.0, 10.0, 0.1).name('Lava Lamp Boost').onChange(updateShaderUniform(getLavaLampMat, 'bopLavaLampBoost'));
    bopFolder.add(proxy, 'bopAuroraBoost', 0.0, 5.0, 0.1).name('Aurora Boost').onChange(updateShaderUniform(getAuroraMat, 'bopAuroraBoost'));
    bopFolder.add(proxy, 'bopCloudFlash', 0.0, 1.0, 0.01).name('Cloud Flash').onChange(updateShaderUniform(getCloudMat, 'bopCloudFlash'));
    bopFolder.add(proxy, 'bopWaterRipple', 0.0, 2.0, 0.01).name('Water Ripple').onChange(updateSurfaceUniform('bopWaterRipple'));
    bopFolder.add(proxy, 'bopEnvGlowBoost', 0.0, 10.0, 0.1).name('Env Glow Boost').onChange(updateShaderUniform(getEnvGlowMat, 'bopEnvGlowBoost'));
    bopFolder.add(proxy, 'bopLightShow').name('Light Show Mode').onChange(updateParam('bopLightShow'));
    bopFolder.add({ fire() {
      const g = globeRef.current;
      if (g?.customUniforms?.prismPulse) g.customUniforms.prismPulse.value = 1.0;
    } }, 'fire').name('Simulate Bop');
    bopFolder.add({ triggerPeek() {
      window.dispatchEvent(new CustomEvent('trigger-prism-peek'));
    } }, 'triggerPeek').name('Trigger Prism Peek');
    bopFolder.close();

    // ══════════════════════════════════════════
    // PRISM BOP CHARACTER (Full Control Panel)
    // ══════════════════════════════════════════
    const prismBopFolder = gui.addFolder('Glint Character');
    // Ensure config exists with all defaults (including new portal/spawn keys)
    if (!window.__prismConfig) {
      window.__prismConfig = { ...PRISM_DEFAULTS };
    } else {
      // Merge any new keys from PRISM_DEFAULTS into existing config
      for (const [k, v] of Object.entries(PRISM_DEFAULTS)) {
        if (window.__prismConfig[k] === undefined) {
          window.__prismConfig[k] = Array.isArray(v) ? [...v] : v;
        }
      }
    }
    const pcfg = window.__prismConfig;

    // -- Visibility / Positioning --
    const peekFolder = prismBopFolder.addFolder('Peek Control');
    const peekStyles = ['portal', 'slide', 'bounce', 'swing', 'pop', 'roll'];
    const peekProxy = { side: 'right', cell: 0, duration: 8, pinned: false, style: 'portal', dragMode: false };
    peekFolder.add(peekProxy, 'side', ['right', 'left', 'top']).name('Side');
    peekFolder.add(peekProxy, 'cell', 0, 3, 1).name('Cell Index');
    peekFolder.add(peekProxy, 'duration', 1, 30, 1).name('Duration (s)');
    peekFolder.add(peekProxy, 'pinned').name('Pin On Screen');
    peekFolder.add(peekProxy, 'style', peekStyles).name('Peek Style');
    peekFolder.add({ show() {
      window.dispatchEvent(new CustomEvent('trigger-prism-peek', {
        detail: { side: peekProxy.side, cell: Math.round(peekProxy.cell), duration: peekProxy.duration * 1000, pinned: peekProxy.pinned, style: peekProxy.style }
      }));
    } }, 'show').name('Show Glint');
    peekFolder.add({ hide() {
      window.dispatchEvent(new CustomEvent('hide-prism-peek'));
    } }, 'hide').name('Hide Glint');
    peekFolder.add(peekProxy, 'dragMode').name('Drag Mode').onChange((v) => {
      window.dispatchEvent(new CustomEvent('prism-drag-mode', { detail: { enabled: v } }));
      // Auto-show prism when entering drag mode
      if (v) {
        window.dispatchEvent(new CustomEvent('trigger-prism-peek', {
          detail: { side: 'right', pinned: true, style: 'pop' }
        }));
      }
    });
    peekFolder.add(pcfg, 'lockedPeekStyle', {
      'Random': '', 'Portal': 'portal', 'Slide': 'slide', 'Bounce': 'bounce',
      'Swing': 'swing', 'Pop': 'pop', 'Roll': 'roll',
    }).name('Lock Anim Style');
    peekFolder.add({ saveSpawn() {
      window.dispatchEvent(new CustomEvent('prism-spawn-point', { detail: { action: 'add', label: `Saved ${Date.now()}` } }));
    } }, 'saveSpawn').name('Save Spawn Point');

    // -- Shape --
    const pShape = prismBopFolder.addFolder('Shape');
    if (!pcfg.shape) pcfg.shape = 'rounded-prism';
    pShape.add(pcfg, 'shape', ['rounded-prism', 'rounded-pyramid', 'pyramid', 'crystal', 'sphere', 'gem', 'prism']).name('Shape').onChange(() => {
      window.dispatchEvent(new CustomEvent('prism-shape-change'));
    });
    pShape.close();

    // -- Mouth Position / Size --
    const pMouth = prismBopFolder.addFolder('Mouth');
    pMouth.add(pcfg, 'mouthX', -1.0, 1.0, 0.01).name('X Offset');
    pMouth.add(pcfg, 'mouthY', -1.0, 0.5, 0.01).name('Y Offset');
    pMouth.add(pcfg, 'mouthZ', 0, 1.5, 0.01).name('Z Depth');
    pMouth.add(pcfg, 'mouthScaleX', 0.1, 3.0, 0.01).name('Width');
    pMouth.add(pcfg, 'mouthScaleY', 0.1, 2.5, 0.01).name('Height');
    pMouth.close();

    // -- Mouse Reactivity --
    const pMouse = prismBopFolder.addFolder('Mouse Reactivity');
    pMouse.add(pcfg, 'driftStrength', 0, 2.0, 0.01).name('Drift Strength');
    pMouse.add(pcfg, 'driftSpeed', 0.01, 0.2, 0.005).name('Drift Speed');
    pMouse.add(pcfg, 'driftTiltX', 0, 0.5, 0.01).name('Drift Tilt X');
    pMouse.add(pcfg, 'driftTiltY', 0, 0.5, 0.01).name('Drift Tilt Y');
    pMouse.add(pcfg, 'rayBendAmount', 0, 0.5, 0.01).name('Ray Bend');
    pMouse.add(pcfg, 'rayVerticalBend', 0, 0.3, 0.01).name('Ray Vertical Bend');
    pMouse.add(pcfg, 'beamTrackAmount', 0, 0.5, 0.01).name('Beam Track');
    pMouse.add(pcfg, 'eyeTrackSpeed', 0.01, 0.3, 0.005).name('Eye Track Speed');
    pMouse.add(pcfg, 'eyeTrackRange', 0.1, 1.0, 0.01).name('Eye Track Range');
    pMouse.add(pcfg, 'rotationMouseInfluence', 0, 2.0, 0.01).name('Rotation Influence');
    pMouse.close();

    // -- Particles --
    const pParticles = prismBopFolder.addFolder('Particles');
    pParticles.add(pcfg, 'sparkleCount', 0, 100, 1).name('Sparkle Count');
    pParticles.add(pcfg, 'sparkleSize', 0.5, 8.0, 0.1).name('Sparkle Size');
    pParticles.add(pcfg, 'sparkleSpeed', 0, 2.0, 0.1).name('Sparkle Speed');
    pParticles.add(pcfg, 'sparkleOpacity', 0, 1.0, 0.01).name('Sparkle Opacity');
    pParticles.close();

    // -- Lighting --
    const prismLightFolder = prismBopFolder.addFolder('Lighting');
    prismLightFolder.add(pcfg, 'ambientIntensity', 0, 2.0, 0.01).name('Ambient');
    prismLightFolder.add(pcfg, 'keyLightIntensity', 0, 8.0, 0.1).name('Key Light');
    prismLightFolder.add(pcfg, 'fillLightIntensity', 0, 5.0, 0.1).name('Fill Light');
    prismLightFolder.add(pcfg, 'internalGlowIntensity', 0, 5.0, 0.1).name('Internal Glow');
    prismLightFolder.add(pcfg, 'internalGlowDistance', 1, 10, 0.5).name('Glow Distance');
    prismLightFolder.add(pcfg, 'lightSpillIntensity', 0, 3.0, 0.01).name('Light Spill');
    prismLightFolder.close();

    // -- Animation --
    const pAnim = prismBopFolder.addFolder('Animation');
    pAnim.add(pcfg, 'floatSpeed', 0, 5.0, 0.1).name('Float Speed');
    pAnim.add(pcfg, 'rotationIntensity', 0, 1.0, 0.01).name('Float Rotation');
    pAnim.add(pcfg, 'floatIntensity', 0, 2.0, 0.01).name('Float Intensity');
    pAnim.add(pcfg, 'rotationSpeed', 0, 1.0, 0.01).name('Spin Speed');
    pAnim.add(pcfg, 'breathingAmp', 0, 0.1, 0.001).name('Breathing Amp');
    pAnim.add(pcfg, 'breathingSpeed', 0, 3.0, 0.1).name('Breathing Speed');
    pAnim.close();

    // -- Beams & Effects --
    const pFx = prismBopFolder.addFolder('Beams & Effects');
    pFx.add(pcfg, 'beamOpacity', 0, 1.5, 0.01).name('Beam Opacity');
    pFx.add(pcfg, 'rayOpacity', 0, 1.5, 0.01).name('Ray Opacity');
    if (pcfg.beamLength === undefined) pcfg.beamLength = 14;
    if (pcfg.rayLength === undefined) pcfg.rayLength = 14;
    pFx.add(pcfg, 'beamLength', 4, 30, 0.5).name('Beam Length');
    pFx.add(pcfg, 'rayLength', 4, 30, 0.5).name('Ray Length');
    pFx.add(pcfg, 'edgeGlowOpacity', 0, 1.0, 0.01).name('Edge Glow');
    pFx.add(pcfg, 'wireframeOpacity', 0, 1.0, 0.01).name('Wireframe Opacity');
    pFx.add(pcfg, 'edgeThresholdAngle', 1, 90, 1).name('Edge Angle Threshold');
    pFx.add(pcfg, 'vertexHighlightScale', 0, 1.0, 0.01).name('Star Scale');
    pFx.add(pcfg, 'vertexHighlightPulse', 0, 0.5, 0.01).name('Star Pulse');

    // -- Light Source (dispersion physics) --
    const pLight = pFx.addFolder('Light Source');
    if (pcfg.lightSourceX === undefined) pcfg.lightSourceX = -5.0;
    if (pcfg.lightSourceY === undefined) pcfg.lightSourceY = 2.0;
    if (pcfg.lightSourceZ === undefined) pcfg.lightSourceZ = 3.0;
    if (pcfg.baseDispersionAngle === undefined) pcfg.baseDispersionAngle = 0.35;
    if (pcfg.rotationDispersionMod === undefined) pcfg.rotationDispersionMod = 0.5;
    if (pcfg.rotationFanShift === undefined) pcfg.rotationFanShift = 0.3;
    if (pcfg.incidenceEffect === undefined) pcfg.incidenceEffect = 0.4;
    if (pcfg.beamAudioPulse === undefined) pcfg.beamAudioPulse = 0.3;
    if (pcfg.rayAudioSpread === undefined) pcfg.rayAudioSpread = 0.15;
    pLight.add(pcfg, 'lightSourceX', -15, 15, 0.1).name('Light X');
    pLight.add(pcfg, 'lightSourceY', -10, 10, 0.1).name('Light Y');
    pLight.add(pcfg, 'lightSourceZ', -10, 10, 0.1).name('Light Z');
    pLight.add(pcfg, 'baseDispersionAngle', 0.05, 1.2, 0.01).name('Dispersion Angle');
    pLight.add(pcfg, 'rotationDispersionMod', 0, 2.0, 0.01).name('Rotation → Spread');
    pLight.add(pcfg, 'rotationFanShift', 0, 1.0, 0.01).name('Rotation → Shift');
    pLight.add(pcfg, 'incidenceEffect', 0, 2.0, 0.01).name('Incidence → Spread');
    pLight.add(pcfg, 'beamAudioPulse', 0, 1.0, 0.01).name('Bass → Beam');
    pLight.add(pcfg, 'rayAudioSpread', 0, 1.0, 0.01).name('Bass → Rainbow');
    pLight.close();

    // -- Mouse Proximity --
    const pProx = pFx.addFolder('Mouse Proximity');
    if (pcfg.mouseProximityEnabled === undefined) pcfg.mouseProximityEnabled = true;
    if (pcfg.mouseProximityMin === undefined) pcfg.mouseProximityMin = 0.05;
    if (pcfg.mouseProximityMax === undefined) pcfg.mouseProximityMax = 0.8;
    if (pcfg.mouseProximitySpreadMin === undefined) pcfg.mouseProximitySpreadMin = 0.5;
    if (pcfg.mouseProximitySpreadMax === undefined) pcfg.mouseProximitySpreadMax = 2.0;
    pProx.add(pcfg, 'mouseProximityEnabled').name('Enabled');
    pProx.add(pcfg, 'mouseProximityMin', 0.01, 0.5, 0.01).name('Near Threshold');
    pProx.add(pcfg, 'mouseProximityMax', 0.2, 2.0, 0.01).name('Far Threshold');
    pProx.add(pcfg, 'mouseProximitySpreadMin', 0, 1.5, 0.01).name('Spread @ Far');
    pProx.add(pcfg, 'mouseProximitySpreadMax', 0.5, 5.0, 0.01).name('Spread @ Near');
    pProx.close();

    // -- Saber Effects --
    const pSaber = pFx.addFolder('Saber Effects');
    if (pcfg.saberEnabled === undefined) pcfg.saberEnabled = true;
    if (pcfg.saberCoreWidth === undefined) pcfg.saberCoreWidth = 1.0;
    if (pcfg.saberGlowWidth === undefined) pcfg.saberGlowWidth = 1.0;
    if (pcfg.saberPulseSpeed === undefined) pcfg.saberPulseSpeed = 2.0;
    if (pcfg.saberPulseIntensity === undefined) pcfg.saberPulseIntensity = 0.5;
    if (pcfg.saberFlickerSpeed === undefined) pcfg.saberFlickerSpeed = 8.0;
    if (pcfg.saberFlickerIntensity === undefined) pcfg.saberFlickerIntensity = 0.15;
    if (pcfg.saberColorTemp === undefined) pcfg.saberColorTemp = 0.0;
    if (pcfg.saberHDRIntensity === undefined) pcfg.saberHDRIntensity = 2.0;
    if (pcfg.saberStreakSpeed === undefined) pcfg.saberStreakSpeed = 1.0;
    if (pcfg.saberStreakIntensity === undefined) pcfg.saberStreakIntensity = 0.6;
    if (pcfg.saberGlowRadius === undefined) pcfg.saberGlowRadius = 2.5;
    if (pcfg.saberGlowOpacity === undefined) pcfg.saberGlowOpacity = 0.3;
    pSaber.add(pcfg, 'saberEnabled').name('Enabled');
    pSaber.add(pcfg, 'saberCoreWidth', 0.1, 3.0, 0.01).name('Core Width');
    pSaber.add(pcfg, 'saberGlowWidth', 0.1, 3.0, 0.01).name('Glow Width');
    pSaber.add(pcfg, 'saberPulseSpeed', 0, 8.0, 0.1).name('Pulse Speed');
    pSaber.add(pcfg, 'saberPulseIntensity', 0, 1.0, 0.01).name('Pulse Intensity');
    pSaber.add(pcfg, 'saberFlickerSpeed', 0, 20.0, 0.1).name('Flicker Speed');
    pSaber.add(pcfg, 'saberFlickerIntensity', 0, 0.5, 0.01).name('Flicker Intensity');
    pSaber.add(pcfg, 'saberColorTemp', -1, 1, 0.01).name('Color Temp');
    pSaber.add(pcfg, 'saberHDRIntensity', 0.5, 5.0, 0.01).name('HDR Intensity');
    pSaber.add(pcfg, 'saberStreakSpeed', 0, 4.0, 0.01).name('Streak Speed');
    pSaber.add(pcfg, 'saberStreakIntensity', 0, 2.0, 0.01).name('Streak Intensity');
    pSaber.add(pcfg, 'saberGlowOpacity', 0, 1.0, 0.01).name('Glow Halo Opacity');
    pSaber.close();

    // -- Ray Motion --
    const pRayMotion = pFx.addFolder('Ray Motion');
    if (pcfg.rayJitter === undefined) pcfg.rayJitter = 1.0;
    if (pcfg.raySweep === undefined) pcfg.raySweep = 0.5;
    if (pcfg.portalExitSpread === undefined) pcfg.portalExitSpread = 1.5;
    if (pcfg.portalExitWiden === undefined) pcfg.portalExitWiden = 1.0;
    pRayMotion.add(pcfg, 'rayJitter', 0, 1.0, 0.01).name('Spread Breathing');
    pRayMotion.add(pcfg, 'raySweep', 0, 1.0, 0.01).name('Rotation Sweep');
    pRayMotion.add(pcfg, 'portalExitSpread', 0, 4.0, 0.01).name('Portal Fan-Out');
    pRayMotion.add(pcfg, 'portalExitWiden', 0, 3.0, 0.01).name('Portal Ray Widen');
    pRayMotion.close();

    // -- Convergence Glow --
    const pConv = pFx.addFolder('Convergence Glow');
    if (pcfg.convergenceGlowSize === undefined) pcfg.convergenceGlowSize = 1.5;
    if (pcfg.convergenceGlowOpacity === undefined) pcfg.convergenceGlowOpacity = 0.6;
    if (pcfg.convergenceGlowIridescence === undefined) pcfg.convergenceGlowIridescence = 1.0;
    pConv.add(pcfg, 'convergenceGlowSize', 0.3, 5.0, 0.01).name('Size');
    pConv.add(pcfg, 'convergenceGlowOpacity', 0, 1.5, 0.01).name('Opacity');
    pConv.add(pcfg, 'convergenceGlowIridescence', 0, 2.0, 0.01).name('Iridescence');
    pConv.close();

    pFx.close();

    // -- Music Reactivity --
    const pMusic = prismBopFolder.addFolder('Music Reactivity');
    pMusic.add(pcfg, 'musicReactivity', 0, 2.0, 0.01).name('Overall Reactivity');
    pMusic.add(pcfg, 'musicScalePulse', 0, 0.5, 0.01).name('Bass → Scale');
    pMusic.add(pcfg, 'musicRotationBoost', 0, 1.0, 0.01).name('Mids → Rotation');
    pMusic.add(pcfg, 'musicGlowPulse', 0, 2.0, 0.01).name('Bass → Glow/Caustics');
    pMusic.close();

    // -- Glass / Refraction --
    const pGlassRef = prismBopFolder.addFolder('Glass / Refraction');
    if (!pcfg.hybridMtmScale) pcfg.hybridMtmScale = 1.06;
    if (pcfg.hybridBlend === undefined) pcfg.hybridBlend = 0.5;
    if (pcfg.hybridEnvIntensity === undefined) pcfg.hybridEnvIntensity = 0.4;
    if (pcfg.hybridShaderAdd === undefined) pcfg.hybridShaderAdd = 0.6;
    const glassModeCtrl = pGlassRef.add(pcfg, 'glassMode', { 'Custom Shader': 'shader', 'Real Glass (MTM)': 'mtm', 'Hybrid (Shader + MTM)': 'hybrid' }).name('Glass Mode');

    // ── Glass Presets ──
    const presetProxy = { selectedPreset: '' };
    const loadCustomPresets = () => {
      try { return JSON.parse(localStorage.getItem(GLASS_PRESET_STORAGE_KEY) || '[]'); }
      catch { return []; }
    };

    const getPresetsForMode = (mode) => {
      const builtIn = GLASS_PRESETS.filter(p => p.glassMode === mode);
      const custom = loadCustomPresets().filter(p => p.glassMode === mode);
      return [...builtIn, ...custom];
    };

    const buildPresetOptions = () => {
      const matching = getPresetsForMode(pcfg.glassMode);
      const opts = { '— Select Preset —': '' };
      matching.forEach(p => { opts[p.name] = p.name; });
      return opts;
    };

    const presetCtrl = pGlassRef.add(presetProxy, 'selectedPreset', buildPresetOptions()).name('Preset');

    const rebuildPresetDropdown = () => {
      const opts = buildPresetOptions();
      // lil-gui: replace options on existing controller
      presetCtrl.options(opts);
      presetProxy.selectedPreset = '';
      presetCtrl.updateDisplay();
    };

    // Keys to snapshot/apply per mode
    const SHADER_KEYS = ['glassIOR', 'causticIntensity', 'iridescenceIntensity', 'chromaticSpread', 'glassAlpha', 'streakIntensity'];
    const MTM_KEYS = ['mtmThickness', 'mtmRoughness', 'mtmIOR', 'mtmChromatic', 'mtmTransmission', 'mtmBackside'];
    const HYBRID_KEYS = ['hybridBlend', 'hybridShaderAdd', 'hybridEnvIntensity', 'hybridMtmScale'];

    const getKeysForMode = (mode) => {
      if (mode === 'shader') return SHADER_KEYS;
      if (mode === 'mtm') return MTM_KEYS;
      return [...SHADER_KEYS, ...MTM_KEYS, ...HYBRID_KEYS]; // hybrid
    };

    // Apply Preset
    pGlassRef.add({ apply() {
      const name = presetProxy.selectedPreset;
      if (!name) return;
      const allPresets = [...GLASS_PRESETS, ...loadCustomPresets()];
      const preset = allPresets.find(p => p.name === name);
      if (!preset) return;

      // If preset is a different mode, switch mode first
      if (preset.glassMode !== pcfg.glassMode) {
        pcfg.glassMode = preset.glassMode;
        glassModeCtrl.updateDisplay();
      }

      // Apply all preset values to pcfg
      const keys = getKeysForMode(preset.glassMode);
      keys.forEach(k => { if (preset[k] !== undefined) pcfg[k] = preset[k]; });

      // Refresh all lil-gui sliders
      gui.controllersRecursive().forEach(c => c.updateDisplay());
      // Fire glass mode change to update prism
      window.dispatchEvent(new CustomEvent('prism-glass-mode-change'));
    } }, 'apply').name('Apply Preset');

    // Save Custom
    pGlassRef.add({ save() {
      const name = prompt('Enter a name for your custom preset:');
      if (!name || !name.trim()) return;
      const fullName = `[Custom] ${name.trim()}`;
      const custom = loadCustomPresets();
      // Remove existing with same name
      const filtered = custom.filter(p => p.name !== fullName);
      const newPreset = { name: fullName, glassMode: pcfg.glassMode, description: 'Custom preset' };
      const keys = getKeysForMode(pcfg.glassMode);
      keys.forEach(k => { newPreset[k] = pcfg[k]; });
      filtered.push(newPreset);
      localStorage.setItem(GLASS_PRESET_STORAGE_KEY, JSON.stringify(filtered));
      rebuildPresetDropdown();
    } }, 'save').name('Save as Custom');

    // Delete Custom
    pGlassRef.add({ del() {
      const name = presetProxy.selectedPreset;
      if (!name) return;
      if (!name.startsWith('[Custom]')) { alert('Cannot delete built-in presets.'); return; }
      if (!confirm(`Delete preset "${name}"?`)) return;
      const custom = loadCustomPresets().filter(p => p.name !== name);
      localStorage.setItem(GLASS_PRESET_STORAGE_KEY, JSON.stringify(custom));
      presetProxy.selectedPreset = '';
      rebuildPresetDropdown();
    } }, 'del').name('Delete Custom');

    // Shader-mode controls
    const shaderCtrls = [];
    shaderCtrls.push(pGlassRef.add(pcfg, 'glassIOR', 0.2, 1.0, 0.01).name('IOR (Refraction)'));
    shaderCtrls.push(pGlassRef.add(pcfg, 'causticIntensity', 0, 3.0, 0.01).name('Caustic Intensity'));
    shaderCtrls.push(pGlassRef.add(pcfg, 'iridescenceIntensity', 0, 3.0, 0.01).name('Iridescence'));
    shaderCtrls.push(pGlassRef.add(pcfg, 'chromaticSpread', 0, 3.0, 0.01).name('Chromatic Spread'));
    shaderCtrls.push(pGlassRef.add(pcfg, 'glassAlpha', 0.05, 0.8, 0.01).name('Glass Opacity'));
    shaderCtrls.push(pGlassRef.add(pcfg, 'streakIntensity', 0, 3.0, 0.01).name('Light Streaks'));
    // MTM-mode controls
    const mtmCtrls = [];
    mtmCtrls.push(pGlassRef.add(pcfg, 'mtmThickness', 0, 5, 0.1).name('MTM Thickness'));
    mtmCtrls.push(pGlassRef.add(pcfg, 'mtmRoughness', 0, 1, 0.01).name('MTM Roughness'));
    mtmCtrls.push(pGlassRef.add(pcfg, 'mtmIOR', 1.0, 2.5, 0.05).name('MTM IOR'));
    mtmCtrls.push(pGlassRef.add(pcfg, 'mtmChromatic', 0, 3, 0.1).name('MTM Chromatic'));
    mtmCtrls.push(pGlassRef.add(pcfg, 'mtmTransmission', 0, 1, 0.05).name('MTM Transmission'));
    mtmCtrls.push(pGlassRef.add(pcfg, 'mtmBackside').name('MTM Backside'));
    // Hybrid-only controls
    const hybridCtrls = [];
    hybridCtrls.push(pGlassRef.add(pcfg, 'hybridBlend', 0, 1, 0.01).name('Blend (Shader↔MTM)'));
    hybridCtrls.push(pGlassRef.add(pcfg, 'hybridShaderAdd', 0, 1.5, 0.01).name('Shader Overlay'));
    hybridCtrls.push(pGlassRef.add(pcfg, 'hybridEnvIntensity', 0, 2.0, 0.05).name('Env Intensity'));
    hybridCtrls.push(pGlassRef.add(pcfg, 'hybridMtmScale', 1.0, 1.3, 0.01).name('MTM Shell Scale'));
    // Toggle visibility based on current mode
    const updateGlassControls = () => {
      const mode = pcfg.glassMode;
      const isShader = mode === 'shader';
      const isMTM = mode === 'mtm';
      const isHybrid = mode === 'hybrid';
      shaderCtrls.forEach(c => c.domElement.style.display = (isShader || isHybrid) ? '' : 'none');
      mtmCtrls.forEach(c => c.domElement.style.display = (isMTM || isHybrid) ? '' : 'none');
      hybridCtrls.forEach(c => c.domElement.style.display = isHybrid ? '' : 'none');
    };
    updateGlassControls();
    glassModeCtrl.onChange(() => { updateGlassControls(); rebuildPresetDropdown(); window.dispatchEvent(new CustomEvent('prism-glass-mode-change')); });
    pGlassRef.close();

    // -- Canvas / Display --
    const pCanvas = prismBopFolder.addFolder('Canvas / Display');
    pCanvas.add(pcfg, 'characterScale', 0.3, 3.0, 0.01).name('Character Scale');
    pCanvas.add(pcfg, 'canvasSize', 200, 2400, 10).name('Canvas Size');
    pCanvas.add(pcfg, 'nebulaOpacity', 0, 1.0, 0.01).name('Nebula BG Opacity');
    // Mask toggle + conditional feather controls
    const maskCtrls = [];
    maskCtrls.push(pCanvas.add(pcfg, 'featherInner', 0, 80, 1).name('Feather Inner %'));
    maskCtrls.push(pCanvas.add(pcfg, 'featherOuter', 20, 100, 1).name('Feather Outer %'));
    maskCtrls.push(pCanvas.add(pcfg, 'sceneCenterX', 0, 100, 1).name('Mask Center X %'));
    maskCtrls.push(pCanvas.add(pcfg, 'sceneCenterY', 0, 100, 1).name('Mask Center Y %'));
    const updateMaskCtrls = () => {
      const show = pcfg.canvasMask;
      maskCtrls.forEach(c => c.domElement.style.display = show ? '' : 'none');
    };
    pCanvas.add(pcfg, 'canvasMask').name('Enable Canvas Mask').onChange(updateMaskCtrls);
    updateMaskCtrls();
    pCanvas.close();

    // -- Bop Counter --
    const pCounter = prismBopFolder.addFolder('Bop Counter');
    pCounter.add(pcfg, 'bopCounterOffsetX', -200, 200, 1).name('X Offset');
    pCounter.add(pcfg, 'bopCounterOffsetY', -200, 200, 1).name('Y Offset');
    pCounter.close();

    // -- Hitbox --
    const pHitbox = prismBopFolder.addFolder('Hitbox');
    pHitbox.add(pcfg, 'hitboxShape', ['circle', 'rect']).name('Shape');
    pHitbox.add(pcfg, 'hitboxSize', 30, 250, 1).name('Circle Size');
    pHitbox.add(pcfg, 'hitboxWidth', 30, 300, 1).name('Rect Width');
    pHitbox.add(pcfg, 'hitboxHeight', 30, 300, 1).name('Rect Height');
    pHitbox.add(pcfg, 'hitboxBorderRadius', 0, 80, 1).name('Rect Rounding');
    pHitbox.add(pcfg, 'hitboxOffsetX', -200, 200, 1).name('X Offset');
    pHitbox.add(pcfg, 'hitboxOffsetY', -200, 200, 1).name('Y Offset');
    pHitbox.add(pcfg, 'hitboxDebug').name('Show Outline');
    pHitbox.close();

    // -- Hover Reaction --
    const pHover = prismBopFolder.addFolder('Hover Reaction');
    pHover.add(pcfg, 'hoverScale', 0.85, 1.25, 0.01).name('Scale');
    pHover.add(pcfg, 'hoverExpression', ['surprised', 'curious', 'excited', 'love', 'angry', 'thinking', 'mischief']).name('Expression');
    pHover.add(pcfg, 'hoverGlowBoost', 0, 2, 0.05).name('Glow Boost');
    pHover.add(pcfg, 'hoverTremble', 0, 1, 0.05).name('Tremble');
    pHover.close();

    // -- Angular Physics --
    const pAngular = prismBopFolder.addFolder('Angular Physics');
    pAngular.add(pcfg, 'angularDamping', 0.80, 0.999, 0.005).name('Damping');
    pAngular.add(pcfg, 'angularBopStrength', 0, 3.0, 0.05).name('Bop Strength');
    pAngular.add(pcfg, 'angularBopZTorque', 0, 1.5, 0.05).name('Bop Z Torque');
    pAngular.add(pcfg, 'angularDragSensitivity', 0.001, 0.05, 0.001).name('Drag Sensitivity');
    pAngular.add(pcfg, 'angularWobbleAmp', 0, 0.5, 0.01).name('Wobble Amp');
    pAngular.add(pcfg, 'portalSuckSpinMult', 1.0, 20.0, 0.5).name('Portal Suck Spin');
    pAngular.add(pcfg, 'portalSuckDamping', 0.90, 0.999, 0.005).name('Portal Suck Damping');
    pAngular.add({ testBop() {
      const angle = Math.random() * Math.PI * 2;
      const str = pcfg.angularBopStrength ?? 1.0;
      window.__prismBopImpulse = {
        x: Math.sin(angle) * str,
        y: Math.cos(angle) * str,
        z: (Math.random() - 0.5) * (pcfg.angularBopZTorque ?? 0.3),
      };
      window.__prismSquash = Date.now();
    } }, 'testBop').name('Test Bop');
    pAngular.add({ testSuck() {
      window.__prismPortalSuck = true;
      setTimeout(() => { window.__prismPortalSuck = false; }, 3000);
    } }, 'testSuck').name('Test Portal Suck (3s)');
    pAngular.close();

    // -- Bop +1 Effect --
    const pBopPlus = prismBopFolder.addFolder('Bop +1 Effect');
    const bopColorProxy = { color: pcfg.bopPlusColor || '#fbbf24' };
    pBopPlus.add(pcfg, 'bopPlusFontSize', 1.0, 5.0, 0.1).name('Font Size (rem)');
    pBopPlus.addColor(bopColorProxy, 'color').name('Color').onChange((v) => { pcfg.bopPlusColor = v; });
    pBopPlus.add(pcfg, 'bopPlusRandomColor').name('Random Color Each Bop');
    pBopPlus.add(pcfg, 'bopPlusGlowSize', 0, 40, 1).name('Glow Size (px)');
    pBopPlus.add(pcfg, 'bopPlusGlowIntensity', 0, 1, 0.05).name('Glow Intensity');
    pBopPlus.add(pcfg, 'bopPlusDuration', 0.3, 3.0, 0.1).name('Duration (s)');
    pBopPlus.add(pcfg, 'bopPlusDistance', 40, 300, 5).name('Float Distance (px)');
    pBopPlus.add(pcfg, 'bopPlusScale', 1.0, 3.0, 0.1).name('End Scale');
    pBopPlus.add({ test() {
      window.dispatchEvent(new CustomEvent('bop-plus-test', { detail: { x: window.innerWidth / 2, y: window.innerHeight / 2 } }));
    } }, 'test').name('Test +1');
    pBopPlus.close();

    // -- Speech Bubble --
    const pBubble = prismBopFolder.addFolder('Speech Bubble');
    pBubble.add(pcfg, 'bubbleLocked').name('Lock to Glint');
    pBubble.add(pcfg, 'bubblePosition', ['auto', 'above', 'below']).name('Position');
    pBubble.add(pcfg, 'bubbleOffsetX', -200, 200, 1).name('X Offset');
    pBubble.add(pcfg, 'bubbleOffsetY', -200, 200, 1).name('Y Offset');
    pBubble.add(pcfg, 'bubbleFontSize', 0.5, 1.6, 0.01).name('Font Size (rem)');
    pBubble.add(pcfg, 'bubbleMaxWidth', 120, 500, 5).name('Max Width (px)');
    pBubble.add(pcfg, 'bubblePadding', 4, 30, 1).name('Padding (px)');
    pBubble.add(pcfg, 'bubbleThinkingEnabled').name('Thinking Dots');
    pBubble.add(pcfg, 'bubbleThinkingMs', 400, 3000, 50).name('Think Duration (ms)');
    pBubble.add(pcfg, 'bubbleAnimSpeed', 0.3, 3.0, 0.05).name('Anim Speed');
    pBubble.close();

    // -- Portal Effects --
    const portalFolder = prismBopFolder.addFolder('Portal Effects');

    // Portal colors (stored as [r,g,b] 0-1, lil-gui uses hex strings)
    const portalColorProxy = {
      color1: rgbToHex(pcfg.portalColor1 || PRISM_DEFAULTS.portalColor1),
      color2: rgbToHex(pcfg.portalColor2 || PRISM_DEFAULTS.portalColor2),
      color3: rgbToHex(pcfg.portalColor3 || PRISM_DEFAULTS.portalColor3),
      seepColor: rgbToHex(pcfg.portalSeepColor || PRISM_DEFAULTS.portalSeepColor),
    };
    const hexToRgb01 = (hex) => {
      const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      if (!m) return [0, 0, 0];
      return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
    };

    const pColorsFolder = portalFolder.addFolder('Colors');
    pColorsFolder.addColor(portalColorProxy, 'color1').name('Color 1 (purple)').onChange(v => { pcfg.portalColor1 = hexToRgb01(v); });
    pColorsFolder.addColor(portalColorProxy, 'color2').name('Color 2 (blue)').onChange(v => { pcfg.portalColor2 = hexToRgb01(v); });
    pColorsFolder.addColor(portalColorProxy, 'color3').name('Color 3 (pink)').onChange(v => { pcfg.portalColor3 = hexToRgb01(v); });
    pColorsFolder.addColor(portalColorProxy, 'seepColor').name('Seep Color (green)').onChange(v => { pcfg.portalSeepColor = hexToRgb01(v); });
    pColorsFolder.close();

    const pTimingFolder = portalFolder.addFolder('Timing');
    pTimingFolder.add(pcfg, 'portalSeepDuration', 0, 2000, 50).name('Seep Duration (ms)');
    pTimingFolder.add(pcfg, 'portalGatherMs', 100, 2000, 50).name('Gather (ms)');
    pTimingFolder.add(pcfg, 'portalRuptureMs', 100, 2000, 50).name('Rupture (ms)');
    pTimingFolder.add(pcfg, 'portalEmergeMs', 200, 3000, 50).name('Emerge (ms)');
    pTimingFolder.add(pcfg, 'portalResidualMs', 500, 5000, 50).name('Residual (ms)');
    pTimingFolder.close();

    const pEffectsFolder = portalFolder.addFolder('Effects');
    pEffectsFolder.add(pcfg, 'portalSeepEnabled').name('Seep Enabled');
    pEffectsFolder.add(pcfg, 'portalSeepIntensity', 0, 2.0, 0.05).name('Seep Intensity');
    pEffectsFolder.add(pcfg, 'portalRingRadius', 60, 300, 5).name('Ring Radius');
    pEffectsFolder.add(pcfg, 'portalWobble', 0, 3.0, 0.05).name('Ring Wobble');
    pEffectsFolder.add(pcfg, 'portalGlowIntensity', 0, 3.0, 0.05).name('Glow Intensity');
    pEffectsFolder.add(pcfg, 'portalFlashIntensity', 0, 2.0, 0.05).name('Flash Intensity');
    pEffectsFolder.add(pcfg, 'portalInteriorEnabled').name('Interior Enabled');
    pEffectsFolder.add(pcfg, 'portalParticleMultiplier', 0, 3.0, 0.05).name('Particle Density');
    pEffectsFolder.add(pcfg, 'portalConfettiEnabled').name('Confetti Enabled');
    pEffectsFolder.add(pcfg, 'portalConfettiCount', 10, 200, 5).name('Confetti Count');
    pEffectsFolder.close();

    const pSpawnFolder = portalFolder.addFolder('Spawn');
    pSpawnFolder.add(pcfg, 'spawnScale', 0.3, 3.0, 0.05).name('Spawn Scale');
    pSpawnFolder.close();

    const pExitFolder = portalFolder.addFolder('Exit Animation');
    pExitFolder.add(pcfg, 'portalAlwaysExits').name('Portal Always Exits');
    pExitFolder.add(pcfg, 'lockedExitStyle', {
      'Random': '',
      'Portal Exit': 'portal-exit',
      'Spin Shrink': 'spin-shrink',
      'Tumble Fall': 'tumble-fall',
      'Pop Burst': 'pop-burst',
      'Melt': 'melt',
    }).name('Locked Exit Style');
    pExitFolder.close();

    portalFolder.add({ trigger() {
      window.dispatchEvent(new CustomEvent('trigger-prism-peek', {
        detail: { style: 'portal', pinned: true }
      }));
    } }, 'trigger').name('Trigger Portal');
    portalFolder.close();

    // -- Spawn Point Management --
    const spawnMgmtFolder = prismBopFolder.addFolder('Spawn Points');
    const spawnMarkerProxy = { showMarkers: pcfg.showSpawnMarkers ?? false };
    spawnMgmtFolder.add(spawnMarkerProxy, 'showMarkers').name('Show Markers').onChange((v) => {
      pcfg.showSpawnMarkers = v;
      window.dispatchEvent(new CustomEvent('prism-spawn-markers', { detail: { enabled: v } }));
    });

    // Dynamic spawn point list — each point gets its own sub-folder
    const spawnListFolder = spawnMgmtFolder.addFolder('Point List');
    let spawnPointFolders = [];

    const rebuildSpawnList = () => {
      // Remove old folders
      spawnPointFolders.forEach(f => { try { f.destroy(); } catch(_) {} });
      spawnPointFolders = [];

      let pts;
      try { pts = JSON.parse(localStorage.getItem('prism_spawn_points') || '[]'); }
      catch { pts = []; }

      pts.forEach((pt, i) => {
        const ptProxy = {
          label: pt.label || pt.side || `Point ${i + 1}`,
          side: pt.side || 'custom',
          x: pt.x ?? 0,
          y: pt.y ?? 0,
        };
        const pf = spawnListFolder.addFolder(`#${i + 1}: ${ptProxy.label}`);
        pf.add(ptProxy, 'label').name('Label').onFinishChange((v) => {
          pts[i].label = v;
          localStorage.setItem('prism_spawn_points', JSON.stringify(pts));
          window.dispatchEvent(new CustomEvent('prism-spawn-point', { detail: { action: 'reset', points: pts } }));
          pf.title(`#${i + 1}: ${v}`);
        });
        if (pt.side && pt.side !== 'custom') {
          pf.add(ptProxy, 'side').name('Side').disable();
        } else {
          pf.add(ptProxy, 'x', 0, window.innerWidth, 1).name('X').onChange((v) => {
            pts[i].x = v;
            localStorage.setItem('prism_spawn_points', JSON.stringify(pts));
            // Live-update markers without rebuilding folders (which collapses them)
            window.dispatchEvent(new CustomEvent('prism-spawn-markers-update', { detail: { points: pts } }));
          });
          pf.add(ptProxy, 'y', 0, window.innerHeight, 1).name('Y').onChange((v) => {
            pts[i].y = v;
            localStorage.setItem('prism_spawn_points', JSON.stringify(pts));
            window.dispatchEvent(new CustomEvent('prism-spawn-markers-update', { detail: { points: pts } }));
          });
        }
        pf.add({ preview() {
          const W = window.innerWidth, H = window.innerHeight;
          let ox, oy;
          if (pt.x != null && pt.y != null && (!pt.side || pt.side === 'custom')) {
            ox = `${(pt.x / W) * 100}%`; oy = `${(pt.y / H) * 100}%`;
          } else {
            const s = pt.side || 'right';
            if (s === 'right') { ox = `${((W - 130) / W) * 100}%`; oy = '50%'; }
            else if (s === 'left') { ox = `${(130 / W) * 100}%`; oy = '40%'; }
            else { ox = '50%'; oy = `${(230 / H) * 100}%`; }
          }
          window.dispatchEvent(new CustomEvent('trigger-prism-peek', {
            detail: { style: 'portal', pinned: false, duration: 4000, side: pt.side, x: pt.x, y: pt.y }
          }));
        } }, 'preview').name('Preview Portal');
        pf.add({ remove() {
          pts.splice(i, 1);
          localStorage.setItem('prism_spawn_points', JSON.stringify(pts));
          window.dispatchEvent(new CustomEvent('prism-spawn-point', { detail: { action: 'reset', points: pts } }));
          rebuildSpawnList();
        } }, 'remove').name('Delete Point');
        pf.close();
        spawnPointFolders.push(pf);
      });
    };
    rebuildSpawnList();

    // Listen for spawn point changes to rebuild list
    const spawnChangeHandler = () => setTimeout(rebuildSpawnList, 150);
    window.addEventListener('prism-spawn-point', spawnChangeHandler);

    spawnMgmtFolder.add({ save() {
      window.dispatchEvent(new CustomEvent('prism-spawn-point', { detail: { action: 'add', label: `Point ${Date.now()}` } }));
      setTimeout(rebuildSpawnList, 200);
    } }, 'save').name('Save Current Position');
    spawnMgmtFolder.add({ addCustom() {
      const pts = JSON.parse(localStorage.getItem('prism_spawn_points') || '[]');
      pts.push({ label: `Custom ${pts.length + 1}`, x: window.innerWidth / 2, y: window.innerHeight / 2, side: 'custom' });
      localStorage.setItem('prism_spawn_points', JSON.stringify(pts));
      window.dispatchEvent(new CustomEvent('prism-spawn-point', { detail: { action: 'reset', points: pts } }));
      rebuildSpawnList();
    } }, 'addCustom').name('Add Custom Point');
    spawnMgmtFolder.add({ clearAll() {
      if (!confirm('Clear all saved spawn points?')) return;
      localStorage.removeItem('prism_spawn_points');
      window.dispatchEvent(new CustomEvent('prism-spawn-point', { detail: { action: 'clear' } }));
      rebuildSpawnList();
    } }, 'clearAll').name('Clear All Points');
    spawnMgmtFolder.add({ resetDefaults() {
      const defaults = [
        { label: 'Right Edge', side: 'right' },
        { label: 'Left Edge', side: 'left' },
        { label: 'Top', side: 'top' },
      ];
      localStorage.setItem('prism_spawn_points', JSON.stringify(defaults));
      window.dispatchEvent(new CustomEvent('prism-spawn-point', { detail: { action: 'reset', points: defaults } }));
      rebuildSpawnList();
    } }, 'resetDefaults').name('Reset to Defaults');
    spawnMgmtFolder.close();

    // -- Reset --
    prismBopFolder.add({ reset() {
      Object.assign(pcfg, JSON.parse(JSON.stringify(PRISM_DEFAULTS)));
      gui.controllersRecursive().forEach(c => c.updateDisplay());
      // Update color proxies
      portalColorProxy.color1 = rgbToHex(PRISM_DEFAULTS.portalColor1);
      portalColorProxy.color2 = rgbToHex(PRISM_DEFAULTS.portalColor2);
      portalColorProxy.color3 = rgbToHex(PRISM_DEFAULTS.portalColor3);
      portalColorProxy.seepColor = rgbToHex(PRISM_DEFAULTS.portalSeepColor);
      gui.controllersRecursive().forEach(c => c.updateDisplay());
    } }, 'reset').name('Reset All to Defaults');

    // -- Prism localStorage Save/Load --
    prismBopFolder.add({ save() {
      const snapshot = {};
      for (const [k, v] of Object.entries(pcfg)) {
        snapshot[k] = Array.isArray(v) ? [...v] : v;
      }
      localStorage.setItem('jarowe_prism_editor_preset', JSON.stringify(snapshot));
      alert('Prism settings saved to localStorage');
    } }, 'save').name('Save Prism to localStorage');

    prismBopFolder.add({ load() {
      const saved = localStorage.getItem('jarowe_prism_editor_preset');
      if (!saved) { alert('No saved prism settings found'); return; }
      try {
        const parsed = JSON.parse(saved);
        Object.assign(pcfg, parsed);
        // Update color proxies
        if (pcfg.portalColor1) portalColorProxy.color1 = rgbToHex(pcfg.portalColor1);
        if (pcfg.portalColor2) portalColorProxy.color2 = rgbToHex(pcfg.portalColor2);
        if (pcfg.portalColor3) portalColorProxy.color3 = rgbToHex(pcfg.portalColor3);
        if (pcfg.portalSeepColor) portalColorProxy.seepColor = rgbToHex(pcfg.portalSeepColor);
        gui.controllersRecursive().forEach(c => c.updateDisplay());
        alert('Prism settings loaded');
      } catch { alert('Failed to parse saved settings'); }
    } }, 'load').name('Load Prism from localStorage');

    // -- Push Prism to Live --
    prismBopFolder.add({ pushPrismToLive() {
      // Snapshot all prism config
      const current = {};
      for (const [k, v] of Object.entries(pcfg)) {
        current[k] = Array.isArray(v) ? [...v] : v;
      }

      // Count changes vs defaults
      let changedCount = 0;
      for (const [key, val] of Object.entries(current)) {
        const def = PRISM_DEFAULTS[key];
        if (def === undefined) continue;
        if (Array.isArray(val) && Array.isArray(def)) {
          if (val[0] !== def[0] || val[1] !== def[1] || val[2] !== def[2]) changedCount++;
        } else if (val !== def) changedCount++;
      }

      // Passphrase
      const PASSPHRASE_KEY = 'jarowe_editor_passphrase';
      let passphrase = sessionStorage.getItem(PASSPHRASE_KEY);
      if (!passphrase) {
        passphrase = prompt('Enter editor passphrase:');
        if (!passphrase) return;
        sessionStorage.setItem(PASSPHRASE_KEY, passphrase);
      }

      if (!confirm(`Push ${changedCount} prism setting${changedCount !== 1 ? 's' : ''} to live?\n\nThis will commit prismDefaults.js to GitHub and trigger a Vercel deploy.`)) return;

      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed', inset: '0', zIndex: '99999',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        color: '#fff', fontFamily: 'system-ui', fontSize: '1.1rem',
      });
      overlay.innerHTML = '<div style="font-size:1.5rem;margin-bottom:0.5rem">Pushing prism to live...</div><div style="opacity:0.6">Committing prismDefaults.js to GitHub</div>';
      document.body.appendChild(overlay);

      fetch('/api/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: passphrase, settings: current, file: 'prism' }),
      })
        .then(r => r.json().then(data => ({ ok: r.ok, status: r.status, data })))
        .then(({ ok, status, data }) => {
          if (ok && data.success) {
            const sha = data.commitSha ? data.commitSha.slice(0, 7) : '?';
            overlay.innerHTML = `<div style="font-size:1.5rem;color:#4f8;">Prism pushed to live!</div>`
              + `<div style="opacity:0.7;margin-top:0.3rem">${data.changedCount} setting${data.changedCount !== 1 ? 's' : ''} updated</div>`
              + `<div style="opacity:0.5;margin-top:0.3rem;font-family:monospace">commit ${sha}</div>`
              + `<div style="opacity:0.4;margin-top:0.8rem;font-size:0.85rem">Vercel will auto-deploy in ~30s</div>`
              + `<div style="opacity:0.4;margin-top:0.5rem;font-size:0.85rem;cursor:pointer" onclick="this.parentElement.remove()">Click to dismiss</div>`;
          } else {
            if (status === 401) sessionStorage.removeItem(PASSPHRASE_KEY);
            overlay.innerHTML = `<div style="font-size:1.5rem;color:#f44">Push failed</div>`
              + `<div style="opacity:0.7;margin-top:0.3rem">${data.error || 'Unknown error'}</div>`
              + `<div style="opacity:0.4;margin-top:0.8rem;font-size:0.85rem;cursor:pointer" onclick="this.parentElement.remove()">Click to dismiss</div>`;
          }
        })
        .catch(err => {
          overlay.innerHTML = `<div style="font-size:1.5rem;color:#f44">Network error</div>`
            + `<div style="opacity:0.7;margin-top:0.3rem">${err.message}</div>`
            + `<div style="opacity:0.4;margin-top:0.8rem;font-size:0.85rem;cursor:pointer" onclick="this.parentElement.remove()">Click to dismiss</div>`;
        });
    } }, 'pushPrismToLive').name('⬆ Push Prism to Live');

    prismBopFolder.close();

    // ══════════════════════════════════════════
    // POST-PROCESSING (Cinematic VFX)
    // ══════════════════════════════════════════
    const ppFolder = gui.addFolder('Post-Processing');
    ppFolder.add(proxy, 'ppEnabled').name('Enable').onChange(updateParam('ppEnabled'));

    const godRaysFolder = ppFolder.addFolder('God Rays');
    godRaysFolder.add(proxy, 'godRaysEnabled').name('Enable').onChange(updateParam('godRaysEnabled'));
    godRaysFolder.add(proxy, 'godRaysDensity', 0.1, 2.0, 0.01).name('Density').onChange(updateParam('godRaysDensity'));
    godRaysFolder.add(proxy, 'godRaysWeight', 0.05, 2.0, 0.01).name('Weight').onChange(updateParam('godRaysWeight'));
    godRaysFolder.add(proxy, 'godRaysDecay', 0.9, 1.0, 0.001).name('Decay').onChange(updateParam('godRaysDecay'));
    godRaysFolder.add(proxy, 'godRaysExposure', 0.01, 1.0, 0.005).name('Exposure').onChange(updateParam('godRaysExposure'));

    const colorFolder = ppFolder.addFolder('Color Grading');
    colorFolder.add(proxy, 'ppBrightness', -0.5, 0.5, 0.005).name('Brightness').onChange(updateParam('ppBrightness'));
    colorFolder.add(proxy, 'ppContrast', 0.5, 2.0, 0.01).name('Contrast').onChange(updateParam('ppContrast'));
    colorFolder.add(proxy, 'ppSaturation', 0.0, 2.0, 0.01).name('Saturation').onChange(updateParam('ppSaturation'));
    colorFolder.add(proxy, 'ppGamma', 0.5, 2.0, 0.01).name('Gamma').onChange(updateParam('ppGamma'));
    colorFolder.addColor(proxy, 'ppTint').name('Color Tint').onChange(updatePPColor('ppTint'));

    const lensFolder = ppFolder.addFolder('Lens Effects');
    lensFolder.add(proxy, 'ppChromaticAberration', 0.0, 0.02, 0.0005).name('Chromatic Aberr.').onChange(updateParam('ppChromaticAberration'));
    lensFolder.add(proxy, 'ppVignetteStrength', 0.0, 1.0, 0.01).name('Vignette Strength').onChange(updateParam('ppVignetteStrength'));
    lensFolder.add(proxy, 'ppVignetteRadius', 0.3, 1.0, 0.01).name('Vignette Radius').onChange(updateParam('ppVignetteRadius'));
    lensFolder.add(proxy, 'ppFilmGrain', 0.0, 0.15, 0.001).name('Film Grain').onChange(updateParam('ppFilmGrain'));
    lensFolder.add(proxy, 'ppScanLines', 0.0, 1.0, 0.01).name('Scan Lines').onChange(updateParam('ppScanLines'));
    lensFolder.add(proxy, 'ppScanLineSpeed', 0.0, 5.0, 0.1).name('Scan Speed').onChange(updateParam('ppScanLineSpeed'));
    ppFolder.close();

    // ══════════════════════════════════════════
    // TV / CAMERA EFFECTS
    // ══════════════════════════════════════════
    const tvFolder = gui.addFolder('TV / Camera FX');
    tvFolder.add(proxy, 'tvEnabled').name('Enable TV Mode').onChange(updateParam('tvEnabled'));
    tvFolder.add(proxy, 'tvGlitch', 0.0, 1.0, 0.01).name('Glitch').onChange(updateParam('tvGlitch'));
    tvFolder.add(proxy, 'tvGlitchSpeed', 0.0, 5.0, 0.1).name('Glitch Speed').onChange(updateParam('tvGlitchSpeed'));
    tvFolder.add(proxy, 'tvScanLineJitter', 0.0, 1.0, 0.01).name('Scan Jitter').onChange(updateParam('tvScanLineJitter'));
    tvFolder.add(proxy, 'tvColorBleed', 0.0, 1.0, 0.01).name('Color Bleed').onChange(updateParam('tvColorBleed'));
    tvFolder.add(proxy, 'tvStaticNoise', 0.0, 1.0, 0.01).name('Static Noise').onChange(updateParam('tvStaticNoise'));
    tvFolder.add(proxy, 'tvBarrelDistortion', 0.0, 0.5, 0.005).name('Barrel Distort').onChange(updateParam('tvBarrelDistortion'));
    tvFolder.add(proxy, 'tvRGBShift', 0.0, 1.0, 0.01).name('RGB Shift').onChange(updateParam('tvRGBShift'));
    tvFolder.close();

    // ══════════════════════════════════════════
    // OVERLAY GRAPHICS (arcs, rings, labels)
    // ══════════════════════════════════════════
    const overlayFolder = gui.addFolder('Overlay Graphics');
    const overlayKeys = ['arcStroke', 'arcDashLength', 'arcDashGap', 'arcDashAnimateTime',
      'ringMaxRadius', 'ringPropagationSpeed', 'ringRepeatPeriod', 'labelSize', 'labelDotRadius'];
    const updateOverlay = (key) => (v) => {
      p[key] = v;
      if (setOverlayParams) {
        const update = {};
        overlayKeys.forEach(k => { update[k] = p[k]; });
        setOverlayParams(update);
      }
    };
    overlayFolder.add(proxy, 'arcStroke', 0.0, 3.0, 0.1).name('Arc Stroke').onChange(updateOverlay('arcStroke'));
    overlayFolder.add(proxy, 'arcDashLength', 0.0, 2.0, 0.05).name('Dash Length').onChange(updateOverlay('arcDashLength'));
    overlayFolder.add(proxy, 'arcDashGap', 0.0, 2.0, 0.05).name('Dash Gap').onChange(updateOverlay('arcDashGap'));
    overlayFolder.add(proxy, 'arcDashAnimateTime', 0, 10000, 100).name('Dash Animate (ms)').onChange(updateOverlay('arcDashAnimateTime'));
    overlayFolder.add(proxy, 'ringMaxRadius', 0.0, 10.0, 0.1).name('Ring Max Radius').onChange(updateOverlay('ringMaxRadius'));
    overlayFolder.add(proxy, 'ringPropagationSpeed', 0.0, 5.0, 0.1).name('Ring Speed').onChange(updateOverlay('ringPropagationSpeed'));
    overlayFolder.add(proxy, 'ringRepeatPeriod', 0, 5000, 50).name('Ring Period (ms)').onChange(updateOverlay('ringRepeatPeriod'));
    overlayFolder.add(proxy, 'labelSize', 0.1, 5.0, 0.1).name('Label Size').onChange(updateOverlay('labelSize'));
    overlayFolder.add(proxy, 'labelDotRadius', 0.0, 2.0, 0.05).name('Label Dot Radius').onChange(updateOverlay('labelDotRadius'));
    overlayFolder.close();

    // ══════════════════════════════════════════
    // MAP BADGE (Location Bar)
    // ══════════════════════════════════════════
    const badgeFolder = gui.addFolder('Location Bar');
    const updateBadgeVar = (cssVar, unit) => (v) => {
      p[cssVar] = v;
      const cell = document.querySelector('.cell-map');
      if (!cell) return;
      const propMap = {
        badgeBgOpacity: '--badge-bg-opacity',
        badgeBlur: '--badge-blur',
        badgeBorderOpacity: '--badge-border-opacity',
        badgeRadius: '--badge-radius',
        badgeFontSize: '--badge-font-size',
        badgePadding: '--badge-padding',
        badgeBottom: '--badge-bottom',
        badgeInset: '--badge-inset',
      };
      const prop = propMap[cssVar];
      if (prop) cell.style.setProperty(prop, unit ? `${v}${unit}` : v);
      if (cssVar === 'badgePadding') cell.style.setProperty('--badge-padding-x', `${v * 1.4}rem`);
    };
    badgeFolder.add(proxy, 'badgeBgOpacity', 0.0, 1.0, 0.01).name('Background Opacity').onChange(updateBadgeVar('badgeBgOpacity'));
    badgeFolder.add(proxy, 'badgeBlur', 0, 30, 1).name('Blur (px)').onChange(updateBadgeVar('badgeBlur', 'px'));
    badgeFolder.add(proxy, 'badgeBorderOpacity', 0.0, 0.5, 0.01).name('Border Opacity').onChange(updateBadgeVar('badgeBorderOpacity'));
    badgeFolder.add(proxy, 'badgeRadius', 0, 40, 1).name('Border Radius').onChange(updateBadgeVar('badgeRadius', 'px'));
    badgeFolder.add(proxy, 'badgeFontSize', 0.5, 1.5, 0.05).name('Font Size (rem)').onChange(updateBadgeVar('badgeFontSize', 'rem'));
    badgeFolder.add(proxy, 'badgePadding', 0.1, 1.5, 0.05).name('Padding (rem)').onChange(updateBadgeVar('badgePadding', 'rem'));
    badgeFolder.add(proxy, 'badgeBottom', 0.0, 3.0, 0.1).name('Bottom (rem)').onChange(updateBadgeVar('badgeBottom', 'rem'));
    badgeFolder.add(proxy, 'badgeInset', 0.0, 3.0, 0.1).name('Side Inset (rem)').onChange(updateBadgeVar('badgeInset', 'rem'));
    badgeFolder.close();

    // ══════════════════════════════════════════
    // PRESETS
    // ══════════════════════════════════════════
    const presetFolder = gui.addFolder('Presets');
    const presetActions = {
      save() {
        const data = {};
        for (const [key, val] of Object.entries(p)) {
          data[key] = Array.isArray(val) ? [...val] : val;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('[GlobeEditor] Preset saved');
      },
      load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) { console.warn('[GlobeEditor] No saved preset'); return; }
        try { applyPreset(JSON.parse(raw)); console.log('[GlobeEditor] Loaded'); }
        catch (e) { console.error('[GlobeEditor] Load failed:', e); }
      },
      exportJSON() {
        const data = {};
        for (const [key, val] of Object.entries(p)) {
          data[key] = Array.isArray(val) ? [...val] : val;
        }
        const json = JSON.stringify(data, null, 2);
        navigator.clipboard.writeText(json).then(
          () => { console.log('[GlobeEditor] Exported to clipboard'); alert('Settings copied to clipboard!'); },
          () => { const w = window.open('', '_blank'); if (w) w.document.write(`<pre>${json}</pre>`); }
        );
      },
      importJSON() {
        const input = prompt('Paste globe settings JSON:');
        if (!input) return;
        try {
          const data = JSON.parse(input);
          applyPreset(data);
          console.log('[GlobeEditor] Imported from JSON');
        } catch (e) {
          alert('Invalid JSON: ' + e.message);
          console.error('[GlobeEditor] Import failed:', e);
        }
      },
      loadLive() { applyPreset(GLOBE_DEFAULTS); console.log('[GlobeEditor] Loaded live settings'); },
      pushToLive() {
        // Collect current settings
        const current = {};
        for (const [key, val] of Object.entries(p)) {
          current[key] = Array.isArray(val) ? [...val] : val;
        }

        // Count changed settings vs GLOBE_DEFAULTS
        let changedCount = 0;
        for (const [key, val] of Object.entries(current)) {
          const def = GLOBE_DEFAULTS[key];
          if (def === undefined) continue;
          if (Array.isArray(val) && Array.isArray(def)) {
            if (val[0] !== def[0] || val[1] !== def[1] || val[2] !== def[2]) changedCount++;
          } else if (val !== def) changedCount++;
        }

        // Prompt for passphrase (cached in sessionStorage)
        const PASSPHRASE_KEY = 'jarowe_editor_passphrase';
        let passphrase = sessionStorage.getItem(PASSPHRASE_KEY);
        if (!passphrase) {
          passphrase = prompt('Enter editor passphrase:');
          if (!passphrase) return;
          sessionStorage.setItem(PASSPHRASE_KEY, passphrase);
        }

        // Confirm
        if (!confirm(`Push ${changedCount} changed setting${changedCount !== 1 ? 's' : ''} to live?\n\nThis will commit to GitHub and trigger a Vercel deploy.`)) return;

        // Show overlay
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
          position: 'fixed', inset: '0', zIndex: '99999',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          color: '#fff', fontFamily: 'system-ui', fontSize: '1.1rem',
        });
        overlay.innerHTML = '<div style="font-size:1.5rem;margin-bottom:0.5rem">Pushing to live...</div><div style="opacity:0.6">Committing to GitHub</div>';
        document.body.appendChild(overlay);

        fetch('/api/save-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: passphrase, settings: current }),
        })
          .then((r) => r.json().then((data) => ({ ok: r.ok, status: r.status, data })))
          .then(({ ok, status, data }) => {
            if (ok && data.success) {
              const sha = data.commitSha ? data.commitSha.slice(0, 7) : '?';
              overlay.innerHTML = `<div style="font-size:1.5rem;color:#4f8;">Pushed to live!</div>`
                + `<div style="opacity:0.7;margin-top:0.3rem">${data.changedCount} setting${data.changedCount !== 1 ? 's' : ''} updated</div>`
                + `<div style="opacity:0.5;margin-top:0.3rem;font-family:monospace">commit ${sha}</div>`
                + `<div style="opacity:0.4;margin-top:0.8rem;font-size:0.85rem">Vercel will auto-deploy in ~30s</div>`
                + `<div style="opacity:0.4;margin-top:0.5rem;font-size:0.85rem;cursor:pointer" onclick="this.parentElement.remove()">Click to dismiss</div>`;
            } else {
              if (status === 401) sessionStorage.removeItem(PASSPHRASE_KEY);
              overlay.innerHTML = `<div style="font-size:1.5rem;color:#f44">Push failed</div>`
                + `<div style="opacity:0.7;margin-top:0.3rem">${data.error || 'Unknown error'}</div>`
                + `<div style="opacity:0.4;margin-top:0.8rem;font-size:0.85rem;cursor:pointer" onclick="this.parentElement.remove()">Click to dismiss</div>`;
            }
          })
          .catch((err) => {
            overlay.innerHTML = `<div style="font-size:1.5rem;color:#f44">Network error</div>`
              + `<div style="opacity:0.7;margin-top:0.3rem">${err.message}</div>`
              + `<div style="opacity:0.4;margin-top:0.8rem;font-size:0.85rem;cursor:pointer" onclick="this.parentElement.remove()">Click to dismiss</div>`;
          });
      },
    };
    presetFolder.add(presetActions, 'loadLive').name('Load Live Settings');
    presetFolder.add(presetActions, 'save').name('Save to localStorage');
    presetFolder.add(presetActions, 'load').name('Load from localStorage');
    presetFolder.add(presetActions, 'importJSON').name('Import JSON (paste)');
    presetFolder.add(presetActions, 'exportJSON').name('Export JSON (clipboard)');
    presetFolder.add(presetActions, 'pushToLive').name('⬆ Push to Live');

    function applyPreset(data) {
      for (const [key, val] of Object.entries(data)) {
        if (!(key in p)) continue;
        if (Array.isArray(val)) { p[key] = [...val]; proxy[key] = rgbToHex(val); }
        else { p[key] = val; proxy[key] = val; }
      }
      // Push to all shader uniforms
      const mats = [
        globeShaderMaterial,
        getCloudMat(), getRimMat(), getHaloMat(), getParticleMat(),
        getAuroraMat(), getPrismGlowMat(), getEnvGlowMat(), getLavaLampMat()
      ].filter(Boolean);
      for (const [key, val] of Object.entries(data)) {
        for (const mat of mats) {
          if (!mat?.uniforms?.[key]) continue;
          if (Array.isArray(val)) mat.uniforms[key].value.set(...val);
          else mat.uniforms[key].value = val;
        }
      }
      // Post-processing tint
      if (data.ppTint) {
        const pp = globeRef.current?.ppPass;
        if (pp?.uniforms?.tint) pp.uniforms.tint.value.set(...data.ppTint);
      }
      // Scene lights
      if (data.ambientIntensity != null && globeRef.current?._ambientLight)
        globeRef.current._ambientLight.intensity = data.ambientIntensity;
      if (data.sunIntensity != null && globeRef.current?._sunLight)
        globeRef.current._sunLight.intensity = data.sunIntensity;
      // Overlay graphics (triggers React re-render)
      if (setOverlayParams) {
        const update = {};
        overlayKeys.forEach(k => { update[k] = p[k]; });
        setOverlayParams(update);
      }
      // Sync CSS class toggles and custom properties
      const cell = document.querySelector('.cell-map');
      if (cell) {
        cell.classList.toggle('globe-breakout', !!p.globeBreakout);
        if (p.globeBreakout) cell.style.setProperty('--globe-breakout-px', `${p.globeBreakoutPx}px`);
        cell.classList.toggle('glass-sweep-off', !p.glassSweepEnabled);
        cell.classList.toggle('glass-shimmer-off', !p.glassShimmerEnabled);
        cell.classList.toggle('inner-glow-off', !p.innerGlowEnabled);
        cell.style.setProperty('--glass-sweep-opacity', p.glassSweepOpacity);
        cell.style.setProperty('--glass-shimmer-opacity', p.glassShimmerOpacity);
        cell.style.setProperty('--badge-bg-opacity', p.badgeBgOpacity);
        cell.style.setProperty('--badge-blur', `${p.badgeBlur}px`);
        cell.style.setProperty('--badge-border-opacity', p.badgeBorderOpacity);
        cell.style.setProperty('--badge-radius', `${p.badgeRadius}px`);
        cell.style.setProperty('--badge-font-size', `${p.badgeFontSize}rem`);
        cell.style.setProperty('--badge-padding', `${p.badgePadding}rem`);
        cell.style.setProperty('--badge-padding-x', `${p.badgePadding * 1.4}rem`);
        cell.style.setProperty('--badge-bottom', `${p.badgeBottom}rem`);
        cell.style.setProperty('--badge-inset', `${p.badgeInset}rem`);
      }
      gui.controllersRecursive().forEach(c => c.updateDisplay());
    }

    return () => {
      gui.destroy();
      guiRef.current = null;
      window.removeEventListener('prism-spawn-point', spawnChangeHandler);
    };
  }, [editorParams, globeRef, globeShaderMaterial, setOverlayParams]);

  return null;
}
