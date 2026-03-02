/**
 * Instagram HTML export parser.
 *
 * Parses Instagram "Download Your Information" HTML export files into
 * canonical constellation nodes. Handles posts_*.html, reels.html,
 * and stories.html from the your_instagram_activity/media/ directory.
 *
 * Tuned to the 2024-2026 Instagram HTML export format:
 *   - Post container: div._a6-g inside <main>
 *   - Caption: h2._a6-h (bold heading)
 *   - Date: div._a6-o (e.g. "Feb 13, 2026 10:16 am")
 *   - Media: img._a6_o with relative src paths
 *   - Tagged users: plain text in table cells
 *   - Location: Latitude/Longitude in table cells
 *
 * Resilience: Never crashes the pipeline for a single bad post.
 * Missing export directory returns empty array gracefully.
 */

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { parse as dateParse, isValid as isValidDate, format } from 'date-fns';
import { createCanonicalNode } from '../schemas/canonical.mjs';
import { assignEpoch } from '../config/epochs.mjs';
import { sortedGlob } from '../utils/deterministic.mjs';
import { createLogger } from '../utils/logger.mjs';

const log = createLogger('instagram');

// ─── Selector configuration ─────────────────────────────────────────────
// Tuned to the actual 2024-2026 Instagram HTML export format.
const SELECTORS = {
  // Post container candidates (tried in order)
  postContainers: [
    'main > div._a6-g',          // 2024-2026 export: each post in <main>
    'div.pam._a6-g',             // Posts with pam padding class
    'div._a6-g',                 // Generic Instagram class-based
    'div[role="article"]',       // Semantic article role
    'table td',                  // Older table-based exports
  ],

  // Date/time extraction
  dateSelectors: [
    'div._a6-o',                 // 2024-2026 export: "Feb 13, 2026 10:16 am"
    '._a6-o',                   // Same class, any element
    'time[datetime]',            // <time datetime="...">
    'time',                      // <time> with text content
  ],

  // Caption text
  captionSelectors: [
    'h2._a6-h',                  // 2024-2026 export: bold heading caption
    'h2._a6-i',                  // Instagram caption with border class
    'h2',                        // Any h2 in post container
    'div._a6-i',                 // Older: div-based caption
  ],

  // Media elements
  mediaSelectors: [
    'img._a6_o',                 // 2024-2026 export: styled media images
    'img[src]',                  // Any image with src
    'video source[src]',
    'video[src]',
  ],
};

// ─── Known paths within Instagram export ─────────────────────────────────
// The HTML export places post files in these known subdirectories.
const POST_FILE_PATHS = [
  'your_instagram_activity/media',    // 2024-2026 export structure
  'content',                          // Older export structure
];

// Only parse these files (skip messages, likes, comments, etc.)
const POST_FILE_PATTERNS = [
  'posts_*.html',
  'reels.html',
  'stories.html',
];

// ─── Date parsing formats ────────────────────────────────────────────────
const DATE_FORMATS = [
  'MMM d, yyyy h:mm a',         // "Feb 13, 2026 10:16 am" (actual format!)
  'MMM d, yyyy, h:mm a',        // "Jun 15, 2022, 3:45 PM"
  'MMM d, yyyy',                // "Jun 15, 2022"
  'MMMM d, yyyy',               // "June 15, 2022"
  "yyyy-MM-dd'T'HH:mm:ss",     // ISO-like without timezone
  'yyyy-MM-dd HH:mm:ss',       // "2022-06-15 15:45:00"
  'yyyy-MM-dd',                 // "2022-06-15"
  'MM/dd/yyyy',                 // "06/15/2022"
  'd MMM yyyy',                 // "15 Jun 2022"
];

/**
 * Attempt to parse a date string using multiple format strategies.
 *
 * @param {string} dateStr - Date text from HTML
 * @returns {string|null} ISO date string "YYYY-MM-DD" or null if unparseable
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();
  if (!cleaned) return null;

  // Strategy 1: Try each known format (most specific first)
  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = dateParse(cleaned, fmt, new Date(2020, 0, 1));
      if (isValidDate(parsed) && !isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        if (year >= 2000 && year <= 2040) {
          return format(parsed, 'yyyy-MM-dd');
        }
      }
    } catch {
      // This format didn't match, try next
    }
  }

  // Strategy 2: Try as ISO date directly
  const directDate = new Date(cleaned);
  if (isValidDate(directDate) && !isNaN(directDate.getTime())) {
    const year = directDate.getFullYear();
    if (year >= 2000 && year <= 2040) {
      return format(directDate, 'yyyy-MM-dd');
    }
  }

  // Strategy 3: Extract date-like pattern from text with regex
  const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const candidate = `${y}-${m}-${d}`;
    const check = new Date(candidate);
    if (isValidDate(check) && !isNaN(check.getTime())) {
      return candidate;
    }
  }

  return null;
}

/**
 * Extract hashtags from caption text.
 */
function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

/**
 * Generate a deterministic sourceId from post content for deduplication.
 */
function generateSourceId(caption, dateStr, fileName, index) {
  const base = `${dateStr || 'nodate'}_${path.basename(fileName, '.html')}_${index}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `ig_${Math.abs(hash).toString(36)}`;
}

/**
 * Discovery phase: log the DOM structure of the first HTML file.
 */
function discoveryPhase(htmlContent, fileName) {
  const $ = cheerio.load(htmlContent);

  log.info(`=== Discovery: ${fileName} ===`);

  // Log what the main element contains
  const mainEl = $('main');
  if (mainEl.length > 0) {
    const mainChildren = mainEl.children();
    log.info(`<main> has ${mainChildren.length} children`);
    mainChildren.slice(0, 3).each((i, el) => {
      const tag = $(el).prop('tagName')?.toLowerCase() || '?';
      const cls = $(el).attr('class')?.split(' ').slice(0, 3).join(' ') || '';
      log.info(`  child ${i}: <${tag}> class="${cls}"`);
    });
  } else {
    log.info('No <main> element found');
  }

  // Log selector match rates
  for (const [name, selectors] of Object.entries(SELECTORS)) {
    if (Array.isArray(selectors)) {
      for (const sel of selectors) {
        try {
          const count = $(sel).length;
          if (count > 0) {
            log.info(`  ${name}: "${sel}" → ${count} matches`);
          }
        } catch { /* skip */ }
      }
    }
  }

  log.info(`=== End discovery ===`);
}

/**
 * Find post containers using multiple selector strategies.
 */
function findPostContainers($) {
  for (const sel of SELECTORS.postContainers) {
    try {
      const elements = $(sel);
      if (elements.length > 0) {
        return { elements, selector: sel };
      }
    } catch { /* skip */ }
  }

  // Fallback: look for divs inside <main>
  const mainChildren = $('main > div');
  if (mainChildren.length > 0) {
    return { elements: mainChildren, selector: 'fallback:main-children' };
  }

  return { elements: $('body > *'), selector: 'fallback:body-children' };
}

/**
 * Extract tagged users from the plain-text format used in 2024-2026 exports.
 * Format: "username1 (Tagged, 0.00, 0.00), username2 (Tagged, 0.00, 0.00)"
 */
function extractTaggedUsers($, $post) {
  const users = [];

  // Look for table cells that mention "Tagged users"
  $post.find('div._a6-q').each((_, el) => {
    const text = $(el).text()?.trim() || '';
    if (text === 'Tagged users') {
      // The next sibling div contains the actual user list
      const $parent = $(el).parent();
      const valueDiv = $parent.find('div > div._a6-q').last();
      const value = valueDiv.text()?.trim() || '';
      if (value && value !== 'Tagged users') {
        // Parse "user1 (Tagged, 0.00, 0.00), user2 (Tagged, 0.00, 0.00)"
        const parts = value.split('),');
        for (const part of parts) {
          const match = part.trim().match(/^(\S+)\s*\(/);
          if (match) {
            users.push(match[1]);
          }
        }
      }
    }
  });

  return [...new Set(users)];
}

/**
 * Extract lat/lng from the table-based location format.
 * Returns { lat, lng } or null.
 */
function extractLocation($, $post) {
  let lat = null;
  let lng = null;

  $post.find('div._a6-q').each((_, el) => {
    const label = $(el).text()?.trim() || '';
    if (label === 'Latitude' || label === 'Longitude') {
      // The value is in a sibling div._a6-q
      const $parent = $(el).parent();
      const valueDivs = $parent.find('div._a6-q');
      // Second ._a6-q in the parent td is the value
      if (valueDivs.length >= 2) {
        const val = parseFloat($(valueDivs[1]).text()?.trim());
        if (!isNaN(val)) {
          if (label === 'Latitude') lat = val;
          if (label === 'Longitude') lng = val;
        }
      }
    }
  });

  if (lat !== null && lng !== null) {
    return { lat, lng };
  }
  return null;
}

/**
 * Extract a single post from a DOM element.
 * Defensive: never crashes, returns null for unparseable posts.
 */
function extractPost($, postElement, fileName, index) {
  try {
    const $post = $(postElement);

    // ── Caption ──
    let caption = '';
    for (const sel of SELECTORS.captionSelectors) {
      try {
        const text = $post.find(sel).first().text()?.trim();
        if (text && text.length > 0) {
          caption = text;
          break;
        }
      } catch { /* skip */ }
    }
    // Fallback: get all text content (but strip date text)
    if (!caption) {
      const $clone = $post.clone();
      $clone.find('._a6-o, ._a6-q, table').remove();
      caption = $clone.text()?.trim() || '';
    }

    // ── Date ──
    let dateText = null;
    for (const sel of SELECTORS.dateSelectors) {
      try {
        const $dateEl = $post.find(sel).first();
        if ($dateEl.length > 0) {
          // Try datetime attribute
          const dtAttr = $dateEl.attr('datetime');
          if (dtAttr) {
            dateText = parseDate(dtAttr);
            if (dateText) break;
          }
          // Try text content
          const dtText = $dateEl.text()?.trim();
          if (dtText) {
            dateText = parseDate(dtText);
            if (dateText) break;
          }
        }
      } catch { /* skip */ }
    }

    // Fallback: search for date patterns in full text
    if (!dateText) {
      const fullText = $post.text() || '';
      // Match "Mon DD, YYYY H:MM am/pm" at end of text block
      const monthMatch = fullText.match(/(\w{3}\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s*[ap]m)/i);
      if (monthMatch) {
        dateText = parseDate(monthMatch[1]);
      }
      if (!dateText) {
        const datePatterns = [
          /(\w+ \d{1,2}, \d{4})/,
          /(\d{4}-\d{2}-\d{2})/,
        ];
        for (const pat of datePatterns) {
          const match = fullText.match(pat);
          if (match) {
            dateText = parseDate(match[1]);
            if (dateText) break;
          }
        }
      }
    }

    // REQUIRED: skip post if no date parseable
    if (!dateText) {
      log.warn(`Post ${index} in ${fileName}: no parseable date, skipping`);
      return null;
    }

    // ── Media ──
    const media = [];
    for (const sel of SELECTORS.mediaSelectors) {
      try {
        $post.find(sel).each((_, el) => {
          const src = $(el).attr('src');
          if (src && !src.includes('profile_pic') && !src.startsWith('data:')
              && !src.includes('Instagram-Logo')) {
            // Deduplicate media within post
            if (!media.includes(src)) {
              media.push(src);
            }
          }
        });
        if (media.length > 0) break; // Use first selector that finds media
      } catch { /* skip */ }
    }

    // ── Tagged users ──
    const taggedUsers = extractTaggedUsers($, $post);

    // ── Location ──
    const location = extractLocation($, $post);

    return {
      caption,
      dateText,
      media,
      taggedUsers,
      location,
    };
  } catch (err) {
    log.warn(`Post ${index} in ${fileName}: extraction error: ${err.message}`);
    return null;
  }
}

/**
 * Discover HTML files containing posts/reels/stories.
 * Searches known paths and avoids messages/likes/comments/etc.
 */
async function discoverPostFiles(exportDir) {
  const found = [];

  for (const subDir of POST_FILE_PATHS) {
    const searchDir = path.join(exportDir, subDir);
    try {
      await fs.access(searchDir);
    } catch {
      continue; // subdir doesn't exist
    }

    for (const pattern of POST_FILE_PATTERNS) {
      const matches = await sortedGlob(pattern, { cwd: searchDir });
      for (const m of matches) {
        found.push(path.join(searchDir, m));
      }
    }
  }

  // Fallback: look in content/ directory (older exports)
  if (found.length === 0) {
    const contentDir = path.join(exportDir, 'content');
    try {
      await fs.access(contentDir);
      const files = await sortedGlob('**/*.html', { cwd: contentDir });
      for (const f of files) {
        found.push(path.join(contentDir, f));
      }
    } catch { /* no content dir */ }
  }

  // Last resort: HTML files directly in export root
  if (found.length === 0) {
    const rootFiles = await sortedGlob('*.html', { cwd: exportDir });
    for (const f of rootFiles) {
      // Skip start_here.html and other non-post files
      if (f === 'start_here.html') continue;
      found.push(path.join(exportDir, f));
    }
  }

  return found;
}

/**
 * Parse Instagram HTML export directory into canonical constellation nodes.
 *
 * @param {string} exportDir - Path to Instagram export root directory
 * @param {Object} options - Parser options
 * @param {boolean} options.discovery - Run discovery phase (default: true for first file)
 * @returns {Promise<{nodes: Object[], stats: Object}>} Parsed nodes and stats
 */
export async function parseInstagram(exportDir, options = {}) {
  const stats = {
    total: 0,
    parsed: 0,
    skipped: 0,
    duplicates: 0,
    files: 0,
    warnings: [],
    selectorUsed: '',
  };

  // ── Resilience: handle missing/empty export directory ──
  try {
    await fs.access(exportDir);
  } catch {
    log.warn(`Instagram export directory not found: ${exportDir}`);
    stats.warnings.push('Instagram export directory not found');
    return { nodes: [], stats };
  }

  // ── File discovery ──
  const htmlFiles = await discoverPostFiles(exportDir);

  if (htmlFiles.length === 0) {
    log.warn('No post/reel/story HTML files found in Instagram export');
    stats.warnings.push('No post HTML files found');
    return { nodes: [], stats };
  }

  log.info(`Found ${htmlFiles.length} HTML file(s) to parse: ${htmlFiles.map(f => path.basename(f)).join(', ')}`);
  stats.files = htmlFiles.length;

  // ── Parse each HTML file ──
  let discoveryDone = false;
  let globalIndex = 0;
  const allPosts = [];
  const seenSourceIds = new Set();

  for (const htmlFile of htmlFiles) {
    let htmlContent;
    try {
      htmlContent = await fs.readFile(htmlFile, 'utf-8');
    } catch (err) {
      log.warn(`Failed to read ${htmlFile}: ${err.message}`);
      continue;
    }

    const $ = cheerio.load(htmlContent);
    const fileName = path.basename(htmlFile);

    // Discovery phase: run once on first file
    if (!discoveryDone && options.discovery !== false) {
      discoveryPhase(htmlContent, fileName);
      discoveryDone = true;
    }

    // Find post containers
    const { elements: postElements, selector } = findPostContainers($);
    if (!stats.selectorUsed) {
      stats.selectorUsed = selector;
      log.info(`Using selector strategy: ${selector} (${postElements.length} posts)`);
    }

    // Determine the base href for resolving relative media paths
    const baseHref = $('base').attr('href') || '';
    const htmlFileDir = path.dirname(htmlFile);

    // Extract posts
    postElements.each((i, el) => {
      stats.total++;
      globalIndex++;

      const post = extractPost($, el, fileName, globalIndex);
      if (!post) {
        stats.skipped++;
        return;
      }

      // Resolve media paths relative to the base href and HTML file location
      const resolvedMedia = post.media.map(src => {
        if (src.startsWith('http://') || src.startsWith('https://')) return src;
        // base href is relative to the HTML file's directory
        const resolvedPath = path.resolve(htmlFileDir, baseHref, src);
        // Return path relative to exportDir for consistent storage
        return path.relative(exportDir, resolvedPath).replace(/\\/g, '/');
      });
      post.media = resolvedMedia;

      // Generate sourceId for dedup
      const sourceId = generateSourceId(post.caption, post.dateText, fileName, i);

      if (seenSourceIds.has(sourceId)) {
        log.warn(`Duplicate post (sourceId: ${sourceId}), keeping first`);
        stats.duplicates++;
        stats.skipped++;
        return;
      }
      seenSourceIds.add(sourceId);

      allPosts.push({ ...post, sourceId, fileName });
    });
  }

  // ── Normalize to canonical nodes ──
  const nodes = [];

  for (let i = 0; i < allPosts.length; i++) {
    const post = allPosts[i];
    const paddedIndex = String(i + 1).padStart(3, '0');
    const id = `ig-${paddedIndex}`;

    const title = post.caption
      ? post.caption.slice(0, 60) + (post.caption.length > 60 ? '...' : '')
      : `Instagram Post ${post.dateText}`;

    const epoch = assignEpoch(post.dateText);
    const hashtags = extractHashtags(post.caption);

    // Convert media paths to web-servable paths (images/instagram/...)
    const media = post.media.map(p => {
      // media/posts/202602/xxx.jpg → images/instagram/posts/202602/xxx.jpg
      if (p.startsWith('media/')) {
        return `images/instagram/${p.slice('media/'.length)}`;
      }
      return `images/instagram/${p}`;
    });

    const node = createCanonicalNode({
      id,
      type: 'moment',
      title,
      date: post.dateText,
      epoch,
      description: post.caption || '',
      media,
      source: 'instagram',
      sourceId: post.sourceId,
      visibility: 'private', // Default private -- allowlist promotes to public/friends
      entities: {
        people: post.taggedUsers || [],
        places: post.location ? [`${post.location.lat}, ${post.location.lng}`] : [],
        tags: hashtags,
        clients: [],
        projects: [],
      },
      location: post.location,
    });

    if (node) {
      nodes.push(node);
      stats.parsed++;
    } else {
      stats.skipped++;
      log.warn(`Node creation returned null for post ${i + 1}`);
    }
  }

  // ── Summary ──
  log.info(
    `Parse complete: ${stats.parsed} nodes from ${stats.total} posts ` +
    `(${stats.skipped} skipped, ${stats.duplicates} duplicates)`
  );

  if (stats.warnings.length > 0) {
    log.info(`Warnings: ${stats.warnings.join('; ')}`);
  }

  return { nodes, stats };
}
