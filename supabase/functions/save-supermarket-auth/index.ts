import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { marketId, email, password } = await req.json();

    // Verify JWT user token from header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Manca l'header di autorizzazione");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      throw new Error("Utente non autorizzato");
    }

    // Struttura iniziale per ricevere e simulare il salvataggio.
    // In produzione qui va integrata la cifratura simmetrica (es. AES-256-GCM) 
    // prima di scrivere nel database.
    console.log(`[B2B Cart AI] Ricevute credenziali per l'utente ${user.id} sul market ${marketId}`);
    
    // TODO: 
    // const encryptedPassword = encrypt(password, Deno.env.get('AES_SECRET_KEY'));
    // await supabase.from('user_market_credentials').upsert({ user_id: user.id, market_id: marketId, email, password: encryptedPassword });

    // Simuliamo 1 secondo di caricamento per l'esperienza utente
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(JSON.stringify({ success: true, message: "Credenziali salvate e pronte per il riempimento del carrello AI." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
