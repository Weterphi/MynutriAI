import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function resetJobs() {
    const { data, error } = await supabase.from('shopping_jobs').update({ status: 'pending' }).in('status', ['processing', 'completed', 'failed']);
    console.log("Jobs resettati a pending per il test. Error:", error);
}

resetJobs();
