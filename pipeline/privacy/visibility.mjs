/**
 * Visibility tier REFINEMENT and allowlist enforcement.
 *
 * This is the SECOND PHASE of the two-phase visibility system:
 *   Phase 1 (parsers): Set source-level defaults (Instagram=private, Carbonmade=public)
 *   Phase 2 (this module): Refine via allowlist enforcement, curation overrides,
 *                          minors policy, and most-restrictive-wins rule.
 *
 * Visibility tiers (exactly 3): "public" | "friends" | "private"
 * LOCKED: Most restrictive rule always wins.
 */

import { createLogger } from '../utils/logger.mjs';

const log = createLogger('visibility');

/**
 * Tier restriction order (lower index = more restrictive).
 * Used for most-restrictive-wins comparisons.
 */
const TIER_ORDER = Object.freeze(['private', 'friends', 'public']);

/**
 * Get the numeric restriction level for a tier.
 * Lower number = more restrictive.
 *
 * @param {string} tier - Visibility tier
 * @returns {number} Restriction level (0=private, 1=friends, 2=public)
 */
function tierLevel(tier) {
  const idx = TIER_ORDER.indexOf(tier);
  return idx >= 0 ? idx : 0; // Unknown tiers default to most restrictive (private)
}

/**
 * Return the more restrictive of two tiers.
 *
 * @param {string} a - First tier
 * @param {string} b - Second tier
 * @returns {string} The more restrictive tier
 */
function mostRestrictive(a, b) {
  return tierLevel(a) <= tierLevel(b) ? a : b;
}

/**
 * Check if a person name is on a specific allowlist tier.
 *
 * @param {string} name - Person name to check
 * @param {string[]} list - Array of allowed names
 * @returns {boolean} True if name is on the list (case-insensitive)
 */
function isOnList(name, list) {
  if (!Array.isArray(list)) return false;
  const lower = name.toLowerCase().trim();
  return list.some(entry => entry.toLowerCase().trim() === lower);
}

/**
 * Assign a refined visibility tier to a node.
 *
 * Starts with the node's current visibility (set by parser in Phase 1),
 * applies curation overrides, then enforces allowlist constraints with
 * most-restrictive-wins logic.
 *
 * @param {Object} node - Canonical node with visibility, entities fields
 * @param {Object} allowlist - Allowlist config { public: [], friends: [], minors: { firstNames: [], blockedPatterns: [] } }
 * @param {Object} curationOverrides - Map of { [nodeId]: "public"|"friends"|"private" }
 * @returns {string} Final visibility tier ("public", "friends", or "private")
 */
export function assignVisibility(node, allowlist, curationOverrides) {
  // Start with parser-assigned visibility (Phase 1 default)
  let tier = node.visibility || 'private';

  // Apply curation override if one exists for this node
  if (curationOverrides && curationOverrides[node.id]) {
    const curationTier = curationOverrides[node.id];
    if (TIER_ORDER.includes(curationTier)) {
      tier = curationTier;
    }
  }

  // Apply allowlist constraints on people mentioned in this node
  const people = node.entities?.people || [];

  if (people.length > 0 && allowlist) {
    for (const person of people) {
      if (isOnList(person, allowlist.public)) {
        // Person is cleared for public -- no restriction from this person
        continue;
      } else if (isOnList(person, allowlist.friends)) {
        // Person is friends-tier only -- cap at friends
        tier = mostRestrictive(tier, 'friends');
      } else {
        // Person not on any allowlist -- cap at friends (cannot be public with unknown names)
        tier = mostRestrictive(tier, 'friends');
      }
    }
  }

  // Most-restrictive-wins is already enforced by the logic above:
  // - Parser default establishes baseline
  // - Curation can promote or demote
  // - Allowlist constraints can only make it MORE restrictive (never less)
  return tier;
}

/**
 * Apply allowlist name processing to all nodes.
 *
 * For each node, check people entities against the allowlist:
 * - People on allowlist.public: keep name as-is
 * - People on allowlist.friends: keep name, mark node as "friends" visibility
 * - People not on any list: replace name with generic label ("Friend")
 *
 * @param {Object[]} nodes - Array of canonical nodes
 * @param {Object} allowlist - Allowlist config
 * @returns {Object[]} Modified nodes array (mutated in place and returned)
 */
export function applyAllowlist(nodes, allowlist) {
  if (!allowlist) return nodes;

  let redactedCount = 0;
  const minorFirstNames = (allowlist.minors?.firstNames || []).map(n => n.toLowerCase().trim());

  for (const node of nodes) {
    const people = node.entities?.people;
    if (!people || people.length === 0) continue;

    const processedPeople = [];

    for (const person of people) {
      if (isOnList(person, allowlist.public)) {
        // Cleared for public -- keep full name
        processedPeople.push(person);
      } else if (isOnList(person, allowlist.friends)) {
        // Friends-tier -- keep name (only visible to friends)
        processedPeople.push(person);
      } else if (minorFirstNames.includes(person.toLowerCase().trim())) {
        // Minor first name (already stripped to first-name-only by minors guard) -- keep visible
        processedPeople.push(person);
      } else {
        // Not on any list -- replace with generic label
        processedPeople.push('Friend');
        redactedCount++;
      }
    }

    node.entities.people = processedPeople;
  }

  if (redactedCount > 0) {
    log.info(`Allowlist: ${redactedCount} person name(s) replaced with generic labels`);
  }

  return nodes;
}

/**
 * Filter out all private-tier nodes from the output.
 *
 * @param {Object[]} nodes - Array of canonical nodes
 * @returns {Object[]} Nodes with visibility !== "private"
 */
export function filterPrivateNodes(nodes) {
  const before = nodes.length;
  const filtered = nodes.filter(n => n.visibility !== 'private');
  const removed = before - filtered.length;

  if (removed > 0) {
    log.info(`Filtered ${removed} private node(s) from output (${filtered.length} remaining)`);
  }

  return filtered;
}

/**
 * Filter to public-only nodes for publish artifacts.
 * Used by --publish mode to ensure deployed graph contains only public data.
 *
 * @param {Object[]} nodes - Array of canonical nodes
 * @returns {Object[]} Nodes with visibility === "public" only
 */
export function filterPublicOnly(nodes) {
  const before = nodes.length;
  const filtered = nodes.filter(n => n.visibility === 'public');
  const removed = before - filtered.length;

  log.info(`Public-only filter: ${filtered.length} public, ${removed} non-public removed`);
  return filtered;
}

/**
 * Prune edges that reference any node not in the surviving set.
 *
 * @param {Object[]} edges - Array of edges with source/target IDs
 * @param {Set<string>} validIds - Set of surviving node IDs
 * @returns {Object[]} Edges where both source and target are in validIds
 */
export function pruneOrphanEdges(edges, validIds) {
  const before = edges.length;
  const filtered = edges.filter(e => validIds.has(e.source) && validIds.has(e.target));
  const removed = before - filtered.length;

  if (removed > 0) {
    log.info(`Pruned ${removed} orphan edge(s) (${filtered.length} remaining)`);
  }
  return filtered;
}
