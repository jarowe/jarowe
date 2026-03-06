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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (p) {
          setUser(session.user);
          setProfile(p);
        } else {
          // Stale session — user was deleted or profile missing, force sign out
          try { await supabase.auth.signOut(); } catch (_) {}
          try {
            Object.keys(localStorage)
              .filter(k => k.startsWith('sb-'))
              .forEach(k => localStorage.removeItem(k));
          } catch (_) {}
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
            const p = await fetchProfile(session.user.id);
            setProfile(p);
            if (event === 'SIGNED_IN') {
              window.dispatchEvent(new CustomEvent('auth-signed-in'));
            }
          } else {
            setUser(null);
            setProfile(null);
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
