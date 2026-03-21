# UI-SPEC
## Phase 03 - Living Homepage

Date: 2026-03-20
Status: Approved planning input

Canonical inputs:
- `.planning/future/MASTER_PLAN.md`
- `.planning/future/IDENTITY.md`
- `.planning/future/ORBIT_MODEL.md`
- `.planning/future/90_DAY_PLAN.md`

---

## 1. Purpose

The homepage must stop feeling like a static collection of impressive cells and start feeling like a living foyer.

Within 5 seconds, a new visitor must understand:
- this site is alive today
- Glint can help
- there is something worth exploring now
- there is somewhere to create, not just browse

This phase is not a redesign from scratch.
It is a strategic evolution of the existing bento, globe, music, and Glint homepage into a stronger living-world entry point.

---

## 2. Primary UX outcomes

### Visitor outcomes

1. See date-specific content immediately.
2. Feel a clear time-of-day mood.
3. Notice that Glint is an available guide.
4. Notice at least one creation path into Starseed.
5. Leave with a clear next action.

### Brand outcomes

1. Preserve wonder.
2. Increase clarity.
3. Avoid "dashboard slop."
4. Make the world feel inhabited, not merely decorated.

### Product outcomes

1. Homepage supports daily return behavior.
2. Homepage becomes the launch surface for Glint and Starseed.
3. Existing globe/hero/music strengths remain intact.

---

## 3. Non-goals

This phase should not:
- replace the bento layout with a generic feed
- turn the homepage into a dense analytics dashboard
- bury the globe beneath informational cards
- make Starseed feel like a separate app taking over the homepage
- over-explain the site with too much copy

---

## 4. Design principles

### 4.1 Living, not busy

The page should feel dynamic because it responds to time, weather, and date, not because every region is animated at once.

### 4.2 Premium, not productivity-app

Glass, glow, depth, atmosphere, and cinematic composition remain core. Avoid enterprise UI patterns.

### 4.3 Clarity inside magic

Mystery is good.
Confusion is not.

Every magical surface needs one graspable hook.

### 4.4 Action follows inspiration

Whenever the page surfaces wonder, it should also offer a path into action:
- ask Glint
- open portal
- start in Starseed

### 4.5 Use existing strengths

The globe, music, holiday system, and Glint personality are not side details. They are anchors. The new UI layers should wrap around them rather than compete with them.

---

## 5. Homepage hierarchy

The homepage hierarchy for this phase is:

1. **Today Layer**
2. **Hero + Globe**
3. **Glint access**
4. **Starseed entry**
5. **Existing bento exploration surfaces**

Interpretation:
- the page must communicate "today" before or alongside "who Jared is"
- the globe remains a top-two visual anchor
- Glint must be visible without requiring discovery
- Starseed must be visible without dominating the home

---

## 6. Layout contract

## 6.1 Desktop

Keep the existing 4-column bento system as the structural base.

### New structure

1. **Top utility layer**
   - existing navbar stays
   - optional small "Today" indicator or command hint may live in nav chrome

2. **Today Rail**
   - new full-width strip above the main bento grid
   - visually integrated with the homepage, not a separate dashboard slab
   - consists of 3-4 compact living cards

3. **Main bento grid**
   - keep Hero cell in primary position
   - keep Globe cell in primary position
   - preserve music prominence
   - convert Workshop-facing project surface into Starseed-facing surface

### Today Rail card order

Recommended order:
- Card 1: Today state
- Card 2: Glint thought of the day
- Card 3: Progress signal
- Card 4: Creative prompt / Start in Starseed

If space pressure appears, cards 2 and 3 may stack visually or card 2 may collapse into the hero on smaller desktop widths.

## 6.2 Tablet

- Today Rail becomes 2x2 card grid
- Hero and Globe remain high in the page order
- Music cell may shorten in height
- Starseed CTA remains above the fold if possible

## 6.3 Mobile

- Today Rail becomes the first swipeable/stacked card group below navbar
- Hero card appears next
- Globe remains prominent but may sit below hero instead of side-by-side
- Glint FAB stays persistent
- Avoid forcing the user to scroll deep before discovering the "today" or "create" hooks

---

## 7. Today Layer specification

The Today Layer is the single most important UI addition in this phase.

It must feel:
- immediate
- elegant
- personal
- current
- lightweight

### 7.1 Card 1: Today state

Purpose:
- prove the page knows what day it is

Required contents:
- date or contextual day label
- holiday or seasonal label when available
- one short featured-node or featured-path line
- one primary CTA

Primary CTA options:
- `Explore today's path`
- `Show me what's new`
- `Open today's constellation`

Visual tone:
- highest contrast card in the Today Rail
- should subtly inherit time-of-day palette

### 7.2 Card 2: Glint thought of the day

Purpose:
- make Glint feel like a resident intelligence, not only a button

Required contents:
- short journal excerpt or "Thought of the Day"
- small Glint identity marker
- CTA: `Ask Glint`

Behavior:
- the card can open the expanded Glint panel or start a focused Glint interaction

### 7.3 Card 3: Progress signal

Purpose:
- connect the personal world to a better larger world

Required contents:
- one concise headline
- source attribution
- optional coordinate or category chip
- CTA: `See signal`

Visual rule:
- hopeful but rigorous
- avoid feed-style list visuals
- this must read like a single meaningful signal, not news clutter

### 7.4 Card 4: Creative prompt

Purpose:
- move the visitor from curiosity into action

Required contents:
- prompt text
- small mode chip such as `write`, `sketch`, `build`, or `dream`
- primary CTA: `Start in Starseed`
- optional secondary CTA: `Ask Glint to expand`

Visual rule:
- this card should feel invitational, not instructional

---

## 8. Hero cell contract

The hero cell remains a flagship identity surface.

### Must continue to do
- establish Jared's personality
- keep handcrafted, premium tone
- hold brand/mood copy

### Must evolve to do
- connect more clearly to the daily layer
- include one direct bridge into Glint or Starseed

### CTA rules

The hero cell may include one or two CTAs max:
- one exploration CTA
- one creation CTA

Do not overload the hero with four buttons.

Recommended CTA pair:
- `Enter the world`
- `Start in Starseed`

---

## 9. Globe cell contract

The globe remains one of the most visually arresting surfaces on the homepage.

### Must continue to do
- feel cinematic
- express real-time sun/day-night behavior
- communicate travel, wonder, and scale

### Must evolve to do
- participate in weather state
- participate in moon/time mood shifts
- provide clearer portal potential for future immersive scenes

### Overlay rules

Do not add dense text over the globe.
Overlays must stay sparse:
- existing tour trigger
- subtle world-state indicator
- optional pinned progress-signal marker if relevant

The globe is for awe first, utility second.

---

## 10. Glint entry-point contract

Glint must be visible in three places:

1. **Ambient presence**
   - hero or page personality zone

2. **Persistent access**
   - existing Glint FAB stays

3. **Today Layer**
   - one explicit "Ask Glint" entry point via the journal card

### Rules

- At least one Glint affordance must be above the fold on all breakpoints.
- Glint should feel invited by the page, not hidden as an easter egg.
- The page should never present more than one competing primary Glint CTA in the same viewport cluster.

### Command palette

If `Cmd+K` / `Ctrl+K` is surfaced visually, do it subtly:
- top-right hint
- Glint badge
- compact keyboard chip

Do not add a large enterprise-style search bar.

---

## 11. Starseed CTA contract

Starseed must appear as the creation destination for the homepage.

### Required surfaces

1. Today prompt card
2. Hero secondary CTA
3. Project/workshop replacement card inside the bento grid

### Messaging rules

Use language that feels catalytic, not software-like:
- `Start in Starseed`
- `Sketch the idea`
- `Open a canvas`
- `Turn this into something`

Avoid:
- `Create document`
- `Open workspace`
- `Launch productivity suite`

### Homepage Starseed card

The existing Workshop-facing project cell should become a Starseed-facing branded cell.

Purpose:
- establish Starseed as a real orbit, not a buried route

Required contents:
- Starseed name
- short value proposition
- at least one active project cue
- CTA into `/starseed`

---

## 12. Time-of-day visual state contract

The homepage must visibly change with time of day, but the change must be atmospheric rather than theatrical.

### Phases

- Dawn
- Day
- Golden hour
- Dusk
- Night

### Surfaces affected

- page background wash
- glass tint
- hero accent glow
- globe atmosphere warmth
- particle brightness
- text glow intensity
- subtle shadow softness

### Visual behavior by phase

#### Dawn
- cooler horizon with warm emerging accents
- low-contrast glow
- feeling: awakening

#### Day
- clearest readability
- reduced neon
- lighter glass highlights
- feeling: active, open

#### Golden hour
- warm amber accents
- richer gradients
- strongest emotional warmth

#### Dusk
- deepening indigo and coral edge light
- increased atmosphere
- cinematic transition energy

#### Night
- strongest star visibility
- richest nebula and particle presence
- brighter pinpoint highlights against dark background

### Guardrails

- readability must remain strong in all phases
- no phase should feel like a different theme system
- the palette should shift, not reset

---

## 13. Weather-state contract

Weather modifiers layer on top of time-of-day states.

### Supported modes

- Clear
- Cloudy
- Rain
- Storm
- Snow
- Fog
- Windy

### Affected surfaces

- globe fog density
- particle movement speed
- background haze
- precipitation overlay
- hero/glass contrast
- optional icon/chip in Today state

### Intensity rules

Weather effects must be subtle by default.

Maximum intensity is reserved for:
- active storm
- dense fog
- snow

The page must never become harder to use because of the weather layer.

### Geolocation fallback

If precise weather is unavailable:
- use fallback coordinates or non-localized default mood
- never block rendering
- never present broken weather UI

---

## 14. Moon-phase contract

Moon phase affects atmosphere, not layout.

### Influences

- nebula glow
- particle brightness
- subtle badge or hidden date cue
- occasional Glint line variation

### Rules

- this should be discoverable by repeat visitors, not explained loudly
- full moon may trigger slightly stronger atmosphere or hidden delight
- no moon state should overpower the Today Layer

---

## 15. Motion contract

Motion must support wonder and orientation.

### Required

- smooth state transitions between time/weather updates
- subtle parallax and hover response in cards
- elegant reveal for Today Rail cards
- cross-page view transitions later in implementation

### Avoid

- simultaneous heavy looping motion in every card
- long entrance sequences that delay comprehension
- aggressive particle or fog motion on low-power devices

### Reduced motion

Support reduced motion by:
- shortening or removing hover transforms
- reducing particle drift
- minimizing animated shimmer

---

## 16. Content contract

### Copy tone

The homepage copy should feel:
- direct
- lyrical in small doses
- alive
- handcrafted

It should not feel:
- corporate
- pseudo-spiritual
- vague to the point of unusable

### Content density

Keep most homepage copy short.

Suggested max lengths:
- Today state: 1 line plus CTA
- Glint thought: 1-2 short lines
- Progress signal: headline plus source
- Prompt: 1 prompt plus CTA

---

## 17. Accessibility contract

Required:
- keyboard access to all Today Layer CTAs
- visible focus states
- sufficient contrast in all time-of-day states
- semantic card headings where appropriate
- motion fallbacks for reduced-motion users
- weather visuals must not be the sole source of information

Avoid:
- relying only on color to convey current state
- text overlays on highly active backgrounds without support

---

## 18. Implementation mapping

This UI spec maps onto the current homepage as follows:

- keep existing `.bento-grid` and major cell rhythm
- add new Today Rail above the grid
- preserve `cell-hero`, `cell-map`, and `cell-music` prominence
- repurpose Workshop/project cell into Starseed-facing cell
- retain HolidayBanner concept, but visually subordinate it to the Today Layer if both appear
- retain Glint FAB and expanded panel

This is an additive phase, not a homepage rewrite.

---

## 19. Acceptance criteria

The UI spec is satisfied when:

1. A visitor can identify the homepage's daily state within 5 seconds.
2. The page visibly changes across time-of-day phases without harming readability.
3. Weather influences the atmosphere without reducing usability.
4. Glint has a clear visible entry point above the fold.
5. Starseed has at least three homepage entry points.
6. The homepage still feels premium and world-like, not like a widget dashboard.
7. Mobile preserves the same conceptual hierarchy as desktop.

---

## 20. Final directive

Do not design this page like a productivity homepage.

Design it like the foyer of a living creative world:
- one part observatory
- one part memory palace
- one part invitation

The user should feel that something is happening here today, and that they can step into it immediately.
