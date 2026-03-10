const BASE = import.meta.env.BASE_URL;

const BITB_ART = `${BASE}images/music/Boy In The Bubble/jarowe_boyinthebubble_album-art.jpg`;
const REDUX_ART = `${BASE}images/music/Boy In The Bubble Redux/jarowe_boyinthebubbleredux_album-art.jpg`;

const tracks = [
  // ── Boy In The Bubble (Mastered) ──────────────────────────
  {
    title: "Boy In The Bubble",
    artist: "Jarowe",
    album: "Boy In The Bubble",
    src: `${BASE}audio/Boy In The Bubble/JaroweBoyInTheBubble-mastered.mp3`,
    artwork: BITB_ART,
    platform: "spotify",
    platformUrl: "https://open.spotify.com/artist/jarowe",
  },
  {
    title: "Forever is Now",
    artist: "Jarowe",
    album: "Boy In The Bubble",
    src: `${BASE}audio/Boy In The Bubble/JaroweForeverisNow-mastered.mp3`,
    artwork: BITB_ART,
    platform: "spotify",
    platformUrl: "https://open.spotify.com/artist/jarowe",
  },
  {
    title: "Limitless and Fragile",
    artist: "Jarowe",
    album: "Boy In The Bubble",
    src: `${BASE}audio/Boy In The Bubble/JaroweLimitlessandFragile-mastered.mp3`,
    artwork: BITB_ART,
    platform: "spotify",
    platformUrl: "https://open.spotify.com/artist/jarowe",
  },
  {
    title: "My Whole Life for This",
    artist: "Jarowe",
    album: "Boy In The Bubble",
    src: `${BASE}audio/Boy In The Bubble/JaroweMyWholeLifeforThis-mastered.mp3`,
    artwork: BITB_ART,
    platform: "spotify",
    platformUrl: "https://open.spotify.com/artist/jarowe",
  },
  {
    title: "The Birds That Stayed",
    artist: "Jarowe",
    album: "Boy In The Bubble",
    src: `${BASE}audio/Boy In The Bubble/JaroweTheBirdsThatStayed-mastered.mp3`,
    artwork: BITB_ART,
    platform: "spotify",
    platformUrl: "https://open.spotify.com/artist/jarowe",
  },
  {
    title: "We Were Never Ready for the Light",
    artist: "Jarowe",
    album: "Boy In The Bubble",
    src: `${BASE}audio/Boy In The Bubble/JaroweWeWereNeverReadyfortheLight-mastered.mp3`,
    artwork: BITB_ART,
    platform: "spotify",
    platformUrl: "https://open.spotify.com/artist/jarowe",
  },

  // ── Boy In The Bubble Redux ───────────────────────────────
  {
    title: "Limitless and Fragile (Remix)",
    artist: "Jarowe",
    album: "Boy In The Bubble Redux",
    src: `${BASE}audio/Boy In The Bubble Redux/Jarowe_Limitless-and-Fragile_Remix.mp3`,
    artwork: REDUX_ART,
    platform: "spotify",
    platformUrl: "https://open.spotify.com/artist/jarowe",
  },
  {
    title: "Limitless and Fragile (Slowed)",
    artist: "Jarowe",
    album: "Boy In The Bubble Redux",
    src: `${BASE}audio/Boy In The Bubble Redux/Jarowe_Limitless-and-Fragile_Slowed.mp3`,
    artwork: REDUX_ART,
    platform: "spotify",
    platformUrl: "https://open.spotify.com/artist/jarowe",
  },
  {
    title: "My Whole Life for This (Remix)",
    artist: "Jarowe",
    album: "Boy In The Bubble Redux",
    src: `${BASE}audio/Boy In The Bubble Redux/Jarowe_My_Whole_Life_for_This_Remix.mp3`,
    artwork: REDUX_ART,
    platform: "spotify",
    platformUrl: "https://open.spotify.com/artist/jarowe",
  },

  // ── SoundCloud Singles ────────────────────────────────────
  {
    title: "Cosmic Collide",
    artist: "Jarowe",
    src: `${BASE}audio/Jarowe - Cosmic Collide.mp3`,
    artwork: null,
    platform: "soundcloud",
    platformUrl: "https://soundcloud.com/jarowe",
  },
  {
    title: "Eyes Open",
    artist: "Jarowe",
    src: `${BASE}audio/Jarowe - Eyes Open.mp3`,
    artwork: null,
    platform: "soundcloud",
    platformUrl: "https://soundcloud.com/jarowe",
  },
  {
    title: "Fading Into Light",
    artist: "Jarowe",
    src: `${BASE}audio/Jarowe - Fading Into Light.mp3`,
    artwork: null,
    platform: "soundcloud",
    platformUrl: "https://soundcloud.com/jarowe",
  },
  {
    title: "Flicker and Fade",
    artist: "Jarowe",
    src: `${BASE}audio/Jarowe - Flicker and Fade - Rock.mp3`,
    artwork: null,
    platform: "soundcloud",
    platformUrl: "https://soundcloud.com/jarowe",
  },
  {
    title: "Flowgenesis",
    artist: "Jarowe",
    src: `${BASE}audio/Jarowe - Flowgenesis.mp3`,
    artwork: null,
    platform: "soundcloud",
    platformUrl: "https://soundcloud.com/jarowe",
  },
];

export default tracks;
