import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('diet_plans').select('user_id, created_at, users(first_name)');
  if (error) console.error(error);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  data.forEach(p => {
    const cd = new Date(p.created_at);
    cd.setHours(0,0,0,0);
    const diff = Math.floor((today.getTime() - cd.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`User: ${p.users?.first_name}, Created: ${p.created_at}, Day: ${diff + 1}`);
  });
}
check();
