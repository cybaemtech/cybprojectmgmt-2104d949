import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = "https://mdykqdqopwzgvlhlrydm.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keWtxZHFvcHd6Z3ZsaGxyeWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTYxNTgsImV4cCI6MjA5MTYzMjE1OH0.9iTGkjN3PSGAfsm49hZVoWDBaxfYVQCrqwWWLpgvMo0";

const supabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);

async function findPriyanka() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, email');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Total profiles found:', data.length);
    console.log('Profiles:', JSON.stringify(data, null, 2));
}

findPriyanka();
