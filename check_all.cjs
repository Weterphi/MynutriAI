const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://dkguwchycalrtsqxcttv.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ3V3Y2h5Y2FscnRzcXhjdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTk4MDEsImV4cCI6MjA5NzE5NTgwMX0.z5c5Q3VFKI5HKcK4DI0QTDbBNYGE1R-o6NttxW0sDio";

async function run() {
  const sb = createClient(SUPABASE_URL, ANON_KEY);
  
  const { data: plans } = await sb.from('diet_plans').select(`
    id, created_at, plan_json, user_id, users (first_name, phone_number)
  `);
  
  if (!plans || plans.length === 0) {
    console.log("Nessun piano trovato");
    return;
  }
  
  const { data: prefs } = await sb.from('user_preferences').select('user_id, wakeup_time');
  const prefMap = {};
  if (prefs) prefs.forEach(p => prefMap[p.user_id] = p.wakeup_time);

  console.log(`Trovati ${plans.length} piani dietetici.`);
  
  for (const plan of plans) {
    const user = Array.isArray(plan.users) ? plan.users[0] : plan.users;
    console.log("-------------------");
    console.log(`Utente: ${user?.first_name || 'Sconosciuto'} (Tel: ${user?.phone_number || 'N/A'})`);
    console.log(`Data creazione piano: ${plan.created_at}`);
    
    const createdDate = new Date(plan.created_at);
    const today = new Date();
    createdDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentDayNumber = diffDays + 1;
    
    console.log(`Giorni passati: ${diffDays}. currentDayNumber: ${currentDayNumber}`);
    
    const wakeupTime = prefMap[plan.user_id] || '07:00:00';
    const wakeupHour = wakeupTime.split(':')[0];
    console.log(`Ora sveglia: ${wakeupTime} (Ora trigger cron: ${wakeupHour}:00)`);
    
    if (currentDayNumber > 30 || currentDayNumber <= 0) {
      console.log(`-> NESSUN INVIO: currentDayNumber (${currentDayNumber}) fuori dal range 1-30`);
    } else {
      console.log(`-> PRONTO PER L'INVIO: Giorno ${currentDayNumber}`);
    }
  }
}

run();
