import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const ADMIN_EMAILS = ['rowe.jared@gmail.com'];

/** Race a promise against a timeout. Returns the promise result or null on timeout. */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fetch profile row from profiles table
  const fetchProfile = useCallback(async (userId) => {
    if (!supabase) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  }, []);

  // Initial session + auth state listener
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // getSession() only reads cached tokens — they may be expired.
    // Use it for instant UI, then validate with the server.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Set user IMMEDIATELY so email-based checks (isAdmin) work right away
        setUser(session.user);

        // Validate session server-side and refresh if expired.
        // This ensures downstream Supabase queries use a valid token.
        // Timeout after 5s to prevent hanging on stale refresh tokens.
        try {
          const refreshResult = await withTimeout(supabase.auth.refreshSession(), 5000);
          if (refreshResult?.data?.session?.user) {
            setUser(refreshResult.data.session.user);
          }
        } catch (_) {
          // Refresh failed — cached session may still work for some calls
        }

        // Profile is optional — don't block auth on it
        try {
          const p = await fetchProfile(session.user.id);
          if (p) setProfile(p);
        } catch (_) {
          // Profile fetch failed — user is still authenticated
        }
      }
      setLoading(false);
    }).catch(() => {
      // Supabase connection failed — continue as guest
      setLoading(false);
    });

    let subscription;
    try {
      const result = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            setLoading(false); // Auth resolved — clear loading regardless of which path won the race
            if (event === 'SIGNED_IN') {
              window.dispatchEvent(new CustomEvent('auth-signed-in'));
            }
            try {
              const p = await fetchProfile(session.user.id);
              if (p) setProfile(p);
            } catch (_) {
              // Profile fetch failed — user is still authenticated
            }
          } else {
            setUser(null);
            setProfile(null);
            setLoading(false); // Auth resolved — no session
          }
        }
      );
      subscription = result.data.subscription;
    } catch (_) {
      // Auth listener failed — continue as guest
    }

    return () => subscription?.unsubscribe();
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithGitHub = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    // Clear state FIRST for immediate UI feedback
    setUser(null);
    setProfile(null);
    if (!supabase) return;
    try { await supabase.auth.signOut({ scope: 'global' }); } catch (_) { /* ignore */ }
    // Force-clear Supabase auth tokens from localStorage in case server signOut failed
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k));
    } catch (_) { /* ignore */ }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (data) setProfile(data);
  }, [user]);

  // Expose user to non-React code (glintBrain ambient lines)
  useEffect(() => {
    window.__jaroweUser = user || null;
    return () => { window.__jaroweUser = null; };
  }, [user]);

  const openAuthModal = useCallback(() => setShowAuthModal(true), []);
  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);

  const isAdmin = useMemo(() => {
    if (profile?.is_admin === true) return true;
    // Check both user.email and OAuth metadata for email match
    const email = user?.email || user?.user_metadata?.email;
    return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
  }, [profile, user]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin,
    showAuthModal,
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    signUp,
    signOut,
    updateProfile,
    openAuthModal,
    closeAuthModal,
  }), [user, profile, loading, isAdmin, showAuthModal, signInWithGoogle, signInWithGitHub,
    signInWithEmail, signUp, signOut, updateProfile, openAuthModal, closeAuthModal]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
