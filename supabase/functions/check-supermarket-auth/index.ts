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

    const { marketId } = await req.json();

    // Verify JWT user token from header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Manca l'header di autorizzazione");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      throw new Error("Utente non autorizzato");
    }

    // Qui andremmo a controllare su una tabella "user_market_credentials" se l'utente ha salvato i dati per marketId.
    // Per questo primo step del modulo B2B AI Cart Filling, simuliamo il controllo:
    // Restituiamo false per forzare l'apertura del Modal e testare il flusso UI/UX.
    
    // In futuro:
    // const { data } = await supabase.from('user_market_credentials').select('id').eq('user_id', user.id).eq('market_id', marketId).single();
    // const hasCredentials = !!data;

    const hasCredentials = false;

    return new Response(JSON.stringify({ hasCredentials }), {
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
