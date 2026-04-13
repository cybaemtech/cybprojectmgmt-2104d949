/**
 * Custom Supabase client pointing to the user's external Supabase project.
 * This overrides the auto-generated Lovable Cloud client for all app data operations.
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
