import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = "https://mdykqdqopwzgvlhlrydm.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keWtxZHFvcHd6Z3ZsaGxyeWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTYxNTgsImV4cCI6MjA5MTYzMjE1OH0.9iTGkjN3PSGAfsm49hZVoWDBaxfYVQCrqwWWLpgvMo0";

const supabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);

async function run() {
  // 1. Get profiles
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('*');
  if (profErr) console.error('Profiles err:', profErr);
  console.log('--- PROFILES ---');
  console.log(profiles);

  // 2. Get work items for project 41 or all work items with Vyntra / Varad
  const { data: items, error: itemErr } = await supabase
    .from('work_items')
    .select('id, title, type, status, parent_id, assignee_id, project_id');
  if (itemErr) console.error('Items err:', itemErr);
  console.log('--- WORK ITEMS ---');
  console.log(JSON.stringify(items, null, 2));
}

run();
