/**
 * Identity resolution registry.
 *
 * Resolves raw usernames (e.g. Instagram handles) to canonical person names
 * using an identity-map.json lookup. Enables cross-source person matching
 * and preserves real names through the privacy pipeline.
 */

import fs from 'fs/promises';
import { createLogger } from '../utils/logger.mjs';

const log = createLogger('identity');

/**
 * Load identity map from a JSON file.
 * Returns a graceful empty registry if the file is missing or invalid.
 *
 * @param {string} filePath - Absolute path to identity-map.json
 * @returns {Promise<Object>} Registry object with identities and selfAliases
 */
export async function loadIdentityMap(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);

    // Build a case-insensitive alias → identity lookup
    const aliasIndex = new Map();
    const identities = data.identities || {};

    for (const [identityId, identity] of Object.entries(identities)) {
      const aliases = identity.aliases || [];
      for (const alias of aliases) {
        aliasIndex.set(alias.toLowerCase(), {
          canonicalName: identity.canonicalName,
          tier: identity.tier || 'private',
          relationship: identity.relationship || null,
          identityId,
        });
      }
      // Also index the canonical name itself
      aliasIndex.set(identity.canonicalName.toLowerCase(), {
        canonicalName: identity.canonicalName,
        tier: identity.tier || 'private',
        relationship: identity.relationship || null,
        identityId,
      });
    }

    const selfAliases = new Set(
      (data.selfAliases || []).map(a => a.toLowerCase())
    );

    log.info(
      `Loaded identity map: ${Object.keys(identities).length} identities, ` +
      `${aliasIndex.size} aliases, ${selfAliases.size} self aliases`
    );

    return { identities, aliasIndex, selfAliases };
  } catch (err) {
    if (err.code === 'ENOENT') {
      log.info('No identity-map.json found — identity resolution disabled');
    } else {
      log.warn(`Failed to load identity map: ${err.message}`);
    }
    return { identities: {}, aliasIndex: new Map(), selfAliases: new Set() };
  }
}

/**
 * Resolve a raw username to a canonical identity.
 *
 * @param {string} raw - Raw username (e.g. "rowetogether")
 * @param {Object} registry - Registry from loadIdentityMap()
 * @returns {Object|null} { canonicalName, tier, relationship, identityId } or null
 */
export function resolveUsername(raw, registry) {
  if (!raw || !registry?.aliasIndex) return null;
  return registry.aliasIndex.get(raw.toLowerCase()) || null;
}

/**
 * Resolve an array of raw people names/usernames to canonical names.
 * Unresolved usernames stay as-is.
 *
 * @param {string[]} rawPeople - Array of raw names/usernames
 * @param {Object} registry - Registry from loadIdentityMap()
 * @returns {string[]} Array with resolved canonical names
 */
export function resolvePeopleArray(rawPeople, registry) {
  if (!Array.isArray(rawPeople) || !registry?.aliasIndex) return rawPeople || [];

  return rawPeople.map(raw => {
    const resolved = resolveUsername(raw, registry);
    return resolved ? resolved.canonicalName : raw;
  });
}

/**
 * Check if a username is a self alias (i.e. refers to the site owner).
 *
 * @param {string} username - Username to check
 * @param {Object} registry - Registry from loadIdentityMap()
 * @returns {boolean}
 */
export function isSelfAlias(username, registry) {
  if (!username || !registry?.selfAliases) return false;
  return registry.selfAliases.has(username.toLowerCase());
}
