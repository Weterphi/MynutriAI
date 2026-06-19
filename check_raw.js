import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dkguwchycalrtsqxcttv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ3V3Y2h5Y2FscnRzcXhjdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTk4MDEsImV4cCI6MjA5NzE5NTgwMX0.z5c5Q3VFKI5HKcK4DI0QTDbBNYGE1R-o6NttxW0sDio';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRaw() {
  const { data, error } = await supabase.from('diet_plans').select('*');
  console.log("Diets count:", data?.length);
  if (data?.length > 0) console.log(data.map(d => d.user_id));
}
checkRaw();
