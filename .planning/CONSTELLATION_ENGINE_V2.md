# Constellation Engine V2: Connection Quality + Predictions

## THE PROBLEM

Connections are broken. Example: "Jared married Maria" connects to "Sony Animation Project" because they're in the same epoch (0.2) and within 30 days (0.3) = 0.5 barely crosses threshold. No shared people, theme, or meaning.

### Current Signal Distribution (909 edges)
- life-chapter: 683 (48% of all signals) — "same era" too broad
- temporal-proximity: 506 — "within 30 days" too generous
- shared-motif: 290 — themes extracted but too generic
- narrative-arc: 276
- cross-source-echo: 220
- seasonal-echo: 114
- same-day: 108
- shared-tags: 57
- shared-entity: 17 — the REAL signal barely fires
- shared-identity: 17
- shared-place: 3

## PHASE 1: FIX CONNECTION QUALITY

### 1.1 Signal Weight Rebalancing

**File:** `pipeline/edges/signals.mjs`

| Signal | Current | Proposed | Rationale |
|--------|---------|----------|-----------|
| life-chapter | 0.2 | 0.0 (standalone) / 0.1 (with other signals) | Should never be the reason two nodes connect |
| temporal-proximity | 0.3 (30 days) | 0.2 (7 days) / 0.1 (30 days) | Tighter window, less weight |
| shared-motif | 0.5 | 0.4 (generic) / 0.6 (specific) | "family" everywhere vs "greece" is specific |
| shared-entity | 0.6 | 0.8 | Shared people = strongest real signal |
| shared-identity | 0.7 | 0.9 | Resolved canonical person = gold |
| shared-place | 0.25 | 0.5 (GPS validated) / 0.15 (city name only) | GPS = real, city name = weak |
| cross-source-echo | 0.6 | 0.5 (require 2+ signals) | Cross-source needs corroboration |

### 1.2 Threshold Changes

**File:** `pipeline/edges/edge-generator.mjs`

- Global EDGE_THRESHOLD: 0.5 → 0.6
- Cross-source threshold: 0.5 → 0.8 (work↔personal needs strong evidence)
- Require at least 1 non-temporal signal for any edge (no pure temporal connections)

### 1.3 Motif Quality Improvements

**File:** `pipeline/edges/motifs.mjs`

- Split generic motifs: "family" → "fatherhood", "brotherhood", "marriage", "parenting"
- Add motif rarity weighting: common motifs (family, love) get 0.3x weight; rare motifs (greece, career) get 1.5x
- Raise motif threshold from 2.0 → 3.0 for generic motifs

### 1.4 Evidence Icon Fix

**File:** `src/constellation/ui/StoryPanel.jsx`

Current EVIDENCE_ICON_MAP expects wrong types. Fix:
```
temporal → Calendar
semantic → User/Folder/Tag (contextual)
thematic → Lightbulb
narrative → Star
identity → User
spatial → MapPin
```

## PHASE 2: PREDICTION & IDEAS LAYER

### Architecture Overview

```
User views node X
    ↓
Extract local subgraph (X + 2-hop neighbors + shared entities + same-epoch)
    ↓
API endpoint builds structured prompt with graph context
    ↓
LLM generates speculative nodes via OpenAI Structured Outputs
    ↓
Client renders with visual differentiation (translucent, pulsing, dashed edges)
    ↓
User can Accept / Dismiss / Edit
```

### Three Prediction Types

1. **Synapses** (Phase 2a — highest wow-factor)
   - "Find Connections" button on StoryPanel
   - Takes current node + 2 distant nodes (fewest hops, different epoch/theme)
   - LLM finds creative bisociative connections between them
   - Visual: glowing dashed lines connecting distant constellation regions

2. **Trajectory Predictions** (Phase 2b)
   - "What comes next?" button
   - Detects temporal patterns (career milestones every ~2.5 years, etc.)
   - Generates 1-3 future milestone predictions grounded in real nodes
   - Visual: future cone above helix terminus, speculative nodes at varying confidence

3. **What-If Branching** (Phase 2c)
   - User types a premise ("What if I moved to Japan?")
   - AI generates branching future considering full graph context
   - Visual: branching path from current node

### Data Model Extensions

**New node fields:**
```javascript
{
  factuality: 'synthetic',           // marks as AI-generated
  confidence: 0.65,                  // prediction confidence
  generationMeta: {
    generatedAt: ISO_DATE,
    generatedFrom: ['ms-003', 'ig-015'],  // source nodes
    generatedBy: 'trajectory-v1',
    userAction: null,                // 'accepted' | 'dismissed' | 'edited'
  },
  branchType: 'prediction',         // prediction | idea | synapse | what-if
  timeHorizon: '6mo',               // 3mo | 1yr | 5yr
}
```

**New edge evidence types:**
```javascript
'trajectory-prediction':  0.4,
'creative-synapse':       0.3,
'pattern-echo':           0.5,
'what-if-branch':         0.35,
```

**Storage:** Separate from main graph. Use Supabase `speculative_nodes` table.

### Visual Differentiation

| Property | Confirmed | Speculative |
|----------|-----------|-------------|
| Opacity | 1.0 | 0.3-0.5 (translucent) |
| Edges | Solid lines | Animated dashed lines |
| Glow | Steady | Pulsing/breathing |
| Shape | Sphere | Diamond or ring |
| Color | Epoch color | Desaturated + shifted hue |
| Animation | Static | Particle emission ("forming") |

### API Endpoints

```
api/constellation-predict.js    // Trajectory predictions
api/constellation-synapse.js    // Distant node connections
api/constellation-whatif.js     // Branching scenarios
```

Pattern: same as existing `api/glint-chat.js` (SSE streaming, rate limiting).

### Making Predictions Personal

1. Every prediction MUST cite 2+ real nodes by name (enforced via schema)
2. Detect and name recurring patterns: "The Derek Cycle", "The 2.5-Year Leap"
3. Use Jared's own language (few-shot from real node descriptions)
4. Confidence calibration: 5+ corroborating nodes = high; creative synapses = lower but labeled "creative spark"
5. Feedback loop: accepted/dismissed signals tune future generations

## PIPELINE FILES

```
Pipeline Generation:
  pipeline/index.mjs                    — orchestrator (13 phases)
  pipeline/edges/edge-generator.mjs     — pruning logic, thresholds
  pipeline/edges/signals.mjs            — signal weights & descriptions
  pipeline/edges/motifs.mjs             — theme extraction (21 motifs)
  pipeline/parsers/instagram.mjs        — IG HTML export parser
  pipeline/parsers/facebook.mjs         — FB HTML export parser
  pipeline/parsers/carbonmade.mjs       — portfolio JSON parser
  pipeline/parsers/milestones.mjs       — manual milestones
  pipeline/parsers/music.mjs            — Suno/SoundCloud parser
  pipeline/scoring/significance.mjs     — multi-dimensional scoring
  pipeline/identity/registry.mjs        — canonical name resolution
  pipeline/config/pipeline-config.mjs   — thresholds, source config
  pipeline/config/persona.mjs           — Jared's identity (single source of truth)

Config:
  data-private/identity-map.json        — alias → canonical name mapping
  data-private/allowlist.json           — privacy tiers
  data-private/curation.json            — hidden list, overrides

UI:
  src/constellation/ui/StoryPanel.jsx   — "Because..." connections display
  src/constellation/ui/useNodeConnections.js — edge grouping
  src/constellation/store.js            — Zustand state
```

## IMPLEMENTATION ORDER

1. **Fix signals.mjs** — rebalance weights, nerf life-chapter, tighten temporal-proximity
2. **Fix edge-generator.mjs** — raise thresholds, require non-temporal signal
3. **Fix motifs.mjs** — split generic motifs, add rarity weighting
4. **Re-run pipeline** — regenerate graph with clean connections
5. **Fix StoryPanel icons** — correct evidence icon mapping
6. **Build synapse finder API** — first prediction feature
7. **Build speculative node UI** — visual differentiation in constellation
8. **Build trajectory predictions** — pattern detection + future generation
9. **Build what-if branching** — user-driven scenario exploration
