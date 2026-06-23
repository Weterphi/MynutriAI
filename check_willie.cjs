const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://dkguwchycalrtsqxcttv.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ3V3Y2h5Y2FscnRzcXhjdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTk4MDEsImV4cCI6MjA5NzE5NTgwMX0.z5c5Q3VFKI5HKcK4DI0QTDbBNYGE1R-o6NttxW0sDio";

async function run() {
  const sb = createClient(SUPABASE_URL, ANON_KEY);
  
  const { data: users, error: userError } = await sb.from('users').select('*').ilike('first_name', '%willie%');
  if (userError || !users || users.length === 0) {
    console.error("Willie non trovato");
    return;
  }
  
  const willie = users[0];
  console.log("=== USER WILLIE ===");
  console.log("ID:", willie.id, "Phone:", willie.phone_number);

  const { data: prefs } = await sb.from('user_preferences').select('*').eq('user_id', willie.id);
  console.log("=== PREFERENCES ===");
  console.log(prefs && prefs.length > 0 ? prefs[0] : 'Nessuna preferenza');

  const { data: plans } = await sb.from('diet_plans').select('id, created_at, plan_json').eq('user_id', willie.id);
  console.log("=== DIET PLAN ===");
  if (plans && plans.length > 0) {
    console.log("Created At:", plans[0].created_at);
    if (!Array.isArray(plans[0].plan_json)) {
      console.log("ERRORE: plan_json non e' un array!", typeof plans[0].plan_json);
      return;
    }
    const firstTwoDays = plans[0].plan_json.slice(0, 2).map(d => ({day_number: d.day_number, day_name: d.day_name}));
    console.log("Primi due giorni nel JSON:", firstTwoDays);

    const createdDate = new Date(plans[0].created_at);
    const today = new Date();
    createdDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    console.log("DiffDays calcolati:", diffDays);
    console.log("CurrentDayNumber (diffDays + 1):", diffDays + 1);

    const wakeupTime = prefs && prefs.length > 0 && prefs[0].wakeup_time ? prefs[0].wakeup_time : '07:00:00';
    const wakeupHour = wakeupTime.split(':')[0];
    console.log("Wakeup Hour calcolata:", wakeupHour);
  } else {
    console.log("Nessun piano trovato");
  }
}

run();
