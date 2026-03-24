/**
 * Configurable epoch boundaries and assignment function.
 *
 * Epochs define the life timeline segments displayed in the constellation.
 * Ranges are adjusted from mock-constellation.json to match actual
 * Carbonmade career data (experience starts 2001 at AOTV).
 */

/**
 * Epoch configuration array.
 * Each epoch has an id, label, human-readable range, color, and numeric boundaries.
 * Ranges are [start, end) -- start is inclusive, end is exclusive.
 */
export const EPOCH_CONFIG = Object.freeze([
  { id: 'early-years', label: 'Early Years', range: '2001-2004', color: '#fbbf24', start: 2001, end: 2004 },
  { id: 'college', label: 'College', range: '2004-2008', color: '#f59e0b', start: 2004, end: 2008 },
  { id: 'career-start', label: 'Career Start', range: '2008-2014', color: '#f87171', start: 2008, end: 2014 },
  { id: 'growth', label: 'Growth', range: '2014-2022', color: '#a78bfa', start: 2014, end: 2022 },
  { id: 'present', label: 'Present', range: '2022-2026', color: '#22d3ee', start: 2022, end: 2026 },
]);

/**
 * Assign an epoch label to a date string.
 *
 * Parses the date string to extract the year, then finds the matching
 * epoch by range (start <= year < end).
 *
 * Edge cases:
 * - Year before first epoch start: assigns first epoch
 * - Year >= last epoch end: assigns last epoch
 * - Invalid/missing date: returns "Unknown"
 *
 * @param {string} dateStr - Date string (ISO "YYYY-MM-DD", year "YYYY", or any parseable format)
 * @returns {string} Epoch label (e.g., "Career Start")
 */
export function assignEpoch(dateStr) {
  if (!dateStr) return 'Unknown';

  // Extract year from various date formats
  let year;
  const yearMatch = String(dateStr).match(/(\d{4})/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  } else {
    return 'Unknown';
  }

  if (isNaN(year)) return 'Unknown';

  // Clamp to epoch range boundaries
  const firstEpoch = EPOCH_CONFIG[0];
  const lastEpoch = EPOCH_CONFIG[EPOCH_CONFIG.length - 1];

  if (year < firstEpoch.start) {
    return firstEpoch.label;
  }

  if (year >= lastEpoch.end) {
    return lastEpoch.label;
  }

  // Find matching epoch (start <= year < end)
  for (const epoch of EPOCH_CONFIG) {
    if (year >= epoch.start && year < epoch.end) {
      return epoch.label;
    }
  }

  // Fallback (should not reach here given the clamping above)
  return lastEpoch.label;
}

/**
 * Returns the full EPOCH_CONFIG array for inclusion in output JSON.
 * @returns {Array} Epoch configuration objects
 */
export function getEpochConfig() {
  return [...EPOCH_CONFIG];
}
