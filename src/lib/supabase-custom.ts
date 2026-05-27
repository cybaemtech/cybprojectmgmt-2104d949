/**
 * Custom Supabase client pointing to the user's external Supabase project.
 * This overrides the auto-generated Lovable Cloud client for all app data operations.
 *
 * NOTE: We intentionally hardcode the external project URL + anon key here and do
 * NOT read from import.meta.env, because Lovable Cloud auto-populates
 * VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY with the managed Cloud project
 * (which does not contain this app's schema). Using env vars would route all
 * queries to the wrong backend and return 404s.
 */
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://mdykqdqopwzgvlhlrydm.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keWtxZHFvcHd6Z3ZsaGxyeWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTYxNTgsImV4cCI6MjA5MTYzMjE1OH0.9iTGkjN3PSGAfsm49hZVoWDBaxfYVQCrqwWWLpgvMo0';

export const supabaseCustom = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
