const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function run() {
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) {
    console.error("Errore recupero buckets:", error);
    return;
  }
  
  console.log("=== BUCKETS ===");
  for (const b of buckets) {
    console.log(`- ${b.name}: Public=${b.public}`);
  }
}

run();
