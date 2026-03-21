# MASTER PLAN
## jarowe.com v2.0 - the living world that helps Jared ship

This is the canonical strategy document for v2.0.

Read this first.

Use it to answer:
- What are we actually building?
- What is in v2.0 and what is not?
- How does this reduce Jared's operational burden?
- How do all the planning docs fit together?
- What order do we ship this in so it actually works?

---

## Executive decision

**Include all scoped v2.0 requirements.**

Do not cut the differentiators.

The listed requirements are already strategically filtered. They are not random feature creep. Together they form one complete product loop:

1. the site feels alive today
2. Glint can act
3. Starseed gives visitors somewhere to create
4. the daily engine makes the world change without manual effort
5. one immersive portal gives the site a flagship wow surface

If you cut the differentiators, you do not get a tighter product.
You get disconnected fragments:

- a homepage that hints at life but does not fully feel alive
- a Glint that talks but does not act enough
- a Starseed layer without strong handoff
- daily infrastructure without emotional payoff
- no flagship spectacle worth sharing

The right move is:

**Keep all scoped v2.0 requirements. Sequence them intelligently.**

---

## Scope correction

The requirement list currently described as "28 requirements" is actually **37 requirements across 6 categories**.

Breakdown:

| Category | Count |
|----------|------:|
| Today Layer | 7 |
| Glint Operator | 7 |
| Starseed Hub | 7 |
| Starseed Labs | 6 |
| Daily Engine | 6 |
| Immersive Portal | 4 |
| **Total** | **37** |

This document uses the correct total: **37**.

---

## The grand picture

jarowe.com v2.0 is not six separate initiatives.

It is one system:

**A living personal world that turns curiosity into creation, then makes it easy for Jared to turn real life, projects, travel, music, and ideas into living site content without constant manual publishing work.**

That system has four visible layers and one invisible spine.

### Visible layers

1. **World**
   - homepage
   - globe
   - constellation
   - music
   - games
   - atmosphere
   - portal

2. **Guide**
   - Glint
   - command palette
   - narrative actions
   - daily invitations

3. **Creation**
   - Starseed hub
   - scratchpad
   - canvas
   - brainstorm flows

4. **Signal**
   - progress card
   - positive/constructive daily signal
   - world-improving perspective

### Invisible spine

5. **Autonomous publishing and orchestration**
   - deterministic daily rotation
   - dynamic OG generation
   - saved ideas
   - reusable content blocks
   - future automation hooks for publishing and promotion

This fifth layer is the hidden reason the whole system matters.
It is what makes the experience feel alive for visitors and low-friction for Jared.

---

## The promise to Jared

The site should do more of the remembering, shaping, and surfacing so Jared can do more of the creating.

### The core operating promise

**Capture once. Surface everywhere.**

Jared should be able to:
- have an idea
- save it quickly
- turn it into a note or canvas
- let Glint understand it
- let the site feature or reference it
- generate shareable previews automatically
- route visitors toward it without rebuilding the context every time

### What "just work" means here

It does **not** mean full autonomous chaos.
It means bounded, useful leverage.

It means:
- the homepage updates itself daily
- Glint can route people intelligently
- saved ideas land in Starseed automatically
- social previews are generated automatically
- one project or thought can feed multiple surfaces

It does **not** mean:
- a generic agent roaming the internet
- uncontrolled auto-publishing
- replacing taste and curation
- removing Jared from creative direction

The goal is not to remove the human.
The goal is to remove repetitive overhead around the human.

---

## The emotional promise to visitors

When a visitor arrives, the site should make them feel:

1. "This place is alive."
2. "This place knows what day it is."
3. "This guide can actually help me."
4. "This world wants me to make something too."
5. "I should come back."

That is the entire strategy in five feelings.

---

## The product loop

The loop for visitors:

1. **Arrive**
   - see today's state immediately
   - notice world mood, weather, light, Glint invitation

2. **Explore**
   - move into globe, constellation, games, music, portal

3. **Interact**
   - ask Glint something
   - use command palette
   - trigger a daily ritual

4. **Create**
   - save an idea
   - open Starseed
   - sketch, write, brainstorm

5. **Carry away**
   - leave with a note, memory, card, idea, or emotional impression

6. **Return**
   - come back because tomorrow is different

The loop for Jared:

1. create something in life or work
2. capture it once
3. let the site generate supporting surfaces
4. let Glint route people to it
5. let daily rotation and OG systems keep it circulating

Visitors experience wonder.
Jared experiences leverage.

Both matter.

---

## v2.0 scope map

Everything listed below is **in scope for v2.0**.

The rule is simple:

- all 37 scoped requirements are in v2.0
- they ship in waves
- only larger out-of-scope ideas remain deferred

---

## 1. Today Layer

### Why this category exists

This is the difference between "cool homepage" and "living homepage."

It creates immediate aliveness, temporal awareness, and daily relevance.

### In scope for v2.0

- `TODAY-01` Visitor sees date-specific content within 5 seconds
- `TODAY-02` Homepage color temperature shifts by time of day
- `TODAY-03` Moon phase subtly affects visuals
- `TODAY-04` Real weather drives atmospheric visuals
- `TODAY-05` Glint daily journal entry appears as a card
- `TODAY-06` Daily progress signal card appears on homepage
- `TODAY-07` Daily creative prompt card with Starseed CTA

### Strategic role

This category makes the site feel alive before the user clicks anything.

Without it, the site feels handcrafted.
With it, the site feels inhabited.

---

## 2. Glint Operator

### Why this category exists

Glint is the human interface to the whole world.

The site becomes dramatically easier to use when a visitor can simply ask for movement, discovery, or action.

### In scope for v2.0

- `GLINT-01` Navigate to any page through conversation
- `GLINT-02` Launch any game through conversation
- `GLINT-03` Control music through conversation
- `GLINT-04` Narrate tool actions in character
- `GLINT-05` Command palette shares the action dispatcher
- `GLINT-06` Save ideas into Starseed through conversation
- `GLINT-07` Surface daily content and progress signal on request

### Strategic role

Glint turns the site from a place you browse into a place that responds.

He is not frosting.
He is the operating layer.

---

## 3. Starseed Hub

### Why this category exists

The world needs a clear creation-facing satellite with its own identity.

Right now Starseed exists more as a concept than a living branded entrypoint.
v2.0 fixes that.

### In scope for v2.0

- `STAR-01` `/starseed` route becomes the branded Starseed showcase
- `STAR-02` Project cards show active Starseed projects
- `STAR-03` Starseed branding applies across `/starseed/*`
- `STAR-04` Return path to the main site is seamless
- `STAR-05` Contact/client-facing inquiry section exists
- `STAR-06` Each project card links to a real destination
- `STAR-07` DNS/route strategy is unified between `starseed.llc` and `/starseed`

### Strategic role

This gives the world a professional outward-facing creation wing without diluting the core `jarowe.com` identity.

---

## 4. Starseed Labs

### Why this category exists

Inspiration without capture is waste.

Labs turns inspiration into action immediately.

### In scope for v2.0

- `LABS-01` Scratchpad route with Milkdown and local persistence
- `LABS-02` Canvas route with Excalidraw and local persistence
- `LABS-03` Both tools are lazy-loaded
- `LABS-04` Glint handoff can save ideas into scratchpad
- `LABS-05` Glint brainstorm mode can generate a project brief
- `LABS-06` Labs hub route connects scratchpad, canvas, brainstorm

### Strategic role

This is the mechanism that lets visitors and Jared convert momentum into artifacts.

---

## 5. Daily Engine

### Why this category exists

This is the invisible infrastructure that makes "alive every day" real instead of rhetorical.

### In scope for v2.0

- `DAILY-01` deterministic daily seed utility
- `DAILY-02` View Transitions between routes
- `DAILY-03` dynamic OG images for every URL
- `DAILY-04` visitor streak system and Glint milestone reactions
- `DAILY-05` date-locked easter egg system
- `DAILY-06` weather-responsive globe and constellation atmosphere

### Strategic role

This category gives the site memory, repeatability, rhythm, and shareability.

---

## 6. Immersive Portal

### Why this category exists

Every living world needs one premium spectacle that proves the ambition is real.

### In scope for v2.0

- `PORTAL-01` one optimized Gaussian splat scene is viewable in the site
- `PORTAL-02` the splat is reached through a portal-style transition
- `PORTAL-03` soundtrack and narrative text enhance the scene
- `PORTAL-04` direct URL and dynamic OG support sharing

### Strategic role

This is the flagship wow layer.
Not the architecture. The peak.

---

## What is explicitly deferred beyond v2.0

These ideas may be good, but they are **not** part of the scoped v2.0 set:

- voice-first Glint
- multiplayer presence
- collaborative Labs
- multiple splat portals
- editorial news network operations
- generalized autonomous internet agent behavior
- VR and native app variants

This is how we keep v2.0 powerful without losing control.

---

## Shipping order inside v2.0

All scoped requirements stay in.
They do **not** ship all at once.

### Wave 1 - living homepage foundation

Ship first:
- `TODAY-01`
- `TODAY-02`
- `TODAY-03`
- `TODAY-07`
- `DAILY-01`
- `DAILY-02`
- `STAR-01`
- `STAR-03`
- `STAR-04`

Reason:
- fastest path to visible aliveness
- clarifies brand and route structure
- gives the site an immediate "today" identity

### Wave 2 - Glint becomes useful

Ship second:
- `GLINT-01`
- `GLINT-02`
- `GLINT-03`
- `GLINT-04`
- `GLINT-05`
- `GLINT-07`
- `TODAY-05`

Reason:
- once the homepage feels alive, the guide must become actionable

### Wave 3 - Starseed becomes real

Ship third:
- `STAR-02`
- `STAR-05`
- `STAR-06`
- `STAR-07`
- `LABS-01`
- `LABS-02`
- `LABS-03`
- `LABS-06`

Reason:
- gives the world a clear creation destination

### Wave 4 - automation and retention

Ship fourth:
- `TODAY-04`
- `TODAY-06`
- `GLINT-06`
- `LABS-04`
- `LABS-05`
- `DAILY-03`
- `DAILY-04`
- `DAILY-05`
- `DAILY-06`

Reason:
- this is where the system starts helping Jared more directly
- this is also where return behavior gets stronger

### Wave 5 - flagship portal

Ship fifth:
- `PORTAL-01`
- `PORTAL-02`
- `PORTAL-03`
- `PORTAL-04`

Reason:
- spectacle is most valuable after the world and creation loop already work

---

## The autonomous action model

This is the most important strategic section in the whole document.

The site should increasingly behave like a **creative amplification system**.

### Rule 1: Jared should capture once

Examples:
- a song idea
- a project brief
- a travel memory
- a note from Glint chat
- a release concept

### Rule 2: the system should create multiple outputs from that capture

Possible outputs:
- scratchpad note
- canvas starter
- project brief
- homepage feature candidate
- Glint knowledge context
- future constellation candidate
- share card or OG card

### Rule 3: curation remains intentional

Automation should propose and prefill.
Jared should still decide what becomes public, featured, or permanent.

### Rule 4: every surface should help another surface

Examples:
- Today prompt opens Starseed
- Glint saves to Labs
- Portal links back to constellation
- Project card generates OG
- Progress signal gives Glint something timely to discuss

This is the system becoming self-reinforcing.

---

## Example flows

### Flow A - Jared has an idea

1. Jared tells Glint the idea
2. Glint saves it to scratchpad
3. Glint offers a canvas or brief
4. the idea becomes available for future featuring
5. Starseed becomes the working surface

### Flow B - visitor arrives and gets inspired

1. visitor lands on homepage
2. sees today's state and a creative prompt
3. asks Glint for help
4. Glint opens Labs and seeds the first note
5. visitor leaves with something started, not just something viewed

### Flow C - Jared ships a new project or song

1. Starseed hub gets updated
2. a project page or external link becomes reachable
3. OG image exists automatically
4. Glint can route to it
5. the homepage can feature it through daily rotation

This is how the world starts working for the work.

---

## Success criteria for v2.0

v2.0 is successful when all of these are true:

### Visitor success

- a new visitor sees date-specific aliveness within 5 seconds
- Glint can successfully perform core actions
- a visitor can start creating without friction
- one immersive portal is memorable and shareable
- the site feels different across repeated visits

### Jared success

- Jared can save an idea in under 30 seconds
- new work can be surfaced without rebuilding context from scratch
- the daily layer updates without manual daily editing
- Glint reduces explanation overhead
- Starseed gives a clear home to active creative projects

### Brand success

- the site feels like one coherent world
- Starseed feels like a clean satellite, not a competing identity
- the signal/progress layer adds meaning without turning the site into a feed

---

## The role of the supporting documents

Use the suite like this:

- `MASTER_PLAN.md` - canonical overview and scope truth
- `IDENTITY.md` - positioning and brand language
- `ORBIT_MODEL.md` - product architecture
- `DAILY_ENGINE.md` - daily-state system details
- `GLINT_EVOLUTION.md` - Glint action system details
- `STARSEED_LABS.md` - creation surface blueprint
- `IMMERSIVE_TECH.md` - spectacle and portal decisions
- `PROGRESS_LENS.md` - signal layer principles
- `GROWTH_PLAYBOOK.md` - user growth and activation
- `TECHNOLOGY_CATALOG.md` - tool/package sourcing
- `90_DAY_PLAN.md` - schedule and delivery sequencing

The other docs explain parts.
This document explains the whole.

---

## Final directive

Do not build v2.0 as a list of features.

Build it as a machine that does three things well:

1. makes the world feel alive today
2. helps people move from curiosity to creation
3. helps Jared ship ideas with less friction and more continuity

That is the real strategy.

Travel.
Create.
Sing.
Write.
Play.

Let the site make those actions easier to capture, shape, and share.
