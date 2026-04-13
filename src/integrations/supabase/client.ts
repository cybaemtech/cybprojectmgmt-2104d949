import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mdykqdqopwzgvlhlrydm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keWtxZHFvcHd6Z3ZsaGxyeWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTYxNTgsImV4cCI6MjA5MTYzMjE1OH0.9iTGkjN3PSGAfsm49hZVoWDBaxfYVQCrqwWWLpgvMo0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
