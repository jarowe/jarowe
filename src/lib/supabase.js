import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (url && key) ? createClient(url, key) : null;

/**
 * Direct REST query — bypasses the Supabase JS client's internal session lock.
 *
 * The Supabase JS client queues ALL requests behind an auth session lock during
 * token refresh. This causes reads to hang for 10-30s (or forever if the lock
 * corrupts). Since all our SELECT RLS policies use `qual: "true"` (public read),
 * we can bypass the client entirely and use the anon key directly.
 *
 * Use this for all read-only admin queries. Keep using `supabase` client for
 * writes (upsert/delete) that need the user's auth token for RLS.
 *
 * @param {string} table - Table name (e.g. 'profiles')
 * @param {object} [opts] - Query options
 * @param {string} [opts.select] - PostgREST select string (default '*')
 * @param {Record<string,string>} [opts.filters] - key=value filters (eq only)
 * @param {string} [opts.order] - Order string (e.g. 'created_at.desc')
 * @returns {Promise<any[]|null>} Array of rows or null on failure
 */
export async function supabaseGet(table, opts = {}) {
  if (!url || !key) return null;

  const params = new URLSearchParams();
  params.set('select', opts.select || '*');
  if (opts.order) params.set('order', opts.order);
  if (opts.filters) {
    for (const [k, v] of Object.entries(opts.filters)) {
      params.set(k, v);
    }
  }

  try {
    const res = await fetch(`${url}/rest/v1/${table}?${params}`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
