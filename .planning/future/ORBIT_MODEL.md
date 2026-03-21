# ORBIT MODEL — The Four-Layer Architecture

## The principle

Every idea gets the right orbit. Not every idea belongs on the homepage. Not every idea belongs on the site at all. The orbit model prevents ambition without hierarchy.

```
                    ┌─────────────────────────────┐
                    │     CORE WORLD: jarowe.com   │
                    │                               │
                    │  Wonder. Presence. Daily pulse.│
                    │  Personal mythology.           │
                    │                               │
                    │    ┌───────────────────┐      │
                    │    │   GUIDE: Glint    │      │
                    │    │                   │      │
                    │    │ Navigate. Reveal. │      │
                    │    │ Activate. Memory. │      │
                    │    └───────────────────┘      │
                    │                               │
                    └────────────┬──────────────────┘
                                 │
                    ┌────────────┴──────────────────┐
                    │                               │
              ┌─────┴─────┐                 ┌───────┴──────┐
              │  CREATION  │                │   SIGNAL     │
              │ Starseed   │                │  Progress    │
              │            │                │              │
              │ Canvas.    │                │ Curated.     │
              │ Notes.     │                │ Visual.      │
              │ Kickoffs.  │                │ Hopeful.     │
              └────────────┘                └──────────────┘
```

---

## Orbit 1: Core World (jarowe.com)

### What lives here
- The cinematic globe with real-time sun, weather, atmosphere
- The constellation (life, work, ideas, memory)
- The bento grid homepage
- Games, puzzles, secrets, experiments
- Music (GlobalPlayer, releases, campaigns)
- Daily holiday layer (364 entries)
- XP progression, achievements, vault

### Mental model for visitors
| Space | What it is |
|-------|-----------|
| **Earth** | Real-time world — weather, daylight, moon, signal |
| **Constellation** | Life map — work, travel, ideas, memory, connections |
| **Play** | Games, puzzles, secrets, experiments |
| **Create** | Starseed canvas, notes, prompts (portal to Orbit 3) |
| **Glint** | The guide who moves between all of them |

### Design principle
The core world must feel **complete on its own**. A visitor who never touches Starseed or the progress signal should still have a full, compelling experience. The core world is not a gateway to other products — it IS the product.

### What the homepage answers
- What is alive here today? (daily state, holiday, weather)
- Where should I go first? (Glint invitation, featured portal)
- What can I make from here? (creation prompt, Starseed CTA)

---

## Orbit 2: Guide Layer (Glint)

### What Glint does
Glint is the operating layer, not just the conversational layer.

| Role | Examples |
|------|---------|
| **Explain** | "This constellation maps 20 years of Jared's life." |
| **Navigate** | "Let me take you to the Greece epoch." → actually navigates |
| **Reveal** | "There's something hidden on this page. Want a hint?" |
| **Activate** | "You've been exploring for 10 minutes. Want to make something?" |
| **Create** | "Let me start a Starseed canvas with that idea." |
| **Remember** | "Last time you were curious about the filmmaking nodes." |

### Glint is NOT
- A generic chatbot that answers any question about anything
- A search engine wrapper
- An unbounded AI agent that can do anything on the internet
- A customer support bot

### Glint IS
- A site-native intelligence with agency **inside this world**
- A character with personality, humor, and opinions
- The fastest way to understand, navigate, and use the site
- A bridge between browsing and creating

### Key constraint
Glint should feel bounded and specific. "I can help you explore this world and start creating. I can't book your flights." The constraints make him MORE memorable, not less.

See [GLINT_EVOLUTION.md](./GLINT_EVOLUTION.md) for the full technical path.

---

## Orbit 3: Creation Layer (Starseed Labs)

### The split
**jarowe.com inspires. Starseed helps you begin.**

This is the clean boundary. The core world provokes wonder. Starseed converts that wonder into action.

### What lives here
- Infinite sketch canvas (Excalidraw)
- Notes/doc surface (Milkdown)
- Idea capture ("save this thought")
- Project kickoffs (templates, AI scaffolding)
- Creative utilities (share cards, export, etc.)

### Route structure
```
/labs                  — Hub landing
/labs/scratchpad       — Quick notepad (Milkdown)
/labs/canvas           — Infinite canvas (Excalidraw)
/labs/canvas/:id       — Specific project
/labs/brainstorm       — Glint-powered ideation
```

### How visitors arrive
1. Glint suggests it: "Want to sketch that idea?"
2. Homepage CTA: "Start creating in Starseed"
3. Direct navigation: Navbar "Create" link
4. After inspiration: "That constellation node sparked something → capture it"

### What Starseed is NOT (yet)
- A marketplace
- A collaborative platform (until single-player proves out)
- A full design tool competing with Figma/Canva
- A publishing platform

See [STARSEED_LABS.md](./STARSEED_LABS.md) for the full blueprint.

---

## Orbit 4: Signal Layer (Progress)

### The principle
Positive news/progress belongs on the site, but NOT as the core identity.

It is a **lens**, not a **feed**.

### What it looks like
- Small number of meaningful signals (3-5 per day max)
- Highly visual (charts, maps, photos — not article cards)
- Geographically grounded when possible (pin on globe)
- Linked to action or curiosity ("learn more," "see the data")
- Glint can present it: "Here's one quiet breakthrough from today."

### Tone
- Intelligent, measured, constructive
- NOT saccharine, NOT "good vibes only"
- Hope through clarity, not empty positivity
- "What got better" > "Everything is fine"

### Sources (curated, not aggregated)
| Type | Examples |
|------|---------|
| Data | Our World in Data, public datasets, climate/health charts |
| News metadata | Headline summaries with link-outs to original reporting |
| Constructive journalism | Good Good Good, Fix The News, The Progress Network |

### What this is NOT
- A full editorial operation with daily publishing
- A generic news aggregator
- A social feed of user-submitted stories
- The homepage identity

See [PROGRESS_LENS.md](./PROGRESS_LENS.md) for implementation details.

---

## Orbit decisions — Where ideas go

| Idea | Orbit | Rationale |
|------|-------|-----------|
| Weather on the globe | Core World | Atmospheric — makes the world feel real |
| Glint navigates pages | Guide | Glint's core job |
| Excalidraw canvas | Creation (Starseed) | Creative tool, not the core experience |
| "What got better today" card | Signal | Progress lens, not homepage identity |
| Gaussian splat of Greece | Core World | Memory portal — part of the personal mythology |
| Full news feed | REJECT | Too editorial, dilutes the world |
| Multiplayer cursors | DEFER | Not until single-player retention is proven |
| Desktop OS mode | DEFER | Fun but not before core loop is magnetic |
| Voice-enabled Glint | Guide (Phase 3) | After tool use is solid |
| Community guest book | Core World (Phase 5) | Only after daily return loop exists |

## Challenge: Is four orbits too many?

For a personal site built by one person? Maybe. The risk is that Starseed and Progress become ghost towns — routes that exist but feel empty.

**Counter-move:** Start with the core world + Glint only. Add Starseed when Glint can hand off naturally. Add Progress as a single card on the homepage, not a section. Only promote to full routes when there's enough content to feel alive.

The orbit model is a **destination map**, not a launch-day feature list.
