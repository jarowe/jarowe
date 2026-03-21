---
plan: "03"
phase: "05"
status: complete
started: "2026-03-21"
completed: "2026-03-21"
---

# Plan 05-03 Summary: Labs Hub + TodayRail CTA

## What was built

1. **Labs Hub page** (`/starseed/labs`) — 3 glass cards: Scratchpad (active), Canvas (active), Brainstorm (Coming soon)
2. **TodayRail CTA update** — "Start in Starseed" now links to `/starseed/labs/scratchpad?prompt=...` with creative prompt pre-loaded
3. **Route registration** — LabsHub lazy route added to App.jsx

## Key decisions

- Brainstorm card shows "Coming soon" badge (LABS-05 is Phase 6)
- Active cards use React Router Link components for navigation
- TodayRail CTA uses `encodeURIComponent(prompt.text)` for URL safety
- LabsHub shares Starseed shell chrome (starseed-nav + escape hatch)

## Key files

### Created
- `src/pages/labs/LabsHub.jsx` — Hub page with 3 tool cards
- `src/pages/labs/LabsHub.css` — Glass card styling matching Starseed aesthetic

### Modified
- `src/App.jsx` — LabsHub lazy route at /starseed/labs
- `src/components/TodayRail.jsx` — CTA links to scratchpad with prompt param

## Deviations

None — implemented as planned.
