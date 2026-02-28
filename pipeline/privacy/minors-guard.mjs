/**
 * Minors policy enforcement (PRIV-05).
 *
 * LOCKED policy:
 * - First names OK
 * - No last names
 * - No GPS data (location set to null)
 * - No school/home identifiers
 * - Blocked patterns redacted to "[redacted]"
 *
 * Any node referencing a minor gets:
 * - Last names stripped from title and description
 * - GPS/location set to null
 * - Blocked patterns replaced with "[redacted]"
 * - _isMinor flag set to true (for privacy audit verification)
 */

import { createLogger } from '../utils/logger.mjs';

const log = createLogger('minors-guard');

/**
 * Check if a person name is a known minor.
 *
 * Checks against allowlist.minors.firstNames (case-insensitive).
 * Matches if any first-name token in the person string matches a minor name.
 *
 * @param {string} name - Person name to check
 * @param {Object} allowlist - Allowlist config with minors.firstNames array
 * @returns {boolean} True if the person is a known minor
 */
export function isMinor(name, allowlist) {
  if (!name || !allowlist?.minors?.firstNames?.length) return false;

  const minorNames = allowlist.minors.firstNames.map(n => n.toLowerCase().trim());
  const nameLower = name.toLowerCase().trim();

  // Check if the full name matches a minor first name
  if (minorNames.includes(nameLower)) return true;

  // Check if the first token (first name) matches a minor first name
  const firstName = nameLower.split(/\s+/)[0];
  if (minorNames.includes(firstName)) return true;

  return false;
}

/**
 * Strip last names from text for a given list of minor first names.
 *
 * For each minor first name found in the text, if it's followed by additional
 * name tokens (words starting with an uppercase letter), remove those trailing
 * name tokens. The first-name match is case-insensitive but the last-name
 * detection requires actual uppercase letters (not case-insensitive).
 *
 * Example: "Jace Rowe at the park" -> "Jace at the park"
 * Example: "Photo with Jace Smith-Jones" -> "Photo with Jace"
 *
 * @param {string} text - Text to process
 * @param {string[]} minorFirstNames - Array of minor first names
 * @returns {string} Text with last names removed
 */
function stripLastNames(text, minorFirstNames) {
  if (!text || !minorFirstNames?.length) return text || '';

  let result = text;

  for (const firstName of minorFirstNames) {
    // Use case-insensitive flag ONLY for the first-name match.
    // The replacer function checks if subsequent words are capitalized
    // using case-SENSITIVE logic (actual uppercase first letter).
    const escapedName = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match the first name (case-insensitive) followed by remaining text
    const pattern = new RegExp(
      `\\b(${escapedName})\\b(\\s+.*)`,
      'gi'
    );

    result = result.replace(pattern, (_match, name, rest) => {
      // Walk through subsequent words, stripping capitalized ones (last name parts)
      // Stop at the first non-capitalized word
      let remaining = rest;
      // Repeatedly strip leading whitespace + capitalized word
      while (true) {
        const wordMatch = remaining.match(/^(\s+)([A-Z][a-zA-Z'-]*)(.*)/s);
        if (wordMatch) {
          // This word starts with uppercase -- it's a last name part, strip it
          remaining = wordMatch[3];
        } else {
          break;
        }
      }
      return name + remaining;
    });
  }

  return result;
}

/**
 * Redact blocked patterns from text.
 *
 * Replaces any occurrence of a blocked pattern with "[redacted]".
 * Case-insensitive matching.
 *
 * @param {string} text - Text to scan
 * @param {string[]} blockedPatterns - Patterns to redact
 * @returns {string} Text with blocked patterns replaced
 */
function redactBlockedPatterns(text, blockedPatterns) {
  if (!text || !blockedPatterns?.length) return text || '';

  let result = text;

  for (const pattern of blockedPatterns) {
    if (!pattern) continue;
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    result = result.replace(regex, '[redacted]');
  }

  return result;
}

/**
 * Check if a minor first name appears as a whole word in text.
 *
 * @param {string} text - Text to search
 * @param {string[]} minorFirstNames - Minor first names to match
 * @returns {boolean} True if any minor name appears as a whole word
 */
function textMentionsMinor(text, minorFirstNames) {
  if (!text || !minorFirstNames?.length) return false;
  const lower = text.toLowerCase();
  for (const name of minorFirstNames) {
    const escaped = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lower)) return true;
  }
  return false;
}

/**
 * Enforce minors policy on a single node.
 *
 * Detects minor references from TWO sources:
 *   1. entities.people names (existing name-based check)
 *   2. title + description whole-word matches against minors.firstNames
 *
 * If any minor reference is found:
 * - Strip last names from title, description, AND entities.people
 * - Remove GPS data entirely (location = null)
 * - Redact blocked patterns in title and description
 * - Set _isMinor = true for privacy audit verification
 *
 * @param {Object} node - Canonical node to process
 * @param {Object} allowlist - Allowlist config with minors section
 * @returns {Object} Modified node (mutated in place and returned)
 */
export function enforceMinorsPolicy(node, allowlist) {
  if (!node || !allowlist?.minors) return node;

  const minorFirstNames = allowlist.minors.firstNames || [];
  if (!minorFirstNames.length) return node;

  const people = node.entities?.people || [];
  const blockedPatterns = allowlist.minors.blockedPatterns || [];

  // Detect minors from entities.people OR title/description text
  const hasMinorInPeople = people.some(person => isMinor(person, allowlist));
  const hasMinorInText = textMentionsMinor(
    `${node.title || ''} ${node.description || ''}`,
    minorFirstNames
  );

  if (!hasMinorInPeople && !hasMinorInText) return node;

  // Strip last names from title and description
  node.title = stripLastNames(node.title, minorFirstNames);
  node.description = stripLastNames(node.description, minorFirstNames);

  // Strip last names from entities.people for minor entries
  if (node.entities?.people) {
    node.entities.people = node.entities.people.map(person => {
      if (isMinor(person, allowlist)) {
        // Keep only the first name
        return person.trim().split(/\s+/)[0];
      }
      return person;
    });
  }

  // Remove GPS data entirely for nodes referencing minors
  node.location = null;

  // Redact blocked patterns (school names, home identifiers, etc.)
  node.title = redactBlockedPatterns(node.title, blockedPatterns);
  node.description = redactBlockedPatterns(node.description, blockedPatterns);

  // Mark node for privacy audit verification
  node._isMinor = true;

  log.info(`Minors policy enforced on node ${node.id}: location removed, names stripped`);

  return node;
}
