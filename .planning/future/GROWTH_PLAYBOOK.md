# GROWTH PLAYBOOK — Activation, Virality, Metrics

## The growth model

### Intrigue → Ritual → Agency → Identity → Contribution

| Stage | What happens | What's needed |
|-------|-------------|---------------|
| **Intrigue** | People arrive because the site is visually distinct and socially shareable | Dynamic OG images, share cards, "WTF is this?" moments |
| **Ritual** | They return because there is a daily pattern | Daily engine, streaks, visible daily state |
| **Agency** | They engage because they can do something meaningful | Starseed, Glint actions, games, daily prompt |
| **Identity** | They stay because the site feels like a worldview | Constellation depth, manifesto, Glint relationship |
| **Contribution** | Only after the above — guestbook, community, shared creation | Phase 5+ |

---

## The 30-second activation path

| Time | What happens | What makes it work |
|------|-------------|-------------------|
| 0-5s | Globe or constellation stops the scroll | Visual spectacle — this is unlike any other site |
| 5-10s | Glint peeks with context-aware greeting | "Welcome — it's [holiday] today. Want to play a game?" |
| 10-30s | Visitor plays a game OR explores a constellation node | One clear next action, not a menu of 20 options |
| 30-120s | XP earned, music playing, second surprise discovered | Progression feedback, ambient delight |
| 2-10min | Vault teased, streak started, "more tomorrow" surfaced | "Come back tomorrow — there's something different every day." |
| Return | Glint remembers them. Content is different. | Relationship deepens, daily engine delivers |

### The critical failure mode
If a visitor spends 15 seconds and thinks "this is beautiful but I don't know what to do," the site has failed. The homepage must translate wonder into a **specific invitation** within 5 seconds.

---

## Viral mechanics

### What makes people share a URL

1. **The "WTF" factor** — Links shared out of bewilderment/delight. The globe, Glint, the constellation, the daily cipher are all WTF material.
2. **Screenshot-ability** — Anything that looks intriguing as a static image in a social feed. Glint saying something clever. A constellation view. A game result.
3. **The "First Discovery" hook** — When users feel they found/created something unique. Generative visitor fingerprints, first-to-solve a cipher, hidden easter eggs.
4. **Dynamic OG images** — Every URL generates a unique social card. Poorly configured OG → 40% CTR reduction. Well-crafted OG → irresistible click.

### Dynamic OG images (high priority)

**Tech:** `@vercel/og` Edge Function — generates images at request time.

| Page | OG image shows |
|------|---------------|
| `/` | Today's holiday + site mood + Glint |
| `/constellation` | The focused node + surrounding connections |
| `/constellation?node=X` | Specific node with title + epoch + image |
| Game result | Score + game visual + "Can you beat this?" |
| `/labs/canvas/:id` | Canvas preview thumbnail |
| Share card | Custom artifact (daily prompt result, visitor fingerprint) |

### Shareable moments to engineer

| Moment | Share mechanic |
|--------|---------------|
| Game completion | Score card with one-tap share button |
| Cipher solved | "I cracked today's cipher" share card |
| Constellation discovery | "I found this hidden in Jared's life map" card |
| Glint says something clever | Screenshot-worthy dialogue (design for this) |
| Generative fingerprint | "This is my jarowe.com fingerprint" — unique, downloadable |
| Streak milestone | "Day 30 at jarowe.com" achievement card |

---

## Discovery channels

### Tier 1: High impact, do first
| Channel | Action | When |
|---------|--------|------|
| **Hacker News** | "Show HN: I turned my personal site into a living interactive world with an AI guide" | When Glint tool use is working |
| **Awwwards** | Submit for Site of the Day | When the experience is polished end-to-end |
| **Creative coding Twitter/X** | Short clips of globe, constellation, Glint interactions | Ongoing, start now |

### Tier 2: Medium impact, do second
| Channel | Action |
|---------|--------|
| **Dev.to / Medium** | "How I built a 3D life constellation with R3F" (technical breakdown) |
| **Product Hunt** | Launch with "A living, playable personal website" |
| **Reddit** | r/webdev, r/reactjs, r/threejs, r/InternetIsBeautiful |
| **GitHub awesome lists** | awesome-creative-coding, awesome-threejs, awesome-react |

### Tier 3: Long-term, ongoing
| Channel | Action |
|---------|--------|
| **IndieWeb/POSSE** | Publish on jarowe.com first, syndicate to social |
| **Conference talks** | "Building a living personal world" — creative dev conferences |
| **Creative coding communities** | OpenProcessing, Shadertoy (submit standalone experiments) |
| **Newsletter** | Weekly/monthly "What's new at jarowe.com" for returners |

---

## Metrics that matter

### Don't measure
- Raw page views (meaningless for an experience site)
- Bounce rate (many visitors are exploring, not "bouncing")
- Session duration alone (doesn't distinguish engagement from confusion)

### Do measure

**Engagement depth:**
| Metric | Tool | What it tells you |
|--------|------|------------------|
| Avg engagement time | GA4 (active tab metric) | Are people actually present? |
| Interactions per visit | Custom events | Are they clicking, playing, exploring? |
| Pages per session | GA4 | Are they going deeper? |
| Scroll depth | GA4 (custom at 25/50/75/90%) | Are they finding content below the fold? |

**Return behavior:**
| Metric | Tool | What it tells you |
|--------|------|------------------|
| D1 / D7 / D30 retention | GA4 cohorts | Is the daily engine working? |
| Streak distribution | Custom event + localStorage | How many daily returners exist? |
| Resurrection rate | GA4 | Are lapsed visitors coming back? |
| Return visit rate (7-day) | GA4 | Core health metric |

**Delight events (custom):**
| Event | Trigger |
|-------|---------|
| `glint_conversation_started` | First AI chat message sent |
| `glint_tool_used` | Glint executes a navigation/action |
| `game_completed` | Any game finished (with score, duration) |
| `constellation_node_focused` | Node detail view opened |
| `easter_egg_discovered` | Any hidden content found |
| `starseed_note_created` | First note saved |
| `starseed_canvas_created` | First canvas opened |
| `daily_prompt_engaged` | Clicked/started daily prompt |
| `progress_signal_clicked` | Engaged with progress card |
| `share_initiated` | Any share button clicked |
| `xp_milestone_reached` | 100, 250, 500, 1000, 2000 |
| `streak_milestone` | 3, 7, 14, 30, 100 days |

**Viral metrics:**
| Metric | What it tells you |
|--------|------------------|
| Share rate (shares / unique visitors) | Is the site producing shareable moments? |
| OG image click-through rate | Are shared links compelling? |
| Referral source breakdown | Which channels work? |
| Show HN / PH upvote performance | How does the creative community respond? |

### Primary KPI

**Percentage of visitors who take at least one intentional action.**

Examples of intentional action:
- Ask Glint something
- Open a constellation node
- Play a game
- Solve the daily cipher
- Save an idea
- Engage with the daily prompt
- Click a progress signal

Target: 40%+ of visitors take at least one action.

---

## The neal.fun lesson

Neal Agarwal (neal.fun) is the closest comparable. Key learnings:

| What neal.fun does | What jarowe.com should learn |
|--------------------|-----------------------------|
| Each project is a standalone experience | Every page should work as a standalone shareable URL |
| Simple concept, beautiful execution | Don't over-explain. Let the interaction speak. |
| No login, no friction, no "sign up" | The core world must be fully accessible without auth |
| 50% of traffic from organic search | Technical blog posts + standalone experiences build SEO |
| New projects added when ready, not on a schedule | Quality > cadence for new features |

### What jarowe.com has that neal.fun does NOT
- Daily return mechanic (365 holidays, streaks, daily engine)
- Persistent progression (XP, achievements, relationship memory)
- An AI character with personality (Glint)
- A personal story as the narrative backbone (constellation)
- Music as first-class feature
- Creation tools (Starseed)

jarowe.com is ahead on engagement infrastructure. It needs more standalone "wow" moments to match neal.fun's acquisition power.

---

## Challenge: Is the growth model realistic for a personal site?

**Honest assessment:**
- 100,000 daily visitors is unlikely without platform mechanics or viral lightning
- 5,000-10,000 daily visitors is achievable over 2-3 years with consistent effort
- 500-1,000 deeply engaged "regulars" is the realistic sweet spot
- That is not a business. But it is proof that the personal web can still feel like magic.

**What success actually looks like:**
- jarowe.com becomes a reference point in "personal website" discussions
- "Have you seen jarowe.com?" becomes something creative technologists say to each other
- The site's techniques inspire other builders
- Conference invitations and speaking opportunities follow
- The portfolio function is served by the site's mere existence

The growth playbook optimizes for **cultural impact**, not for scale.
