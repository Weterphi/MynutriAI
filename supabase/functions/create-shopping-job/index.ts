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
    const supabaseClient = createClient(supabaseUrl, supabaseKey); // auth bypass proxy

    const { marketId, parsedItems } = await req.json();

    if (!marketId || !parsedItems) {
        throw new Error("Dati mancanti (marketId o parsedItems)");
    }

    // Verify JWT user token from header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Manca l'header di autorizzazione");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      throw new Error("Utente non autorizzato");
    }

    console.log(`[B2B Cart AI] Creazione Shopping Job per utente ${user.id} sul market ${marketId}`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabaseAdmin
        .from('shopping_jobs')
        .insert({
            user_id: user.id,
            market_id: marketId,
            parsed_items: parsedItems,
            status: 'pending'
        })
        .select('id')
        .single();

    if (error) {
        throw new Error(error.message || "Errore di salvataggio a database");
    }

    return new Response(JSON.stringify({ success: true, jobId: data.id }), {
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
