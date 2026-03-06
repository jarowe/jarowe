// sounds.js - Clean approach
const AudioContext = window.AudioContext || window.webkitAudioContext;
let ctx = null;

let isMuted = false;

export const setMuted = (muted) => {
    isMuted = muted;
};

export const getMuted = () => isMuted;

function getCtx() {
    if (!ctx) ctx = new AudioContext();
    return ctx;
}

export const playHoverSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') return; // Don't try if user hasn't interacted
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = 800;
        gain.gain.value = 0.05;
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
        osc.connect(gain).connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + 0.1);
    } catch (e) { }
};

export const playClickSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') {
            c.resume();
        }
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.value = 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        osc.connect(gain).connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + 0.15);
    } catch (e) { }
};

export const playBopSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') c.resume();
        const t = c.currentTime;
        // Punchy impact: frequency drop 300→100Hz
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain).connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.15);
        // Click noise layer
        const osc2 = c.createOscillator();
        const gain2 = c.createGain();
        osc2.type = 'square';
        osc2.frequency.value = 1200;
        gain2.gain.setValueAtTime(0.06, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc2.connect(gain2).connect(c.destination);
        osc2.start(t);
        osc2.stop(t + 0.05);
    } catch (e) { }
};

export const playPortalSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') c.resume();
        const t = c.currentTime;
        // Frequency sweep 200→800Hz over 400ms
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.4);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.1);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.55);
        // White noise whoosh (bandpass filtered)
        const bufferSize = c.sampleRate * 0.4;
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = c.createBufferSource();
        noise.buffer = buffer;
        const bpf = c.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.value = 2000;
        bpf.Q.value = 1.5;
        const noiseGain = c.createGain();
        noiseGain.gain.setValueAtTime(0.001, t);
        noiseGain.gain.linearRampToValueAtTime(0.06, t + 0.15);
        noiseGain.gain.linearRampToValueAtTime(0.001, t + 0.45);
        noise.connect(bpf).connect(noiseGain).connect(c.destination);
        noise.start(t);
        noise.stop(t + 0.5);
    } catch (e) { }
};

export const playBirthdaySound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') c.resume();
        const t = c.currentTime;
        // Happy birthday melody: C-C-D-C-F-E
        const notes = [
            { freq: 523.25, start: 0, dur: 0.2 },      // C5
            { freq: 523.25, start: 0.25, dur: 0.2 },    // C5
            { freq: 587.33, start: 0.5, dur: 0.3 },     // D5
            { freq: 523.25, start: 0.8, dur: 0.3 },     // C5
            { freq: 698.46, start: 1.1, dur: 0.3 },     // F5
            { freq: 659.25, start: 1.4, dur: 0.5 },     // E5
        ];
        notes.forEach(({ freq, start, dur }) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.12, t + start);
            gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
            osc.connect(gain).connect(c.destination);
            osc.start(t + start);
            osc.stop(t + start + dur + 0.05);
        });
        // Sparkle shimmer overlay
        const shimmer = c.createOscillator();
        const shimGain = c.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(2000, t);
        shimmer.frequency.exponentialRampToValueAtTime(4000, t + 1.8);
        shimGain.gain.setValueAtTime(0.02, t);
        shimGain.gain.linearRampToValueAtTime(0.04, t + 0.5);
        shimGain.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
        shimmer.connect(shimGain).connect(c.destination);
        shimmer.start(t);
        shimmer.stop(t + 2);
    } catch (e) { }
};

export const playComboSound = (comboLevel = 1) => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') c.resume();
        const t = c.currentTime;
        const freq = 400 + Math.min(comboLevel, 20) * 80;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.12);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain).connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.25);
        // Shimmer overtone
        const osc2 = c.createOscillator();
        const gain2 = c.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;
        gain2.gain.setValueAtTime(0.04, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc2.connect(gain2).connect(c.destination);
        osc2.start(t);
        osc2.stop(t + 0.2);
    } catch (e) { }
};

export const playChatSendSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') return;
        const t = c.currentTime;
        // Gentle ascending chime — two notes
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.setValueAtTime(1108, t + 0.08);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain).connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    } catch (e) { }
};

export const playChatReceiveSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') return;
        const t = c.currentTime;
        // Soft descending sparkle — three notes
        const notes = [
            { freq: 1318, start: 0, dur: 0.1 },     // E6
            { freq: 1108, start: 0.06, dur: 0.1 },   // C#6
            { freq: 880, start: 0.12, dur: 0.15 },    // A5
        ];
        notes.forEach(({ freq, start, dur }) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.05, t + start);
            gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
            osc.connect(gain).connect(c.destination);
            osc.start(t + start);
            osc.stop(t + start + dur + 0.02);
        });
    } catch (e) { }
};

export const playTourTransitionSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') return;
        const t = c.currentTime;
        // Gentle ascending sweep 400→700Hz
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(700, t + 0.4);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.07, t + 0.1);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.55);
        // Subtle white noise overlay
        const bufferSize = Math.floor(c.sampleRate * 0.35);
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = c.createBufferSource();
        noise.buffer = buffer;
        const bpf = c.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.value = 1500;
        bpf.Q.value = 2;
        const noiseGain = c.createGain();
        noiseGain.gain.setValueAtTime(0.001, t);
        noiseGain.gain.linearRampToValueAtTime(0.025, t + 0.12);
        noiseGain.gain.linearRampToValueAtTime(0.001, t + 0.4);
        noise.connect(bpf).connect(noiseGain).connect(c.destination);
        noise.start(t);
        noise.stop(t + 0.45);
    } catch (e) { }
};

export const playTourCompleteSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') c.resume();
        const t = c.currentTime;
        // Triumphant C5-E5-G5-C6 arpeggio
        const notes = [
            { freq: 523.25, start: 0, dur: 0.4 },     // C5
            { freq: 659.25, start: 0.2, dur: 0.4 },    // E5
            { freq: 783.99, start: 0.4, dur: 0.4 },    // G5
            { freq: 1046.5, start: 0.6, dur: 0.6 },    // C6
        ];
        notes.forEach(({ freq, start, dur }) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, t + start);
            gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
            osc.connect(gain).connect(c.destination);
            osc.start(t + start);
            osc.stop(t + start + dur + 0.05);
        });
        // Shimmer overtone
        const shimmer = c.createOscillator();
        const shimGain = c.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(2093, t + 0.3);
        shimmer.frequency.exponentialRampToValueAtTime(3000, t + 1.2);
        shimGain.gain.setValueAtTime(0.02, t + 0.3);
        shimGain.gain.linearRampToValueAtTime(0.035, t + 0.6);
        shimGain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
        shimmer.connect(shimGain).connect(c.destination);
        shimmer.start(t + 0.3);
        shimmer.stop(t + 1.4);
    } catch (e) { }
};

export const playTourEntranceSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') c.resume();
        const t = c.currentTime;
        // Deep cinematic whoosh — low sine sweep 100→300Hz
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.8);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.2);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        osc.connect(gain).connect(c.destination);
        osc.start(t);
        osc.stop(t + 1.05);
        // Filtered white noise whoosh (bandpass sweep)
        const bufferSize = Math.floor(c.sampleRate * 0.9);
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = c.createBufferSource();
        noise.buffer = buffer;
        const bpf = c.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.setValueAtTime(800, t);
        bpf.frequency.exponentialRampToValueAtTime(2500, t + 0.7);
        bpf.Q.value = 1.2;
        const noiseGain = c.createGain();
        noiseGain.gain.setValueAtTime(0.001, t);
        noiseGain.gain.linearRampToValueAtTime(0.07, t + 0.15);
        noiseGain.gain.linearRampToValueAtTime(0.04, t + 0.5);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        noise.connect(bpf).connect(noiseGain).connect(c.destination);
        noise.start(t);
        noise.stop(t + 0.95);
        // Rising shimmer overtone
        const shimmer = c.createOscillator();
        const shimGain = c.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(1200, t + 0.2);
        shimmer.frequency.exponentialRampToValueAtTime(2400, t + 0.9);
        shimGain.gain.setValueAtTime(0.001, t + 0.2);
        shimGain.gain.linearRampToValueAtTime(0.03, t + 0.4);
        shimGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        shimmer.connect(shimGain).connect(c.destination);
        shimmer.start(t + 0.2);
        shimmer.stop(t + 1.05);
    } catch (e) { }
};

export const playTourExitSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') return;
        const t = c.currentTime;
        // Deep descending whoosh — sub-bass sweep 350→60Hz with longer tail
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 1.0);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
        osc.connect(gain).connect(c.destination);
        osc.start(t);
        osc.stop(t + 1.15);
        // Descending filtered noise whoosh (3000→400Hz sweep — wider range)
        const bufferSize = Math.floor(c.sampleRate * 1.0);
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = c.createBufferSource();
        noise.buffer = buffer;
        const bpf = c.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.setValueAtTime(3000, t);
        bpf.frequency.exponentialRampToValueAtTime(400, t + 0.9);
        bpf.Q.value = 1.0;
        const noiseGain = c.createGain();
        noiseGain.gain.setValueAtTime(0.07, t);
        noiseGain.gain.linearRampToValueAtTime(0.04, t + 0.35);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        noise.connect(bpf).connect(noiseGain).connect(c.destination);
        noise.start(t);
        noise.stop(t + 1.05);
        // Fading shimmer overtone (descending 2400→600Hz)
        const shimmer = c.createOscillator();
        const shimGain = c.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(2400, t);
        shimmer.frequency.exponentialRampToValueAtTime(600, t + 0.9);
        shimGain.gain.setValueAtTime(0.03, t);
        shimGain.gain.linearRampToValueAtTime(0.015, t + 0.4);
        shimGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        shimmer.connect(shimGain).connect(c.destination);
        shimmer.start(t);
        shimmer.stop(t + 1.05);
        // Sub-bass resonance — felt more than heard, adds weight
        const sub = c.createOscillator();
        const subGain = c.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(80, t);
        sub.frequency.exponentialRampToValueAtTime(40, t + 0.8);
        subGain.gain.setValueAtTime(0.1, t + 0.1);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        sub.connect(subGain).connect(c.destination);
        sub.start(t + 0.1);
        sub.stop(t + 0.95);
    } catch (e) { }
};

export const playBalloonPopSound = () => {
    if (isMuted) return;
    try {
        const c = getCtx();
        if (c.state === 'suspended') c.resume();
        const t = c.currentTime;
        // White noise burst (pop)
        const bufferSize = Math.floor(c.sampleRate * 0.08);
        const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = c.createBufferSource();
        noise.buffer = buffer;
        const hpf = c.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 3000;
        const popGain = c.createGain();
        popGain.gain.setValueAtTime(0.3, t);
        popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        noise.connect(hpf).connect(popGain).connect(c.destination);
        noise.start(t);
        noise.stop(t + 0.08);
        // Pitch drop thud
        const thud = c.createOscillator();
        const thudGain = c.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(400, t);
        thud.frequency.exponentialRampToValueAtTime(80, t + 0.15);
        thudGain.gain.setValueAtTime(0.15, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        thud.connect(thudGain).connect(c.destination);
        thud.start(t);
        thud.stop(t + 0.2);
    } catch (e) { }
};
