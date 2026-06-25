import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Deno.env.get('MASTER_ENCRYPTION_KEY');

function encryptPassword(password) {
    if (!ENCRYPTION_KEY) {
        throw new Error("MASTER_ENCRYPTION_KEY mancante nelle variabili d'ambiente.");
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag
    };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseKey); // auth bypass proxy

    const { marketId, email, password } = await req.json();

    // Verify JWT user token from header per validare l'identità dell'utente
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Manca l'header di autorizzazione");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      throw new Error("Utente non autorizzato");
    }

    const userId = user.id;

    // Cripta la password usando AES-256-GCM
    const { iv, encryptedData, authTag } = encryptPassword(password);

    console.log(`[B2B Cart AI] Salvataggio crittografato per utente ${userId} sul market ${marketId}`);

    // Usa la Service Role Key per bypassare RLS e fare l'upsert garantito lato server
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabaseAdmin
        .from('user_supermarket_credentials')
        .upsert({
            user_id: userId,
            market_id: marketId,
            email: email,
            encrypted_password: encryptedData,
            iv: iv,
            auth_tag: authTag
        }, { onConflict: 'user_id, market_id' });

    if (error) {
        throw new Error(error.message || "Errore di salvataggio a database");
    }

    return new Response(JSON.stringify({ success: true, message: "Credenziali crittografate e salvate." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400, // or 500
    });
  }
});
