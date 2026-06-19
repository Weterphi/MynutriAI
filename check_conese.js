import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dkguwchycalrtsqxcttv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ3V3Y2h5Y2FscnRzcXhjdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTk4MDEsImV4cCI6MjA5NzE5NTgwMX0.z5c5Q3VFKI5HKcK4DI0QTDbBNYGE1R-o6NttxW0sDio';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConese() {
  const { data: users, error: usersErr } = await supabase.from('users').select('*').ilike('last_name', '%Conese%');
  if (usersErr) return console.error(usersErr);
  
  for (const u of users) {
    console.log(`\nUser: ${u.first_name} ${u.last_name}`);
    
    const { data: plan } = await supabase.from('diet_plans').select('created_at, plan_json').eq('user_id', u.id).single();
    if (!plan) {
      console.log("Nessuna dieta generata.");
      continue;
    }
    
    const { data: pref } = await supabase.from('user_preferences').select('wakeup_time').eq('user_id', u.id).single();
    
    const createdDate = new Date(plan.created_at);
    const today = new Date();
    createdDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentDay = diffDays + 1;
    
    console.log(`Orario Sveglia: ${pref?.wakeup_time || '07:00:00'}`);
    console.log(`Creata il: ${new Date(plan.created_at).toLocaleString()}`);
    console.log(`Giorno corrente (oggi): ${currentDay}`);
    
    const todayMenu = plan.plan_json.find(d => d.day_number === currentDay);
    if (todayMenu) {
       console.log(`\nMenu previsto per oggi (${todayMenu.day_name}):`);
       console.log(todayMenu.meals.map(m => `🍴 ${m.name}\n${m.food}`).join('\n\n'));
    }
  }
}

checkConese();
