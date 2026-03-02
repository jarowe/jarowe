/**
 * Facebook HTML export parser.
 *
 * Parses Meta "Download Your Information" HTML export files into
 * canonical constellation nodes. Handles timeline posts, photos/videos,
 * and life events from the Facebook export ZIP structure.
 *
 * Expected export structure (Meta ZIP → extracted HTML):
 *   posts/your_posts_*.html       — Timeline posts
 *   photos_and_videos/album/      — Photo albums with HTML indices
 *   profile_information/           — Life events
 *   your_activity_across_facebook/ — Activity logs
 *
 * Won't parse: messages, comments, marketplace items.
 *
 * Graceful: returns empty results when export directory doesn't exist.
 */

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { parse as dateParse, isValid as isValidDate, format } from 'date-fns';
import { createCanonicalNode } from '../schemas/canonical.mjs';
import { assignEpoch } from '../config/epochs.mjs';
import { sortedGlob } from '../utils/deterministic.mjs';
import { createLogger } from '../utils/logger.mjs';

const log = createLogger('facebook');

// ─── Excluded directories (never parse these) ───────────────────────────
const EXCLUDED_DIRS = new Set([
  'messages', 'comments_and_reactions', 'marketplace',
  'ads_information', 'apps_and_websites', 'security_and_login_information',
  'other_logged_information', 'search', 'notifications',
]);

// ─── Date formats used in Facebook HTML exports ─────────────────────────
const DATE_FORMATS = [
  'MMMM d, yyyy h:mm a',        // "January 15, 2023 3:45 PM"
  'MMMM d, yyyy, h:mm a',       // "January 15, 2023, 3:45 PM"
  'MMM d, yyyy h:mm a',          // "Jan 15, 2023 3:45 PM"
  'MMM d, yyyy, h:mm a',         // "Jan 15, 2023, 3:45 PM"
  'MMMM d, yyyy',                // "January 15, 2023"
  'MMM d, yyyy',                 // "Jan 15, 2023"
  'yyyy-MM-dd',                  // "2023-01-15"
];

/**
 * Attempt to parse a date string using multiple format strategies.
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  if (!cleaned) return null;

  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = dateParse(cleaned, fmt, new Date(2020, 0, 1));
      if (isValidDate(parsed) && !isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        if (year >= 2000 && year <= 2040) {
          return format(parsed, 'yyyy-MM-dd');
        }
      }
    } catch { /* try next */ }
  }

  // Fallback: native Date parse
  const directDate = new Date(cleaned);
  if (isValidDate(directDate) && !isNaN(directDate.getTime())) {
    const year = directDate.getFullYear();
    if (year >= 2000 && year <= 2040) {
      return format(directDate, 'yyyy-MM-dd');
    }
  }

  return null;
}

/**
 * Generate a deterministic sourceId from post content.
 */
function generateSourceId(text, dateStr, fileName, index) {
  const base = `fb_${dateStr || 'nodate'}_${path.basename(fileName, '.html')}_${index}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash = hash & hash;
  }
  return `fb_${Math.abs(hash).toString(36)}`;
}

/**
 * Classify authorship for a Facebook post.
 */
function classifyFbAuthorship(postText, isTaggedIn) {
  if (isTaggedIn) {
    return { authorship: 'tagged_external', isOwned: true, reason: 'tagged in post' };
  }
  return { authorship: 'authored', isOwned: true, reason: null };
}

/**
 * Discover parseable HTML files (skip excluded directories).
 */
async function discoverFbFiles(exportDir) {
  const found = [];

  // Look for posts directory
  const postPaths = ['posts', 'your_posts'];
  for (const sub of postPaths) {
    const dir = path.join(exportDir, sub);
    try {
      await fs.access(dir);
      const files = await sortedGlob('**/*.html', { cwd: dir });
      for (const f of files) {
        found.push({ path: path.join(dir, f), type: 'post' });
      }
    } catch { /* dir doesn't exist */ }
  }

  // Look for photos
  const photoPaths = ['photos_and_videos', 'photos'];
  for (const sub of photoPaths) {
    const dir = path.join(exportDir, sub);
    try {
      await fs.access(dir);
      const files = await sortedGlob('**/*.html', { cwd: dir });
      for (const f of files) {
        found.push({ path: path.join(dir, f), type: 'photo' });
      }
    } catch { /* dir doesn't exist */ }
  }

  // Look for life events
  const eventPaths = ['profile_information'];
  for (const sub of eventPaths) {
    const dir = path.join(exportDir, sub);
    try {
      await fs.access(dir);
      const files = await sortedGlob('**/*.html', { cwd: dir });
      for (const f of files) {
        found.push({ path: path.join(dir, f), type: 'life_event' });
      }
    } catch { /* dir doesn't exist */ }
  }

  return found;
}

/**
 * Extract posts from a Facebook HTML file.
 *
 * Facebook HTML exports use a div-based structure with CSS classes.
 * Common patterns:
 *   - Post container: div with timestamp + content divs
 *   - Date: text nodes with "Month Day, Year Time" format
 *   - Content: nested div with post text
 *   - Media: img/video elements with relative src paths
 *   - Tagged: "with [Name]" or "was tagged" text patterns
 */
function extractFbPosts($, fileName, fileType) {
  const posts = [];

  // Facebook HTML exports use div-based containers
  // Try multiple selector strategies
  const containerSelectors = [
    'div._a6-g',           // Modern Meta export format
    'div[role="article"]', // Semantic
    'div._2ph_',           // Older format
  ];

  let $containers = $();
  for (const sel of containerSelectors) {
    $containers = $(sel);
    if ($containers.length > 0) break;
  }

  // Fallback: look for divs inside main or body
  if ($containers.length === 0) {
    $containers = $('main > div, body > div > div');
  }

  $containers.each((i, el) => {
    const $post = $(el);
    const text = $post.text()?.trim() || '';
    if (!text || text.length < 5) return;

    // Extract date
    let dateStr = null;
    const datePatterns = [
      /(\w+ \d{1,2}, \d{4},?\s+\d{1,2}:\d{2}\s*[AP]M)/i,
      /(\w+ \d{1,2}, \d{4})/i,
      /(\d{4}-\d{2}-\d{2})/,
    ];
    for (const pat of datePatterns) {
      const match = text.match(pat);
      if (match) {
        dateStr = parseDate(match[1]);
        if (dateStr) break;
      }
    }

    if (!dateStr) return; // Skip undateable posts

    // Extract caption/content (first substantial text block)
    let caption = '';
    $post.find('div').each((_, div) => {
      const divText = $(div).text()?.trim() || '';
      if (divText.length > 10 && divText.length < 5000 && !caption) {
        caption = divText;
      }
    });
    if (!caption) caption = text.slice(0, 300);

    // Extract media
    const media = [];
    $post.find('img[src], video source[src], video[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('data:') && !src.includes('profile')) {
        if (!media.includes(src)) media.push(src);
      }
    });

    // Check if tagged
    const isTaggedIn = /was tagged/i.test(text) || /tagged you/i.test(text);

    // Extract people mentions ("with Name1 and Name2")
    const people = [];
    const withMatch = text.match(/with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (withMatch) {
      people.push(withMatch[1]);
    }

    const ownership = classifyFbAuthorship(text, isTaggedIn);

    posts.push({
      caption: caption.slice(0, 300),
      dateStr,
      media,
      people,
      ownership,
      fileType,
    });
  });

  return posts;
}

/**
 * Parse Facebook HTML export directory into canonical constellation nodes.
 *
 * @param {string} exportDir - Path to Facebook export root directory
 * @param {Object} options - Parser options
 * @returns {Promise<{nodes: Object[], stats: Object}>} Parsed nodes and stats
 */
export async function parseFacebook(exportDir, options = {}) {
  const stats = {
    total: 0,
    parsed: 0,
    skipped: 0,
    files: 0,
    warnings: [],
  };

  // Graceful return when export directory doesn't exist
  try {
    await fs.access(exportDir);
  } catch {
    log.info(`Facebook export directory not found: ${exportDir} — skipping`);
    return { nodes: [], stats };
  }

  // Discover HTML files
  const htmlFiles = await discoverFbFiles(exportDir);

  if (htmlFiles.length === 0) {
    log.info('No parseable Facebook HTML files found — skipping');
    return { nodes: [], stats };
  }

  log.info(`Found ${htmlFiles.length} Facebook HTML file(s)`);
  stats.files = htmlFiles.length;

  // Parse each file
  const allPosts = [];
  const seenSourceIds = new Set();

  for (const { path: htmlPath, type: fileType } of htmlFiles) {
    let html;
    try {
      html = await fs.readFile(htmlPath, 'utf-8');
    } catch (err) {
      log.warn(`Failed to read ${htmlPath}: ${err.message}`);
      continue;
    }

    const $ = cheerio.load(html);
    const fileName = path.basename(htmlPath);
    const posts = extractFbPosts($, fileName, fileType);

    for (const post of posts) {
      stats.total++;
      const sourceId = generateSourceId(post.caption, post.dateStr, fileName, stats.total);

      if (seenSourceIds.has(sourceId)) {
        stats.skipped++;
        continue;
      }
      seenSourceIds.add(sourceId);

      allPosts.push({ ...post, sourceId });
    }
  }

  // Normalize to canonical nodes
  const nodes = [];

  for (let i = 0; i < allPosts.length; i++) {
    const post = allPosts[i];
    const paddedIndex = String(i + 1).padStart(3, '0');
    const id = `fb-${paddedIndex}`;

    const title = post.caption
      ? post.caption.slice(0, 60) + (post.caption.length > 60 ? '...' : '')
      : `Facebook Post ${post.dateStr}`;

    const nodeType = post.fileType === 'life_event' ? 'milestone' : 'moment';

    // Normalize media paths
    const media = post.media.map(p => {
      if (p.startsWith('http://') || p.startsWith('https://')) return p;
      return `images/facebook/${p}`;
    });

    const node = createCanonicalNode({
      id,
      type: nodeType,
      title,
      date: post.dateStr,
      epoch: assignEpoch(post.dateStr),
      description: post.caption || '',
      media,
      source: 'facebook',
      sourceId: post.sourceId,
      visibility: 'private', // Default private — config promotes to friends
      entities: {
        people: post.people || [],
        places: [],
        tags: [],
        clients: [],
        projects: [],
      },
      sourceMeta: {
        authorship: post.ownership?.authorship || 'authored',
        isOwned: post.ownership?.isOwned !== false,
        reshareReason: post.ownership?.reason || null,
      },
    });

    if (node) {
      nodes.push(node);
      stats.parsed++;
    } else {
      stats.skipped++;
    }
  }

  log.info(
    `Facebook parse complete: ${stats.parsed} nodes from ${stats.total} posts ` +
    `(${stats.skipped} skipped)`
  );

  return { nodes, stats };
}
