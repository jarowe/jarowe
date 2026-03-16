/**
 * Takeover Registry
 *
 * Each entry describes a campaign that can live at a permanent slugged URL
 * and optionally take over the homepage.
 *
 * Adding a future campaign = add a folder + add an entry here.  Zero changes
 * to App.jsx or the routing system.
 */

const registry = [
  {
    id: 'bitb-2026',
    slug: 'boy-in-the-bubble',
    previewBasePath: '/music/boy-in-the-bubble',

    /* lazy-load the heavy config only when a campaign route mounts */
    loadConfig: () => import('./bitb/config.js'),

    /* lazy page components — wired by TakeoverRouter / App.jsx */
    pages: {
      landing: () => import('../../pages/release/bitb/ReleaseLandingPage.jsx'),
      artist:  () => import('../../pages/release/bitb/ArtistPage.jsx'),
      epk:     () => import('../../pages/release/bitb/EpkPage.jsx'),
    },

    /* chrome rules applied when any campaign route is active */
    chrome: {
      hideNavbar: true,
      hideGlobalPlayer: true,
      hideGameOverlay: true,
      disableHolidayBodyFx: true,
      bodyClass: 'release-bitb',
    },

    /* static fallback when Supabase is unavailable */
    defaultState: {
      exposure_mode: 'preview',   // preview | takeover | archived
      rollout_phase: 'pre-single', // pre-single | single-live | pre-album | album-live
    },
  },
];

/* ── helpers ─────────────────────────────────────────────── */

export function getTakeoverById(id) {
  return registry.find(t => t.id === id) ?? null;
}

export function getTakeoverBySlug(slug) {
  return registry.find(t => t.slug === slug) ?? null;
}

export function getActiveTakeover() {
  // For now returns the first entry.  When Supabase runtime state
  // is wired, this will resolve via useTakeoverState() instead.
  return registry[0] ?? null;
}

export default registry;
