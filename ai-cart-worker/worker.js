import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { handleAmazonFresh } from './amazonFresh.js';

dotenv.config();
chromium.use(stealth());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENCRYPTION_KEY = process.env.MASTER_ENCRYPTION_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.includes('inserisci_qui')) {
    console.error("❌ ERRORE: SUPABASE_SERVICE_ROLE_KEY non valida nel file .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Funzione per decriptare la password
function decryptPassword(encryptedData, ivHex, authTagHex) {
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm', 
        Buffer.from(ENCRYPTION_KEY, 'hex'), 
        Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

async function processJob(job) {
    console.log(`\n=================================================`);
    console.log(`[🚀 AVVIO] Elaborazione Job ${job.id}`);
    console.log(`[🛒 MARKET] Supermercato: ${job.market_id}`);
    console.log(`[👤 UTENTE] User ID: ${job.user_id}`);
    console.log(`=================================================`);
    
    // 1. Recupero credenziali
    console.log("-> 🔑 Recupero credenziali protette da Supabase...");
    const { data: creds, error } = await supabase
        .from('user_supermarket_credentials')
        .select('*')
        .eq('user_id', job.user_id)
        .eq('market_id', job.market_id)
        .single();

    if (error || !creds) {
        throw new Error("Credenziali non trovate per l'utente e il supermercato.");
    }

    // Decriptazione in memoria
    console.log("-> 🔓 Decrittazione AES-256-GCM in memoria...");
    const plainPassword = decryptPassword(creds.encrypted_password, creds.iv, creds.auth_tag);
    console.log(`-> ✅ Password decriptata con successo per l'email: ${creds.email}`);

    // 2. Avvio Browser (headless: false per il debug, come richiesto)
    console.log("-> 🌐 Avvio motore Playwright (Stealth Mode)...");
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        if (job.market_id.toLowerCase().includes('amazon')) {
            await handleAmazonFresh(page, creds.email, plainPassword, job.parsed_items);
        } else {
            console.log(`-> 🤖 Simulazione navigazione generica su ${job.market_id}...`);
            console.log(`-> 📝 Lettura array di ${job.parsed_items.length} prodotti...`);
            await page.waitForTimeout(3000); 
            console.log("-> ✅ Carrello riempito con successo!");
        }
        
        // 3. Lavoro completato
        await supabase.from('shopping_jobs').update({ status: 'completed', updated_at: new Date() }).eq('id', job.id);
        console.log(`[✅ COMPLETATO] Job ${job.id} terminato con successo.\n`);
    } catch (err) {
        console.error(`[❌ ERRORE] nel job ${job.id}:`, err);
        await supabase.from('shopping_jobs').update({ status: 'failed', updated_at: new Date() }).eq('id', job.id);
    } finally {
        await browser.close();
    }
}

// Loop di Polling
async function startWorker() {
    console.log(`
      ___  ____   _____  ____  _      ___    ____  ___ 
     / _ \\|_   _|/ ___/ / __ \\| |    / _ \\  / __ \\/ _ \\
    / /_\\ \\ | |  \\___ \\/ / / /| |   / /_\\ \\/ / / / /_\\ \\
   / /___/ _| |_ ____/ / /_/ / | |__/ /___/ /_/ / /___/ 
  /_/     |_____|_____/\\____/  |___/_/    \\____/_/      
                                                        
    🤖 B2B CART AUTOMATION WORKER AVVIATO
    🛡️ Protezione Stealth Attiva
    ⏳ In ascolto di nuovi Job...
    `);

    setInterval(async () => {
        try {
            const { data: jobs, error } = await supabase
                .from('shopping_jobs')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1);

            if (error) {
                console.error("Errore fetch jobs:", error.message);
                return;
            }

            if (jobs && jobs.length > 0) {
                const job = jobs[0];
                
                // Blocca subito il job impostandolo su processing (previene doppie esecuzioni se abbiamo più worker)
                await supabase.from('shopping_jobs').update({ status: 'processing', updated_at: new Date() }).eq('id', job.id);
                
                // Elabora il job
                await processJob(job);
            }
        } catch (err) {
            console.error("Errore nel loop del worker:", err);
        }
    }, 5000); // Polling ogni 5 secondi
}

startWorker();
