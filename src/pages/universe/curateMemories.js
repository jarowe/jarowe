/**
 * Curate ~25 best memory moments from constellation data for the Universe page.
 *
 * Filters to nodes with image media, applies per-epoch quotas,
 * and ensures theme diversity within each epoch.
 */

import { CM_LOCAL_FILES } from './cmLocalFiles';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

function isImage(path) {
  const ext = '.' + path.split('?')[0].split('#')[0].split('.').pop().toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function hasImageMedia(node) {
  if (!node.media || node.media.length === 0) return false;
  // cm-p nodes always have local copies even though media[] has external URLs
  if (node.id.startsWith('cm-p-') && CM_LOCAL_FILES[node.id]) return true;
  return node.media.some(m => isImage(m));
}

function getFirstImage(node) {
  if (!node.media) return null;
  // For cm-p nodes, use the actual local file manifest (correct extensions)
  const localFiles = CM_LOCAL_FILES[node.id];
  if (node.id.startsWith('cm-p-') && localFiles && localFiles.length > 0) {
    return `/data/media/${node.id}/${localFiles[0]}`;
  }
  for (const m of node.media) {
    if (isImage(m)) return m;
  }
  return null;
}

// Epoch quotas — balanced representation across life chapters
const EPOCH_QUOTAS = {
  'Early Years': 4,
  'College': 5,
  'Career Start': 6,
  'Growth': 5,
  'Present': 5,
};

const EPOCH_COLORS = {
  'Early Years': '#fbbf24',
  'College': '#f59e0b',
  'Career Start': '#f87171',
  'Growth': '#a78bfa',
  'Present': '#22d3ee',
};

/**
 * @param {Array} nodes - Constellation graph nodes
 * @param {Object} [opts]
 * @param {number} [opts.maxTotal=25] - Max total memories
 * @param {boolean} [opts.mobile=false] - If true, reduce to ~15 (3 per epoch)
 * @returns {Array<{id, title, description, date, epoch, epochColor, theme, significance, heroImage, allImages, type}>}
 */
export function curateMemories(nodes, opts = {}) {
  const { maxTotal = 25, mobile = false } = opts;

  // Filter to nodes that have at least one image
  const candidates = nodes.filter(hasImageMedia);

  // Group by epoch
  const byEpoch = {};
  for (const node of candidates) {
    const epoch = node.epoch || 'Unknown';
    if (!byEpoch[epoch]) byEpoch[epoch] = [];
    byEpoch[epoch].push(node);
  }

  // Sort each epoch by significance descending
  for (const epoch of Object.keys(byEpoch)) {
    byEpoch[epoch].sort((a, b) => b.significance - a.significance);
  }

  const selected = [];

  // Pick per-epoch quota with theme diversity
  for (const [epoch, quota] of Object.entries(EPOCH_QUOTAS)) {
    const pool = byEpoch[epoch] || [];
    const epochQuota = mobile ? Math.min(3, quota) : quota;
    const themesUsed = new Set();
    let picked = 0;

    for (const node of pool) {
      if (picked >= epochQuota) break;

      // Prefer theme diversity: skip if we already have 2 of this theme
      const theme = node.theme || 'misc';
      const themeCount = [...themesUsed].filter(t => t === theme).length;
      if (themeCount >= 2 && pool.length > epochQuota) continue;

      themesUsed.add(theme);
      const heroImage = getFirstImage(node);
      // For cm-p nodes, use actual local file paths from manifest
      let allImages;
      const localFiles = CM_LOCAL_FILES[node.id];
      if (node.id.startsWith('cm-p-') && localFiles) {
        allImages = localFiles
          .filter(f => isImage(f))
          .map(f => `/data/media/${node.id}/${f}`);
      } else {
        allImages = (node.media || []).filter(m => isImage(m));
      }

      selected.push({
        id: node.id,
        title: node.title || '',
        description: node.description || '',
        date: node.date || '',
        epoch,
        epochColor: EPOCH_COLORS[epoch] || '#888',
        theme: node.theme || null,
        significance: node.significance || 0,
        heroImage,
        allImages,
        type: node.type || 'moment',
      });
      picked++;
    }
  }

  // Trim to maxTotal if somehow over
  return selected.slice(0, maxTotal);
}
