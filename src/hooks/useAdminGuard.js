import { useAuth } from '../context/AuthContext';

/**
 * Simple admin check — no redirects, no timers, no race conditions.
 * Pages handle their own UI for each auth state.
 */
export function useAdminGuard() {
  const auth = useAuth();
  const loading = auth?.loading ?? true;
  const isAdmin = auth?.isAdmin ?? false;
  const user = auth?.user ?? null;

  return { allowed: isAdmin, loading, user };
}
