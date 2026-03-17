/**
 * Boy In The Bubble — Release Config
 *
 * Single source of truth for all campaign content, dates, CTAs,
 * palette tokens, track metadata, press fields, and asset paths.
 *
 * ─── DOM CONTRACT (frozen — do not rename without syncing visual pass) ───
 *
 * Root:     .release-bitb[data-rollout-phase][data-exposure-mode]
 *
 * Sections:
 *   #bitb-hero        .bitb-hero__bg  .bitb-hero__halo  .bitb-hero__content  .bitb-hero__cta
 *   #bitb-manifesto
 *   #bitb-focus
 *   #bitb-world
 *   #bitb-timeline
 *   #bitb-press
 *   #bitb-footer
 *
 * Preview player:
 *   .bitb-player            (wrapper)
 *   .bitb-player__artwork   (img)
 *   .bitb-player__title     (track name)
 *   .bitb-player__toggle    (play/pause button)
 *   .bitb-player__rail      (progress bar container)
 *   .bitb-player__fill      (progress fill)
 *   .bitb-player__elapsed   (current time)
 *   .bitb-player__duration  (total time)
 *
 * Track cards:
 *   .bitb-track-card                 (individual card)
 *   .bitb-track-card--expanded       (active/open state)
 *   .bitb-track-card--collapsed      (default state)
 *   .bitb-track-card--locked         (pre-release, no audio)
 *   .bitb-track-card--focus          (the focus single)
 *
 * Timeline items:
 *   .bitb-timeline-item
 *   .bitb-timeline-item--active
 *   .bitb-timeline-item--past
 *   .bitb-timeline-item--upcoming
 *
 * Press cards:
 *   .bitb-press-card
 *   .bitb-press-card__cta
 *
 * Reduced motion:
 *   .reduce-motion   (on shell root, mirrors prefers-reduced-motion)
 * ─────────────────────────────────────────────────────────────────────────
 */

const BASE = import.meta.env.BASE_URL;

/* ── Palette Tokens ──────────────────────────────────────── */
export const palette = {
  midnightNavy:      '#0a0e1a',
  smokedIndigo:      'rgba(49, 46, 129, 0.35)',
  smokedIndigoSolid: '#1e1b4b',
  haloGold:          '#c9a86c',
  haloGoldBright:    '#dbb978',
  emberRose:         '#c4626a',
  emberRoseLight:    '#d4878d',
  jellyfishIvory:    '#ede6db',
  jellyfishIvoryDim: 'rgba(237, 230, 219, 0.7)',
};

/* ── Typography ──────────────────────────────────────────── */
export const fonts = {
  display: "'Fraunces', serif",
  body: "'Manrope', sans-serif",
};

/* ── Artist ──────────────────────────────────────────────── */
export const artist = {
  name: 'Jarowe',
  realName: 'Jared Rowe',
  shortBio:
    'Jarowe is the musical voice of Jared Rowe — a storyteller, producer, and builder who spent two decades in film, tech, and creator tools before turning inward to write the songs that had been waiting.',
  longBio:
    'For twenty years, Jared Rowe built things for other people\'s stories — indie films, creator platforms, product teams at companies like Elgato. He co-founded studios, raised three sons while worldschooling across Europe, and quietly lost 150 pounds along the way. Somewhere inside all of that motion, a collection of songs started forming — not as a side project, but as the truest thing he\'d ever made. Jarowe is the name he gave to that voice. Boy In The Bubble is what it had to say.',
  statement:
    'I didn\'t set out to make an album. I set out to say something I\'d been carrying for a long time - about the weight of becoming, the terror of being seen, and the strange grace of realizing you were never ready for any of it. These songs are the most honest thing I\'ve ever put into the world.',
  portrait: `${BASE}images/jarowe_image.jpg`,
  socials: {
    spotify: 'https://open.spotify.com/artist/jarowe',
    soundcloud: 'https://soundcloud.com/jarowe',
    instagram: 'https://instagram.com/jarowemusic',
    x: 'https://x.com/jarikirane',
  },
  contact: 'music@jarowe.com',
};

/* ── Album ───────────────────────────────────────────────── */
export const album = {
  title: 'Boy In The Bubble',
  subtitle: 'The weight of becoming, the grace of letting go.',
  artwork: `${BASE}images/music/Boy In The Bubble/jarowe_boyinthebubble_album-art.jpg`,
  statement:
    'Boy In The Bubble is a six-track journey through vulnerability, fatherhood, reinvention, and the quiet terror of stepping into the light. Each song is a window into a moment of becoming — fragile, limitless, and never quite ready.',
  releaseYear: 2026,
  label: 'Independent',
  upc: '', // fill before release
  credits: {
    writtenBy: 'Jared Rowe',
    producedBy: 'Jared Rowe',
    aiAssisted: true,
    aiNote:
      'Vocals, melodies, lyrics, and production direction by Jared Rowe. AI tools were used as creative collaborators in the production process.',
  },
  riyl: ['Bon Iver', 'James Blake', 'Novo Amor', 'Phoebe Bridgers', 'Sufjan Stevens'],
  genres: ['Indie', 'Alt-Pop', 'Cinematic', 'Electronic'],
  moods: ['Intimate', 'Reflective', 'Luminous', 'Vulnerable', 'Hopeful'],
};

/* ── Focus Single ────────────────────────────────────────── */
export const focusTrackId = 'we-were-never-ready';

/* ── Dates ───────────────────────────────────────────────── */
export const dates = {
  singleRelease: '2026-04-10',
  albumRelease:  '2026-05-08',
  singleDisplayDate: 'April 10, 2026',
  albumDisplayDate:  'May 8, 2026',
};

/* ── CTAs (keyed by rollout_phase) ───────────────────────── */
export const ctas = {
  'pre-single': {
    primary:   { label: 'Listen on Spotify', url: 'https://open.spotify.com/album/1evTMGldNCiaD5jQuAiAdC', utmCampaign: 'bitb-presave' },
    secondary: { label: 'Open EPK', url: '/music/boy-in-the-bubble/epk' },
  },
  'single-live': {
    primary:   { label: 'Listen on Spotify', url: 'https://open.spotify.com/album/1evTMGldNCiaD5jQuAiAdC', utmCampaign: 'bitb-single' },
    secondary: { label: 'Open EPK', url: '/music/boy-in-the-bubble/epk' },
  },
  'pre-album': {
    primary:   { label: 'Listen on Spotify', url: 'https://open.spotify.com/album/1evTMGldNCiaD5jQuAiAdC', utmCampaign: 'bitb-album-presave' },
    secondary: { label: 'Open EPK', url: '/music/boy-in-the-bubble/epk' },
  },
  'album-live': {
    primary:   { label: 'Listen on Spotify', url: 'https://open.spotify.com/album/1evTMGldNCiaD5jQuAiAdC', utmCampaign: 'bitb-album' },
    secondary: { label: 'Open EPK', url: '/music/boy-in-the-bubble/epk' },
  },
};

/* ── Tracks ──────────────────────────────────────────────── */
export const tracks = [
  {
    id: 'boy-in-the-bubble',
    number: 1,
    title: 'Boy In The Bubble',
    duration: '3:42',
    durationSec: 222,
    isFocusTrack: false,
    lyricExcerpt: 'I\'m the boy in the bubble, still learning to breathe.',
    themeTags: ['identity', 'vulnerability', 'becoming'],
    previewSrc: `${BASE}audio/previews/boy-in-the-bubble/boy-in-the-bubble-preview.mp3`,
    masterSrc: `${BASE}audio/Boy In The Bubble/JaroweBoyInTheBubble-mastered.mp3`,
    isrc: '',
  },
  {
    id: 'forever-is-now',
    number: 2,
    title: 'Forever is Now',
    duration: '4:01',
    durationSec: 241,
    isFocusTrack: false,
    lyricExcerpt: 'This is the only forever. It\'s already there.',
    themeTags: ['presence', 'fatherhood', 'time'],
    previewSrc: `${BASE}audio/previews/boy-in-the-bubble/forever-is-now-preview.mp3`,
    masterSrc: `${BASE}audio/Boy In The Bubble/JaroweForeverisNow-mastered.mp3`,
    isrc: '',
  },
  {
    id: 'limitless-and-fragile',
    number: 3,
    title: 'Limitless and Fragile',
    duration: '3:55',
    durationSec: 235,
    isFocusTrack: false,
    lyricExcerpt: 'I am limitless and fragile, caught between the sparks and the spiral.',
    themeTags: ['duality', 'strength', 'fragility'],
    previewSrc: `${BASE}audio/previews/boy-in-the-bubble/limitless-and-fragile-preview.mp3`,
    masterSrc: `${BASE}audio/Boy In The Bubble/JaroweLimitlessandFragile-mastered.mp3`,
    isrc: '',
  },
  {
    id: 'my-whole-life-for-this',
    number: 4,
    title: 'My Whole Life for This',
    duration: '4:18',
    durationSec: 258,
    isFocusTrack: false,
    lyricExcerpt: 'I have been waiting my whole life for this.',
    themeTags: ['devotion', 'sacrifice', 'purpose'],
    previewSrc: `${BASE}audio/previews/boy-in-the-bubble/my-whole-life-for-this-preview.mp3`,
    masterSrc: `${BASE}audio/Boy In The Bubble/JaroweMyWholeLifeforThis-mastered.mp3`,
    isrc: '',
  },
  {
    id: 'the-birds-that-stayed',
    number: 5,
    title: 'The Birds That Stayed',
    duration: '3:38',
    durationSec: 218,
    isFocusTrack: false,
    lyricExcerpt: 'I thought the birds were them - the souls that couldn\'t stay but didn\'t want to leave me.',
    themeTags: ['loyalty', 'resilience', 'belonging'],
    previewSrc: `${BASE}audio/previews/boy-in-the-bubble/the-birds-that-stayed-preview.mp3`,
    masterSrc: `${BASE}audio/Boy In The Bubble/JaroweTheBirdsThatStayed-mastered.mp3`,
    isrc: '',
  },
  {
    id: 'we-were-never-ready',
    number: 6,
    title: 'We Were Never Ready for the Light',
    duration: '4:27',
    durationSec: 267,
    isFocusTrack: true,
    lyricExcerpt: 'We were never ready for the light. It showed the dust we danced around.',
    themeTags: ['revelation', 'grace', 'surrender'],
    previewSrc: `${BASE}audio/previews/boy-in-the-bubble/we-were-never-ready-preview.mp3`,
    masterSrc: `${BASE}audio/Boy In The Bubble/JaroweWeWereNeverReadyfortheLight-mastered.mp3`,
    isrc: '',
  },
];

/* ── Press / Assets ──────────────────────────────────────── */
export const press = {
  oneLiner:
    'Jarowe\'s debut album Boy In The Bubble is a six-track meditation on vulnerability, fatherhood, and the terror of stepping into the light.',
  downloadableAssets: [
    { label: 'Album Art (3000x3000)', file: `${BASE}images/music/Boy In The Bubble/jarowe_boyinthebubble_album-art.jpg` },
    { label: 'Artist Portrait', file: `${BASE}images/jarowe_image.jpg` },
  ],
};

/* ── Rollout Timeline ────────────────────────────────────── */
export const timeline = [
  { id: 'tl-presave',   label: 'Pre-save Opens',   date: dates.singleDisplayDate, phase: 'pre-single' },
  { id: 'tl-single',    label: 'Single Release',    date: dates.singleDisplayDate, phase: 'single-live' },
  { id: 'tl-prealbum',  label: 'Album Pre-save',    date: '',                      phase: 'pre-album' },
  { id: 'tl-album',     label: 'Album Release',     date: dates.albumDisplayDate,  phase: 'album-live' },
];

/* ── Default export ──────────────────────────────────────── */
const config = {
  palette,
  fonts,
  artist,
  album,
  focusTrackId,
  dates,
  ctas,
  tracks,
  press,
  timeline,
};

export default config;
