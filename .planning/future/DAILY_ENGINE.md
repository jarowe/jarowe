# DAILY ENGINE — The Pulse That Brings People Back

## The principle

The site must have a visible daily state. Not "there might be something new." There MUST be something that is concretely, visibly different today than it was yesterday.

The daily engine is what transforms jarowe.com from "amazing site I visited once" into "place I check every morning."

## The Wordle lesson

Wordle works because of three properties:
1. **Scarcity** — One puzzle per day. You cannot binge.
2. **Shared experience** — Everyone gets the same puzzle. Private becomes communal.
3. **Shareability** — The colored grid conveys a journey without spoiling the answer.

jarowe.com's daily engine should have all three.

---

## Daily content stack

### Layer 1: Already built (activate it)
| Content | Source | Visible? |
|---------|--------|----------|
| Daily holiday (364 entries) | `holidayCalendar.js` | Yes, via HolidayBanner |
| Holiday-matched game | `gameRegistry.js` tier mapping | Yes, via HolidayBanner game button |
| Daily cipher | `DailyCipher.jsx` | Yes, but requires discovery |
| Daily trivia | `DailyTrivia.jsx` | Yes, but buried |

**Problem:** These exist but are not unified into a "today" experience. The holiday is a banner. The cipher is a vault entry. The trivia is a modal. There is no single "Today at jarowe.com" surface.

### Layer 2: New daily content (build it)
| Content | How it works | Effort |
|---------|-------------|--------|
| **Featured constellation node** | `dailyPick(nodes, 'node')` — one life moment highlighted daily | Easy |
| **Featured music track** | `dailyPick(tracks, 'track')` — today's soundtrack | Easy |
| **Daily creative prompt** | Pool of ~100 prompts, rotated by seed. "Draw your morning in 30 seconds." | Easy |
| **Glint's thought of the day** | Vercel cron → OpenAI gpt-4o-mini → Supabase. ~200 words with personality. | Medium |
| **Daily generative art** | Fragment shader seeded by date. Same date = same art. | Medium |
| **Progress signal** | One data point or headline from curated sources | Medium |

### Layer 3: Ambient daily variation (automatic)
| Variation | How it works |
|-----------|-------------|
| Color temperature | `suncalc` dawn/dusk/night → CSS custom properties |
| Moon phase | `SunCalc.getMoonIllumination()` → particle brightness, nebula glow |
| Weather | Open-Meteo → fog density, particle speed, rain overlay |
| Season | Day-of-year → palette shift, particle type |
| Holiday theme | Existing HolidayContext → extended to more visual surfaces |

---

## "Today" homepage component

### What it shows
A visible, date-specific hero section answering: **"What is alive here today?"**

```
┌─────────────────────────────────────────────┐
│  Today: National Inventors Day              │
│                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │ Play │ │ Node │ │Prompt│ │Signal│      │
│  │ 🎮   │ │ ⭐   │ │ ✏️   │ │ 📈   │      │
│  └──────┘ └──────┘ └──────┘ └──────┘      │
│                                             │
│  Glint: "Thomas Edison would have loved     │
│  this site. Want to see the tech nodes?"    │
└─────────────────────────────────────────────┘
```

### Cards within "Today"
1. **Holiday + Game** — "It's [holiday]. Play [matched game]."
2. **Featured Node** — "Today's constellation highlight: [node title]"
3. **Creative Prompt** — "Today's prompt: [prompt text]. Start in Starseed →"
4. **Progress Signal** — "One quiet breakthrough: [headline]" (link out)
5. **Glint Invitation** — Context-aware one-liner + CTA

### Success metric
Visitor sees something date-specific in under 5 seconds.

---

## Technical architecture

### Daily seed module
```js
// src/utils/dailySeed.js
import seedrandom from 'seedrandom';

export function getDailySeed(namespace = '') {
  const key = new Date().toISOString().slice(0, 10) + namespace;
  return seedrandom(key);
}

export function dailyPick(arr, namespace) {
  const rng = getDailySeed(namespace);
  return arr[Math.floor(rng() * arr.length)];
}

export function dailyIndex(length, namespace) {
  const rng = getDailySeed(namespace);
  return Math.floor(rng() * length);
}
```

**Package:** `seedrandom` (3KB, npm) — deterministic PRNG. Replaces hand-rolled `seededRandom` in DailyTrivia.

### Astronomical data (client-side, $0)
```js
// src/utils/astro.js
import SunCalc from 'suncalc';

export function getAstroState(lat = 28.54, lng = -81.38) {
  const now = new Date();
  const times = SunCalc.getTimes(now, lat, lng);
  const moon = SunCalc.getMoonIllumination(now);
  const sunPos = SunCalc.getPosition(now, lat, lng);

  // Determine time-of-day phase
  let phase = 'night';
  if (now > times.dawn && now < times.sunrise) phase = 'dawn';
  else if (now > times.sunrise && now < times.goldenHourEnd) phase = 'golden-morning';
  else if (now > times.goldenHourEnd && now < times.goldenHour) phase = 'day';
  else if (now > times.goldenHour && now < times.sunset) phase = 'golden-evening';
  else if (now > times.sunset && now < times.dusk) phase = 'dusk';

  return {
    phase,            // 'dawn' | 'golden-morning' | 'day' | 'golden-evening' | 'dusk' | 'night'
    moonFraction: moon.fraction,  // 0 = new, 0.5 = full
    moonPhase: moon.phase,        // 0-1 cycle
    isFullMoon: moon.fraction > 0.98,
    isNewMoon: moon.fraction < 0.02,
    sunAltitude: sunPos.altitude,
  };
}
```

**Package:** `suncalc` (4KB, npm, zero deps)

### Weather data (free API, server-cached)
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=28.54&longitude=-81.38
  &current_weather=true
  &hourly=cloudcover,precipitation
```

- Cache in `sessionStorage` (refresh every 30 min)
- Or fetch via Vercel Edge Function + KV cache
- Map to visual parameters:

| Weather field | Visual parameter |
|--------------|-----------------|
| `cloudcover` | NebulaFog density, star visibility |
| `windspeed` | Particle velocity, cloth animation speed |
| `temperature` | Color warmth (CSS custom property) |
| `precipitation` | Rain/snow particle overlay |
| `weathercode` | Special effects (thunderstorm flash, fog) |

### Glint daily journal (Vercel cron)
```json
// vercel.json
{ "crons": [{ "path": "/api/daily-journal", "schedule": "0 7 * * *" }] }
```

```js
// api/daily-journal.js
// 1. Read today's holiday
// 2. Read constellation events on this date
// 3. Call gpt-4o-mini with Glint personality prompt
// 4. Store in Supabase glint_journal(date, body, mood)
// 5. Return 200
```

**Cost:** ~$0.06/month

---

## Streak system

### How it works
```js
// localStorage: jarowe_streak
{
  currentStreak: 7,
  longestStreak: 14,
  lastVisitDate: '2026-03-19',
  freezesAvailable: 1,    // earned at milestones
  freezesUsed: 0
}
```

### Glint reactions to streaks
| Streak | Glint says |
|--------|-----------|
| 3 days | "Three in a row! You're becoming a regular." |
| 7 days | "A whole week! I made you something..." (unlock: exclusive Glint dialogue) |
| 14 days | "Two weeks straight. You know this place better than most." |
| 30 days | "A month. We should talk." (unlock: special constellation layer) |
| Broken | "Hey, you missed a day. But I saved your streak — just this once." (auto-freeze) |
| Resumed | "Welcome back. I kept your spot." |

### Streak freeze
- Earned at streak milestones (7, 30, 100)
- Auto-applied when a day is missed (reduces churn 21% per Duolingo data)
- Max 1 freeze available at a time (prevents hoarding)

---

## Date-locked easter eggs

| Date | Effect |
|------|--------|
| Full moon | Enhanced nebula glow, brighter particles, Glint moon dialogue |
| New moon | Darker atmosphere, constellation lines more visible, "mystery" Glint |
| Friday the 13th | Subtle glitch effects, Glint gets nervous |
| Pi Day (3/14) | Pi digits scroll across footer |
| Summer solstice | Longest "daylight" in UI, special astronomical animation |
| Winter solstice | Shortest daylight, aurora borealis effect |
| Equinox | Day/night perfectly balanced, special shader |
| Leap Day | Content only available once every 4 years |
| Site birthday | Retrospective mode, "X days alive" celebration |
| User's 100th visit | Confetti + special Glint celebration |

---

## Cost

| Item | Monthly |
|------|---------|
| Glint journal (30 OpenAI calls) | $0.06 |
| Open-Meteo weather | $0.00 |
| SunCalc (client-side) | $0.00 |
| seedrandom (client-side) | $0.00 |
| NASA APOD (optional) | $0.00 |
| **Total daily engine** | **~$0.06/month** |

## Challenge: Will people actually come back daily?

The honest answer: probably not at first. The daily return habit requires a critical mass of daily visitors who talk about it.

**The realistic path:**
1. Build the daily engine so it's there when discovery happens
2. Invest in one viral moment (Show HN, Awwwards, creative coding community)
3. The daily engine converts one-time visitors into returners
4. Returners become advocates who bring more visitors
5. The flywheel starts

The daily engine is not the acquisition strategy. It is the **retention strategy**. Acquisition comes from shareability, OG images, and "WTF is this?" moments.
