/**
 * Facebook HTML export parser.
 *
 * Parses Meta "Download Your Information" HTML export files into
 * canonical constellation nodes.
 *
 * Real Meta export structure:
 *   your_facebook_activity/posts/your_posts__check_ins__photos_and_videos_1.html
 *   your_facebook_activity/posts/album/*.html
 *   your_facebook_activity/posts/your_photos.html
 *   your_facebook_activity/posts/your_videos.html
 *   personal_information/profile_information/
 *
 * HTML structure per post:
 *   <section class="_a6-g">
 *     <h2 class="_a6-h _a6-i">Jared Rowe ...</h2>
 *     <div class="_a6-p">
 *       <div class="_2pin">content text</div>
 *       <div class="_2pin"><img src="..."></div>
 *     </div>
 *     <footer class="_a6-o">
 *       <div class="_a72d">Sep 03, 2009 5:11:57 am</div>
 *     </footer>
 *   </section>
 *
 * Won't parse: messages, comments, marketplace, ads, apps.
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

// ─── Date formats used in Meta HTML exports ──────────────────────────
const DATE_FORMATS = [
  'MMM d, yyyy h:mm:ss a',        // "Sep 03, 2009 5:11:57 am" (actual format)
  'MMMM d, yyyy h:mm:ss a',       // "September 3, 2009 5:11:57 am"
  'MMM d, yyyy h:mm a',           // "Jan 15, 2023 3:45 PM"
  'MMMM d, yyyy h:mm a',          // "January 15, 2023 3:45 PM"
  'MMM d, yyyy',                   // "Jan 15, 2023"
  'MMMM d, yyyy',                  // "January 15, 2023"
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
function generateSourceId(dateStr, headerText, index) {
  const base = `fb_${dateStr || 'nodate'}_${index}_${headerText?.slice(0, 40) || ''}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash) + base.charCodeAt(i);
    hash = hash & hash;
  }
  return `fb_${Math.abs(hash).toString(36)}`;
}

/**
 * Classify authorship from the h2 header text.
 *
 * Reshared: "shared a link", "shared a post", "shared a photo",
 *           "shared a video", "shared a memory", "Shared from Instagram"
 * Tagged:   "was tagged", "tagged you"
 * Authored: everything else (status updates, check-ins, photos, etc.)
 */
function classifyFbAuthorship(headerText) {
  const h = headerText || '';
  if (/shared a (link|post|photo|video|memory|reel)/i.test(h)) {
    return { authorship: 'reshared', isOwned: false, reason: 'shared content' };
  }
  if (/shared from instagram/i.test(h)) {
    return { authorship: 'reshared', isOwned: false, reason: 'cross-posted from Instagram' };
  }
  if (/shared a/i.test(h)) {
    return { authorship: 'reshared', isOwned: false, reason: 'shared content' };
  }
  if (/was tagged/i.test(h) || /tagged you/i.test(h)) {
    return { authorship: 'tagged_external', isOwned: true, reason: 'tagged in post' };
  }
  return { authorship: 'authored', isOwned: true, reason: null };
}

/**
 * Extract people mentioned in the header ("was with Name1 and Name2").
 */
function extractPeople(headerText) {
  const people = [];
  if (!headerText) return people;

  // "was with Name1 and Name2."
  const withMatch = headerText.match(/was with (.+?)\.?$/);
  if (withMatch) {
    const names = withMatch[1].split(/\s+and\s+/i);
    for (const name of names) {
      const cleaned = name.replace(/[.,]$/, '').trim();
      if (cleaned && /^[A-Z]/.test(cleaned)) {
        people.push(cleaned);
      }
    }
  }

  return people;
}

/**
 * Discover parseable HTML files in the real Meta export structure.
 */
async function discoverFbFiles(exportDir) {
  const found = [];

  // Main posts file(s)
  const postDirs = [
    'your_facebook_activity/posts',
    'posts',
    'your_posts',
  ];
  for (const sub of postDirs) {
    const dir = path.join(exportDir, sub);
    try {
      await fs.access(dir);
      // Main timeline posts HTML
      const files = await sortedGlob('your_posts*.html', { cwd: dir });
      for (const f of files) {
        found.push({ path: path.join(dir, f), type: 'post' });
      }
      // Photo/video specific HTML
      for (const name of ['your_photos.html', 'your_videos.html']) {
        try {
          const filePath = path.join(dir, name);
          await fs.access(filePath);
          found.push({ path: filePath, type: 'photo' });
        } catch { /* doesn't exist */ }
      }
      // Album HTML files
      const albumDir = path.join(dir, 'album');
      try {
        await fs.access(albumDir);
        const albumFiles = await sortedGlob('*.html', { cwd: albumDir });
        for (const f of albumFiles) {
          found.push({ path: path.join(albumDir, f), type: 'album' });
        }
      } catch { /* no albums */ }
    } catch { /* dir doesn't exist */ }
  }

  // Life events / profile information
  const profileDirs = [
    'personal_information/profile_information',
    'profile_information',
  ];
  for (const sub of profileDirs) {
    const dir = path.join(exportDir, sub);
    try {
      await fs.access(dir);
      const files = await sortedGlob('*.html', { cwd: dir });
      for (const f of files) {
        found.push({ path: path.join(dir, f), type: 'life_event' });
      }
    } catch { /* dir doesn't exist */ }
  }

  return found;
}

/**
 * Extract posts from a Facebook HTML file using the real Meta section structure.
 *
 * Each post is a <section class="_a6-g"> containing:
 *   - h2._a6-h: header ("Jared Rowe shared a link.", "Jared Rowe was with ...")
 *   - div._a6-p > div._2pin: content blocks (text, media)
 *   - footer._a6-o > div._a72d: timestamp
 *   - img[src]: media with relative paths
 */
function extractFbPosts($, exportDir, fileType) {
  const posts = [];

  // Real Meta export uses <section class="_a6-g">
  let $sections = $('section._a6-g');

  // Fallback selectors for older formats
  if ($sections.length === 0) {
    $sections = $('div._a6-g');
  }
  if ($sections.length === 0) {
    $sections = $('div[role="article"]');
  }

  $sections.each((i, el) => {
    const $post = $(el);

    // Extract header
    const headerText = $post.find('h2._a6-h').text()?.trim() ||
                       $post.find('h2').first().text()?.trim() || '';

    // Extract date from footer
    let dateStr = null;
    const dateEl = $post.find('div._a72d').first().text()?.trim();
    if (dateEl) {
      dateStr = parseDate(dateEl);
    }
    // Fallback: look for date in content divs
    if (!dateStr) {
      $post.find('div._2pin div').each((_, div) => {
        if (dateStr) return;
        const text = $(div).text()?.trim() || '';
        if (/^(Updated\s+)?[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}/i.test(text)) {
          const cleaned = text.replace(/^Updated\s+/i, '');
          dateStr = parseDate(cleaned);
        }
      });
    }

    if (!dateStr) return; // Skip undateable posts

    // Extract content text from _2pin divs (skip media-only and date-only blocks)
    let caption = '';
    $post.find('div._2pin').each((_, div) => {
      if (caption) return;
      const divText = $(div).clone().children('div, img, a').remove().end()
        .text()?.trim() || '';
      // Skip if it's just a date, URL, or album name
      if (divText.length > 10 &&
          !/^(Updated|http|Photos$)/i.test(divText) &&
          !/^\w+ \d{1,2}, \d{4}/.test(divText)) {
        caption = divText;
      }
    });
    // Broader fallback: any _2pin text
    if (!caption) {
      $post.find('div._2pin').each((_, div) => {
        if (caption) return;
        const divText = $(div).text()?.trim() || '';
        if (divText.length > 15 && !/^(Updated|http)/i.test(divText)) {
          caption = divText;
        }
      });
    }

    // Extract media (local images/videos only)
    const media = [];
    $post.find('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('data:') && !src.startsWith('http')) {
        if (!media.includes(src)) media.push(src);
      }
    });
    $post.find('video source[src], video[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('data:') && !src.startsWith('http')) {
        if (!media.includes(src)) media.push(src);
      }
    });

    // Classify authorship
    const ownership = classifyFbAuthorship(headerText);

    // Extract people
    const people = extractPeople(headerText);

    posts.push({
      headerText,
      caption: (caption || '').slice(0, 500),
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
    reshared: 0,
    empty: 0,
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
    const posts = extractFbPosts($, exportDir, fileType);

    for (const post of posts) {
      stats.total++;

      // Drop empty posts: no caption AND no media = noise
      if (!post.caption && post.media.length === 0) {
        stats.empty++;
        stats.skipped++;
        continue;
      }

      const sourceId = generateSourceId(post.dateStr, post.headerText, stats.total);

      if (seenSourceIds.has(sourceId)) {
        stats.skipped++;
        continue;
      }
      seenSourceIds.add(sourceId);

      if (post.ownership.authorship === 'reshared') {
        stats.reshared++;
      }

      allPosts.push({ ...post, sourceId });
    }
  }

  // Normalize to canonical nodes
  const nodes = [];

  // Use 4-digit padding for large datasets
  const padWidth = Math.max(3, String(allPosts.length).length);

  for (let i = 0; i < allPosts.length; i++) {
    const post = allPosts[i];
    const paddedIndex = String(i + 1).padStart(padWidth, '0');
    const id = `fb-${paddedIndex}`;

    // Clean title: strip album pollution, generate meaningful fallbacks
    let title;
    const cleanCaption = (post.caption || '')
      .replace(/^(Mobile Uploads|Timeline Photos|Cover Photos|Profile Pictures|Instagram Photos)\s*/i, '')
      .trim();

    if (cleanCaption.length > 5) {
      title = cleanCaption.slice(0, 60) + (cleanCaption.length > 60 ? '...' : '');
    } else if (post.media.length > 0) {
      // Photo/video post without meaningful text — try description as title
      const desc = (post.caption || '').trim();
      if (desc.length > 5) {
        title = desc.slice(0, 60) + (desc.length > 60 ? '...' : '');
      } else {
        const verb = post.headerText?.match(/(added|uploaded|posted|updated)/i)?.[1] || 'shared';
        const mediaWord = post.media.length > 1 ? `${post.media.length} photos` : 'a photo';
        title = `${verb} ${mediaWord}`;
      }
    } else {
      title = `Facebook ${post.dateStr}`;
    }

    const nodeType = post.fileType === 'life_event' ? 'milestone' : 'moment';

    // Media paths: relative to export root, served from data-private (junction or copy)
    const media = post.media.map(p => {
      if (p.startsWith('http://') || p.startsWith('https://')) return p;
      // Paths in HTML are relative to the HTML file location via <base> tag
      // Keep as-is — pipeline EXIF phase will resolve
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
    `(${stats.reshared} reshared, ${stats.empty} empty dropped, ${stats.skipped} total skipped)`
  );

  return { nodes, stats };
}
