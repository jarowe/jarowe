import { create } from 'zustand';
import { loadConstellationData } from './data/loader';

/** In-flight promise for deduplication (StrictMode double-invoke). */
let _loadPromise = null;

const useConstellationStore = create((set, get) => ({
  // ---- Data (loaded via loader) ----
  nodes: [],
  edges: [],
  epochs: [],
  dataLoading: false,
  dataLoaded: false,
  dataError: null,

  loadData: async ({ force = false } = {}) => {
    const state = get();
    if (state.dataLoaded && !force) return;
    if (_loadPromise && !force) return _loadPromise;

    set({ dataLoading: true, dataError: null });

    _loadPromise = loadConstellationData()
      .then((data) => {
        set({
          nodes: data.nodes,
          edges: data.edges,
          epochs: data.epochs,
          dataLoading: false,
          dataLoaded: true,
          dataError: null,
        });
      })
      .catch((err) => {
        set({
          dataLoading: false,
          dataLoaded: false,
          dataError: err.message || 'Failed to load constellation data',
        });
      })
      .finally(() => {
        _loadPromise = null;
      });

    return _loadPromise;
  },

  // View mode: '3d' | '2d'
  viewMode: '3d', // always start in 3D — user can toggle to 2D
  setViewMode: (mode) => {
    localStorage.setItem('constellation-view', mode);
    set({ viewMode: mode });
  },

  // Camera mode: 'helix' (side view) | 'tunnel' (inside the helix looking along axis)
  cameraMode: 'helix',
  tunnelY: 0,
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setTunnelY: (y) => set({ tunnelY: y }),

  // GPU tier (set once on mount by GPUDetector)
  gpuTier: null,
  setGpuTier: (tier) => set({ gpuTier: tier }),

  // Node interaction
  focusedNodeId: null,
  hoveredNodeIdx: null,
  filterEntity: null,

  focusNode: (id) => {
    console.warn('[constellation] focusNode →', id, new Error().stack?.split('\n').slice(1, 4).join(' ← '));
    set({ focusedNodeId: id });
  },
  clearFocus: () => {
    console.warn('[constellation] clearFocus called!', new Error().stack?.split('\n').slice(1, 4).join(' ← '));
    set({ focusedNodeId: null, filterEntity: null });
  },
  setHoveredNode: (idx) => set({ hoveredNodeIdx: idx }),
  setFilterEntity: (entity) => set({ filterEntity: entity }),
  clearFilter: () => set({ filterEntity: null }),

  // Derived: panelOpen is true when a node is focused
  get panelOpen() {
    return this.focusedNodeId !== null;
  },

  // Lightbox
  lightboxMedia: null,
  lightboxIndex: 0,
  openLightbox: (media, index = 0) =>
    set({ lightboxMedia: media, lightboxIndex: index }),
  closeLightbox: () => set({ lightboxMedia: null, lightboxIndex: 0 }),

  // Timeline scrubber position (0-1 normalized)
  timelinePosition: 0,
  setTimelinePosition: (t) => set({ timelinePosition: t }),
}));

// Selector for panelOpen (derived state)
export const selectPanelOpen = (state) => state.focusedNodeId !== null;

// Listen for admin curation changes and reload data
if (typeof window !== 'undefined') {
  window.addEventListener('constellation-data-changed', () => {
    useConstellationStore.getState().loadData({ force: true });
  });
  // Expose store for Playwright tests
  window.__constellationStore = useConstellationStore;
}

export { useConstellationStore };
