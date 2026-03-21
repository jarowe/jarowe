# PROGRESS LENS — Hope Through Clarity

## The principle

Positive news/progress belongs on jarowe.com, but as a **lens**, not a **feed**. Not a news site. Not an editorial operation. A curated, visual, intelligent signal layer that makes the world feel less broken without pretending everything is fine.

The tone: **hopeful but rigorous**. Hope through clarity, not empty positivity.

## What it looks like

### On the homepage
A single "Progress Signal" card in the "Today" section:
```
┌──────────────────────────────┐
│ 📈 One quiet breakthrough    │
│                              │
│ Coral reef coverage in the   │
│ Great Barrier Reef hit its   │
│ highest level since 1986.    │
│                              │
│ Source: AIMS monitoring      │
│ [See the data →]             │
└──────────────────────────────┘
```

### NOT on the homepage
- A scrolling feed of 50 positive news stories
- An "Uplifting News" section with puppy rescue stories
- A dashboard of metrics and charts
- A social feed of user-submitted stories

## Content strategy

### Three source types

**1. Data sources (automated)**
| Source | What it provides | API/access |
|--------|-----------------|------------|
| Our World in Data | Long-term progress charts (poverty, health, education, energy) | Open data, CSV/JSON |
| World Bank Open Data | Development indicators | Free API |
| WHO Global Health Observatory | Health progress metrics | Free API |
| IEA / IRENA | Renewable energy deployment data | Reports, some APIs |

**2. News metadata (semi-automated)**
| Source | What it provides | Access |
|--------|-----------------|--------|
| GNews API | Headlines from 60K+ sources, keyword filterable | Free tier: 100 req/day |
| RSS feeds from constructive journalism outlets | Curated stories | Free, use `rss-parser` npm |

**RSS sources to aggregate:**
- Positive.News RSS
- Reasons to be Cheerful RSS
- Fix The News RSS
- Good Good Good RSS
- Our World in Data RSS
- Vox Future Perfect RSS

**3. Curated constructive journalism (manual)**
| Source | Quality | Notes |
|--------|---------|-------|
| The Progress Network | High | Expert commentary on underreported progress |
| Fix The News | High | Constructive framing of mainstream stories |
| Good Good Good | High | Solutions-focused, well-designed |
| Future Crunch | High | Data-driven, bi-weekly |
| Reasons to be Cheerful | High | David Byrne's project, editorial taste |

## Technical pipeline

### Phase 1: Manual curation (now)
- Maintain `src/data/progressSignals.json` — hand-curated array of ~100 signals
- Each signal: `{ date, headline, source, sourceUrl, category, chartUrl? }`
- `dailyPick(signals, 'progress')` selects one per day
- Zero API cost, zero infrastructure

### Phase 2: Semi-automated (after daily engine works)
```
Vercel Cron (every 6 hours):
  → Fetch 5-10 RSS feeds via rss-parser
  → Keyword pre-filter (positive indicators)
  → Optional: LLM scoring via gpt-4o-mini ($0.001/article)
  → Store top 10 in Supabase progress_signals table
  → Manual review flag for borderline items
```

**Cost:** ~$1-3/month for LLM scoring

### Phase 3: Glint-narrated briefing (future)
Glint synthesizes the day's 3-5 most interesting signals into a personality-driven briefing:
"Okay so three things happened today that you probably didn't see on your doom scroll..."

## Content principles

### DO
- Lead with data when possible (charts > opinions)
- Link to original sources always
- Show trends, not isolated incidents
- Include geographic context (where in the world?)
- Mix scales: global trend + local story + scientific breakthrough

### DON'T
- Aggregate puppy rescue stories (lowest-common-denominator positivity)
- Ignore context (a positive headline about a country in crisis needs framing)
- Force positivity ("Everything is fine!" when it's not)
- Create editorial overhead that requires daily attention
- Build a feed that competes with the core world for attention

## Globe integration

Progress signals with geographic data can pin to the globe:
- A renewable energy milestone in Denmark → glowing pin at 55.6°N, 12.5°E
- Coral reef recovery → pin at Great Barrier Reef coordinates
- Visitors spin the globe and discover where good things are happening

This is the strongest visual treatment: **progress as geography, not as a feed.**

## Challenge: Is this worth building at all?

The risk is that a single daily card doesn't justify the infrastructure, and a full feed dilutes the world.

**Counter-move:** Start with the manual JSON array. Zero infrastructure. If visitors engage with the card (click-through rate, time spent), expand to semi-automated. If they ignore it, it's just a static JSON file that costs nothing to maintain.

The progress lens is a **cheap bet** on whether jarowe.com visitors want to leave feeling not just wonder but also hope. If they do, it becomes a differentiator. If they don't, it quietly fades to a daily Glint line.

The worst outcome is building a full editorial pipeline that nobody reads. Guard against that by starting manually and measuring.
