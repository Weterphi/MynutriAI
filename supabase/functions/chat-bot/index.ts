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
    const xaiKey = Deno.env.get("NUTRI-XAI") ?? Deno.env.get("XAI") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, message, history } = await req.json();

    if (!userId || !message) {
      return new Response(JSON.stringify({ error: "Mancano parametri userId o message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("chat-bot: processing message for", { userId });

    // 1. Recupera dati utente, preferenze e dieta
    const { data: user } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
    const { data: prefs } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
    const { data: diet } = await supabase.from("diet_plans").select("*").eq("user_id", userId).maybeSingle();

    const userName = user?.first_name || "Amico";
    const userGoal = prefs?.goal || "Mantenimento";
    const dietType = prefs?.diet_type || "Nessuna restrizione";
    const planJson = diet?.plan_json || [];

    // 2. Costruisci il contesto del piano dietetico (mostrando i primi giorni o un riassunto se troppo grande)
    let dietContext = "Nessun piano dietetico attivo.";
    if (planJson && planJson.length > 0) {
      // Includiamo un riassunto dei pasti della prima settimana o in generale dei pasti per dare contesto all'IA
      dietContext = `L'utente ha un piano di 30 giorni. Ecco i primi giorni di esempio del suo piano:\n`;
      planJson.slice(0, 7).forEach((day: any) => {
        dietContext += `- Giorno ${day.day_number} (${day.day_name}):\n`;
        day.meals.forEach((meal: any) => {
          dietContext += `  * ${meal.name}: ${meal.food}\n`;
        });
      });
    }

    // 3. Sistema di messaggi per l'API xAI
    const systemPrompt = `Sei l'Assistente AI di NutriAI, un coach nutrizionale empatico, motivante ed esperto.
Il tuo obiettivo è rispondere alle domande dell'utente, motivarlo nel suo percorso e consigliarlo su alimentazione e stile di vita.

Dati dell'utente attuale:
- Nome: ${userName}
- Obiettivo: ${userGoal}
- Tipo di dieta preferito: ${dietType}

Ecco una porzione del suo piano nutrizionale attuale (30 giorni):
${dietContext}

Regole di comportamento:
1. Sii sempre incoraggiante, positivo e professionale.
2. Rispondi preferibilmente in italiano. Usa le emoji per rendere i messaggi più amichevoli e facili da leggere.
3. Se l'utente ti fa domande sul suo piano o su come sostituire degli alimenti, dagli suggerimenti nutrizionali sensati (es. sostituire pollo con tacchino o tofu, mantenere grammature simili).
4. Ricorda sempre all'utente che sei un assistente virtuale e che per modifiche cliniche o problemi di salute deve consultare il suo medico o nutrizionista.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: any) => ({
        role: h.sender === "user" ? "user" : "assistant",
        content: h.text
      })),
      { role: "user", content: message }
    ];

    if (!xaiKey) {
      return new Response(
        JSON.stringify({ response: `Ciao ${userName}! 🤖 Sono il tuo assistente NutriAI. Al momento la mia intelligenza artificiale avanzata (xAI) non è configurata nell'ambiente locale, ma sono qui per aiutarti a consultare la tua dieta!` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${xaiKey}`,
      },
      body: JSON.stringify({
        model: "grok-latest",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (grokRes.ok) {
      const grokData = await grokRes.json();
      const aiResponse = grokData?.choices?.[0]?.message?.content || "Scusa, non sono riuscito a elaborare una risposta. Riprova più tardi! 🍎";
      return new Response(JSON.stringify({ response: aiResponse }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      const errText = await grokRes.text();
      console.error("Grok API Error:", errText);
      return new Response(
        JSON.stringify({ response: `Ciao ${userName}! Sto riscontrando qualche problema di comunicazione con i miei server neurali. Riprova tra poco! 🥦` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    console.error("Error in chat-bot edge function:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
