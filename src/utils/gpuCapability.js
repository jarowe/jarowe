/**
 * Capability-based detection for gaussian splat rendering.
 *
 * Returns true if the device can sustain splat rendering at interactive
 * frame rates. Checks:
 *   1. WebGL2 support (required by the splat library)
 *   2. GPU texture size as a capability proxy
 *   3. Known low-end mobile GPU strings
 *   4. Mobile + low device memory heuristic
 *
 * The function is synchronous and safe to call during component mount.
 */
export function canRenderSplat() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;

    // Max texture size < 4096 implies a very limited GPU
    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTexSize < 4096) return false;

    // Check renderer string for known low-end GPUs
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl
        .getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        .toLowerCase();
      const lowEnd = [
        'mali-4',
        'mali-t6',
        'adreno 3',
        'adreno 4',
        'powervr sgx',
        'apple gpu', // older iPhones
      ];
      if (lowEnd.some((g) => renderer.includes(g))) return false;
    }

    // Mobile heuristic: touch device + small screen + low device memory
    const isMobile = 'ontouchstart' in window && window.innerWidth < 768;
    const lowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
    if (isMobile && lowMemory) return false;

    // Clean up the WebGL context
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();

    return true;
  } catch {
    return false;
  }
}
