import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dkguwchycalrtsqxcttv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ3V3Y2h5Y2FscnRzcXhjdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTk4MDEsImV4cCI6MjA5NzE5NTgwMX0.z5c5Q3VFKI5HKcK4DI0QTDbBNYGE1R-o6NttxW0sDio';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAll() {
  const { data: plans, error } = await supabase.from('diet_plans').select('user_id, created_at, users(first_name, last_name, phone_number)');
  if (error) return console.error(error);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const plan of plans) {
    const user = plan.users;
    const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    
    const createdDate = new Date(plan.created_at);
    createdDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentDay = diffDays + 1;
    
    console.log(`\n===================`);
    console.log(`Utente: ${name || 'Sconosciuto'}`);
    console.log(`Telefono: ${user?.phone_number || 'N/D'}`);
    console.log(`Creata il: ${new Date(plan.created_at).toLocaleString('it-IT')}`);
    console.log(`Oggi è il Giorno: ${currentDay}`);
    console.log(`===================`);
  }
}

checkAll();
