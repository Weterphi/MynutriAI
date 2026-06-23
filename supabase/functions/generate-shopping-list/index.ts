import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, dietJson } = await req.json();

    if (!userId || !dietJson) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xaiKey = Deno.env.get("NUTRI-XAI") ?? Deno.env.get("XAI");
    if (!xaiKey) {
      throw new Error("Missing NUTRI-XAI config");
    }

    // We only need the first 7 days to calculate the weekly shopping list
    const weeklyDiet = Array.isArray(dietJson) ? dietJson.slice(0, 7) : dietJson;
    const dietText = JSON.stringify(weeklyDiet, null, 2);
    
    const promptText = `Di seguito ti fornisco una dieta settimanale in formato JSON. 
Il tuo compito è analizzarla, estrarre TUTTI gli ingredienti necessari per seguire la dieta per l'intera settimana, e sommarne le grammature totali.
Devi creare una LISTA DELLA SPESA strutturata, suddivisa per "reparto" del supermercato (es. Ortofrutta, Macelleria, Latticini, Dispensa).

DIETA JSON:
${dietText}

REGOLE CRITICHE:
1. Raggruppa ingredienti simili (es. "Pollo" e "Petto di pollo" diventano una voce unica sommando i grammi).
2. Usa nomi di prodotti generici per la spesa (es. "Riso Basmati", "Olio Extravergine d'Oliva").
3. Per ingredienti non pesati (es. "1 cucchiaio", "1 fetta"), convertili in quantità pratiche (es. "1 bottiglia", "1 confezione").

FORMATO OUTPUT:
Devi restituire ESCLUSIVAMENTE un JSON valido, senza testo introduttivo, senza markdown.
Usa esattamente questa struttura:
{
  "Ortofrutta": [
    { "item": "Zucchine", "quantity": "800g" },
    { "item": "Mele", "quantity": "1.5kg" }
  ],
  "Macelleria e Pescheria": [
    { "item": "Petto di pollo", "quantity": "600g" }
  ],
  "Latticini": [],
  "Dispensa": []
}
Non inserire altri campi. Le categorie devono essere esattamente quelle sopra.`;

    console.log("🛒 Generazione lista della spesa...");
    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${xaiKey}`,
      },
      body: JSON.stringify({
        model: "grok-latest",
        messages: [
          {
            role: "system",
            content: "You are a specialized JSON-output only AI.",
          },
          {
            role: "user",
            content: promptText,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!grokRes.ok) {
      throw new Error(`Grok API Error: ${await grokRes.text()}`);
    }

    const grokData = await grokRes.json();
    let rawContent = grokData?.choices?.[0]?.message?.content?.trim() ?? "";
    rawContent = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    
    let shoppingList;
    try {
      shoppingList = JSON.parse(rawContent);
    } catch (e) {
      throw new Error("Invalid JSON from Grok: " + rawContent);
    }

    return new Response(JSON.stringify({
      success: true,
      shoppingList: shoppingList
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("❌ Errore:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
