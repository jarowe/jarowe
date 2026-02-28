---
status: complete
phase: 02-data-pipeline-privacy
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md
started: 2026-02-28T17:00:00Z
updated: 2026-02-28T17:22:00Z
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
expected: Open `public/data/constellation.graph.json`. It contains ~60 nodes with types including "project" (~35), "blog" (~20), and "milestone" (~5). Each node has: id, label, type, epoch, visibility, date fields. Edges array has ~88 entries with source, target, weight, and evidence fields.
result: issue
reported: "counts are correct (60 nodes, 88 edges), but schema differs from this test: there is no 'blog' type (blog posts are normalized into 'moment'), and nodes use 'title' instead of 'label'."
severity: minor

### 4. Privacy — no private nodes in output
expected: In constellation.graph.json, no node has `visibility: "private"`. All nodes are either "public" or "friends". Non-allowlisted person names are replaced with "Friend" in node text/metadata.
result: pass

### 5. Privacy — GPS coordinates truncated
expected: Any GPS coordinates in the output have at most 2 decimal places (~1.1km precision). No full-precision GPS data leaked.
result: pass

### 6. Minors guard active
expected: If any nodes reference minors (configured in allowlist.json under "minors"), those nodes show first name only (no last name), have no GPS data, and have blocked patterns (school names, home identifiers) redacted.
result: issue
reported: "not fully testable right now. allowlist.json has minors.firstNames = [], so minors guard was not exercised (0 _isMinor nodes flagged). Current output shows no GPS leaks, but minors redaction behavior remains unverified until minor names/patterns are configured."
severity: minor

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
result: issue
reported: "Real-data loader exists (src/constellation/data/loader.js) but is not wired into the live constellation UI. Active components still import mock-constellation.json directly (e.g., ConstellationCanvas, ListView, NodeCloud, ConnectionLines, HoverLabel, TimelineScrubber, DetailPanel), so the app does not currently load from public/data with runtime fallback."
severity: major

## Summary

total: 11
passed: 8
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Nodes have types 'project', 'blog', 'milestone' with 'label' field"
  status: failed
  reason: "User reported: counts are correct (60 nodes, 88 edges), but schema differs: no 'blog' type (normalized to 'moment'), nodes use 'title' instead of 'label'."
  severity: minor
  test: 3
  artifacts: []
  missing: []

- truth: "Minors guard strips last names, removes GPS, redacts blocked patterns for configured minors"
  status: failed
  reason: "User reported: not fully testable — allowlist.json has minors.firstNames = [], so minors guard was not exercised (0 _isMinor nodes flagged). Behavior unverified until minor names/patterns are configured."
  severity: minor
  test: 6
  artifacts: []
  missing: []

- truth: "App loads constellation data from public/data/ with mock fallback"
  status: failed
  reason: "User reported: Real-data loader exists (src/constellation/data/loader.js) but is not wired into the live constellation UI. Active components still import mock-constellation.json directly, so the app does not currently load from public/data with runtime fallback."
  severity: major
  test: 11
  artifacts: []
  missing: []
