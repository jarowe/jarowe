import { useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Debounce helper
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function useCloudSync() {
  const { user, updateProfile } = useAuth() || {};
  const xpDebounceRef = useRef(null);
  const bopsDebounceRef = useRef(null);

  // ── Initial Sync (merge localStorage ↔ cloud, highest wins) ──
  const initialSync = useCallback(async () => {
    if (!supabase || !user) return;
    try {
      // Fetch cloud profile (include new columns)
      const { data: cloudProfile } = await supabase
        .from('profiles')
        .select('xp, visited_paths, vault_collection, bonus_ciphers, cipher_streak, total_bops, flags')
        .eq('id', user.id)
        .single();

      if (!cloudProfile) return;

      const updates = {};

      // XP: max(cloud, local)
      const localXp = parseInt(localStorage.getItem('jarowe_xp') || '0', 10);
      const cloudXp = cloudProfile.xp || 0;
      const mergedXp = Math.max(localXp, cloudXp);
      localStorage.setItem('jarowe_xp', mergedXp.toString());
      if (mergedXp !== cloudXp) updates.xp = mergedXp;

      // Visited paths: union
      const localPaths = JSON.parse(localStorage.getItem('jarowe_visited_paths') || '[]');
      const cloudPaths = cloudProfile.visited_paths || [];
      const mergedPaths = [...new Set([...localPaths, ...cloudPaths])];
      localStorage.setItem('jarowe_visited_paths', JSON.stringify(mergedPaths));
      if (mergedPaths.length !== cloudPaths.length) updates.visited_paths = mergedPaths;

      // Vault collection: union by card ID
      const localCollection = JSON.parse(localStorage.getItem('jarowe_collection') || '[]');
      const cloudCollection = cloudProfile.vault_collection || [];
      const mergedCollection = [...new Set([...localCollection, ...cloudCollection])];
      localStorage.setItem('jarowe_collection', JSON.stringify(mergedCollection));
      if (mergedCollection.length !== cloudCollection.length) updates.vault_collection = mergedCollection;

      // Bonus ciphers: max
      const localBonus = parseInt(localStorage.getItem('jarowe_bonus_ciphers') || '0', 10);
      const cloudBonus = cloudProfile.bonus_ciphers || 0;
      const mergedBonus = Math.max(localBonus, cloudBonus);
      localStorage.setItem('jarowe_bonus_ciphers', String(mergedBonus));
      if (mergedBonus !== cloudBonus) updates.bonus_ciphers = mergedBonus;

      // Cipher streak: max
      const localStreak = parseInt(localStorage.getItem('jarowe_cipher_streak') || '0', 10);
      const cloudStreak = cloudProfile.cipher_streak || 0;
      const mergedStreak = Math.max(localStreak, cloudStreak);
      localStorage.setItem('jarowe_cipher_streak', String(mergedStreak));
      if (mergedStreak !== cloudStreak) updates.cipher_streak = mergedStreak;

      // Total bops: max
      const localBops = parseInt(localStorage.getItem('jarowe_total_bops') || '0', 10);
      const cloudBops = cloudProfile.total_bops || 0;
      const mergedBops = Math.max(localBops, cloudBops);
      localStorage.setItem('jarowe_total_bops', String(mergedBops));
      if (mergedBops !== cloudBops) updates.total_bops = mergedBops;

      // Flags: merge objects (any true wins)
      const localFlags = {};
      if (localStorage.getItem('jarowe_konami_used') === 'true') localFlags.konami_used = true;
      if (localStorage.getItem('jarowe_glint_met') === 'true') localFlags.glint_met = true;
      if (localStorage.getItem('jarowe_vault_opened') === 'true') localFlags.vault_opened = true;
      const cloudFlags = cloudProfile.flags || {};
      const mergedFlags = { ...cloudFlags, ...localFlags };
      // Write cloud flags back to localStorage
      if (mergedFlags.konami_used) localStorage.setItem('jarowe_konami_used', 'true');
      if (mergedFlags.glint_met) localStorage.setItem('jarowe_glint_met', 'true');
      if (mergedFlags.vault_opened) localStorage.setItem('jarowe_vault_opened', 'true');
      if (JSON.stringify(mergedFlags) !== JSON.stringify(cloudFlags)) updates.flags = mergedFlags;

      // Batch update if anything changed
      if (Object.keys(updates).length > 0) {
        await supabase.from('profiles').update(updates).eq('id', user.id);
      }

      // High scores: merge per game
      const { data: cloudScores } = await supabase
        .from('high_scores')
        .select('game_id, score')
        .eq('user_id', user.id);

      if (cloudScores) {
        for (const { game_id, score: cloudScore } of cloudScores) {
          const localKey = `jarowe_highscore_${game_id}`;
          const localScore = parseInt(localStorage.getItem(localKey) || '0', 10);
          const best = Math.max(localScore, cloudScore);
          localStorage.setItem(localKey, best.toString());
          if (best > cloudScore) {
            await supabase.from('high_scores')
              .upsert({ user_id: user.id, game_id, score: best, updated_at: new Date().toISOString() },
                { onConflict: 'user_id,game_id' });
          }
        }
      }

      // Reload XP in GameOverlay
      window.dispatchEvent(new CustomEvent('xp-synced', { detail: { xp: mergedXp } }));
    } catch (e) {
      // Silent failure — localStorage is the fallback
    }
  }, [user]);

  // ── Sync XP (debounced) ──
  if (!xpDebounceRef.current) {
    xpDebounceRef.current = debounce(async (userId, xp) => {
      if (!supabase) return;
      try {
        await supabase.from('profiles').update({ xp }).eq('id', userId);
      } catch (e) { /* silent */ }
    }, 1500);
  }

  const syncXp = useCallback((xp) => {
    if (!user) return;
    xpDebounceRef.current(user.id, xp);
  }, [user]);

  // ── Sync High Score ──
  const syncHighScore = useCallback(async (gameId, score) => {
    if (!supabase || !user) return;
    try {
      await supabase.from('high_scores')
        .upsert(
          { user_id: user.id, game_id: gameId, score, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,game_id' }
        );
    } catch (e) { /* silent */ }
  }, [user]);

  // ── Sync Visited Paths ──
  const syncVisitedPaths = useCallback(async (paths) => {
    if (!supabase || !user) return;
    try {
      await supabase.from('profiles')
        .update({ visited_paths: paths })
        .eq('id', user.id);
    } catch (e) { /* silent */ }
  }, [user]);

  // ── Sync Achievement ──
  const syncAchievement = useCallback(async (achievementId) => {
    if (!supabase || !user) return;
    try {
      await supabase.from('achievements')
        .upsert(
          { user_id: user.id, achievement_id: achievementId },
          { onConflict: 'user_id,achievement_id' }
        );
    } catch (e) { /* silent */ }
  }, [user]);

  // ── Sync Vault Collection ──
  const syncVaultCollection = useCallback(async (collection) => {
    if (!supabase || !user) return;
    try {
      await supabase.from('profiles')
        .update({ vault_collection: collection })
        .eq('id', user.id);
    } catch (e) { /* silent */ }
  }, [user]);

  // ── Sync Bonus Ciphers ──
  const syncBonusCiphers = useCallback(async (count) => {
    if (!supabase || !user) return;
    try {
      await supabase.from('profiles')
        .update({ bonus_ciphers: count })
        .eq('id', user.id);
    } catch (e) { /* silent */ }
  }, [user]);

  // ── Sync Cipher Streak ──
  const syncCipherStreak = useCallback(async (streak) => {
    if (!supabase || !user) return;
    try {
      await supabase.from('profiles')
        .update({ cipher_streak: streak })
        .eq('id', user.id);
    } catch (e) { /* silent */ }
  }, [user]);

  // ── Sync Total Bops (debounced) ──
  if (!bopsDebounceRef.current) {
    bopsDebounceRef.current = debounce(async (userId, bops) => {
      if (!supabase) return;
      try {
        await supabase.from('profiles').update({ total_bops: bops }).eq('id', userId);
      } catch (e) { /* silent */ }
    }, 2000);
  }

  const syncTotalBops = useCallback((bops) => {
    if (!user) return;
    bopsDebounceRef.current(user.id, bops);
  }, [user]);

  // ── Sync Flags (merge into JSONB via read-modify-write) ──
  const syncFlags = useCallback(async (flagsObj) => {
    if (!supabase || !user) return;
    try {
      const { data } = await supabase.from('profiles')
        .select('flags')
        .eq('id', user.id)
        .single();
      const existing = data?.flags || {};
      const merged = { ...existing, ...flagsObj };
      await supabase.from('profiles')
        .update({ flags: merged })
        .eq('id', user.id);
    } catch (e) { /* silent */ }
  }, [user]);

  // ── Fetch Leaderboard ──
  const fetchLeaderboard = useCallback(async (gameId, limit = 5) => {
    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('game_id', gameId)
        .order('score', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (e) {
      return [];
    }
  }, []);

  return {
    initialSync,
    syncXp,
    syncHighScore,
    syncVisitedPaths,
    syncAchievement,
    syncVaultCollection,
    syncBonusCiphers,
    syncCipherStreak,
    syncTotalBops,
    syncFlags,
    fetchLeaderboard,
  };
}
