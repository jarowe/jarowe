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
