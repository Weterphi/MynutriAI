const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZ3V3Y2h5Y2FscnRzcXhjdHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTk4MDEsImV4cCI6MjA5NzE5NTgwMX0.z5c5Q3VFKI5HKcK4DI0QTDbBNYGE1R-o6NttxW0sDio";

fetch('https://dkguwchycalrtsqxcttv.supabase.co/functions/v1/meta-whatsapp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ANON_KEY}`
  },
  body: JSON.stringify({ action: 'daily_diet', test_day: 1 })
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
