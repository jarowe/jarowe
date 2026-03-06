#!/usr/bin/env node
/**
 * Content Audit Script
 *
 * Scans constellation.graph.json and flags content that may need review.
 * Merges flags into curation.json (additive — never removes existing flags).
 *
 * Usage:
 *   node pipeline/audit/content-audit.mjs            # merge flags into curation.json
 *   node pipeline/audit/content-audit.mjs --dry-run   # print summary only
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const GRAPH_PATH = resolve(ROOT, 'public/data/constellation.graph.json');
const CURATION_PATH = resolve(ROOT, 'curation.json');

const dryRun = process.argv.includes('--dry-run');

// ─── Persona allowlist ──────────────────────────────────────────────────
// Names that are fine to appear (Jared's immediate family + himself)
const ALLOWED_NAMES = new Set([
  'jared', 'jared rowe', 'rowe',
  'maria', 'maria rowe',
  'derek', 'derek rowe',
  'jace', 'gatlin', 'jole',
]);

// Common words that look like names but aren't
const FALSE_POSITIVES = new Set([
  'friend', 'friends', 'family', 'mom', 'dad', 'brother', 'wife', 'husband',
  'son', 'sons', 'daughter', 'kids', 'children', 'bro', 'sis', 'buddy',
  'guy', 'man', 'woman', 'girl', 'boy', 'baby', 'everyone', 'someone',
  'anyone', 'people', 'folks', 'crew', 'team', 'group',
]);

const FLAG_TYPES = [
  'third-party-mention',
  'trivial-content',
  'media-only',
  'low-quality',
  'sensitive',
  'needs-review',
];

// ─── Load data ──────────────────────────────────────────────────────────

const graph = JSON.parse(readFileSync(GRAPH_PATH, 'utf8'));
const nodes = graph.nodes || [];

let curation;
try {
  curation = JSON.parse(readFileSync(CURATION_PATH, 'utf8'));
} catch {
  curation = { hidden: [], visibility_overrides: {}, flags: {}, significance_overrides: {} };
}
if (!curation.flags) curation.flags = {};

// ─── Audit logic ────────────────────────────────────────────────────────

const newFlags = {}; // nodeId → flag[]
const today = new Date().toISOString().slice(0, 10);

function addFlag(nodeId, type, note) {
  if (!newFlags[nodeId]) newFlags[nodeId] = [];
  // Avoid duplicate flag types for the same node
  if (newFlags[nodeId].some(f => f.type === type)) return;
  newFlags[nodeId].push({ type, note, createdAt: today, source: 'audit' });
}

/**
 * Check description text for third-party names.
 * Looks for capitalized words that appear to be proper names
 * not in the allowlist.
 */
function checkThirdPartyNames(node) {
  const text = [node.description || '', node.title || ''].join(' ');

  // Check entities.people first
  const people = node.entities?.people || [];
  for (const name of people) {
    const lower = name.toLowerCase().trim();
    if (!ALLOWED_NAMES.has(lower) && !FALSE_POSITIVES.has(lower)) {
      addFlag(node.id, 'third-party-mention', `Entity: "${name}"`);
      return;
    }
  }

  // Scan for @mentions or "with [Name]" patterns
  const mentionPattern = /@(\w+)/g;
  let match;
  while ((match = mentionPattern.exec(text)) !== null) {
    const name = match[1].toLowerCase();
    if (!ALLOWED_NAMES.has(name) && !FALSE_POSITIVES.has(name)) {
      addFlag(node.id, 'third-party-mention', `@mention: "${match[1]}"`);
      return;
    }
  }

  // Look for "with [Capitalized Name]" patterns in longer descriptions
  if (text.length > 30) {
    const withPattern = /\bwith\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
    while ((match = withPattern.exec(text)) !== null) {
      const name = match[1].toLowerCase().trim();
      if (!ALLOWED_NAMES.has(name) && !FALSE_POSITIVES.has(name)) {
        addFlag(node.id, 'third-party-mention', `"with ${match[1]}"`);
        return;
      }
    }
  }
}

function checkTrivialContent(node) {
  const desc = (node.description || '').trim();
  const hasMedia = (node.media?.length || 0) > 0;

  if (desc.length < 30 && !hasMedia) {
    addFlag(node.id, 'trivial-content', `Description: ${desc.length} chars, no media`);
  }
}

function checkMediaOnly(node) {
  const desc = (node.description || '').trim();
  const hasMedia = (node.media?.length || 0) > 0;

  if (hasMedia && desc.length < 30) {
    addFlag(node.id, 'media-only', `${node.media.length} media item(s), description: ${desc.length} chars`);
  }
}

function checkLowQuality(node) {
  if (node.source !== 'carbonmade') return;
  const desc = (node.description || '').trim();
  // Carbonmade banner images without meaningful descriptions
  if (node.id.startsWith('cm-b-') && desc.length < 50 && (node.media?.length || 0) === 0) {
    addFlag(node.id, 'low-quality', 'Carbonmade banner with minimal description and no media');
  }
}

// ─── Run audit ──────────────────────────────────────────────────────────

for (const node of nodes) {
  checkThirdPartyNames(node);
  checkTrivialContent(node);
  checkMediaOnly(node);
  checkLowQuality(node);
}

// ─── Summary ────────────────────────────────────────────────────────────

const flaggedCount = Object.keys(newFlags).length;
const byCounts = {};
for (const flags of Object.values(newFlags)) {
  for (const f of flags) {
    byCounts[f.type] = (byCounts[f.type] || 0) + 1;
  }
}

console.log('\n=== Content Audit Results ===\n');
console.log(`Total nodes scanned: ${nodes.length}`);
console.log(`Nodes flagged: ${flaggedCount}`);
console.log('');
console.log('Flags by type:');
for (const type of FLAG_TYPES) {
  if (byCounts[type]) console.log(`  ${type}: ${byCounts[type]}`);
}

// Show samples of each type
console.log('\nSamples:');
const shown = {};
for (const [nodeId, flags] of Object.entries(newFlags)) {
  for (const f of flags) {
    if (!shown[f.type]) shown[f.type] = 0;
    if (shown[f.type] < 3) {
      const node = nodes.find(n => n.id === nodeId);
      console.log(`  [${f.type}] ${nodeId} — ${(node?.title || '').substring(0, 60)}`);
      console.log(`    ${f.note}`);
      shown[f.type]++;
    }
  }
}

if (dryRun) {
  console.log('\n(dry run — no changes written)\n');
  process.exit(0);
}

// ─── Merge into curation.json ───────────────────────────────────────────

let added = 0;
for (const [nodeId, flags] of Object.entries(newFlags)) {
  if (!curation.flags[nodeId]) curation.flags[nodeId] = [];
  for (const flag of flags) {
    // Skip if this exact flag type already exists from a previous audit
    const exists = curation.flags[nodeId].some(
      f => f.type === flag.type && f.source === 'audit'
    );
    if (!exists) {
      curation.flags[nodeId].push(flag);
      added++;
    }
  }
}

writeFileSync(CURATION_PATH, JSON.stringify(curation, null, 2) + '\n', 'utf8');
console.log(`\nMerged ${added} new flags into curation.json`);
console.log('');
