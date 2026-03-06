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
 *   1.   Parse (Instagram + Carbonmade + Music + Facebook)
 *   1.5  Identity resolution (username → canonical name)
 *   2.   Curation (read-only: hidden list + visibility overrides)
 *   3.   Visibility tier refinement (allowlist enforcement, most-restrictive-wins)
 *   3b.  Minors guard (strip last names, remove GPS, redact blocked patterns)
 *   4.   Allowlist name processing (replace non-public names with generic labels)
 *   5.   Filter private nodes (remove from output)
 *   6.   EXIF strip + GPS redact
 *   6.5  Motif extraction
 *   6.7  Significance scoring (multi-dimensional)
 *   7.   Edge generation (with identity signals)
 *   7.5  Connection-degree significance update
 *   8.   Layout computation
 *   9.   Build output JSON
 *  10.   Schema validation (fail on invalid)
 *  11.   Privacy audit (FAIL-CLOSED on any violation)
 *  12.   Write output files
 *  13.   Write pipeline-status.json
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
import { parseFacebook } from './parsers/facebook.mjs';
import { parseMilestones } from './parsers/milestones.mjs';
import { loadIdentityMap, resolvePeopleArray } from './identity/registry.mjs';
import { computeAllSignificance, sizeFromSignificance } from './scoring/significance.mjs';
import { generateEdges } from './edges/edge-generator.mjs';
import { extractAllMotifs } from './edges/motifs.mjs';
import { computePipelineLayout } from './layout/helix.mjs';
import { stripAndVerify } from './privacy/exif-stripper.mjs';
import { redactGPS } from './privacy/gps-redactor.mjs';
import { assignVisibility, applyAllowlist, filterPrivateNodes, filterPublicOnly, pruneOrphanEdges } from './privacy/visibility.mjs';
import { filterLowQualityNodes } from './filters/content-quality.mjs';
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
  const facebookDir = resolve(PIPELINE_CONFIG.sources.facebook.dir);
  const milestonesDir = resolve(PIPELINE_CONFIG.sources.milestones.dir);

  const [instagramResult, carbonmadeResult, musicResult, facebookResult, milestonesResult] = await Promise.all([
    parseInstagram(instagramDir),
    parseCarbonmade(carbonmadeDir),
    parseMusic(musicDir),
    parseFacebook(facebookDir),
    parseMilestones(milestonesDir),
  ]);

  let allNodes = [
    ...instagramResult.nodes,
    ...carbonmadeResult.nodes,
    ...musicResult.nodes,
    ...facebookResult.nodes,
    ...milestonesResult.nodes,
  ];

  // Apply source-level default visibility from pipeline config
  const sourceVisDefaults = {
    instagram: PIPELINE_CONFIG.sources.instagram.defaultVisibility,
    carbonmade: PIPELINE_CONFIG.sources.carbonmade.defaultVisibility,
    suno: PIPELINE_CONFIG.sources.music.defaultVisibility,
    soundcloud: PIPELINE_CONFIG.sources.music.defaultVisibility,
    facebook: PIPELINE_CONFIG.sources.facebook.defaultVisibility,
    manual: PIPELINE_CONFIG.sources.milestones.defaultVisibility,
  };
  for (const node of allNodes) {
    const srcDefault = sourceVisDefaults[node.source];
    if (srcDefault && node.visibility === 'private') {
      node.visibility = srcDefault;
    }
  }

  log.info(
    `Parsed ${allNodes.length} total nodes ` +
    `(Instagram: ${instagramResult.nodes.length}, Carbonmade: ${carbonmadeResult.nodes.length}, ` +
    `Music: ${musicResult.nodes.length}, Facebook: ${facebookResult.nodes.length}, ` +
    `Milestones: ${milestonesResult.nodes.length})`
  );

  if (allNodes.length === 0) {
    await failPipeline('Pipeline produced zero nodes', 0);
  }

  // ========================================================================
  // Phase 1.5: IDENTITY RESOLUTION
  // ========================================================================
  log.info('--- Phase 1.5: Identity Resolution ---');

  const identityMap = await loadIdentityMap(
    resolve(PIPELINE_CONFIG.identity?.file || 'identity-map.json')
  );

  let identityResolved = 0;
  let identityUnresolved = 0;

  for (const node of allNodes) {
    if (node.entities?.people?.length > 0) {
      const before = [...node.entities.people];
      node.entities.people = resolvePeopleArray(node.entities.people, identityMap);
      for (let i = 0; i < before.length; i++) {
        if (before[i] !== node.entities.people[i]) {
          identityResolved++;
        } else {
          identityUnresolved++;
        }
      }
    }
  }

  log.info(`Identity resolution: ${identityResolved} resolved, ${identityUnresolved} unresolved`);

  // ========================================================================
  // Phase 1.6: AUTHORSHIP FILTER (drop reshared content)
  // ========================================================================
  log.info('--- Phase 1.6: Authorship Filter ---');

  const authorshipCounts = { authored: 0, tagged_external: 0, reshared: 0 };
  for (const node of allNodes) {
    const auth = node.sourceMeta?.authorship || 'authored';
    authorshipCounts[auth] = (authorshipCounts[auth] || 0) + 1;
  }

  const beforeAuthFilter = allNodes.length;
  allNodes = allNodes.filter(n => (n.sourceMeta?.authorship || 'authored') !== 'reshared');
  const resharedDropped = beforeAuthFilter - allNodes.length;

  log.info(
    `Authorship: ${authorshipCounts.authored} authored, ` +
    `${authorshipCounts.tagged_external} tagged_external, ` +
    `${authorshipCounts.reshared} reshared (${resharedDropped} dropped)`
  );

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
  // Phase 4: PUBLISH ROLLUP (promote friends → public for social sources)
  // ========================================================================
  const rollupPromotions = { totalPromoted: 0, bySource: {} };

  if (PUBLISH_MODE && PIPELINE_CONFIG.publishRollup?.enabled) {
    log.info('--- Phase 4: Publish Rollup ---');

    const rollupSources = new Set(PIPELINE_CONFIG.publishRollup.sources || []);

    for (const node of allNodes) {
      if (
        node.visibility === 'friends' &&
        rollupSources.has(node.source) &&
        (node.sourceMeta?.authorship || 'authored') !== 'reshared' &&
        node._isMinor !== true
      ) {
        node.visibility = 'public';
        rollupPromotions.totalPromoted++;
        rollupPromotions.bySource[node.source] = (rollupPromotions.bySource[node.source] || 0) + 1;
      }
    }

    log.info(
      `Publish rollup: ${rollupPromotions.totalPromoted} nodes promoted to public ` +
      `(${Object.entries(rollupPromotions.bySource).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'})`
    );
  }

  // ========================================================================
  // Phase 4.5: CONTENT QUALITY FILTER (drop junk before visibility filter)
  // ========================================================================
  log.info('--- Phase 4.5: Content Quality Filter ---');

  // Build set of protected node IDs (curated overrides, milestones, projects)
  const qualityProtectedIds = new Set([
    ...Object.keys(curation?.significance_overrides || {}),
  ]);

  const qualityResult = filterLowQualityNodes(allNodes, qualityProtectedIds);
  allNodes = qualityResult.kept;

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

      // In publish mode, if node has CDN URLs, skip local media copies (CDN is primary)
      const hasCdnUrls = PUBLISH_MODE && node.media.some(
        m => m.startsWith('http://') || m.startsWith('https://')
      );

      for (const mediaPath of node.media) {
        // Only process local files (not CDN URLs)
        if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
          processedMedia.push(mediaPath);
          continue;
        }

        // In publish mode, skip local copies when CDN URLs exist (avoids committing redundant media)
        if (hasCdnUrls) {
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
          const publicPath = resolve(path.join('public', mediaPath));
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

        // If already served from public/ (e.g. Instagram junction):
        // - In normal mode: pass through as-is (served via junction)
        // - In publish mode: MUST copy through EXIF stripper so files are committed
        if (foundInPublic && !PUBLISH_MODE) {
          processedMedia.push(mediaPath);
          mediaProcessed++;
          continue;
        }

        // Compute output path and strip EXIF
        const relativeName = path.basename(mediaPath);
        const outputPath = path.join(outputMediaDir, node.id, relativeName);

        // Video files can't be processed by sharp — copy directly
        const ext = path.extname(mediaPath).toLowerCase();
        const isVideo = ['.mp4', '.webm', '.mov', '.m4v', '.avi'].includes(ext);

        if (isVideo) {
          // Direct copy for video files (no EXIF GPS concern in video)
          const videoOutputDir = path.dirname(outputPath);
          await fs.mkdir(videoOutputDir, { recursive: true });
          await fs.copyFile(sourceAbsolute, outputPath);
          const relativeToPublic = path.relative(resolve('public'), outputPath).replace(/\\/g, '/');
          processedMedia.push(`/${relativeToPublic}`);
          mediaProcessed++;
        } else {
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
  // Phase 6.5: MOTIF EXTRACTION (powers thematic connections)
  // ========================================================================
  log.info('--- Phase 6.5: Motif Extraction ---');

  const motifStats = extractAllMotifs(allNodes);

  // ========================================================================
  // Phase 6.7: SIGNIFICANCE SCORING
  // ========================================================================
  log.info('--- Phase 6.7: Significance Scoring ---');

  const significanceStats = computeAllSignificance(allNodes);

  // ========================================================================
  // Phase 6.8: TWO-TIER CLASSIFICATION (helix vs particle)
  // ========================================================================
  log.info('--- Phase 6.8: Tier Classification ---');

  const helixThreshold = PIPELINE_CONFIG.tiers?.helixThreshold ?? 0.35;
  let helixCount = 0;
  let particleCount = 0;

  for (const node of allNodes) {
    // Manual milestones have tier pre-set by parser — respect it
    if (node.tier === 'helix') {
      helixCount++;
    } else if (node.type === 'milestone' || node.type === 'project') {
      // Milestones and projects always go on helix regardless of significance
      node.tier = 'helix';
      helixCount++;
    } else if (node.significance >= helixThreshold) {
      node.tier = 'helix';
      helixCount++;
    } else {
      node.tier = 'particle';
      particleCount++;
    }
  }

  log.info(
    `Tier classification: ${helixCount} helix, ${particleCount} particle ` +
    `(threshold: ${helixThreshold})`
  );

  // ========================================================================
  // Phase 7: EDGE GENERATION
  // ========================================================================
  log.info('--- Phase 7: Edge Generation ---');

  let { edges, stats: edgeStats } = await generateEdges(allNodes, identityMap);

  // Prune any edges referencing nodes that were filtered out
  const survivingIds = new Set(allNodes.map(n => n.id));
  edges = pruneOrphanEdges(edges, survivingIds);

  log.info(
    `Edges: ${edgeStats.edgesCreated} created from ${edgeStats.totalPairs} pairs ` +
    `(${edgeStats.edgesPruned} pruned)`
  );

  // ========================================================================
  // Phase 7.5: CONNECTION-DEGREE SIGNIFICANCE UPDATE
  // ========================================================================
  log.info('--- Phase 7.5: Connection-Degree Update ---');

  const maxConnections = Math.max(1, ...allNodes.map(n => n.connections.length));
  for (const node of allNodes) {
    const connectionDegree = node.connections.length / maxConnections;
    node.significance = Number((0.85 * node.significance + 0.15 * connectionDegree).toFixed(2));
    node.size = sizeFromSignificance(node.significance);
  }

  log.info(`Connection-degree blended into significance (max connections: ${maxConnections})`);

  // Apply manual significance overrides from curation.json (AFTER all auto-scoring)
  const significanceOverrides = curation?.significance_overrides || {};
  let overridesApplied = 0;
  for (const [nodeId, override] of Object.entries(significanceOverrides)) {
    const node = allNodes.find(n => n.id === nodeId);
    if (node && typeof override === 'number') {
      node.significance = Math.max(0, Math.min(1, Number(override.toFixed(2))));
      node.size = sizeFromSignificance(node.significance);
      overridesApplied++;
    }
  }
  if (overridesApplied > 0) {
    log.info(`Significance overrides: ${overridesApplied} applied from curation.json`);
  }

  // ========================================================================
  // Phase 8: LAYOUT
  // ========================================================================
  log.info('--- Phase 8: Layout ---');

  const { positions, helixParams, bounds } = computePipelineLayout(
    allNodes,
    PIPELINE_CONFIG.layout,
    PIPELINE_CONFIG.tiers || {}
  );

  log.info(
    `Layout: ${Object.keys(positions).length} positions computed, ` +
    `bounds Y: [${bounds.minY.toFixed(1)}, ${bounds.maxY.toFixed(1)}]`
  );

  // ========================================================================
  // Phase 9: BUILD OUTPUT
  // ========================================================================
  log.info('--- Phase 9: Build Output ---');

  // Strip internal fields before serialization, persist primary motif as theme
  for (const node of allNodes) {
    node.theme = node._motifs?.[0]?.id || null;
    delete node._motifs;
    delete node._isMinor;
  }

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

  // Compute authorship breakdown
  const byAuthorship = {};
  for (const node of sortedNodes) {
    const a = node.sourceMeta?.authorship || 'authored';
    byAuthorship[a] = (byAuthorship[a] || 0) + 1;
  }

  // Compute significance tier breakdown
  const bySignificanceTier = { low: 0, medium: 0, high: 0, exceptional: 0 };
  for (const node of sortedNodes) {
    const sig = node.significance ?? 0.5;
    if (sig < 0.3) bySignificanceTier.low++;
    else if (sig < 0.6) bySignificanceTier.medium++;
    else if (sig < 0.85) bySignificanceTier.high++;
    else bySignificanceTier.exceptional++;
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
        facebook: { status: facebookResult.nodes.length > 0 ? 'active' : 'empty', count: facebookResult.nodes.length },
        milestones: { status: milestonesResult.nodes.length > 0 ? 'active' : 'empty', count: milestonesResult.nodes.length },
      },
      edgeQuality: {
        avgConnectionsPerNode: edgeStats.avgConnectionsPerNode,
        crossSourceEdges: edgeStats.crossSourceEdges,
        crossSourceRatio: edgeStats.crossSourceRatio,
        isolatedNodes: edgeStats.isolatedNodes,
        signalDistribution: edgeStats.signalDistribution,
      },
      byAuthorship,
      bySignificanceTier,
      significanceOverridesApplied: overridesApplied,
      rollupPromotions: {
        totalPromoted: rollupPromotions.totalPromoted,
        bySource: rollupPromotions.bySource,
        publishMode: PUBLISH_MODE,
      },
      byTier: {
        helix: sortedNodes.filter(n => n.tier === 'helix').length,
        particle: sortedNodes.filter(n => n.tier === 'particle').length,
        helixThreshold,
      },
      contentQuality: qualityResult.stats,
      motifs: motifStats.motifDistribution,
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
