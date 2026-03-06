import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function useAdminGuard() {
  const auth = useAuth();
  const loading = auth?.loading ?? true;
  const isAdmin = auth?.isAdmin ?? false;
  const user = auth?.user ?? null;
  const navigate = useNavigate();
  // Small delay before redirecting — lets auth state settle after page load
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (loading) return;
    // Give auth state 300ms to fully settle (handles race between getSession + onAuthStateChange)
    const timer = setTimeout(() => setSettled(true), 300);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (settled && !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [settled, isAdmin, navigate]);

  return { allowed: !loading && isAdmin, loading: loading || (!isAdmin && !settled) };
}
