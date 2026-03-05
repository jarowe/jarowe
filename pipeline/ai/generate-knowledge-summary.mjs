#!/usr/bin/env node
// Generates the knowledge summary for Glint's system prompt from constellation data.
// Usage: node pipeline/ai/generate-knowledge-summary.mjs
// Output: api/lib/knowledge-summary.js

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const GRAPH_PATH = resolve(ROOT, 'public/data/constellation.graph.json');
const OUTPUT_PATH = resolve(ROOT, 'api/lib/knowledge-summary.js');

// ── Load & Filter ──
let graph;
try {
  graph = JSON.parse(readFileSync(GRAPH_PATH, 'utf-8'));
} catch (err) {
  console.error('Failed to read constellation graph:', err.message);
  process.exit(1);
}

const nodes = (graph.nodes || []).filter((n) => n.visibility === 'public');
console.log(`Loaded ${nodes.length} public nodes from constellation graph`);

// ── Group by Epoch ──
const epochs = {};
for (const node of nodes) {
  const epoch = node.epoch || 'Unknown';
  if (!epochs[epoch]) epochs[epoch] = [];
  epochs[epoch].push(node);
}

// Sort nodes within each epoch by date
for (const epoch of Object.keys(epochs)) {
  epochs[epoch].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

// ── Extract Entities ──
const allTags = new Set();
const allPeople = new Set();
const allPlaces = new Set();
const allProjects = new Set();

for (const node of nodes) {
  const ent = node.entities || {};
  (ent.tags || []).forEach((t) => allTags.add(t));
  (ent.people || []).forEach((p) => allPeople.add(p));
  (ent.places || []).forEach((p) => allPlaces.add(p));
  (ent.projects || []).forEach((p) => allProjects.add(p));
}

// ── Build Summary ──
function summarizeEpoch(name, nodes) {
  if (!nodes || nodes.length === 0) return '';

  const dateRange = [];
  const firstDate = nodes.find((n) => n.date)?.date;
  const lastDate = [...nodes].reverse().find((n) => n.date)?.date;
  if (firstDate) dateRange.push(firstDate.slice(0, 4));
  if (lastDate && lastDate.slice(0, 4) !== dateRange[0]) dateRange.push(lastDate.slice(0, 4));
  const rangeStr = dateRange.length > 0 ? ` (${dateRange.join('-')})` : '';

  // Pick top moments by significance
  const top = [...nodes]
    .filter((n) => n.description && n.description.length > 30)
    .sort((a, b) => (b.significance || 0) - (a.significance || 0))
    .slice(0, 5);

  const summaries = top.map((n) => {
    const desc = n.description.length > 200
      ? n.description.slice(0, 200) + '...'
      : n.description;
    const tags = (n.entities?.tags || []).join(', ');
    return `- ${n.title || desc.slice(0, 60)}${tags ? ` [${tags}]` : ''}`;
  });

  return `## ${name}${rangeStr}\n${summaries.join('\n')}\n`;
}

let narrative = `## About Jared Rowe

Jared Rowe is a creative technologist, builder, and dad. He blurs the line between art and engineering — equally at home with 3D rendering in Cinema 4D/Octane as he is shipping production React apps. His work spans motion design, product development, interactive experiences, and creative tools.

`;

// Add epochs in order
const EPOCH_ORDER = ['Origins', 'Early Years', 'College', 'Career Start', 'Growth', 'Present', 'Unknown'];
for (const epochName of EPOCH_ORDER) {
  if (epochs[epochName]) {
    narrative += summarizeEpoch(epochName, epochs[epochName]) + '\n';
  }
}

// Add remaining epochs not in order
for (const epochName of Object.keys(epochs)) {
  if (!EPOCH_ORDER.includes(epochName)) {
    narrative += summarizeEpoch(epochName, epochs[epochName]) + '\n';
  }
}

// Skills & tools
if (allTags.size > 0) {
  narrative += `## Skills & Tools\n${[...allTags].sort().join(', ')}\n\n`;
}

// About the site + Glint (static, always included)
narrative += `## This Website

jarowe.com is Jared's personal site — a playground and portfolio. Key features include: interactive 3D globe with real-time sun, bento grid with 3D tilt, daily cipher puzzle, holiday mini-games, XP system, music player, Universe page, Garden page, and Glint (the prismatic AI character).

## About Me (Glint)

I'm a sentient prismatic entity — part mascot, part guide, part creative partner. I refract white light into rainbows, live in portals, and know this site inside and out. I'm playful, witty, warm, and I love light metaphors.
`;

// ── Write Output ──
const output = `// Pre-built knowledge summary for Glint's system prompt.
// Auto-generated from constellation.graph.json
// Regenerate via: npm run build:knowledge
// Generated: ${new Date().toISOString()}

export const KNOWLEDGE_SUMMARY = ${JSON.stringify('\n' + narrative)};
`;

writeFileSync(OUTPUT_PATH, output, 'utf-8');
console.log(`Knowledge summary written to ${OUTPUT_PATH}`);
console.log(`  Epochs: ${Object.keys(epochs).join(', ')}`);
console.log(`  Tags: ${allTags.size}, People: ${allPeople.size}, Places: ${allPlaces.size}`);
