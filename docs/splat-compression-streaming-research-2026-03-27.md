# Gaussian Splat Compression, Streaming & Fast Web Loading

Date: 2026-03-27
Goal: Get our 64MB PLY memory world to load in under 3 seconds.

---

## Current State

| Scene | Source PLY | Runtime PLY | Splat Count (runtime) | Source Count |
|-------|-----------|-------------|----------------------|--------------|
| naxos-rock | 153 MB | 61 MB | 900K | 2.26M |
| syros-cave | 142 MB | 57 MB | 850K | 2.09M |
| naxos-laugh | 142 MB | 44 MB | ~650K | 2.26M |

Current renderer: `@mkkellogg/gaussian-splats-3d` v0.4.7 (DropInViewer).
Current format: uncompressed PLY.
Current load time: ~15s white screen + 4s loading spinner = ~19s total.

---

## 1. File Formats and Compression Ratios

### Format Comparison

| Format | Compression | File size (900K splats) | Progressive load | Streaming LOD | Notes |
|--------|------------|------------------------|-----------------|---------------|-------|
| **PLY (uncompressed)** | None | 61 MB | Yes | No | What we use now. 232 bytes/splat. |
| **SPZ (Niantic)** | ~10x | **~6 MB** | No (in mkkellogg) | No | Gzipped, 24-bit fixed positions, 8-bit scales, 10-bit quaternions, 8-bit colors. Becoming the Khronos glTF standard (KHR_gaussian_splatting_compression_spz reached RC Feb 2026). |
| **Compressed PLY (PlayCanvas)** | ~4x | ~15 MB | Yes | No | 16 bytes/splat via chunked quantization. Strips SH data. |
| **KSPLAT (mkkellogg)** | ~2-3x | ~25 MB | Yes | No | Internal format match = fastest parsing in mkkellogg viewer. |
| **SOG (PlayCanvas)** | ~15-20x | **~3-4 MB** | Yes | Yes (LOD chunks) | WebP-encoded channels, Morton-ordered. GPU-ready on load. |
| **RAD (Spark 2.0)** | Variable | ~8 MB (with LOD tree) | Yes | Yes (HTTP Range) | New streaming format with LOD splat tree. ~30% larger than SPZ for the LOD overhead. |

### Key Insight: SPZ or SOG Gets Us to Single-Digit MB

Our 61 MB runtime PLY becomes:
- **SPZ: ~6 MB** (10x compression, near-lossless)
- **SOG: ~3-4 MB** (15-20x compression, lossy quantization but visually excellent)
- **Compressed PLY: ~15 MB** (4x, strips SH)

At 6 MB over a typical 50 Mbps connection, download time is ~1 second.
At 3 MB (SOG), download time is ~0.5 seconds.

---

## 2. Progressive / Streaming Loading

### Approaches Ranked by Impact

**A. Coarse-to-fine LOD streaming (best for us)**

Spark 2.0 builds an LOD splat tree: the root node is a single "average" splat, interior nodes are downsampled versions, leaves are original splats. The viewer streams from coarse to fine via HTTP Range requests, showing a visible scene almost immediately. The rendering budget is fixed (500K on mobile, 1.5M-2.5M on desktop) so frame rate stays steady regardless of total scene size.

SOG (PlayCanvas) does something similar with octree-based LOD chunks that stream on demand based on camera position and device capability.

**B. Progressive file loading (what we partially have)**

mkkellogg's DropInViewer supports progressive loading for PLY/SPLAT/KSPLAT (NOT SPZ). Splats appear as they download with a fade-in effect. But the viewer must parse the entire file before optimization, so there's a tradeoff between progressive display and runtime rendering performance.

**C. Multi-resolution variants (Marble's approach)**

Marble (World Labs) returns three SPZ variants per world: 100K, 500K, and full_res (2M). Load 100K first (sub-1MB SPZ), display immediately, then swap to 500K or full_res. This is the simplest approach to implement and doesn't require any special streaming format.

### Recommendation: Multi-Resolution SPZ + Preload

Generate three SPZ variants per scene:
1. **preview.spz** (~100K splats, ~0.7 MB) -- instant first frame
2. **runtime.spz** (~300-500K splats, ~3-5 MB) -- full quality for most devices
3. **source.spz** (~900K splats, ~6 MB) -- maximum quality for desktop

Load preview.spz first, swap to runtime.spz when ready.

---

## 3. Renderer Comparison

### @mkkellogg/gaussian-splats-3d (current)

- **Pros**: Works, integrates as THREE.Group in R3F, progressive loading for PLY
- **Cons**: No SPZ progressive loading. No LOD streaming. PLY parsing is slow (must parse text header + binary payload). KSPLAT is fastest but still no streaming.
- **Verdict**: Adequate for static scenes under 500K splats. Not the path to sub-3s loading.

### Spark.js (@sparkjsdev/spark)

- **Version**: 0.1.10 stable, 2.0.0-preview available
- **Size**: ~11 MB unpacked (includes WASM decoder)
- **Pros**: SPZ native support. Rust WASM decoder in WebWorker (fast). v2.0 has LOD streaming, HTTP Range requests, splat tree. R3F integration exists (sparkjsdev/spark-react-r3f). Uses Vite (matches our stack).
- **Cons**: v2.0 is preview, not stable. ~11 MB library payload. WASM loading adds one-time overhead.
- **Verdict**: The clear winner for streaming + compression. Switch to this.

### PlayCanvas SuperSplat Viewer (we also tried via iframe)

- **Pros**: Excellent SOG support, LOD streaming built in, great editor
- **Cons**: Iframe isolation means no R3F integration. Separate rendering context.
- **Verdict**: Great for editing/previewing, not for embedding in our R3F scene.

### drei `<Splat>` component

- **Pros**: Simplest integration (one line of JSX in R3F)
- **Cons**: Limited format support, no streaming, no LOD, no SPZ
- **Verdict**: Too limited for our needs.

### Three.js Native

- No built-in Gaussian splat support as of March 2026. Community relies on Spark.js or mkkellogg.

### WebGPU vs WebGL2

WebGPU splat renderers achieve 60-135x speedup over WebGL for GPU sorting (2.1ms/frame vs 280ms+ in worst cases). However, WebGPU browser coverage is still partial (Chrome/Edge yes, Firefox flag, Safari partial). Spark.js works on WebGL2 today and will benefit from WebGPU when available.

---

## 4. Size Optimization

### How Many Splats Do We Actually Need?

| Count | Visual Quality | File Size (SPZ) | Use Case |
|-------|---------------|-----------------|----------|
| 100K | Recognizable, blurry details | ~0.7 MB | Instant preview, mobile fallback |
| 200K | Good overall impression | ~1.4 MB | Mobile full quality |
| 300K | Near-photorealistic at distance | ~2.1 MB | Desktop standard quality |
| 500K | Photorealistic first impression | ~3.5 MB | Desktop high quality |
| 900K | Maximum detail, diminishing returns | ~6.3 MB | Desktop ultra (overkill?) |

For a memory scene viewed from a fixed starting camera with gentle orbit, 300K splats in SPZ format is likely the sweet spot: visually excellent, 2 MB file, 300ms download on fast connection.

### Optimization Techniques

**a. Prune low-opacity splats**
Many generated splats have near-zero opacity and contribute nothing visible. Removing splats below opacity threshold 5-10 typically removes 10-30% with no visible impact.

```bash
3dgsconverter -i scene.ply -o clean.ply -f 3dgs --min_opacity 5
```

**b. Reduce spherical harmonics degree**
SH coefficients are 76% of each splat's data. For web delivery where viewing angles are constrained, reducing from SH degree 3 to degree 0-1 is often invisible:

```bash
splat-transform input.ply --filter-harmonics 1 output.ply
```

**c. Decimate via progressive pairwise merging**
PlayCanvas splat-transform can reduce splat count while preserving visual quality:

```bash
splat-transform input.ply -F 300000 output.ply  # reduce to 300K splats
splat-transform input.ply -F 25% output.ply     # reduce to 25% of original
```

**d. Quantization**
SPZ and SOG both apply quantization internally during conversion. SPZ uses 24-bit fixed-point positions (vs 32-bit float), 8-bit log scales, 10-bit quaternion components. Near-lossless.

### Our Optimization Pipeline

```
scene.ply (900K, 61 MB)
  |
  v  [prune opacity < 5]
clean.ply (~750K, ~51 MB)
  |
  v  [reduce SH to degree 1]
reduced.ply (~750K, ~20 MB)
  |
  v  [decimate to 300K]
decimated.ply (300K, ~8 MB)
  |
  v  [convert to SPZ]
scene.runtime.spz (300K, ~2 MB)
  |
  v  [also generate preview]
scene.preview.spz (100K, ~0.7 MB)
```

**Total: 61 MB PLY -> 2 MB SPZ runtime + 0.7 MB preview = ~30x reduction**

---

## 5. Preloading Strategies

### a. Prefetch on hover/intent

When the user hovers over a memory card or navigates toward a memory section, start fetching the preview SPZ in the background:

```javascript
// In the memory card component
const prefetchSplat = (url) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = 'fetch';
  document.head.appendChild(link);
};
```

### b. Service Worker caching

Cache splat files after first load. Subsequent visits load from disk cache (effectively instant):

```javascript
// In service worker
const SPLAT_CACHE = 'splat-cache-v1';
self.addEventListener('fetch', (event) => {
  if (event.request.url.endsWith('.spz')) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(SPLAT_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
      )
    );
  }
});
```

### c. CDN optimization

- Set `Cache-Control: public, max-age=31536000, immutable` for SPZ files (content-addressed filenames)
- Use Vercel's edge network (already our host) -- binary assets are edge-cached globally
- Consider Brotli pre-compression: SPZ is already gzipped internally, but Vercel's edge can still serve with optimal transfer encoding

### d. Preload during idle time

If the user is on the homepage for more than 5 seconds, start background-loading the first memory world's preview SPZ:

```javascript
requestIdleCallback(() => {
  fetch('/memory/syros-cave/world/scene.preview.spz', { priority: 'low' });
});
```

---

## 6. What Marble (World Labs) Achieves

Marble's API returns worlds with three SPZ resolution tiers:
- **100K splats** -- smallest file, fast preview
- **500K splats** -- medium quality, good for real-time playback (~45 MB in PLY, ~4.5 MB in SPZ)
- **full_res** (2M splats) -- maximum quality (~220 MB PLY, ~22 MB SPZ)

Their recommended viewer is **Spark.js** (they are the same company -- World Labs created both Marble and Spark). The full pipeline: Marble generates SPZ -> Spark.js renders with LOD streaming.

Marble does not publicly document exact load times, but the architecture (SPZ + Spark LOD streaming) is designed for sub-second first frame on their 100K preview tier.

---

## 7. Concrete Recommendation: The 3-Second Plan

### Phase 1: Format conversion (gets us from 19s to ~5s)

**Effort: 1-2 days. No renderer change needed.**

1. Install conversion tools:
   ```bash
   pip install git+https://github.com/francescofugazzi/3dgsconverter.git
   npm install -g @playcanvas/splat-transform
   ```

2. Add to our `generate-memory-world.mjs` pipeline:
   ```
   scene.ply -> prune opacity -> reduce SH -> decimate to 300K -> convert to SPZ
   ```

3. Generate two tiers per scene:
   - `scene.preview.spz` (100K splats, ~0.7 MB)
   - `scene.runtime.spz` (300K splats, ~2 MB)

4. Update `meta.json` to reference SPZ files:
   ```json
   "world": {
     "splat": "world/scene.runtime.spz",
     "preview": "world/scene.preview.spz",
     "format": "spz"
   }
   ```

5. mkkellogg's viewer can load SPZ (just not progressively). This alone takes us from 61 MB download to ~2 MB download. Download time drops from ~10s to ~0.3s. Parsing may take 2-4s.

### Phase 2: Switch renderer to Spark.js (gets us from ~5s to ~2s)

**Effort: 2-3 days.**

1. Install Spark:
   ```bash
   npm install @sparkjsdev/spark
   ```

2. Use the official R3F integration pattern (sparkjsdev/spark-react-r3f):
   ```jsx
   import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
   // In R3F Canvas:
   <SparkRenderer />
   <SplatMesh url={splatUrl} />
   ```

3. Spark's WASM decoder in a WebWorker parses SPZ much faster than mkkellogg's JS parser.

4. The SplatMesh integrates directly into the R3F scene graph (no DropInViewer THREE.Group workaround).

### Phase 3: Two-tier loading + preloading (gets us to ~1-2s)

**Effort: 1 day.**

1. Load `scene.preview.spz` (0.7 MB) first, display immediately
2. Background-load `scene.runtime.spz` (2 MB), swap when ready
3. Add `<link rel="prefetch">` for preview SPZ on memory card hover
4. Add service worker caching for return visits (instant on second load)

### Phase 4 (optional): Spark 2.0 LOD streaming

**Effort: 1-2 days when Spark 2.0 stabilizes.**

1. Pre-build LOD splat tree using Spark's tooling
2. Serve as `.rad` file with HTTP Range request support
3. Viewer streams coarse-to-fine automatically
4. Even 2M+ splat scenes load with sub-second first frame

---

## 8. Timeline and File Size Summary

| Phase | Download Size | Est. Load Time | Effort |
|-------|--------------|---------------|--------|
| Current (PLY) | 61 MB | ~19s | -- |
| Phase 1 (SPZ) | 2 MB | ~5s | 1-2 days |
| Phase 2 (Spark) | 2 MB | ~2s | 2-3 days |
| Phase 3 (preview + prefetch) | 0.7 MB first, 2 MB total | ~1-2s | 1 day |
| Phase 4 (LOD stream) | Progressive | <1s first frame | 1-2 days |

**Total effort to reach sub-3s: ~4-6 days.**

---

## 9. Tools Reference

| Tool | Purpose | Install |
|------|---------|---------|
| `@playcanvas/splat-transform` | PLY decimate, SH filter, format convert | `npm install -g @playcanvas/splat-transform` |
| `3dgsconverter` | PLY prune (opacity/SOR), format convert | `pip install git+https://github.com/francescofugazzi/3dgsconverter.git` |
| `gsbox` | PLY to SPZ conversion, header inspection | `go install github.com/gotoeasy/gsbox@latest` |
| `spz-js` | PLY/SPZ conversion in Node.js | `npm install spz-js` |
| `@sparkjsdev/spark` | SPZ/PLY renderer for Three.js | `npm install @sparkjsdev/spark` |
| SuperSplat Editor | Visual editing, cleanup, preview | https://superspl.at/editor |

---

## Sources

- [Niantic SPZ format](https://github.com/nianticlabs/spz) -- open source, 10x compression
- [SPZ specification](https://scaniverse.com/spz)
- [Spark.js](https://sparkjs.dev/) -- World Labs Three.js renderer
- [Spark 2.0 LOD deep dive](https://sparkjs.dev/2.0.0-preview/docs/new-spark-renderer/)
- [Spark 2.0 features](https://sparkjs.dev/2.0.0-preview/docs/new-features-2.0/)
- [Spark R3F integration](https://github.com/sparkjsdev/spark-react-r3f)
- [PlayCanvas SOG format](https://blog.playcanvas.com/playcanvas-open-sources-sog-format-for-gaussian-splatting/)
- [PlayCanvas compressed splats](https://blog.playcanvas.com/compressing-gaussian-splats/)
- [PlayCanvas splat-transform CLI](https://github.com/playcanvas/splat-transform)
- [PlayCanvas LOD streaming tutorial](https://developer.playcanvas.com/tutorials/gaussian-splat-streaming-lod/)
- [mkkellogg GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D)
- [mkkellogg data formats](https://deepwiki.com/mkkellogg/GaussianSplats3D/3-data-formats-and-loading)
- [Marble API (World Labs)](https://docs.worldlabs.ai/api)
- [3dgsconverter](https://github.com/francescofugazzi/3dgsconverter)
- [gsbox CLI](https://github.com/gotoeasy/gsbox)
- [spz-js](https://github.com/arrival-space/spz-js)
- [Khronos glTF Gaussian Splatting extension](https://www.ogc.org/blog-article/ogc-khronos-and-geospatial-leaders-add-3d-gaussian-splats-to-the-gltf-asset-standard/)
- [SOG web implementation guide](https://reading.torqsoftware.com/notes/software/graphics/gaussian-splatting/2025-11-12-gaussian-splats-web-ready-technical-implementation/)
- [WebGPU vs WebGL splat performance](https://www.emergentmind.com/topics/webgpu-powered-gaussian-splatting)
- [Gaussian splat compression survey (3DGS.zip)](https://arxiv.org/html/2407.09510v3)
- [PRoGS: Progressive Rendering](https://arxiv.org/html/2409.01761v1)
- [LapisGS: Layered Progressive Streaming](https://openreview.net/pdf?id=470WxVD1L3)
