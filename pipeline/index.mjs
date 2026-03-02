#!/usr/bin/env node

/**
 * Pipeline orchestrator: parse -> curation -> visibility -> privacy -> connect -> layout -> emit -> validate
 *
 * Produces:
 *   - public/data/constellation.graph.json  (nodes, edges, epochs)
 *   - public/data/constellation.layout.json  (positions, helixParams, bounds)
 *   - public/data/pipeline-status.json       (runtime metadata, NOT in constellation data)
 *
 * IMPORTANT per user decision:
 *   - curation.json is READ-ONLY input (never written by pipeline)
 *   - All arrays sorted before serialization for determinism
 *   - deterministicStringify for all output files
 *   - No Math.random() -- seeded PRNG only
 *   - No timestamps in constellation data (only in pipeline-status.json)
 *   - Privacy audit is the LAST step before declaring success (fail-closed)
 *
 * Pipeline execution order:
 *   1. Parse (Instagram + Carbonmade) -- parsers set default visibility
 *   2. Curation (read-only: hidden list + visibility overrides)
 *   3. Visibility tier refinement (allowlist enforcement, most-restrictive-wins)
 *   3b. Minors guard (strip last names, remove GPS, redact blocked patterns)
 *   4. Allowlist name processing (replace non-public names with generic labels)
 *   6. Filter private nodes (remove from output)
 *   7. EXIF strip + GPS redact
 *   8. Edge generation
 *   9. Layout computation
 *  10. Build output JSON
 *  11. Schema validation (fail on invalid)
 *  12. Privacy audit (FAIL-CLOSED on any violation)
 *  13. Write output files
 *  14. Write pipeline-status.json
 *
 * Exit codes: 0 = success, 1 = privacy violation / schema error / failure
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Pipeline modules
import { parseInstagram } from './parsers/instagram.mjs';
import { parseCarbonmade } from './parsers/carbonmade.mjs';
import { parseMusic } from './parsers/music.mjs';
import { generateEdges } from './edges/edge-generator.mjs';
import { computePipelineLayout } from './layout/helix.mjs';
import { stripAndVerify } from './privacy/exif-stripper.mjs';
import { redactGPS } from './privacy/gps-redactor.mjs';
import { assignVisibility, applyAllowlist, filterPrivateNodes, filterPublicOnly, pruneOrphanEdges } from './privacy/visibility.mjs';
import { isMinor, enforceMinorsPolicy } from './privacy/minors-guard.mjs';
import { auditPrivacy } from './validation/privacy-audit.mjs';
import { validateSchema } from './validation/schema-validator.mjs';
import { getEpochConfig } from './config/epochs.mjs';
import { PIPELINE_CONFIG } from './config/pipeline-config.mjs';
import { deterministicStringify } from './utils/deterministic.mjs';
import { createLogger, printLogSummary } from './utils/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const log = createLogger('orchestrator');

/** Publish mode: --publish flag produces public-only output for deployment */
const PUBLISH_MODE = process.argv.includes('--publish');

// ---------------------------------------------------------------------------
// Phase helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a path relative to the project root.
 * @param {string} relPath - Relative path
 * @returns {string} Absolute path
 */
function resolve(relPath) {
  return path.resolve(PROJECT_ROOT, relPath);
}

/**
 * Read a JSON file, returning null if it does not exist.
 * @param {string} filePath - Absolute path to JSON file
 * @returns {Promise<Object|null>}
 */
async function readJsonOrNull(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();
  log.info(`Pipeline starting...${PUBLISH_MODE ? ' (PUBLISH MODE -- public-only output)' : ''}`);

  // ========================================================================
  // Pre-flight: Snapshot last good output for resilience
  // ========================================================================
  const graphFilePath = resolve(PIPELINE_CONFIG.output.graphFile);
  const layoutFilePath = resolve(PIPELINE_CONFIG.output.layoutFile);
  const statusFilePath = resolve('public/data/pipeline-status.json');

  let lastGoodGraph = null;
  let lastGoodLayout = null;

  try {
    lastGoodGraph = await fs.readFile(graphFilePath, 'utf8');
    lastGoodLayout = await fs.readFile(layoutFilePath, 'utf8');
    log.info('Snapshotted last good output for resilience');
  } catch {
    log.info('No existing output files -- first run');
  }

  /**
   * Write failure status and exit. Last good output files are NOT overwritten.
   * @param {string} errorMsg - Human-readable failure description
   * @param {number} exitCode - Process exit code (1=privacy, 2=empty data)
   */
  async function failPipeline(errorMsg, exitCode = 1) {
    log.error(`Pipeline FAILED: ${errorMsg}`);

    // Ensure output directory exists for status file
    const outputDir = path.dirname(statusFilePath);
    await fs.mkdir(outputDir, { recursive: true });

    const failureStatus = {
      lastRun: new Date().toISOString(),
      status: 'failed',
      error: errorMsg,
    };

    await fs.writeFile(
      statusFilePath,
      JSON.stringify(failureStatus, null, 2) + '\n',
      'utf8'
    );
    log.info('Written: pipeline-status.json (failure)');
    log.info('Last good output files preserved (not overwritten)');
    printLogSummary();
    process.exit(exitCode);
  }

  try {

  // ========================================================================
  // Phase 1: PARSE
  // ========================================================================
  log.info('--- Phase 1: Parse ---');

  const instagramDir = resolve(PIPELINE_CONFIG.sources.instagram.dir);
  const carbonmadeDir = resolve(PIPELINE_CONFIG.sources.carbonmade.dir);
  const musicDir = resolve(PIPELINE_CONFIG.sources.music.dir);

  const [instagramResult, carbonmadeResult, musicResult] = await Promise.all([
    parseInstagram(instagramDir),
    parseCarbonmade(carbonmadeDir),
    parseMusic(musicDir),
  ]);

  let allNodes = [
    ...instagramResult.nodes,
    ...carbonmadeResult.nodes,
    ...musicResult.nodes,
  ];

  // Apply source-level default visibility from pipeline config
  const sourceVisDefaults = {
    instagram: PIPELINE_CONFIG.sources.instagram.defaultVisibility,
    carbonmade: PIPELINE_CONFIG.sources.carbonmade.defaultVisibility,
    suno: PIPELINE_CONFIG.sources.music.defaultVisibility,
    soundcloud: PIPELINE_CONFIG.sources.music.defaultVisibility,
  };
  for (const node of allNodes) {
    const srcDefault = sourceVisDefaults[node.source];
    if (srcDefault && node.visibility === 'private') {
      node.visibility = srcDefault;
    }
  }

  log.info(
    `Parsed ${allNodes.length} total nodes ` +
    `(Instagram: ${instagramResult.nodes.length}, Carbonmade: ${carbonmadeResult.nodes.length}, Music: ${musicResult.nodes.length})`
  );

  if (allNodes.length === 0) {
    await failPipeline('Pipeline produced zero nodes', 0);
  }

  // ========================================================================
  // Phase 2: CURATION (read-only input)
  // ========================================================================
  log.info('--- Phase 2: Curation ---');

  const curationFile = resolve(PIPELINE_CONFIG.curation.file);
  const curation = await readJsonOrNull(curationFile);

  // Extract curation overrides for the visibility phase
  let curationVisibilityOverrides = {};

  if (curation) {
    // Handle the new curation.json format: { hidden: [], visibility_overrides: {} }
    const hiddenIds = new Set(curation.hidden || []);
    curationVisibilityOverrides = curation.visibility_overrides || {};

    // Also support legacy format: { nodes: { [id]: { hidden, visibility } } }
    if (curation.nodes) {
      for (const [nodeId, override] of Object.entries(curation.nodes)) {
        if (override.hidden === true) {
          hiddenIds.add(nodeId);
        }
        if (override.visibility) {
          curationVisibilityOverrides[nodeId] = override.visibility;
        }
      }
    }

    // Remove hidden nodes
    const beforeCount = allNodes.length;
    allNodes = allNodes.filter(n => !hiddenIds.has(n.id));
    const hiddenCount = beforeCount - allNodes.length;

    if (hiddenCount > 0) {
      log.info(`Curation: ${hiddenCount} nodes hidden, ${allNodes.length} visible`);
    }

    log.info(
      `Loaded curation.json: ${hiddenIds.size} hidden IDs, ` +
      `${Object.keys(curationVisibilityOverrides).length} visibility overrides`
    );
  } else {
    log.info('No curation.json found -- all nodes visible by default');
  }

  // Load allowlist for privacy phases
  const allowlistFile = resolve(PIPELINE_CONFIG.allowlist.file);
  const allowlist = await readJsonOrNull(allowlistFile) || {
    public: [],
    friends: [],
    minors: { firstNames: [], blockedPatterns: [] },
  };

  log.info(
    `Loaded allowlist: ${allowlist.public?.length || 0} public, ` +
    `${allowlist.friends?.length || 0} friends, ` +
    `${allowlist.minors?.firstNames?.length || 0} minors`
  );

  // ========================================================================
  // Phase 3: VISIBILITY REFINEMENT (Phase 2 of two-phase visibility)
  // ========================================================================
  log.info('--- Phase 3: Visibility Refinement ---');

  // Apply visibility refinement to all nodes (most-restrictive-wins)
  for (const node of allNodes) {
    node.visibility = assignVisibility(node, allowlist, curationVisibilityOverrides);
  }

  // ========================================================================
  // Phase 3b: MINORS GUARD (must run BEFORE allowlist name replacement)
  // ========================================================================
  log.info('--- Phase 3b: Minors Guard ---');

  let minorsProtected = 0;
  for (const node of allNodes) {
    const before = node._isMinor;
    enforceMinorsPolicy(node, allowlist);
    if (!before && node._isMinor) minorsProtected++;
  }

  log.info(`Minors guard: ${minorsProtected} node(s) had minors policy applied`);

  // Apply allowlist name processing (replace non-public names with generic labels)
  // Runs AFTER minors guard so minor names are detected before genericization
  applyAllowlist(allNodes, allowlist);

  // ========================================================================
  // Phase 5: FILTER BY VISIBILITY
  // ========================================================================
  if (PUBLISH_MODE) {
    log.info('--- Phase 5: Filter Public-Only (publish mode) ---');
    allNodes = filterPublicOnly(allNodes);
  } else {
    log.info('--- Phase 5: Filter Private Nodes ---');
    allNodes = filterPrivateNodes(allNodes);
  }

  // ========================================================================
  // Phase 6: PRIVACY (EXIF + GPS)
  // ========================================================================
  log.info('--- Phase 6: Privacy (EXIF + GPS) ---');

  const outputMediaDir = resolve(PIPELINE_CONFIG.output.mediaDir);
  let mediaProcessed = 0;
  let mediaSkipped = 0;

  for (const node of allNodes) {
    // Process media files (EXIF stripping)
    if (node.media && node.media.length > 0) {
      const processedMedia = [];

      for (const mediaPath of node.media) {
        // Only process local files (not CDN URLs)
        if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
          processedMedia.push(mediaPath);
          continue;
        }

        // Check if source file exists (try project root, then public/)
        let sourceAbsolute = path.isAbsolute(mediaPath)
          ? mediaPath
          : resolve(mediaPath);

        let foundInPublic = false;
        try {
          await fs.access(sourceAbsolute);
        } catch {
          // Try resolving relative to public/ (for junction-served media like Instagram)
          const publicPath = resolve('public', mediaPath);
          try {
            await fs.access(publicPath);
            sourceAbsolute = publicPath;
            foundInPublic = true;
          } catch {
            // Source media not available -- skip
            log.warn(`Media file not available: ${mediaPath} (node: ${node.id})`);
            mediaSkipped++;
            continue;
          }
        }

        // If already served from public/ (e.g. Instagram junction), pass through as-is
        if (foundInPublic) {
          processedMedia.push(mediaPath);
          mediaProcessed++;
          continue;
        }

        // Compute output path and strip EXIF
        const relativeName = path.basename(mediaPath);
        const outputPath = path.join(outputMediaDir, node.id, relativeName);

        const result = await stripAndVerify(sourceAbsolute, outputPath);
        if (result) {
          // Store path relative to public/
          const relativeToPublic = path.relative(resolve('public'), outputPath).replace(/\\/g, '/');
          processedMedia.push(`/${relativeToPublic}`);
          mediaProcessed++;
        } else {
          mediaSkipped++;
        }
      }

      node.media = processedMedia;
    }

    // GPS redaction based on visibility tier and minor status
    if (node.location) {
      const nodeIsMinor = node._isMinor === true;
      const redacted = redactGPS(
        node.location?.lat,
        node.location?.lng,
        node.visibility,
        nodeIsMinor
      );
      node.location = redacted;
    }
  }

  log.info(`Privacy: ${mediaProcessed} media files processed, ${mediaSkipped} skipped`);

  // ========================================================================
  // Phase 7: EDGE GENERATION
  // ========================================================================
  log.info('--- Phase 7: Edge Generation ---');

  let { edges, stats: edgeStats } = await generateEdges(allNodes);

  // Prune any edges referencing nodes that were filtered out
  const survivingIds = new Set(allNodes.map(n => n.id));
  edges = pruneOrphanEdges(edges, survivingIds);

  log.info(
    `Edges: ${edgeStats.edgesCreated} created from ${edgeStats.totalPairs} pairs ` +
    `(${edgeStats.edgesPruned} pruned)`
  );

  // ========================================================================
  // Phase 8: LAYOUT
  // ========================================================================
  log.info('--- Phase 8: Layout ---');

  const { positions, helixParams, bounds } = computePipelineLayout(
    allNodes,
    PIPELINE_CONFIG.layout
  );

  log.info(
    `Layout: ${Object.keys(positions).length} positions computed, ` +
    `bounds Y: [${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`
  );

  // ========================================================================
  // Phase 9: BUILD OUTPUT
  // ========================================================================
  log.info('--- Phase 9: Build Output ---');

  // Sort nodes by id for deterministic output
  const sortedNodes = [...allNodes].sort((a, b) => a.id.localeCompare(b.id));

  // Sort edges by source + target
  const sortedEdges = [...edges].sort((a, b) => {
    const cmp = a.source.localeCompare(b.source);
    if (cmp !== 0) return cmp;
    return a.target.localeCompare(b.target);
  });

  // Build epoch config
  const epochs = getEpochConfig();

  // Build graph JSON
  const graphData = {
    nodes: sortedNodes,
    edges: sortedEdges,
    epochs,
  };

  // Build layout JSON
  const layoutData = {
    positions,
    helixParams,
    bounds,
  };

  // ========================================================================
  // Phase 10: SCHEMA VALIDATION
  // ========================================================================
  log.info('--- Phase 10: Schema Validation ---');

  const { valid: schemaValid, errors: schemaErrors } = validateSchema(graphData, layoutData);

  if (!schemaValid) {
    const errDesc = `Schema validation failed: ${schemaErrors.join('; ')}`;
    await failPipeline(errDesc, 1);
  }

  // ========================================================================
  // Phase 11: PRIVACY AUDIT (fail-closed, LAST step before write)
  // ========================================================================
  log.info('--- Phase 11: Privacy Audit ---');

  const { violations, warnings: privacyWarnings } = auditPrivacy(graphData, {
    allowlist,
    gpsMaxDecimals: PIPELINE_CONFIG.privacy.gpsMaxDecimals,
    publishMode: PUBLISH_MODE,
  });

  if (violations.length > 0) {
    const errDesc = `Privacy audit failed: ${violations.length} violation(s) -- ${violations[0]}`;
    await failPipeline(errDesc, 1);
  }

  // ========================================================================
  // Phase 12: WRITE OUTPUT FILES
  // ========================================================================
  log.info('--- Phase 12: Write Output ---');

  // Ensure output directory exists
  const outputDir = path.dirname(graphFilePath);
  await fs.mkdir(outputDir, { recursive: true });

  // Write constellation files with deterministic serialization
  const graphJson = deterministicStringify(graphData);
  const layoutJson = deterministicStringify(layoutData);

  await Promise.all([
    fs.writeFile(graphFilePath, graphJson + '\n', 'utf8'),
    fs.writeFile(layoutFilePath, layoutJson + '\n', 'utf8'),
  ]);

  // ========================================================================
  // Phase 13: PIPELINE STATUS (runtime metadata)
  // ========================================================================

  // Compute stats by source, type, and visibility
  const bySource = {};
  const byType = {};
  const byVisibility = {};

  for (const node of sortedNodes) {
    bySource[node.source] = (bySource[node.source] || 0) + 1;
    byType[node.type] = (byType[node.type] || 0) + 1;
    byVisibility[node.visibility] = (byVisibility[node.visibility] || 0) + 1;
  }

  // Compute factuality breakdown
  const byFactuality = {};
  for (const node of sortedNodes) {
    const f = node.factuality || 'factual';
    byFactuality[f] = (byFactuality[f] || 0) + 1;
  }

  // Reality gate: track factual node count toward 250 threshold
  const factualCount = sortedNodes.filter(n => (n.factuality || 'factual') === 'factual').length;
  const REALITY_GATE_THRESHOLD = 250;

  // Write pipeline-status.json (runtime artifact, has timestamps -- NOT curation.json)
  const statusData = {
    lastRun: new Date().toISOString(),
    status: 'success',
    publishMode: PUBLISH_MODE,
    stats: {
      nodeCount: sortedNodes.length,
      edgeCount: sortedEdges.length,
      bySource,
      byType,
      byVisibility,
      byFactuality,
      ingestSources: {
        instagram: { status: instagramResult.nodes.length > 0 ? 'active' : 'empty', count: instagramResult.nodes.length },
        carbonmade: { status: carbonmadeResult.nodes.length > 0 ? 'active' : 'empty', count: carbonmadeResult.nodes.length },
        music: { status: musicResult.nodes.length > 0 ? 'active' : 'empty', count: musicResult.nodes.length },
      },
      privacyAudit: {
        violations: 0,
        warnings: privacyWarnings.length,
      },
      realityGate: {
        factualNodes: factualCount,
        threshold: REALITY_GATE_THRESHOLD,
        passed: factualCount >= REALITY_GATE_THRESHOLD,
        progress: `${factualCount}/${REALITY_GATE_THRESHOLD}`,
      },
    },
  };

  await fs.writeFile(
    statusFilePath,
    JSON.stringify(statusData, null, 2) + '\n',
    'utf8'
  );

  // File size reporting
  const graphSize = Buffer.byteLength(graphJson, 'utf8');
  const layoutSize = Buffer.byteLength(layoutJson, 'utf8');

  log.info(`Written: constellation.graph.json (${(graphSize / 1024).toFixed(1)} KB, ${sortedNodes.length} nodes, ${sortedEdges.length} edges)`);
  log.info(`Written: constellation.layout.json (${(layoutSize / 1024).toFixed(1)} KB, ${Object.keys(positions).length} positions)`);
  log.info(`Written: pipeline-status.json`);

  // ========================================================================
  // Summary
  // ========================================================================
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  log.info('');
  log.info('=== Pipeline Complete ===');
  log.info(`Duration: ${duration}s`);
  log.info(`Nodes: ${sortedNodes.length} (${Object.entries(bySource).map(([k, v]) => `${k}: ${v}`).join(', ')})`);
  log.info(`Edges: ${sortedEdges.length} (${edgeStats.edgesPruned} pruned)`);
  log.info(`Types: ${Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  log.info(`Visibility: ${Object.entries(byVisibility).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
  log.info(`Media: ${mediaProcessed} processed, ${mediaSkipped} skipped`);
  log.info(`Privacy: 0 violations, ${privacyWarnings.length} warnings`);

  printLogSummary();

  process.exit(0);

  } catch (err) {
    // Unexpected error -- preserve last good output, write failure status
    await failPipeline(`Unexpected error: ${err.message}`, 1);
  }
}

// Run
main().catch(err => {
  log.error(`Pipeline failed: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
