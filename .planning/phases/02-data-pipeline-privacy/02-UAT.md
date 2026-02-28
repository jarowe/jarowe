---
status: complete
phase: 02-data-pipeline-privacy
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md
started: 2026-02-28T17:00:00Z
updated: 2026-02-28T17:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Pipeline runs end-to-end
expected: Run `npm run pipeline` in the project root. Pipeline completes successfully (exit code 0) with log output showing all phases completing. Final output shows node count (~60), edge count (~88), and "0 violations".
result: pass

### 2. Pipeline output files generated
expected: After pipeline run, `public/data/constellation.graph.json` and `public/data/constellation.layout.json` exist and contain valid JSON. A `public/data/pipeline-status.json` also exists showing last run timestamp and success status.
result: pass

### 3. Carbonmade data parsed correctly
expected: Open `public/data/constellation.graph.json`. It contains ~60 nodes with types including "project" (~35), "moment" (~19), "idea" (~1), and "milestone" (~5). Each node has: id, title, type, epoch, visibility, date fields. Edges array has ~88 entries with source, target, weight, and evidence fields.
result: pass
reported: "pass — spec aligned to canonical schema. Types are project/moment/idea/milestone (blog posts normalized by text length: <100 chars = idea, >=100 = moment). Field is 'title' per canonical.mjs design."

### 4. Privacy — no private nodes in output
expected: In constellation.graph.json, no node has `visibility: "private"`. All nodes are either "public" or "friends". Non-allowlisted person names are replaced with "Friend" in node text/metadata.
result: pass

### 5. Privacy — GPS coordinates truncated
expected: Any GPS coordinates in the output have at most 2 decimal places (~1.1km precision). No full-precision GPS data leaked.
result: pass

### 6. Minors guard active
expected: If any nodes reference minors (configured in allowlist.json under "minors"), those nodes show first name only (no last name), have no GPS data, and have blocked patterns (school names, home identifiers) redacted.
result: pass
reported: "pass — allowlist.json populated with minors.firstNames=['Jace'] and blockedPatterns. Pipeline detected 1 minor-referencing node (cm-b-002) via title+description text match. Output verified: _isMinor=true, location=null, first name preserved, no last-name pattern in output text. PRIV-05b audit check confirms 0 last-name leaks."

### 7. Pipeline resilience — failure preserves last good output
expected: If the pipeline encounters an error (e.g., corrupt data), it preserves the last good constellation.graph.json and constellation.layout.json rather than overwriting them. pipeline-status.json shows the failure with an error description.
result: pass

### 8. Admin page loads at /admin
expected: Navigate to /admin in the browser. An auth gate appears asking for an admin key. Entering the correct key (matching VITE_ADMIN_KEY env var) grants access to the admin page. Session-only — refreshing the page requires re-entering the key.
result: pass

### 9. Admin pipeline status display
expected: After authenticating, the admin page shows pipeline status: last run timestamp, success/fail badge, node count, edge count, and visibility tier breakdown.
result: pass

### 10. Admin publish/hide controls
expected: The admin page shows a sortable node table with type filter pills and search. Each node has a publish/hide toggle. Clicking "Save Changes" generates a downloadable curation.json file containing hidden array and visibility_overrides.
result: pass

### 11. Frontend data loader with fallback
expected: The app (home page or universe page) loads constellation data from public/data/ when available. If the real data files don't exist (e.g., pipeline hasn't run), it falls back to mock-constellation.json without errors.
result: pass
reported: "pass — Issue #11 resolved. Constellation now loads via store.loadData() from /data/constellation.graph.json + /data/constellation.layout.json when available, with fallback to mock data through loader.js when unavailable. Direct mock imports were removed from consuming components (only loader.js retains mock import). Build passes.\n\nVerified against:\n\nstore.js\nConstellationPage.jsx\nConstellationCanvas.jsx\nHoverLabel.jsx\nloader.js"

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "Nodes have types project/moment/idea/milestone with 'title' field"
  status: resolved
  reason: "Test expectation aligned to canonical schema. Types are project/moment/idea/milestone (not blog). Field is 'title' (not label). NOT a code bug — spec alignment only."
  severity: minor
  test: 3
  resolved_by: "UAT spec update (spec alignment)"

- truth: "Minors guard strips last names, removes GPS, redacts blocked patterns for configured minors"
  status: resolved
  reason: "Minors guard hardened: detection from entities.people AND title+description text. Pipeline order fixed (minors guard before allowlist). allowlist.json populated. 1 node (cm-b-002) correctly protected: _isMinor=true, location=null, no last-name leaks. PRIV-05b audit added."
  severity: minor
  test: 6
  resolved_by: "fix(02): harden minors detection + populate allowlist"

- truth: "App loads constellation data from public/data/ with mock fallback"
  status: resolved
  reason: "Issue #11 resolved. Constellation now loads via store.loadData() from /data/constellation.graph.json + /data/constellation.layout.json when available, with fallback to mock data through loader.js when unavailable. Direct mock imports removed from all 7 consuming components (only loader.js retains mock import). Build passes."
  severity: major
  test: 11
  resolved_by: "feat(02-06): wire data loader into live constellation (commit e3fbc3f)"
