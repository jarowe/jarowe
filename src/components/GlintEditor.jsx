import { useEffect, useRef } from 'react';
import GUI from 'lil-gui';
import { PRISM_DEFAULTS } from '../utils/prismDefaults';
import { GLASS_PRESETS } from './Prism3D';

const GLASS_PRESET_STORAGE_KEY = 'jarowe_glass_presets';

function rgbToHex(arr) {
  const r = Math.round(Math.min(1, Math.max(0, arr[0])) * 255);
  const g = Math.round(Math.min(1, Math.max(0, arr[1])) * 255);
  const b = Math.round(Math.min(1, Math.max(0, arr[2])) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function GlintEditor() {
  const guiRef = useRef(null);

  useEffect(() => {
    if (guiRef.current) return;

    const gui = new GUI({ title: 'Glint Editor', width: 320 });
    gui.domElement.style.position = 'fixed';
    gui.domElement.style.top = '10px';
    gui.domElement.style.left = '10px';
    gui.domElement.style.zIndex = '10000';
    gui.domElement.style.maxHeight = '92vh';
    gui.domElement.style.overflowY = 'auto';
    guiRef.current = gui;

    // ── Search bar ──
    const searchWrap = document.createElement('div');
    searchWrap.style.cssText = 'padding:4px 8px 2px;position:sticky;top:0;z-index:1;background:var(--background-color,#1a1a2e)';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search settings…';
    searchInput.style.cssText = 'width:100%;box-sizing:border-box;padding:5px 8px;border:1px solid rgba(255,255,255,0.15);border-radius:4px;background:rgba(255,255,255,0.06);color:#eee;font-size:12px;outline:none';
    searchInput.addEventListener('focus', () => { searchInput.style.borderColor = 'rgba(140,120,255,0.5)'; });
    searchInput.addEventListener('blur', () => { searchInput.style.borderColor = 'rgba(255,255,255,0.15)'; });
    searchWrap.appendChild(searchInput);
    const titleEl = gui.domElement.querySelector('.title');
    if (titleEl) titleEl.after(searchWrap);
    else gui.domElement.prepend(searchWrap);

    const filterGui = (query) => {
      const q = query.toLowerCase().trim();
      const processFolder = (folder, parentPath) => {
        let anyVisible = false;
        const folderName = (folder._title || '').toLowerCase();
        const fullPath = parentPath ? parentPath + ' ' + folderName : folderName;
        for (const ctrl of folder.controllers) {
          const displayName = (ctrl._name || '').toLowerCase();
          const propName = (ctrl.property || '').toLowerCase();
          const searchable = fullPath + ' ' + displayName + ' ' + propName;
          const match = !q || searchable.includes(q);
          ctrl.domElement.parentElement.style.display = match ? '' : 'none';
          if (match) anyVisible = true;
        }
        for (const sub of folder.folders) {
          const subTitle = (sub._title || '').toLowerCase();
          const titleMatch = !q || subTitle.includes(q);
          const childVisible = processFolder(sub, fullPath);
          const show = titleMatch || childVisible;
          sub.domElement.style.display = show ? '' : 'none';
          if (show && q) sub.open();
          if (show) anyVisible = true;
        }
        return anyVisible;
      };
      processFolder(gui, '');
    };
    searchInput.addEventListener('input', () => filterGui(searchInput.value));

    // Initialize prism config with defaults
    if (!window.__prismConfig) {
      window.__prismConfig = { ...PRISM_DEFAULTS };
    } else {
      for (const [k, v] of Object.entries(PRISM_DEFAULTS)) {
        if (window.__prismConfig[k] === undefined) {
          window.__prismConfig[k] = Array.isArray(v) ? [...v] : v;
        }
      }
    }
    const pcfg = window.__prismConfig;

    // -- Peek Control --
    const peekFolder = gui.addFolder('Peek Control');
    const peekStyles = ['portal', 'slide', 'bounce', 'swing', 'pop', 'roll'];
    const peekProxy = { side: 'left', cell: 0, duration: 8, pinned: false, style: 'portal', dragMode: false };
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
    const pShape = gui.addFolder('Shape');
    if (!pcfg.shape) pcfg.shape = 'rounded-prism';
    pShape.add(pcfg, 'shape', ['rounded-prism', 'rounded-pyramid', 'pyramid', 'crystal', 'sphere', 'gem', 'prism']).name('Shape').onChange(() => {
      window.dispatchEvent(new CustomEvent('prism-shape-change'));
    });
    pShape.close();

    // -- Mouth Position / Size --
    const pMouth = gui.addFolder('Mouth');
    pMouth.add(pcfg, 'mouthX', -1.0, 1.0, 0.01).name('X Offset');
    pMouth.add(pcfg, 'mouthY', -1.0, 0.5, 0.01).name('Y Offset');
    pMouth.add(pcfg, 'mouthZ', 0, 1.5, 0.01).name('Z Depth');
    pMouth.add(pcfg, 'mouthScaleX', 0.1, 3.0, 0.01).name('Width');
    pMouth.add(pcfg, 'mouthScaleY', 0.1, 2.5, 0.01).name('Height');
    pMouth.close();

    // -- Mouse Reactivity --
    const pMouse = gui.addFolder('Mouse Reactivity');
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
    const pParticles = gui.addFolder('Particles');
    pParticles.add(pcfg, 'sparkleCount', 0, 100, 1).name('Sparkle Count');
    pParticles.add(pcfg, 'sparkleSize', 0.5, 8.0, 0.1).name('Sparkle Size');
    pParticles.add(pcfg, 'sparkleSpeed', 0, 2.0, 0.1).name('Sparkle Speed');
    pParticles.add(pcfg, 'sparkleOpacity', 0, 1.0, 0.01).name('Sparkle Opacity');
    pParticles.close();

    // -- Lighting --
    const prismLightFolder = gui.addFolder('Lighting');
    prismLightFolder.add(pcfg, 'ambientIntensity', 0, 2.0, 0.01).name('Ambient');
    prismLightFolder.add(pcfg, 'keyLightIntensity', 0, 8.0, 0.1).name('Key Light');
    prismLightFolder.add(pcfg, 'fillLightIntensity', 0, 5.0, 0.1).name('Fill Light');
    prismLightFolder.add(pcfg, 'internalGlowIntensity', 0, 5.0, 0.1).name('Internal Glow');
    prismLightFolder.add(pcfg, 'internalGlowDistance', 1, 10, 0.5).name('Glow Distance');
    prismLightFolder.add(pcfg, 'lightSpillIntensity', 0, 3.0, 0.01).name('Light Spill');
    prismLightFolder.close();

    // -- Animation --
    const pAnim = gui.addFolder('Animation');
    pAnim.add(pcfg, 'floatSpeed', 0, 5.0, 0.1).name('Float Speed');
    pAnim.add(pcfg, 'rotationIntensity', 0, 1.0, 0.01).name('Float Rotation');
    pAnim.add(pcfg, 'floatIntensity', 0, 2.0, 0.01).name('Float Intensity');
    pAnim.add(pcfg, 'rotationSpeed', 0, 1.0, 0.01).name('Spin Speed');
    pAnim.add(pcfg, 'breathingAmp', 0, 0.1, 0.001).name('Breathing Amp');
    pAnim.add(pcfg, 'breathingSpeed', 0, 3.0, 0.1).name('Breathing Speed');
    pAnim.close();

    // -- Beams & Effects --
    const pFx = gui.addFolder('Beams & Effects');
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
    if (pcfg.beamDamping === undefined) pcfg.beamDamping = 0.7;
    if (pcfg.rayJitter === undefined) pcfg.rayJitter = 1.0;
    if (pcfg.raySweep === undefined) pcfg.raySweep = 0.5;
    if (pcfg.portalExitSpread === undefined) pcfg.portalExitSpread = 1.5;
    if (pcfg.portalExitWiden === undefined) pcfg.portalExitWiden = 1.0;
    pRayMotion.add(pcfg, 'beamDamping', 0, 1.0, 0.01).name('Beam Damping');
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
    const pMusic = gui.addFolder('Music Reactivity');
    pMusic.add(pcfg, 'musicReactivity', 0, 2.0, 0.01).name('Overall Reactivity');
    pMusic.add(pcfg, 'musicScalePulse', 0, 0.5, 0.01).name('Bass → Scale');
    pMusic.add(pcfg, 'musicRotationBoost', 0, 1.0, 0.01).name('Mids → Rotation');
    pMusic.add(pcfg, 'musicGlowPulse', 0, 2.0, 0.01).name('Bass → Glow/Caustics');
    pMusic.close();

    // -- Glass / Refraction --
    const pGlassRef = gui.addFolder('Glass / Refraction');
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
      presetCtrl.options(opts);
      presetProxy.selectedPreset = '';
      presetCtrl.updateDisplay();
    };

    const SHADER_KEYS = ['glassIOR', 'causticIntensity', 'iridescenceIntensity', 'chromaticSpread', 'glassAlpha', 'streakIntensity'];
    const MTM_KEYS = ['mtmThickness', 'mtmRoughness', 'mtmIOR', 'mtmChromatic', 'mtmTransmission', 'mtmBackside'];
    const HYBRID_KEYS = ['hybridBlend', 'hybridShaderAdd', 'hybridEnvIntensity', 'hybridMtmScale'];

    const getKeysForMode = (mode) => {
      if (mode === 'shader') return SHADER_KEYS;
      if (mode === 'mtm') return MTM_KEYS;
      return [...SHADER_KEYS, ...MTM_KEYS, ...HYBRID_KEYS];
    };

    // Apply Preset
    pGlassRef.add({ apply() {
      const name = presetProxy.selectedPreset;
      if (!name) return;
      const allPresets = [...GLASS_PRESETS, ...loadCustomPresets()];
      const preset = allPresets.find(p => p.name === name);
      if (!preset) return;

      if (preset.glassMode !== pcfg.glassMode) {
        pcfg.glassMode = preset.glassMode;
        glassModeCtrl.updateDisplay();
      }

      const keys = getKeysForMode(preset.glassMode);
      keys.forEach(k => { if (preset[k] !== undefined) pcfg[k] = preset[k]; });

      gui.controllersRecursive().forEach(c => c.updateDisplay());
      window.dispatchEvent(new CustomEvent('prism-glass-mode-change'));
    } }, 'apply').name('Apply Preset');

    // Save Custom
    pGlassRef.add({ save() {
      const name = prompt('Enter a name for your custom preset:');
      if (!name || !name.trim()) return;
      const fullName = `[Custom] ${name.trim()}`;
      const custom = loadCustomPresets();
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
    const pCanvas = gui.addFolder('Canvas / Display');
    pCanvas.add(pcfg, 'characterScale', 0.3, 3.0, 0.01).name('Character Scale');
    pCanvas.add(pcfg, 'canvasSize', 200, 2400, 10).name('Canvas Size');
    pCanvas.add(pcfg, 'nebulaOpacity', 0, 1.0, 0.01).name('Nebula BG Opacity');
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
    const pCounter = gui.addFolder('Bop Counter');
    pCounter.add(pcfg, 'bopCounterOffsetX', -200, 200, 1).name('X Offset');
    pCounter.add(pcfg, 'bopCounterOffsetY', -200, 200, 1).name('Y Offset');
    pCounter.close();

    // -- Hitbox --
    const pHitbox = gui.addFolder('Hitbox');
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
    const pHover = gui.addFolder('Hover Reaction');
    pHover.add(pcfg, 'hoverScale', 0.85, 1.25, 0.01).name('Scale');
    pHover.add(pcfg, 'hoverExpression', ['surprised', 'curious', 'excited', 'love', 'angry', 'thinking', 'mischief']).name('Expression');
    pHover.add(pcfg, 'hoverGlowBoost', 0, 2, 0.05).name('Glow Boost');
    pHover.add(pcfg, 'hoverTremble', 0, 1, 0.05).name('Tremble');
    pHover.close();

    // -- Angular Physics --
    const pAngular = gui.addFolder('Angular Physics');
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
    const pBopPlus = gui.addFolder('Bop +1 Effect');
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
    const pBubble = gui.addFolder('Speech Bubble');
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
    const portalFolder = gui.addFolder('Portal Effects');

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
    const spawnMgmtFolder = gui.addFolder('Spawn Points');
    const spawnMarkerProxy = { showMarkers: pcfg.showSpawnMarkers ?? false };
    spawnMgmtFolder.add(spawnMarkerProxy, 'showMarkers').name('Show Markers').onChange((v) => {
      pcfg.showSpawnMarkers = v;
      window.dispatchEvent(new CustomEvent('prism-spawn-markers', { detail: { enabled: v } }));
    });

    const spawnListFolder = spawnMgmtFolder.addFolder('Point List');
    let spawnPointFolders = [];

    const rebuildSpawnList = () => {
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
    gui.add({ reset() {
      Object.assign(pcfg, JSON.parse(JSON.stringify(PRISM_DEFAULTS)));
      gui.controllersRecursive().forEach(c => c.updateDisplay());
      portalColorProxy.color1 = rgbToHex(PRISM_DEFAULTS.portalColor1);
      portalColorProxy.color2 = rgbToHex(PRISM_DEFAULTS.portalColor2);
      portalColorProxy.color3 = rgbToHex(PRISM_DEFAULTS.portalColor3);
      portalColorProxy.seepColor = rgbToHex(PRISM_DEFAULTS.portalSeepColor);
      gui.controllersRecursive().forEach(c => c.updateDisplay());
    } }, 'reset').name('Reset All to Defaults');

    // -- Prism localStorage Save/Load --
    gui.add({ save() {
      const snapshot = {};
      for (const [k, v] of Object.entries(pcfg)) {
        snapshot[k] = Array.isArray(v) ? [...v] : v;
      }
      localStorage.setItem('jarowe_prism_editor_preset', JSON.stringify(snapshot));
      alert('Prism settings saved to localStorage');
    } }, 'save').name('Save Prism to localStorage');

    gui.add({ load() {
      const saved = localStorage.getItem('jarowe_prism_editor_preset');
      if (!saved) { alert('No saved prism settings found'); return; }
      try {
        const parsed = JSON.parse(saved);
        Object.assign(pcfg, parsed);
        if (pcfg.portalColor1) portalColorProxy.color1 = rgbToHex(pcfg.portalColor1);
        if (pcfg.portalColor2) portalColorProxy.color2 = rgbToHex(pcfg.portalColor2);
        if (pcfg.portalColor3) portalColorProxy.color3 = rgbToHex(pcfg.portalColor3);
        if (pcfg.portalSeepColor) portalColorProxy.seepColor = rgbToHex(pcfg.portalSeepColor);
        gui.controllersRecursive().forEach(c => c.updateDisplay());
        alert('Prism settings loaded');
      } catch { alert('Failed to parse saved settings'); }
    } }, 'load').name('Load Prism from localStorage');

    // -- Push Prism to Live --
    gui.add({ pushPrismToLive() {
      const current = {};
      for (const [k, v] of Object.entries(pcfg)) {
        current[k] = Array.isArray(v) ? [...v] : v;
      }

      let changedCount = 0;
      for (const [key, val] of Object.entries(current)) {
        const def = PRISM_DEFAULTS[key];
        if (def === undefined) continue;
        if (Array.isArray(val) && Array.isArray(def)) {
          if (val[0] !== def[0] || val[1] !== def[1] || val[2] !== def[2]) changedCount++;
        } else if (val !== def) changedCount++;
      }

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
    } }, 'pushPrismToLive').name('\u2B06 Push Prism to Live');

    return () => {
      gui.destroy();
      guiRef.current = null;
      window.removeEventListener('prism-spawn-point', spawnChangeHandler);
    };
  }, []);

  return null;
}
