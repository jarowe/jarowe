---
status: partial
phase: 05-starseed-hub-labs
source: [05-VERIFICATION.md]
started: 2026-03-21T07:30:00.000Z
updated: 2026-03-21T07:30:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. starseed.llc DNS redirect (STAR-07)
expected: Configure starseed.llc in Vercel Dashboard, curl -I https://starseed.llc returns 308 → jarowe.com/starseed
result: [deferred — user chose to configure later]

### 2. Lazy-load isolation (LABS-03)
expected: Visit /starseed with DevTools Network open, no Milkdown or Excalidraw chunks load
result: [pending]

### 3. localStorage persistence (LABS-01, LABS-02)
expected: Type in scratchpad, wait 3s, reload — content persists. Draw on canvas, wait 3s, reload — drawing persists
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 1

## Gaps
