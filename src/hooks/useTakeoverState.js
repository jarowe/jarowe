import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import registry, { getTakeoverById } from '../content/takeovers/registry';
import { supabase, supabaseGet } from '../lib/supabase';

/**
 * useTakeoverState — resolves the active campaign's runtime state.
 *
 * Scope: SINGLE-ACTIVE-CAMPAIGN.
 *   This hook resolves state for ONE campaign (registry[0]) globally.
 *   All campaign routes — including registry-generated preview routes —
 *   receive this same resolved object.  This is correct as long as only
 *   one campaign can be in `takeover` mode at a time.
 *
 *   To support multiple simultaneous campaigns with independent state,
 *   this hook would need to accept an entry id / slug param and resolve
 *   per-entry state.  That's a follow-up when the second campaign ships.
 *
 * Resolution order (each layer overrides the previous):
 *   1. Static defaults from registry entry
 *   2. Remote state from Supabase `site_takeovers` table (if configured)
 *   3. Query-string overrides (?rolloutPhase, ?exposureMode, ?takeoverPreview)
 *
 * Loading behavior:
 *   If Supabase is configured, `loading` starts TRUE so the homepage and
 *   alias routes (/artist, /epk) show a neutral splash until the remote
 *   state resolves.  This prevents a flash of the wrong page when the
 *   registry default differs from the live Supabase value.
 *   Without Supabase, loading is always false.
 *
 * Returns:
 *   entry          — full registry entry (or null if no campaigns exist)
 *   phase          — resolved rollout_phase string
 *   exposure       — resolved exposure_mode string
 *   chrome         — chrome rules object from registry entry
 *   loading        — true while Supabase fetch is in flight
 *   isAdminPreview — true when ?takeoverPreview forces homepage preview
 */
export function useTakeoverState() {
  const [searchParams] = useSearchParams();
  const [remoteState, setRemoteState] = useState(null);

  // Start in loading state if Supabase is configured — prevents homepage flash
  const [loading, setLoading] = useState(!!supabase);

  // ── 1. Static registry entry ────────────────────────────
  const baseEntry = useMemo(() => registry[0] ?? null, []);

  // Query-string overrides
  const previewId = searchParams.get('takeoverPreview');
  const phaseOverride = searchParams.get('rolloutPhase');
  const exposureOverride = searchParams.get('exposureMode');

  // If admin is previewing a specific campaign, resolve that entry
  const entry = useMemo(() => {
    if (previewId) return getTakeoverById(previewId) ?? baseEntry;
    return baseEntry;
  }, [previewId, baseEntry]);

  // ── 2. Supabase remote state ────────────────────────────
  useEffect(() => {
    if (!entry || !supabase) {
      setLoading(false);
      return;
    }
    supabaseGet('site_takeovers', {
      filters: { takeover_id: `eq.${entry.id}` },
    })
      .then((rows) => {
        if (rows?.[0]) setRemoteState(rows[0]);
      })
      .finally(() => setLoading(false));
  }, [entry?.id]);

  // ── 3. Resolve final state ──────────────────────────────
  const defaults = entry?.defaultState ?? {};
  let phase = defaults.rollout_phase ?? 'pre-single';
  let exposure = defaults.exposure_mode ?? 'preview';

  if (remoteState) {
    if (remoteState.rollout_phase) phase = remoteState.rollout_phase;
    if (remoteState.exposure_mode) exposure = remoteState.exposure_mode;
  }

  if (phaseOverride) phase = phaseOverride;
  if (exposureOverride) exposure = exposureOverride;

  return {
    entry,
    phase,
    exposure,
    chrome: entry?.chrome ?? {},
    loading,
    isAdminPreview: !!previewId,
  };
}
