// tourChapters.js — Cinematic globe tour chapter definitions
// 6-chapter narrative arc: "It All Starts With an Idea"

const BASE = import.meta.env.BASE_URL;

const CHAPTERS = [
  // ──── PROLOGUE ────
  {
    id: 'prologue',
    title: 'The Idea',
    subtitle: 'Before the leap',
    destinations: [], // globe free-spins
    camera: { altitude: 2.8, spin: true },
    dwell: 10000,
    narration: [
      {
        text: '"I tell myself I\'m a storyteller... Belief\u2014it\'s a peculiar thing. You only truly accomplish something once you deeply know that you will."',
        expression: 'thinking',
        attribution: 'Jared, May 2024',
      },
      {
        text: 'Every great journey starts as a whisper. A what-if. A late-night conversation that refuses to let you sleep.',
        expression: 'curious',
      },
      {
        text: 'This is the story of a family that stopped asking "what if" and started saying "let\'s go."',
        expression: 'excited',
      },
    ],
    photos: [],
  },

  // ──── CHAPTER 1: GREECE ────
  {
    id: 'greece',
    title: 'The Awakening',
    subtitle: 'Syros, Greece \u2014 3 months that changed everything',
    destinations: [
      { lat: 37.44, lng: 24.94, name: 'Syros, Greece' },
    ],
    camera: { altitude: 0.9 },
    dwell: 14000,
    narration: [
      {
        text: '"Jace asked me, \u2018Daddy, has living here changed you?\u2019 After a thoughtful pause, I said, \u2018Yes, it has.\u2019 And before I could finish, he burst out, \u2018Me too!\u2019"',
        expression: 'love',
        attribution: 'Jared, May 2024',
      },
      {
        text: 'Three months on a Greek island. No playbook, no safety net. Just a family learning to live on purpose.',
        expression: 'happy',
      },
      {
        text: 'The boys didn\u2019t just see the world\u2014they became part of it. Every cobblestone street was a classroom.',
        expression: 'excited',
      },
    ],
    photos: [
      { src: `${BASE}images/greek-island.jpg`, caption: 'The island that started it all' },
    ],
  },

  // ──── CHAPTER 2: SPAIN ────
  {
    id: 'spain',
    title: 'The Leap',
    subtitle: 'Estepona, Spain \u2014 Leaving the world you knew behind',
    destinations: [
      { lat: 36.43, lng: -5.15, name: 'Estepona, Spain' },
    ],
    camera: { altitude: 1.0 },
    dwell: 12000,
    narration: [
      {
        text: '"We decided to leave the world we knew behind to start a new chapter, far from home."',
        expression: 'thinking',
        attribution: 'Jared, May 2024',
      },
      {
        text: 'Spain wasn\u2019t just another pin on the map. It was the proof that the dream had legs.',
        expression: 'happy',
      },
      {
        text: 'Maria and the boys found rhythm in a new language, new friends, new sunsets. Home isn\u2019t a zip code.',
        expression: 'love',
      },
    ],
    photos: [
      { src: `${BASE}images/couple-golden-hour.jpg`, caption: 'Golden hour in Estepona' },
    ],
  },

  // ──── CHAPTER 3: ALPS ────
  {
    id: 'alps',
    title: 'The Heights',
    subtitle: 'Austrian Alps \u2014 Reaching peaks literal and figurative',
    destinations: [
      { lat: 47.27, lng: 13.33, name: 'Austrian Alps' },
    ],
    camera: { altitude: 1.4 },
    dwell: 11000,
    narration: [
      {
        text: '"The more we learn to appreciate all of the beauty, the more we see of it."',
        expression: 'surprised',
        attribution: 'Jared, May 2024',
      },
      {
        text: 'Standing at the top of an Austrian peak with three boys who\u2019ve never known a world without wonder.',
        expression: 'excited',
      },
    ],
    photos: [
      { src: `${BASE}images/family-alps.jpg`, caption: 'The Rowe crew conquers the Alps' },
    ],
  },

  // ──── CHAPTER 4: HOME ────
  {
    id: 'home',
    title: 'The Return',
    subtitle: 'Florida & the Smokies \u2014 Home hits different',
    destinations: [
      { lat: 28.54, lng: -81.38, name: 'Orlando, FL' },
      { lat: 35.61, lng: -83.43, name: 'Great Smoky Mountains' },
    ],
    camera: { altitude: 1.8 },
    dwell: 13000,
    narration: [
      {
        text: '"Home isn\u2019t a place, it\u2019s a feeling that\u2019s created in moments, shared with the ones we love, wherever we wander."',
        expression: 'love',
        attribution: 'Jared, April 2024',
      },
      {
        text: 'After seeing the world, coming home doesn\u2019t mean going back. It means bringing everything you\u2019ve learned forward.',
        expression: 'thinking',
      },
      {
        text: 'Roller coasters, mountain trails, family dinners\u2014adventure isn\u2019t always overseas.',
        expression: 'happy',
      },
    ],
    photos: [
      { src: `${BASE}images/boys-selfie.jpg`, caption: 'The crew, back on home turf' },
      { src: `${BASE}images/vault/velocicoaster.jpg`, caption: 'VelociCoaster \u2014 because adventure never stops' },
      { src: `${BASE}images/vault/kraken-family.png`, caption: 'Kraken crew at SeaWorld' },
    ],
  },

  // ──── EPILOGUE ────
  {
    id: 'epilogue',
    title: 'The Spark',
    subtitle: 'Light doesn\u2019t ask permission to refract',
    destinations: [], // zoom out
    camera: { altitude: 3.0, spin: true },
    dwell: 10000,
    narration: [
      {
        text: '"Every challenge presents a call to leap... Our children aren\u2019t just following\u2014they\u2019re bravely leading."',
        expression: 'excited',
        attribution: 'Jared, May 2024',
      },
      {
        text: 'It all started with an idea. And the beautiful thing about ideas? They refract. They multiply. They become something bigger than you ever imagined.',
        expression: 'love',
      },
      {
        text: 'This isn\u2019t the end of the story. It\u2019s barely the beginning.',
        expression: 'mischief',
      },
    ],
    photos: [],
  },
];

export const TOTAL_CHAPTERS = CHAPTERS.length;

export function getTourChapter(index) {
  return CHAPTERS[index] || null;
}

export function getTourChapters() {
  return CHAPTERS;
}

// Intro/outro variants for first-tour vs repeat-tour
export function getTourIntro(isRepeat) {
  if (isRepeat) {
    return { text: 'Welcome back, explorer. Ready to see the world again?', expression: 'happy' };
  }
  return { text: 'Buckle up. I\u2019m about to show you the world through the eyes of a family that said "yes" to everything.', expression: 'excited' };
}

export function getTourOutro(isRepeat) {
  if (isRepeat) {
    return { text: 'Every time you visit, I notice something new. See you next time.', expression: 'mischief' };
  }
  return { text: 'And that\u2019s just the beginning. The world is wide, and the Rowes aren\u2019t done yet.', expression: 'love' };
}
