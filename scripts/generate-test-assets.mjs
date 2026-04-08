// Usage: node scripts/generate-test-assets.mjs
//
// Generates minimal test assets for the memory capsule pipeline.
// Creates public/memory/test-capsule/ with:
//   - photo.png  (64x64 RGB color gradient)
//   - depth.png  (64x64 grayscale vertical gradient)
//   - preview.jpg (minimal valid JPEG)
//
// Uses only Node.js built-ins (fs, path, zlib). No external dependencies.

import { mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { deflateSync } from 'zlib';

const outDir = resolve(process.cwd(), 'public', 'memory', 'test-capsule');
mkdirSync(outDir, { recursive: true });

// ── PNG helpers ─────────────────────────────────────────────────────────────

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buf) {
  // CRC-32 lookup table
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

function buildIHDR(width, height, bitDepth, colorType) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = bitDepth;   // bit depth
  data[9] = colorType;  // 0=grayscale, 2=RGB
  data[10] = 0;         // compression
  data[11] = 0;         // filter
  data[12] = 0;         // interlace
  return pngChunk('IHDR', data);
}

function buildIDAT(rawScanlines) {
  const compressed = deflateSync(rawScanlines);
  return pngChunk('IDAT', compressed);
}

function buildIEND() {
  return pngChunk('IEND', Buffer.alloc(0));
}

// ── Generate photo.png (64x64 RGB, color gradient) ──────────────────────────

const W = 64;
const H = 64;

function generatePhotoPng() {
  // Build raw scanlines: filter byte 0 + RGB pixels per row
  const scanlines = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const rowOffset = y * (1 + W * 3);
    scanlines[rowOffset] = 0; // filter: None
    for (let x = 0; x < W; x++) {
      const px = rowOffset + 1 + x * 3;
      // Simple gradient: R from left, G from top, B constant
      scanlines[px + 0] = Math.floor((x / (W - 1)) * 255); // R
      scanlines[px + 1] = Math.floor((y / (H - 1)) * 255); // G
      scanlines[px + 2] = 128;                               // B
    }
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    buildIHDR(W, H, 8, 2), // 8-bit RGB
    buildIDAT(scanlines),
    buildIEND(),
  ]);
}

// ── Generate depth.png (64x64 grayscale, vertical gradient) ─────────────────

function generateDepthPng() {
  // Build raw scanlines: filter byte 0 + 1 gray byte per pixel per row
  const scanlines = Buffer.alloc(H * (1 + W));
  for (let y = 0; y < H; y++) {
    const rowOffset = y * (1 + W);
    scanlines[rowOffset] = 0; // filter: None
    const gray = Math.floor((y / (H - 1)) * 255); // black at top, white at bottom
    for (let x = 0; x < W; x++) {
      scanlines[rowOffset + 1 + x] = gray;
    }
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    buildIHDR(W, H, 8, 0), // 8-bit grayscale
    buildIDAT(scanlines),
    buildIEND(),
  ]);
}

// ── Generate preview.jpg (minimal valid JPEG) ───────────────────────────────

function generateMinimalJpeg() {
  // Minimal valid JPEG: 8x8 solid gray
  // This is a known-valid minimal JPEG byte sequence
  return Buffer.from([
    // SOI
    0xFF, 0xD8,
    // APP0 (JFIF)
    0xFF, 0xE0, 0x00, 0x10,
    0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // version 1.1
    0x00,       // aspect ratio units: none
    0x00, 0x01, // X density
    0x00, 0x01, // Y density
    0x00, 0x00, // thumbnail W, H
    // DQT (quantization table)
    0xFF, 0xDB, 0x00, 0x43, 0x00,
    // 64 quantization values (all 1 for simplicity)
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    // SOF0 (Start of Frame, baseline, 8x8, 1 component, grayscale)
    0xFF, 0xC0, 0x00, 0x0B,
    0x08,       // precision: 8 bits
    0x00, 0x08, // height: 8
    0x00, 0x08, // width: 8
    0x01,       // 1 component
    0x01,       // component ID: 1
    0x11,       // sampling: 1x1
    0x00,       // quant table: 0
    // DHT (Huffman table - DC)
    0xFF, 0xC4, 0x00, 0x1F, 0x00,
    // DC table: counts for codes of length 1-16
    0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    // DC values
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B,
    // DHT (Huffman table - AC)
    0xFF, 0xC4, 0x00, 0xB5, 0x10,
    // AC table: counts for codes of length 1-16
    0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04, 0x03,
    0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
    // AC values (162 values — standard luminance AC Huffman)
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12,
    0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
    0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
    0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0,
    0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0A, 0x16,
    0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
    0x3A, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
    0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
    0x6A, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79,
    0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98,
    0x99, 0x9A, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7,
    0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
    0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5,
    0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xD2, 0xD3, 0xD4,
    0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
    0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA,
    0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8,
    0xF9, 0xFA,
    // SOS (Start of Scan)
    0xFF, 0xDA, 0x00, 0x08,
    0x01,       // 1 component
    0x01,       // component 1
    0x00,       // DC/AC table: 0/0
    0x00, 0x3F, 0x00, // spectral selection
    // Scan data: encode 64 zeros (DC=0, then EOB)
    // DC: code for value 0 is '00' (2 bits)
    // AC: EOB is '1010' (4 bits) → pad to byte: 0b00101000 = 0x28, pad 0xFF...
    0x28, 0xA0,
    // EOI
    0xFF, 0xD9,
  ]);
}

// ── Write files ─────────────────────────────────────────────────────────────

const photoBuf = generatePhotoPng();
const depthBuf = generateDepthPng();
const jpegBuf = generateMinimalJpeg();

writeFileSync(join(outDir, 'photo.png'), photoBuf);
writeFileSync(join(outDir, 'depth.png'), depthBuf);
writeFileSync(join(outDir, 'preview.jpg'), jpegBuf);

console.log('Generated test capsule assets:');
console.log(`  photo.png   ${photoBuf.length} bytes (${W}x${H} RGB)`);
console.log(`  depth.png   ${depthBuf.length} bytes (${W}x${H} grayscale)`);
console.log(`  preview.jpg ${jpegBuf.length} bytes (8x8 minimal JPEG)`);
console.log(`  Total:      ${photoBuf.length + depthBuf.length + jpegBuf.length} bytes`);
console.log(`  Output:     ${outDir}`);
