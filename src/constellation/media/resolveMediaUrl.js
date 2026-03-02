/**
 * Resolve a media path from the constellation graph into a valid URL.
 *
 * Handles three media path formats:
 *   1. Absolute URLs (https://...) — returned as-is
 *   2. Paths with leading slash (/data/media/...) — prepend BASE_URL correctly
 *   3. Relative paths (images/instagram/...) — prepend BASE_URL
 *
 * Also detects media type (image vs video) from extension.
 */

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.avi', '.ogv']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp', '.svg']);

/**
 * Resolve a media path to a usable URL, correctly handling BASE_URL.
 *
 * @param {string} mediaPath - Raw media path from graph JSON
 * @returns {string} Resolved URL ready for src attribute
 */
export function resolveMediaUrl(mediaPath) {
  if (!mediaPath) return '';

  // Absolute URLs — never prefix with BASE_URL
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    return mediaPath;
  }

  const base = import.meta.env.BASE_URL || '/';

  // Strip leading slash to avoid double-slash (BASE_URL typically ends with /)
  const clean = mediaPath.startsWith('/') ? mediaPath.slice(1) : mediaPath;

  // Ensure base ends with /
  const safeBase = base.endsWith('/') ? base : base + '/';

  return `${safeBase}${clean}`;
}

/**
 * Detect whether a media path points to a video or image.
 *
 * @param {string} mediaPath - Media path or URL
 * @returns {'video'|'image'} Media type
 */
export function getMediaType(mediaPath) {
  if (!mediaPath) return 'image';

  // Extract extension from path (strip query params first)
  const cleanPath = mediaPath.split('?')[0].split('#')[0];
  const lastDot = cleanPath.lastIndexOf('.');
  if (lastDot === -1) return 'image';

  const ext = cleanPath.slice(lastDot).toLowerCase();
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return 'image';
}
