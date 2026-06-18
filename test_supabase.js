import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dkguwchycalrtsqxcttv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ3V3Y2h5Y2FscnRzcXhjdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTk4MDEsImV4cCI6MjA5NzE5NTgwMX0.z5c5Q3VFKI5HKcK4DI0QTDbBNYGE1R-o6NttxW0sDio';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data, error } = await supabase.from('user_preferences').select('non_existent_column').limit(1);
  if (error) {
    console.error("Error fetching non_existent_column:", error);
  } else {
    console.log("Success! Column exists.");
  }
}

checkDb();
