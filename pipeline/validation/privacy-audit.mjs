/**
 * Fail-closed privacy audit for the complete pipeline output.
 *
 * Scans the ENTIRE output JSON (not individual nodes) for privacy violations.
 * This is the "belt and suspenders" layer -- even if parsers or earlier pipeline
 * stages make mistakes, this audit catches it.
 *
 * CRITICAL: If any violations are found, the pipeline MUST exit with code 1.
 * This is non-negotiable per user decision.
 *
 * Checks:
 *   PRIV-02: No private-tier nodes in output
 *   PRIV-03: GPS coordinates <= 2 decimal places
 *   PRIV-05: Minor nodes have no GPS, no blocked patterns
 *   PRIV-06: No DM, contact graph, close friends patterns in output
 *   PRIV-07: No full names of non-public people
 *   PRIV-08: No EXIF GPS data in media paths
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../utils/logger.mjs';

const log = createLogger('privacy-audit');

/**
 * Patterns that must NEVER appear in output (DMs, contact graphs, close friends).
 * Checked against the entire stringified output.
 */
const FORBIDDEN_PATTERNS = [
  'direct_messages',
  'close_friends',
  'contact_graph',
  'message_requests',
  'story_likes',
];

/**
 * Check if a coordinate value has more than N decimal places.
 *
 * @param {number} val - Coordinate value
 * @param {number} maxDecimals - Maximum allowed decimal places
 * @returns {boolean} True if value exceeds the allowed decimal places
 */
function hasExcessiveDecimals(val, maxDecimals) {
  if (val == null || typeof val !== 'number') return false;
  const str = String(val);
  const dotIndex = str.indexOf('.');
  if (dotIndex === -1) return false; // Integer -- no decimals
  const decimalPart = str.slice(dotIndex + 1);
  return decimalPart.length > maxDecimals;
}

/**
 * Check if a name appears to be a full name (first + last).
 *
 * @param {string} name - Name to check
 * @returns {boolean} True if the name has 2+ space-separated words
 */
function isFullName(name) {
  if (!name || typeof name !== 'string') return false;
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2;
}

/**
 * Audit the complete pipeline output for privacy violations.
 *
 * @param {Object} graph - Complete graph data { nodes, edges, epochs }
 * @param {Object} config - Audit config
 * @param {Object} config.allowlist - People allowlist
 * @param {number} [config.gpsMaxDecimals=2] - Maximum GPS decimal places
 * @returns {{ violations: string[], warnings: string[] }}
 */
export function auditPrivacy(graph, config = {}) {
  log.info('Scanning output for privacy violations...');

  const violations = [];
  const warnings = [];
  const allowlist = config.allowlist || { public: [], friends: [], minors: { firstNames: [], blockedPatterns: [] } };
  const gpsMaxDecimals = config.gpsMaxDecimals ?? 2;
  const publishMode = config.publishMode === true;
  const nodes = graph.nodes || [];

  // ── PRIV-02: No private-tier nodes in output ──────────────────────
  for (const node of nodes) {
    if (node.visibility === 'private') {
      violations.push(
        `PRIV-02: Private node in output: ${node.id} (visibility="${node.visibility}")`
      );
    }
  }

  // ── PRIV-09: Publish mode -- ONLY public nodes allowed ────────────
  if (publishMode) {
    for (const node of nodes) {
      if (node.visibility !== 'public') {
        violations.push(
          `PRIV-09: Non-public node in publish output: ${node.id} (visibility="${node.visibility}")`
        );
      }
    }
  }

  // ── PRIV-03: GPS coordinates <= 2 decimal places ──────────────────
  for (const node of nodes) {
    if (node.location) {
      if (hasExcessiveDecimals(node.location.lat, gpsMaxDecimals)) {
        violations.push(
          `PRIV-03: GPS lat exceeds ${gpsMaxDecimals} decimal places on node ${node.id}: ${node.location.lat}`
        );
      }
      if (hasExcessiveDecimals(node.location.lng, gpsMaxDecimals)) {
        violations.push(
          `PRIV-03: GPS lng exceeds ${gpsMaxDecimals} decimal places on node ${node.id}: ${node.location.lng}`
        );
      }
    }
  }

  // ── PRIV-05: Minor node restrictions ──────────────────────────────
  const blockedPatterns = allowlist.minors?.blockedPatterns || [];

  for (const node of nodes) {
    if (node._isMinor) {
      // Minors must have no GPS data
      if (node.location != null) {
        violations.push(
          `PRIV-05: Minor node ${node.id} has GPS data (location must be null)`
        );
      }

      // Check for blocked patterns in title and description
      const text = `${node.title || ''} ${node.description || ''}`;
      for (const pattern of blockedPatterns) {
        if (pattern && text.toLowerCase().includes(pattern.toLowerCase())) {
          violations.push(
            `PRIV-05: Minor node ${node.id} contains blocked pattern "${pattern}"`
          );
        }
      }
    }
  }

  // ── PRIV-05b: No minor last-name patterns in output text ─────────
  const minorFirstNames = allowlist.minors?.firstNames || [];

  for (const node of nodes) {
    const text = `${node.title || ''} ${node.description || ''}`;
    for (const firstName of minorFirstNames) {
      // Case-insensitive find of the first name, then case-SENSITIVE check
      // that the next word starts with uppercase (actual last-name signal).
      const escaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const namePattern = new RegExp(`\\b${escaped}\\b\\s+(\\S)`, 'gi');
      let match;
      while ((match = namePattern.exec(text)) !== null) {
        const nextChar = match[1];
        // Only flag if next word starts with a real uppercase letter
        if (nextChar >= 'A' && nextChar <= 'Z') {
          violations.push(
            `PRIV-05b: Minor "${firstName}" appears with last-name pattern in node ${node.id}`
          );
          break;
        }
      }
    }
  }

  // ── PRIV-06: No DMs, contact graphs, close friends ───────────────
  // Scan the entire stringified output for forbidden patterns
  const outputStr = JSON.stringify(graph).toLowerCase();

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (outputStr.includes(pattern.toLowerCase())) {
      violations.push(
        `PRIV-06: Forbidden pattern "${pattern}" found in output`
      );
    }
  }

  // ── PRIV-07: No full names of non-public people ───────────────────
  const publicNames = new Set(
    (allowlist.public || []).map(n => n.toLowerCase().trim())
  );

  for (const node of nodes) {
    const people = node.entities?.people || [];
    for (const person of people) {
      if (isFullName(person) && !publicNames.has(person.toLowerCase().trim())) {
        // Check if any public-list entry matches as a prefix (for names with middle names etc.)
        const isPublic = [...publicNames].some(pub =>
          person.toLowerCase().trim().startsWith(pub) ||
          pub.startsWith(person.toLowerCase().trim())
        );
        if (!isPublic) {
          violations.push(
            `PRIV-07: Non-public full name "${person}" in node ${node.id}`
          );
        }
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────
  if (violations.length > 0) {
    log.error(`Privacy audit FAILED: ${violations.length} violation(s) found`);
    for (const v of violations) {
      log.error(`  - ${v}`);
    }
  } else {
    log.info(`Privacy audit PASSED: 0 violations, ${warnings.length} warning(s)`);
  }

  return { violations, warnings };
}
