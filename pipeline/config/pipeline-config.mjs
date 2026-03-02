/**
 * Central pipeline configuration.
 *
 * Centralizes all paths, output locations, privacy defaults, layout parameters,
 * and determinism settings used across the data pipeline.
 *
 * Source directories can be overridden via environment variables:
 *   INSTAGRAM_EXPORT_DIR  - Path to Instagram HTML export (default: data-private/instagram)
 *   CARBONMADE_ARCHIVE_DIR - Path to Carbonmade JSON archive (default: carbonmade-archive)
 */

export const PIPELINE_CONFIG = Object.freeze({
  /** Data source directories (overridable via env vars) */
  sources: {
    /** Instagram HTML export (gitignored, private) */
    instagram: {
      dir: process.env.INSTAGRAM_EXPORT_DIR || 'data-private/instagram',
      defaultVisibility: 'friends',
    },
    /** Carbonmade JSON archive (already in repo, read-only) */
    carbonmade: {
      dir: process.env.CARBONMADE_ARCHIVE_DIR || 'carbonmade-archive',
      defaultVisibility: 'public',
    },
    /** Music snapshots (produced by ingest:music, read-only during build) */
    music: {
      dir: process.env.MUSIC_SNAPSHOT_DIR || 'data-private/music',
      defaultVisibility: 'public',
    },
    /** Facebook HTML export (gitignored, private) */
    facebook: {
      dir: process.env.FACEBOOK_EXPORT_DIR || 'data-private/facebook',
      defaultVisibility: 'friends',
    },
  },

  /** Output file paths (generated at build time into public/data/) */
  output: {
    /** Main graph data: nodes, edges, evidence */
    graphFile: 'public/data/constellation.graph.json',
    /** Layout positions computed from graph data */
    layoutFile: 'public/data/constellation.layout.json',
    /** Processed media assets directory */
    mediaDir: 'public/data/media',
  },

  /** Curation and allowlist files (version-controlled) */
  curation: {
    file: 'curation.json',
  },
  allowlist: {
    file: 'allowlist.json',
  },
  /** Identity resolution (username → canonical person mapping) */
  identity: {
    file: 'identity-map.json',
  },

  /** Privacy settings */
  privacy: {
    /** Maximum decimal places for GPS coordinates (2 = ~1.1km precision) */
    gpsMaxDecimals: 2,
    /** Default visibility for new nodes (most restrictive by default) */
    defaultVisibility: 'private',
  },

  /** Helix layout parameters (V2 — continuous angle, compact bands) */
  layout: {
    radius: 34,
    turns: 6,
    verticalStep: 1.35,
    epochBandGap: 1.8,
    jitterRadial: 0.6,
    jitterAxial: 0.25,
    seed: 42,
  },

  /** Determinism settings */
  determinism: {
    seed: 42,
  },
});
