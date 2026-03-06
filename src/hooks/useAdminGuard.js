import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function useAdminGuard() {
  const auth = useAuth();
  const loading = auth?.loading ?? true;
  const isAdmin = auth?.isAdmin ?? false;
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  return { allowed: !loading && isAdmin, loading };
}
