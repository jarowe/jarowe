import { useEffect, useRef } from 'react';
import {
  CONSTELLATION_DEFAULTS,
  CONSTELLATION_CONFIG_KEY,
} from './constellationDefaults';

/**
 * ConstellationEditor — lil-gui editor panel for live-tuning the constellation scene.
 *
 * Follows the GlintEditor pattern:
 * - Receives a `parentGui` lil-gui instance to mount folders under
 * - Writes all changes to `window.__constellationConfig` (read by scene files every frame)
 * - Persists overrides to localStorage
 * - Section reset + global reset buttons
 */
export default function ConstellationEditor({ parentGui }) {
  const guiRef = useRef(null);

  useEffect(() => {
    if (guiRef.current || !parentGui) return;

    const gui = parentGui.addFolder('Constellation');
    gui.close();
    guiRef.current = gui;

    // ── Initialize window config from localStorage + defaults ──
    const saved = (() => {
      try {
        const raw = localStorage.getItem(CONSTELLATION_CONFIG_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    })();

    if (!window.__constellationConfig) {
      window.__constellationConfig = { ...CONSTELLATION_DEFAULTS, ...saved };
    } else {
      for (const [k, v] of Object.entries(CONSTELLATION_DEFAULTS)) {
        if (window.__constellationConfig[k] === undefined) {
          window.__constellationConfig[k] = saved[k] ?? v;
        }
      }
    }
    const cfg = window.__constellationConfig;

    // Helper: persist current config to localStorage
    const persist = () => {
      try {
        // Only save values that differ from defaults
        const overrides = {};
        for (const [k, v] of Object.entries(cfg)) {
          if (CONSTELLATION_DEFAULTS[k] !== undefined && cfg[k] !== CONSTELLATION_DEFAULTS[k]) {
            overrides[k] = v;
          }
        }
        localStorage.setItem(CONSTELLATION_CONFIG_KEY, JSON.stringify(overrides));
      } catch { /* quota exceeded — ignore */ }
    };

    // Helper: reset a set of keys to defaults, update GUI controllers
    const resetKeys = (keys, controllers) => {
      for (const k of keys) {
        cfg[k] = CONSTELLATION_DEFAULTS[k];
      }
      for (const c of controllers) {
        try { c.updateDisplay(); } catch { /* skip destroyed */ }
      }
      persist();
    };

    // ── Undo / Redo history ──
    const undoStack = [];
    const redoStack = [];
    const MAX_UNDO = 80;
    let lastSnapshot = JSON.stringify(cfg);

    const pushUndo = () => {
      const snap = JSON.stringify(cfg);
      if (snap === lastSnapshot) return; // no change
      undoStack.push(lastSnapshot);
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      redoStack.length = 0; // clear redo on new change
      lastSnapshot = snap;
    };

    const applySnapshot = (snap) => {
      const parsed = JSON.parse(snap);
      Object.assign(cfg, parsed);
      gui.controllersRecursive().forEach(c => { try { c.updateDisplay(); } catch {} });
      persist();
      lastSnapshot = snap;
    };

    const undo = () => {
      if (undoStack.length === 0) return;
      redoStack.push(JSON.stringify(cfg));
      applySnapshot(undoStack.pop());
    };

    const redo = () => {
      if (redoStack.length === 0) return;
      undoStack.push(JSON.stringify(cfg));
      applySnapshot(redoStack.pop());
    };

    const handleUndoRedo = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if (e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleUndoRedo);

    // Wrap .onChange to auto-persist + push undo
    const tracked = (controller) => {
      controller.onFinishChange(() => { pushUndo(); persist(); });
      controller.onChange(() => persist());
      return controller;
    };

    // ────────────────────────────────────────────
    // 1. Camera
    // ────────────────────────────────────────────
    const camFolder = gui.addFolder('Camera');
    const camControllers = [];
    const camKeys = [
      'autoRotateSpeed', 'focusedRotateSpeed', 'dampingFactor',
      'flyToDuration', 'flyToStepDuration', 'focusDistance', 'focusYLift',
    ];
    camControllers.push(tracked(camFolder.add(cfg, 'autoRotateSpeed', 0, 2.0, 0.01).name('Auto Rotate Speed')));
    camControllers.push(tracked(camFolder.add(cfg, 'focusedRotateSpeed', 0, 1.0, 0.01).name('Focused Rotate')));
    camControllers.push(tracked(camFolder.add(cfg, 'dampingFactor', 0.01, 0.2, 0.005).name('Damping')));
    camControllers.push(tracked(camFolder.add(cfg, 'flyToDuration', 0.3, 4.0, 0.1).name('Fly-To Duration')));
    camControllers.push(tracked(camFolder.add(cfg, 'flyToStepDuration', 0.2, 3.0, 0.1).name('Step Duration')));
    camControllers.push(tracked(camFolder.add(cfg, 'focusDistance', 10, 120, 1).name('Focus Distance')));
    camControllers.push(tracked(camFolder.add(cfg, 'focusYLift', 0, 30, 0.5).name('Focus Y Lift')));
    camFolder.add({ reset: () => resetKeys(camKeys, camControllers) }, 'reset').name('Reset Camera');
    camFolder.close();

    // ────────────────────────────────────────────
    // 2. Depth of Field
    // ────────────────────────────────────────────
    const dofFolder = gui.addFolder('Depth of Field');
    const dofControllers = [];
    const dofKeys = [
      'focusedBokehScale', 'unfocusedBokehScale', 'focusedFocusRange',
      'unfocusedFocusRange', 'unfocusedFocusDist', 'dofLerpSpeed',
      'vignetteOffset', 'vignetteDarkness', 'ambientLightIntensity',
    ];
    dofControllers.push(tracked(dofFolder.add(cfg, 'focusedBokehScale', 0, 20, 0.5).name('Focused Bokeh')));
    dofControllers.push(tracked(dofFolder.add(cfg, 'unfocusedBokehScale', 0, 10, 0.5).name('Unfocused Bokeh')));
    dofControllers.push(tracked(dofFolder.add(cfg, 'focusedFocusRange', 1, 60, 1).name('Focused Range')));
    dofControllers.push(tracked(dofFolder.add(cfg, 'unfocusedFocusRange', 10, 200, 5).name('Unfocused Range')));
    dofControllers.push(tracked(dofFolder.add(cfg, 'unfocusedFocusDist', 20, 300, 5).name('Unfocused Focus Dist')));
    dofControllers.push(tracked(dofFolder.add(cfg, 'dofLerpSpeed', 0.005, 0.2, 0.005).name('DOF Lerp Speed')));
    dofControllers.push(tracked(dofFolder.add(cfg, 'vignetteOffset', 0, 1, 0.01).name('Vignette Offset')));
    dofControllers.push(tracked(dofFolder.add(cfg, 'vignetteDarkness', 0, 0.8, 0.01).name('Vignette Darkness')));
    dofControllers.push(tracked(dofFolder.add(cfg, 'ambientLightIntensity', 0, 1.0, 0.01).name('Ambient Light')));
    dofFolder.add({ reset: () => resetKeys(dofKeys, dofControllers) }, 'reset').name('Reset DOF');
    dofFolder.close();

    // ────────────────────────────────────────────
    // 2b. Post-Processing (Cinematic)
    // ────────────────────────────────────────────
    const ppFolder = gui.addFolder('Post-Processing');
    const ppControllers = [];
    const ppKeys = [
      'bloomEnabled', 'bloomIntensity', 'bloomThreshold', 'bloomSmoothing', 'bloomRadius',
      'chromaticEnabled', 'chromaticOffset',
      'grainEnabled', 'grainOpacity',
      'toneMappingEnabled',
    ];

    // ── Bloom ──
    const bloomSubfolder = ppFolder.addFolder('Bloom');
    ppControllers.push(tracked(bloomSubfolder.add(cfg, 'bloomEnabled').name('Enabled')));
    ppControllers.push(tracked(bloomSubfolder.add(cfg, 'bloomIntensity', 0, 2.0, 0.05).name('Intensity')));
    ppControllers.push(tracked(bloomSubfolder.add(cfg, 'bloomThreshold', 0, 1.0, 0.01).name('Luminance Threshold')));
    ppControllers.push(tracked(bloomSubfolder.add(cfg, 'bloomSmoothing', 0, 1.0, 0.01).name('Luminance Smoothing')));
    ppControllers.push(tracked(bloomSubfolder.add(cfg, 'bloomRadius', 0, 1.0, 0.05).name('Radius')));
    bloomSubfolder.close();

    // ── Chromatic Aberration ──
    const caSubfolder = ppFolder.addFolder('Chromatic Aberration');
    ppControllers.push(tracked(caSubfolder.add(cfg, 'chromaticEnabled').name('Enabled')));
    ppControllers.push(tracked(caSubfolder.add(cfg, 'chromaticOffset', 0, 0.003, 0.0001).name('Offset')));
    caSubfolder.close();

    // ── Film Grain ──
    const grainSubfolder = ppFolder.addFolder('Film Grain');
    ppControllers.push(tracked(grainSubfolder.add(cfg, 'grainEnabled').name('Enabled')));
    ppControllers.push(tracked(grainSubfolder.add(cfg, 'grainOpacity', 0, 0.15, 0.005).name('Opacity')));
    grainSubfolder.close();

    // ── Tone Mapping ──
    ppControllers.push(tracked(ppFolder.add(cfg, 'toneMappingEnabled').name('ACES Filmic Tone Map')));

    ppFolder.add({ reset: () => resetKeys(ppKeys, ppControllers) }, 'reset').name('Reset Post-Processing');
    ppFolder.close();

    // ────────────────────────────────────────────
    // 3. Connection Lines
    // ────────────────────────────────────────────
    const lineFolder = gui.addFolder('Connections');
    const lineControllers = [];
    const lineKeys = [
      'lineDashSize', 'lineGapSize', 'lineFlowSpeed', 'lineFlowSpeedHighlight',
      'lineOpacityHelixMin', 'lineOpacityHelixMax', 'lineOpacityParticleMin',
      'lineOpacityParticleMax', 'lineOpacityFocusedMin', 'lineOpacityFocusedMax',
      'lineOpacityDim', 'lineWidthHelixMin', 'lineWidthHelixMax',
      'lineWidthFocusedMin', 'lineWidthFocusedMax', 'lineWidthDim',
      'lineTintStrength', 'lineTintStrengthHighlight',
    ];
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineDashSize', 0.2, 6, 0.1).name('Dash Size')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineGapSize', 0.2, 6, 0.1).name('Gap Size')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineFlowSpeed', 0, 3, 0.05).name('Flow Speed')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineFlowSpeedHighlight', 0, 5, 0.1).name('Flow Speed (Focus)')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineOpacityHelixMin', 0, 0.3, 0.005).name('Helix Opacity Min')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineOpacityHelixMax', 0, 0.5, 0.005).name('Helix Opacity Max')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineOpacityParticleMin', 0, 0.2, 0.005).name('Particle Opacity Min')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineOpacityParticleMax', 0, 0.3, 0.005).name('Particle Opacity Max')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineOpacityFocusedMin', 0, 1, 0.01).name('Focused Opacity Min')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineOpacityFocusedMax', 0, 1, 0.01).name('Focused Opacity Max')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineOpacityDim', 0, 0.1, 0.001).name('Dim Opacity')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineWidthHelixMin', 0.1, 3, 0.1).name('Helix Width Min')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineWidthHelixMax', 0.1, 4, 0.1).name('Helix Width Max')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineWidthFocusedMin', 0.1, 5, 0.1).name('Focused Width Min')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineWidthFocusedMax', 0.1, 5, 0.1).name('Focused Width Max')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineWidthDim', 0.1, 2, 0.1).name('Dim Width')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineTintStrength', 0, 1, 0.01).name('Tint Strength')));
    lineControllers.push(tracked(lineFolder.add(cfg, 'lineTintStrengthHighlight', 0, 1, 0.01).name('Tint (Highlighted)')));
    lineFolder.add({ reset: () => resetKeys(lineKeys, lineControllers) }, 'reset').name('Reset Connections');
    lineFolder.close();

    // ────────────────────────────────────────────
    // 4. Nodes
    // ────────────────────────────────────────────
    const nodeFolder = gui.addFolder('Nodes');
    const nodeControllers = [];
    const nodeKeys = [
      'nodeBaseScale', 'nodeBrightnessBase', 'nodeBrightnessRange',
      'nodeFocusDim', 'nodeFocusBright', 'nodePulseAmpMin',
      'nodePulseAmpRange', 'nodePulseSpeed', 'nodePhaseSpread',
    ];
    nodeControllers.push(tracked(nodeFolder.add(cfg, 'nodeBaseScale', 0.2, 5.0, 0.1).name('Base Scale')));
    nodeControllers.push(tracked(nodeFolder.add(cfg, 'nodeBrightnessBase', 0, 2.0, 0.05).name('Brightness Base')));
    nodeControllers.push(tracked(nodeFolder.add(cfg, 'nodeBrightnessRange', 0, 3.0, 0.05).name('Brightness Range')));
    nodeControllers.push(tracked(nodeFolder.add(cfg, 'nodeFocusDim', 0, 1.0, 0.01).name('Focus Dim')));
    nodeControllers.push(tracked(nodeFolder.add(cfg, 'nodeFocusBright', 0.5, 3.0, 0.05).name('Focus Bright')));
    nodeControllers.push(tracked(nodeFolder.add(cfg, 'nodePulseAmpMin', 0, 0.2, 0.005).name('Pulse Amp Min')));
    nodeControllers.push(tracked(nodeFolder.add(cfg, 'nodePulseAmpRange', 0, 0.3, 0.005).name('Pulse Amp Range')));
    nodeControllers.push(tracked(nodeFolder.add(cfg, 'nodePulseSpeed', 0, 3.0, 0.05).name('Pulse Speed')));
    nodeControllers.push(tracked(nodeFolder.add(cfg, 'nodePhaseSpread', 0, 2.0, 0.05).name('Phase Spread')));
    nodeFolder.add({ reset: () => resetKeys(nodeKeys, nodeControllers) }, 'reset').name('Reset Nodes');
    nodeFolder.close();

    // ────────────────────────────────────────────
    // 5. Particles
    // ────────────────────────────────────────────
    const partFolder = gui.addFolder('Particles');
    const partControllers = [];
    const partKeys = [
      'particleSizeBase', 'particleSizeRange', 'particleOpacity',
      'particleOpacityFocused', 'particleOpacityTunnel',
      'particleDriftSpeedX', 'particleDriftSpeedY', 'particleDriftSpeedZ',
      'particleDriftAmplitudeX', 'particleDriftAmplitudeY', 'particleDriftAmplitudeZ',
    ];
    partControllers.push(tracked(partFolder.add(cfg, 'particleSizeBase', 1, 20, 0.5).name('Size Base')));
    partControllers.push(tracked(partFolder.add(cfg, 'particleSizeRange', 0, 20, 0.5).name('Size Range')));
    partControllers.push(tracked(partFolder.add(cfg, 'particleOpacity', 0, 1, 0.01).name('Opacity')));
    partControllers.push(tracked(partFolder.add(cfg, 'particleOpacityFocused', 0, 1, 0.01).name('Opacity (Focused)')));
    partControllers.push(tracked(partFolder.add(cfg, 'particleOpacityTunnel', 0, 1, 0.01).name('Opacity (Tunnel)')));
    partControllers.push(tracked(partFolder.add(cfg, 'particleDriftSpeedX', 0, 1, 0.01).name('Drift Speed X')));
    partControllers.push(tracked(partFolder.add(cfg, 'particleDriftSpeedY', 0, 1, 0.01).name('Drift Speed Y')));
    partControllers.push(tracked(partFolder.add(cfg, 'particleDriftSpeedZ', 0, 1, 0.01).name('Drift Speed Z')));
    partControllers.push(tracked(partFolder.add(cfg, 'particleDriftAmplitudeX', 0, 5, 0.1).name('Drift Amp X')));
    partControllers.push(tracked(partFolder.add(cfg, 'particleDriftAmplitudeY', 0, 5, 0.1).name('Drift Amp Y')));
    partControllers.push(tracked(partFolder.add(cfg, 'particleDriftAmplitudeZ', 0, 5, 0.1).name('Drift Amp Z')));
    partFolder.add({ reset: () => resetKeys(partKeys, partControllers) }, 'reset').name('Reset Particles');
    partFolder.close();

    // ────────────────────────────────────────────
    // 6. Helix Backbone
    // ────────────────────────────────────────────
    const helixFolder = gui.addFolder('Helix Backbone');
    const helixControllers = [];
    const helixKeys = [
      'strandColor0', 'strandColor1', 'strandOpacity', 'strandWidth',
      'rungColor', 'rungOpacity', 'rungWidth',
      'markerSizeBase', 'markerSizeRange', 'markerBrightnessBase', 'markerBrightnessRange',
    ];
    helixControllers.push(tracked(helixFolder.addColor(cfg, 'strandColor0').name('Strand 0 Color')));
    helixControllers.push(tracked(helixFolder.addColor(cfg, 'strandColor1').name('Strand 1 Color')));
    helixControllers.push(tracked(helixFolder.add(cfg, 'strandOpacity', 0, 1, 0.01).name('Strand Opacity')));
    helixControllers.push(tracked(helixFolder.add(cfg, 'strandWidth', 0.2, 6, 0.1).name('Strand Width')));
    helixControllers.push(tracked(helixFolder.addColor(cfg, 'rungColor').name('Rung Color')));
    helixControllers.push(tracked(helixFolder.add(cfg, 'rungOpacity', 0, 0.5, 0.01).name('Rung Opacity')));
    helixControllers.push(tracked(helixFolder.add(cfg, 'rungWidth', 0.1, 4, 0.1).name('Rung Width')));
    helixControllers.push(tracked(helixFolder.add(cfg, 'markerSizeBase', 0, 10, 0.5).name('Marker Size Base')));
    helixControllers.push(tracked(helixFolder.add(cfg, 'markerSizeRange', 0, 10, 0.5).name('Marker Size Range')));
    helixControllers.push(tracked(helixFolder.add(cfg, 'markerBrightnessBase', 0, 2, 0.05).name('Marker Brightness')));
    helixControllers.push(tracked(helixFolder.add(cfg, 'markerBrightnessRange', 0, 2, 0.05).name('Marker Brt. Range')));
    helixFolder.add({ reset: () => resetKeys(helixKeys, helixControllers) }, 'reset').name('Reset Backbone');
    helixFolder.close();

    // ────────────────────────────────────────────
    // 7. Starfield
    // ────────────────────────────────────────────
    const starFolder = gui.addFolder('Starfield');
    const starControllers = [];
    const starKeys = ['starCount', 'starRadius', 'starDepth', 'starBrightness', 'starTwinkleSpeed'];
    starControllers.push(tracked(starFolder.add(cfg, 'starCount', 0, 8000, 100).name('Count')));
    starControllers.push(tracked(starFolder.add(cfg, 'starRadius', 50, 500, 10).name('Radius')));
    starControllers.push(tracked(starFolder.add(cfg, 'starDepth', 10, 300, 10).name('Depth')));
    starControllers.push(tracked(starFolder.add(cfg, 'starBrightness', 0.5, 10, 0.5).name('Brightness')));
    starControllers.push(tracked(starFolder.add(cfg, 'starTwinkleSpeed', 0, 5, 0.1).name('Twinkle Speed')));
    starFolder.add({ reset: () => resetKeys(starKeys, starControllers) }, 'reset').name('Reset Starfield');
    starFolder.close();

    // ────────────────────────────────────────────
    // 8. Evidence Colors
    // ────────────────────────────────────────────
    const colorFolder = gui.addFolder('Evidence Colors');
    const colorControllers = [];
    const colorKeys = ['colorTemporal', 'colorSemantic', 'colorThematic', 'colorNarrative', 'colorSpatial'];
    colorControllers.push(tracked(colorFolder.addColor(cfg, 'colorTemporal').name('Temporal')));
    colorControllers.push(tracked(colorFolder.addColor(cfg, 'colorSemantic').name('Semantic')));
    colorControllers.push(tracked(colorFolder.addColor(cfg, 'colorThematic').name('Thematic')));
    colorControllers.push(tracked(colorFolder.addColor(cfg, 'colorNarrative').name('Narrative')));
    colorControllers.push(tracked(colorFolder.addColor(cfg, 'colorSpatial').name('Spatial')));
    colorFolder.add({ reset: () => resetKeys(colorKeys, colorControllers) }, 'reset').name('Reset Colors');
    colorFolder.close();

    // ────────────────────────────────────────────
    // Global Reset
    // ────────────────────────────────────────────
    gui.add({
      resetAll() {
        for (const [k, v] of Object.entries(CONSTELLATION_DEFAULTS)) {
          cfg[k] = v;
        }
        localStorage.removeItem(CONSTELLATION_CONFIG_KEY);
        // Update all controller displays
        const allControllers = [
          ...camControllers, ...dofControllers, ...ppControllers, ...lineControllers,
          ...nodeControllers, ...partControllers, ...helixControllers,
          ...starControllers, ...colorControllers,
        ];
        for (const c of allControllers) {
          try { c.updateDisplay(); } catch { /* skip */ }
        }
      },
    }, 'resetAll').name('Reset ALL to Defaults');

    // ── Export / Import ──
    gui.add({
      exportJSON() {
        const overrides = {};
        for (const [k, v] of Object.entries(cfg)) {
          if (CONSTELLATION_DEFAULTS[k] !== undefined && cfg[k] !== CONSTELLATION_DEFAULTS[k]) {
            overrides[k] = v;
          }
        }
        const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'constellation-config.json';
        a.click();
        URL.revokeObjectURL(url);
      },
    }, 'exportJSON').name('Export Config');

    // ── Undo / Redo buttons ──
    gui.add({ undo }, 'undo').name('↩ Undo (Ctrl+Z)');
    gui.add({ redo }, 'redo').name('↪ Redo (Ctrl+Shift+Z)');

    return () => {
      window.removeEventListener('keydown', handleUndoRedo);
      try { gui.destroy(); } catch { /* already destroyed */ }
      guiRef.current = null;
    };
  }, [parentGui]);

  return null;
}
