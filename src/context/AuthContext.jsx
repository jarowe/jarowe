import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const ADMIN_EMAILS = ['rowe.jared@gmail.com'];

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
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data;
    } catch {
      return null;
    }
  }, []);

  // Initial session + auth state listener
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // IMPORTANT: Do NOT call refreshSession() manually — it corrupts the
    // Supabase client's internal auth lock. The client's autoRefreshToken
    // (enabled by default) handles token refresh automatically. We only use
    // getSession() for the initial cached state and onAuthStateChange for
    // all subsequent updates (including automatic token refreshes).
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Profile is optional — don't block auth on it
        try {
          const p = await fetchProfile(session.user.id);
          if (p) setProfile(p);
        } catch {
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
          if (event === 'SIGNED_OUT' || !session?.user) {
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          setUser(session.user);
          setLoading(false);

          if (event === 'SIGNED_IN') {
            window.dispatchEvent(new CustomEvent('auth-signed-in'));
          }

          try {
            const p = await fetchProfile(session.user.id);
            if (p) setProfile(p);
          } catch {
            // Profile fetch failed — user is still authenticated
          }
        }
      );
      subscription = result.data.subscription;
    } catch {
      // Auth listener failed — continue as guest
      setLoading(false);
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
