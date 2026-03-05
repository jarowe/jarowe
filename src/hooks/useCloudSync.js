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

  // ── Initial Sync (merge localStorage ↔ cloud, highest wins) ──
  const initialSync = useCallback(async () => {
    if (!supabase || !user) return;
    try {
      // Fetch cloud profile
      const { data: cloudProfile } = await supabase
        .from('profiles')
        .select('xp, visited_paths')
        .eq('id', user.id)
        .single();

      if (!cloudProfile) return;

      // XP: max(cloud, local)
      const localXp = parseInt(localStorage.getItem('jarowe_xp') || '0', 10);
      const cloudXp = cloudProfile.xp || 0;
      const mergedXp = Math.max(localXp, cloudXp);
      localStorage.setItem('jarowe_xp', mergedXp.toString());
      if (mergedXp !== cloudXp) {
        await supabase.from('profiles').update({ xp: mergedXp }).eq('id', user.id);
      }

      // Visited paths: union
      const localPaths = JSON.parse(localStorage.getItem('jarowe_visited_paths') || '[]');
      const cloudPaths = cloudProfile.visited_paths || [];
      const mergedPaths = [...new Set([...localPaths, ...cloudPaths])];
      localStorage.setItem('jarowe_visited_paths', JSON.stringify(mergedPaths));
      if (mergedPaths.length !== cloudPaths.length) {
        await supabase.from('profiles').update({ visited_paths: mergedPaths }).eq('id', user.id);
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
    fetchLeaderboard,
  };
}
