/**
 * Custom Supabase client pointing to the user's external Supabase project.
 * This overrides the auto-generated client for all app data operations.
 *
 * NOTE: We intentionally hardcode the external project URL + anon key here and do
 * NOT read from import.meta.env, because some environments auto-populate
 * VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY with a managed project
 * (which might not contain this app's schema). Using env vars would route all
 * queries to the wrong backend and return 404s.
 */
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EXTERNAL_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseCustom = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
