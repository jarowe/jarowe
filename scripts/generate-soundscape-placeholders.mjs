#!/usr/bin/env node
/**
 * generate-soundscape-placeholders.mjs
 *
 * Generates minimal placeholder MP3 files for soundscape development.
 * These are simple synthesized tones — NOT production-quality ambient audio.
 * Replace them with real field recordings or high-quality synthesized soundscapes.
 *
 * Usage:
 *   node scripts/generate-soundscape-placeholders.mjs
 *
 * Output:
 *   public/audio/soundscapes/syros-cave-drone.mp3
 *   public/audio/soundscapes/syros-cave-water.mp3
 *   public/audio/soundscapes/syros-cave-drips.mp3
 *
 * Since we cannot use OfflineAudioContext in Node.js without native modules,
 * this script generates raw PCM WAV files using pure math, then the files
 * serve as functional placeholders that Howler.js can load.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'audio', 'soundscapes');

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

const SAMPLE_RATE = 44100;
const CHANNELS = 1; // Mono for smaller file size on placeholders

/**
 * Create a WAV file buffer from Float32 PCM samples.
 */
function createWavBuffer(samples, sampleRate = SAMPLE_RATE, channels = CHANNELS) {
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // chunk size
  buffer.writeUInt16LE(1, offset); offset += 2;  // PCM format
  buffer.writeUInt16LE(channels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(sampleRate * blockAlign, offset); offset += 4; // byte rate
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Write PCM samples (clamp to 16-bit range)
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const intSample = Math.round(clamped * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

/**
 * Generate a low drone tone — deep sine wave with slow LFO modulation.
 * Simulates cave resonance / room tone.
 */
function generateDrone(durationSec = 30) {
  const numSamples = SAMPLE_RATE * durationSec;
  const samples = new Float32Array(numSamples);

  const baseFreq = 85;     // Low fundamental (cave resonance)
  const lfoFreq = 0.15;    // Slow wobble
  const lfoDepth = 8;      // Hz variation

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const lfo = Math.sin(2 * Math.PI * lfoFreq * t) * lfoDepth;
    const freq = baseFreq + lfo;

    // Layer: fundamental + soft overtone
    const fundamental = Math.sin(2 * Math.PI * freq * t) * 0.4;
    const overtone = Math.sin(2 * Math.PI * freq * 2.01 * t) * 0.15;
    const subHarmonic = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.2;

    // Fade in/out for seamless looping
    let envelope = 1;
    const fadeSamples = SAMPLE_RATE * 0.5;
    if (i < fadeSamples) envelope = i / fadeSamples;
    if (i > numSamples - fadeSamples) envelope = (numSamples - i) / fadeSamples;

    samples[i] = (fundamental + overtone + subHarmonic) * envelope * 0.6;
  }

  return samples;
}

/**
 * Generate water lapping texture — filtered noise with rhythmic amplitude modulation.
 * Simulates gentle water movement in an enclosed space.
 */
function generateWater(durationSec = 30) {
  const numSamples = SAMPLE_RATE * durationSec;
  const samples = new Float32Array(numSamples);

  // Simple low-pass filter state
  let prevSample = 0;
  const filterCoeff = 0.985; // Strong low-pass (muffled water)

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Noise source
    const noise = (Math.random() * 2 - 1);

    // Low-pass filter
    const filtered = prevSample * filterCoeff + noise * (1 - filterCoeff);
    prevSample = filtered;

    // Rhythmic amplitude modulation (irregular wave-like pattern)
    const wave1 = Math.sin(2 * Math.PI * 0.3 * t) * 0.5 + 0.5;  // ~3.3s period
    const wave2 = Math.sin(2 * Math.PI * 0.17 * t) * 0.3 + 0.5;  // ~5.9s period
    const wave3 = Math.sin(2 * Math.PI * 0.07 * t) * 0.2 + 0.5;  // ~14s period
    const amplitude = (wave1 * wave2 * wave3);

    // Fade in/out for seamless looping
    let envelope = 1;
    const fadeSamples = SAMPLE_RATE * 0.5;
    if (i < fadeSamples) envelope = i / fadeSamples;
    if (i > numSamples - fadeSamples) envelope = (numSamples - i) / fadeSamples;

    samples[i] = filtered * amplitude * envelope * 0.5;
  }

  return samples;
}

/**
 * Generate drip detail layer — occasional short percussive tones with reverb tail.
 * Simulates water dripping from a cave ceiling.
 */
function generateDrips(durationSec = 30) {
  const numSamples = SAMPLE_RATE * durationSec;
  const samples = new Float32Array(numSamples);

  // Schedule random drips
  const drips = [];
  let time = 0.5; // Start after 0.5s
  while (time < durationSec - 1) {
    drips.push({
      startSample: Math.floor(time * SAMPLE_RATE),
      freq: 800 + Math.random() * 1200, // 800-2000 Hz (high ping)
      decay: 0.15 + Math.random() * 0.2,  // 150-350ms decay
      amplitude: 0.2 + Math.random() * 0.3,
    });
    time += 1.5 + Math.random() * 4; // 1.5-5.5s between drips
  }

  for (const drip of drips) {
    const dripSamples = Math.floor(drip.decay * SAMPLE_RATE);
    for (let j = 0; j < dripSamples && drip.startSample + j < numSamples; j++) {
      const t = j / SAMPLE_RATE;
      const env = Math.exp(-t / (drip.decay * 0.3)); // Exponential decay
      const tone = Math.sin(2 * Math.PI * drip.freq * t);
      // Pitch drops slightly during decay (water drip characteristic)
      const pitchDrop = Math.sin(2 * Math.PI * (drip.freq * 0.7) * t) * 0.3;
      samples[drip.startSample + j] += (tone + pitchDrop) * env * drip.amplitude;
    }
  }

  // Global fade in/out
  const fadeSamples = SAMPLE_RATE * 0.3;
  for (let i = 0; i < fadeSamples; i++) {
    samples[i] *= i / fadeSamples;
  }
  for (let i = numSamples - fadeSamples; i < numSamples; i++) {
    samples[i] *= (numSamples - i) / fadeSamples;
  }

  return samples;
}

// Generate all three layers
console.log('Generating soundscape placeholders...');

const layers = [
  { name: 'syros-cave-drone', generator: generateDrone, duration: 30 },
  { name: 'syros-cave-water', generator: generateWater, duration: 30 },
  { name: 'syros-cave-drips', generator: generateDrips, duration: 30 },
];

for (const { name, generator, duration } of layers) {
  const samples = generator(duration);
  const wavBuffer = createWavBuffer(samples);
  // Write as .wav — Howler.js can play WAV files natively.
  // The memoryScenes config references .mp3 but Howler falls back gracefully.
  // For production, convert these WAVs to MP3 or replace with real recordings.
  const wavPath = join(OUTPUT_DIR, `${name}.wav`);
  writeFileSync(wavPath, wavBuffer);
  const sizeMB = (wavBuffer.length / 1024 / 1024).toFixed(2);
  console.log(`  Created: ${wavPath} (${sizeMB} MB, ${duration}s)`);
}

console.log('\nPlaceholder audio files generated.');
console.log('NOTE: These are simple synthesized tones for development.');
console.log('Replace with real ambient recordings for production.');
console.log('\nThe memoryScenes config references .mp3 files.');
console.log('For production, either:');
console.log('  1. Convert these WAVs to MP3 (ffmpeg -i input.wav -b:a 128k output.mp3)');
console.log('  2. Replace with real high-quality MP3 recordings');
