require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function test() {
  const supabase = createClient('https://dkguwchycalrtsqxcttv.supabase.co', process.env.SUPABASE_ANON_KEY);
  // Log in as Willie
  const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'willie@test.com', // wait I don't know his password. Let's use the anon key.
  });
}
