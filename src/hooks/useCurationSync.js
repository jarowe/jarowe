import { useState, useCallback, useRef } from 'react';
import { supabase, supabaseGet } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Admin-only hook for CRUD operations on node_curation table.
 * Pattern follows useCloudSync: debounced saves, silent error handling.
 */
export function useCurationSync() {
  const { user } = useAuth() || {};
  const [savingState, setSavingState] = useState(new Map()); // nodeId → 'saving'|'saved'|'error'
  const debounceTimers = useRef(new Map());

  const updateSaving = useCallback((nodeId, state) => {
    setSavingState(prev => {
      const next = new Map(prev);
      next.set(nodeId, state);
      return next;
    });
    // Auto-clear 'saved' after 2s
    if (state === 'saved') {
      setTimeout(() => {
        setSavingState(prev => {
          if (prev.get(nodeId) !== 'saved') return prev;
          const next = new Map(prev);
          next.delete(nodeId);
          return next;
        });
      }, 2000);
    }
  }, []);

  // Fetch all curation rows via direct REST (bypasses Supabase session lock).
  const fetchAll = useCallback(async () => {
    try {
      const data = await supabaseGet('node_curation');
      if (!data) return null;
      const map = new Map();
      for (const row of data) {
        map.set(row.node_id, row);
      }
      return map;
    } catch {
      return null;
    }
  }, []);

  // Upsert a single node (internal)
  const _upsert = useCallback(async (nodeId, updates) => {
    if (!supabase || !user) return false;
    updateSaving(nodeId, 'saving');
    try {
      const row = {
        node_id: nodeId,
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      };
      const { error } = await supabase
        .from('node_curation')
        .upsert(row, { onConflict: 'node_id' });
      if (error) throw error;
      updateSaving(nodeId, 'saved');
      window.dispatchEvent(new CustomEvent('constellation-data-changed'));
      return true;
    } catch {
      updateSaving(nodeId, 'error');
      return false;
    }
  }, [user, updateSaving]);

  // Save with debounce (for text fields, significance slider)
  const saveNode = useCallback((nodeId, updates) => {
    // Clear any existing timer for this node
    const existing = debounceTimers.current.get(nodeId);
    if (existing) clearTimeout(existing);

    updateSaving(nodeId, 'saving');
    const timer = setTimeout(() => {
      _upsert(nodeId, updates);
      debounceTimers.current.delete(nodeId);
    }, 800);
    debounceTimers.current.set(nodeId, timer);
  }, [_upsert, updateSaving]);

  // Save immediately (for toggles, dropdowns)
  const saveNodeImmediate = useCallback((nodeId, updates) => {
    // Clear any pending debounce
    const existing = debounceTimers.current.get(nodeId);
    if (existing) clearTimeout(existing);
    debounceTimers.current.delete(nodeId);
    return _upsert(nodeId, updates);
  }, [_upsert]);

  // Delete curation row (revert to pipeline defaults)
  const deleteOverride = useCallback(async (nodeId) => {
    if (!supabase || !user) return false;
    updateSaving(nodeId, 'saving');
    try {
      const { error } = await supabase
        .from('node_curation')
        .delete()
        .eq('node_id', nodeId);
      if (error) throw error;
      updateSaving(nodeId, 'saved');
      window.dispatchEvent(new CustomEvent('constellation-data-changed'));
      return true;
    } catch {
      updateSaving(nodeId, 'error');
      return false;
    }
  }, [user, updateSaving]);

  // Bulk hide multiple nodes
  const bulkHide = useCallback(async (nodeIds) => {
    if (!supabase || !user) return false;
    try {
      const rows = nodeIds.map(id => ({
        node_id: id,
        hidden: true,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }));
      const { error } = await supabase
        .from('node_curation')
        .upsert(rows, { onConflict: 'node_id' });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('constellation-data-changed'));
      return true;
    } catch {
      return false;
    }
  }, [user]);

  return {
    fetchAll,
    saveNode,
    saveNodeImmediate,
    deleteOverride,
    bulkHide,
    savingState,
  };
}
