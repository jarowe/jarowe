/**
 * GPU Capability Detection — 3-Tier System
 *
 * Detects device GPU capability and returns a tier string used to
 * route Memory Capsule rendering to the appropriate renderer:
 *
 *   'full'       → DisplacedMeshRenderer (256² subdivisions, postprocessing, DPR up to 2.0)
 *   'simplified' → DisplacedMeshRenderer (128² subdivisions, no postprocessing, DPR 1.0)
 *   'parallax'   → ParallaxFallback (no WebGL, layered CSS parallax + Ken Burns)
 *
 * Tier criteria:
 *   full:       WebGL2 + MAX_TEXTURE_SIZE >= 8192 + deviceMemory >= 6 (or unavailable)
 *               NOT low-end GPU, NOT (mobile AND lowMemory)
 *   simplified: WebGL2 + MAX_TEXTURE_SIZE >= 4096 + NOT low-end GPU
 *   parallax:   Everything else
 *
 * The function is synchronous and safe to call during component mount.
 */

const LOW_END_GPUS = [
  'mali-4',
  'mali-t6',
  'adreno 3',
  'adreno 4',
  'powervr sgx',
  'apple gpu', // older iPhones
];

/**
 * Returns the GPU capability tier: 'full' | 'simplified' | 'parallax'.
 */
export function getGpuTier() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return 'parallax';

    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    // Check renderer string for known low-end GPUs
    let isLowEndGpu = false;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl
        .getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        .toLowerCase();
      isLowEndGpu = LOW_END_GPUS.some((g) => renderer.includes(g));
    }

    // Clean up the WebGL context
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();

    // Low-end GPU → parallax regardless of other checks
    if (isLowEndGpu) return 'parallax';

    // Mobile heuristic: touch device + small screen
    const isMobile = 'ontouchstart' in window && window.innerWidth < 768;
    const deviceMemory = navigator.deviceMemory; // undefined on some browsers
    const lowMemory = deviceMemory && deviceMemory < 4;

    // Mobile + low memory → parallax
    if (isMobile && lowMemory) return 'parallax';

    // Full tier: MAX_TEXTURE_SIZE >= 8192, deviceMemory >= 6 (or unavailable on desktop)
    if (maxTexSize >= 8192) {
      // On mobile, require deviceMemory >= 8 for full tier
      if (isMobile) {
        if (deviceMemory && deviceMemory >= 8) return 'full';
        // Mobile without enough memory falls through to simplified
      } else {
        // Desktop: deviceMemory >= 6 or unavailable (assume capable)
        if (!deviceMemory || deviceMemory >= 6) return 'full';
        // Desktop with low deviceMemory falls through to simplified
      }
    }

    // Simplified tier: MAX_TEXTURE_SIZE >= 4096
    if (maxTexSize >= 4096) return 'simplified';

    // Everything else
    return 'parallax';
  } catch {
    return 'parallax';
  }
}

/**
 * @deprecated Use getGpuTier() instead. Kept for backward compatibility
 * with MemoryPortal until it is fully replaced by CapsuleShell.
 */
export function canRenderSplat() {
  return getGpuTier() !== 'parallax';
}
