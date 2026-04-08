import { useRef, useCallback, useEffect } from 'react';

export function useAutoSave(key, delay = 2000) {
  const timeoutRef = useRef(null);

  const save = useCallback((data) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
      } catch (e) {
        console.warn('useAutoSave: localStorage write failed', e);
      }
    }, delay);
  }, [key, delay]);

  const load = useCallback(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  // Cleanup pending timeout on unmount
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return { save, load };
}
