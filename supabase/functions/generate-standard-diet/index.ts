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

    const { userId, userPrefs } = await req.json();
    if (!userId || !userPrefs) {
      return new Response(JSON.stringify({ error: "Mancano parametri userId o userPrefs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("generate-standard-diet: start", { userId });

    let planJson: any[] = [];
    let grokError = "";

    if (!xaiKey) {
      grokError = "Chiave XAI non configurata nell'ambiente";
      console.warn("⚠️", grokError);
      return new Response(JSON.stringify({ error: grokError }), { status: 500, headers: corsHeaders });
    }

    try {
      const p = userPrefs ?? {};
      
      // Normalizzazione campi (App.jsx può inviare 'formData' con chiavi italiane o 'cachedUserPrefs' con chiavi inglesi)
      const gender = p.gender || p.sesso || "Non specificato";
      const age = p.age || p.eta || "Non specificato";
      const weight = p.weight_kg || p.peso || "Non specificato";
      const height = p.height_cm || p.altezza || "Non specificato";
      const goal = p.goal || p.obiettivo || "Benessere generale";
      const dietType = p.diet_type || (Array.isArray(p.dieta) ? p.dieta.join(', ') : p.dieta) || "Nessuna restrizione";
      const pacing = p.pacing || "Standard";
      const activityLevel = p.activity_level || p.neat_level || "Non specificato";
      const activeWorkoutHours = p.active_workout_hours || 0;
      const mealsPerDay = p.meals_per_day || p.pasti || 5;
      const excludedFoods = p.excluded_foods || p.escludere || "Nessuno";
      const budget = p.diet_budget || p.budget || "Non specificato";
      const prepLunch = p.prep_time_lunch || p.prep_pranzo || "Non specificato";
      const prepDinner = p.prep_time_dinner || p.prep_cena || "Non specificato";
      const gastronomicCountries = p.gastronomic_countries && Array.isArray(p.gastronomic_countries) && p.gastronomic_countries.length > 0 ? p.gastronomic_countries.join(', ') : null;

      const allergieStr = Array.isArray(p.allergies) && p.allergies.length > 0 ? p.allergies.join(", ") : (p.allergies || p.allergie?.join(', ') || "Nessuna");

      let familyInstructions = "";
      if (gender === "Famiglia") {
        const familyStr = (p.family_members || []).map((m: any, i: number) => {
          const mAllergieStr = (m.allergies && m.allergies.length > 0) ? m.allergies.join(", ") : "Nessuna";
          const exclStr = m.excluded_foods ? m.excluded_foods : "Nessuna";
          return `Persona ${i+1}: ${m.name} (${m.role || 'Familiare'}), Sesso: ${m.gender}, Età: ${m.age}, Peso: ${m.weight}kg, Allergie: ${mAllergieStr}, Da escludere: ${exclStr}`;
        }).join(";\n");
        familyInstructions = `\n=== MODALITÀ FAMIGLIA ===\nL'utente ha richiesto una dieta per l'intero nucleo familiare. I componenti della famiglia sono:\n${familyStr}\n\nLe ricette e le grammature che genererai per ogni pasto devono riflettere LA SOMMA TOTALE PER TUTTA LA FAMIGLIA (es. "Pasta integrale: 350g totali da dividere in porzioni adeguate").\nÈ FONDAMENTALE rispettare le allergie e le esclusioni di OGNI singolo componente: se il Papà è allergico ai funghi, i funghi NON devono essere presenti nel pasto condiviso o devono essere previste varianti specifiche per lui.\n`;
      }

      // Istruzioni specifiche per obiettivo
      const goalLower = (goal).toLowerCase();
      let goalInstructions = "";
      if (goalLower.includes("massa") || goalLower.includes("aument") || goalLower.includes("bulk") || goalLower.includes("muscol")) {
        goalInstructions = `\n=== OBIETTIVO: AUMENTO MASSA MUSCOLARE ===\nL'utente vuole aumentare la massa corporea e la muscolatura. Applica queste regole OBBLIGATORIE:\n- SURPLUS CALORICO: ogni giorno il piano deve fornire circa 300-500 kcal in più rispetto al fabbisogno di mantenimento.\n- PROTEINE ALTE: minimo 2g di proteine per kg di peso corporeo al giorno. Includi fonti proteiche in OGNI pasto principale.\n- CARBOIDRATI COMPLESSI ABBONDANTI: riso integrale, pasta integrale, patate dolci, avena, quinoa — presenti in ogni pranzo e cena per sostenere l'allenamento.\n- GRASSI SANI: avocado 50-100g, olio EVO 2 cucchiai/giorno, frutta secca 30-40g/giorno, salmone grasso almeno 3 volte/settimana.\n- SPUNTINI PROTEICI E CALORICI: frullati proteici, pane integrale con burro di arachidi, ricotta con frutta, uova sode.\n- COLAZIONE ABBONDANTE: almeno 600-700 kcal, ricca di proteine e carboidrati complessi.`;
      } else if (goalLower.includes("dimagr") || goalLower.includes("peso") || goalLower.includes("cut") || goalLower.includes("dimagrimento")) {
        goalInstructions = `\n=== OBIETTIVO: DIMAGRIMENTO E PERDITA DI PESO ===\nL'utente vuole perdere peso in modo sano e duraturo. Applica queste regole OBBLIGATORIE:\n- DEFICIT CALORICO MODERATO: piano da circa 1400-1700 kcal/giorno (adatta al sesso ed età), mai sotto le 1200 kcal.\n- PROTEINE ALTE (effetto saziante): 1.6-2g/kg di peso corporeo — carni magre, pesce, uova, legumi, yogurt greco 0%.\n- CARBOIDRATI CONTROLLATI: preferire carboidrati a basso indice glicemico. MAI pane bianco, pasta raffinata, zuccheri semplici.\n- GRASSI SANI in piccole quantità: olio EVO 1 cucchiaio a pasto, avocado 50g max, frutta secca 15-20g/giorno.\n- VERDURE ABBONDANTI: almeno 300-400g di verdure non amidacee al giorno per riempire il pasto con poche calorie.\n- SPUNTINI IPOCALORICI: massimo 100-150 kcal (frutta fresca, yogurt 0%, tè verde, sedano con hummus 20g).\n- IDRATAZIONE: ricorda di bere 2L di acqua al giorno (includi questa nota nel primo pasto).`;
      } else {
        goalInstructions = `\n=== OBIETTIVO: ${goal} ===\nCalibrare il piano in base all'obiettivo dichiarato, bilanciando macronutrienti in modo appropriato con enfasi su cibi freschi, integrali e poco processati.`;
      }

      let gastronomicInstructions = "";
      let gastronomicStrictRule = "";
      if (gastronomicCountries) {
        gastronomicInstructions = `\n- PAESI GASTRONOMICI RICHIESTI: ${gastronomicCountries}.`;
        gastronomicStrictRule = `\n9. TRADIZIONI CULINARIE OBBLIGATORIE: L'utente ha selezionato questi paesi: ${gastronomicCountries}. DEVI INSERIRE ALMENO UN PIATTO TIPICO DI QUESTI PAESI (es. Ramen, Tacos, Sushi bilanciato, Curry, ecc.) IN ALMENO 3-4 GIORNI ALLA SETTIMANA. I nomi dei piatti devono richiamare la nazione (es. "Pollo al Curry Indiano", "Tacos Messicani Fit"). SE IGNORI QUESTA REGOLA L'UTENTE SARÀ MOLTO DELUSO.`;
      }

      let systemRole = `Sei un medico nutrizionista clinico di altissimo livello con 20 anni di esperienza ospedaliera. Il tuo obiettivo è creare una dieta di 30 giorni perfettamente calibrata, salutare e che aiuti il paziente a raggiungere i suoi traguardi fisici e di benessere. Non stai fornendo un semplice consiglio, ma prescrivendo un protocollo nutrizionale strutturato.`;
      
      if (gender === "Famiglia") {
        systemRole = `Sei un esperto nutrizionista e chef specializzato in alimentazione familiare. Il tuo obiettivo NON è creare una "dieta" rigida, ma generare dei **menù squisiti, bilanciati e salutari perfetti per tutta la famiglia**. I pasti devono essere invitanti e calibrati prendendo in considerazione attentamente i dati forniti (età, sesso e peso di ogni componente) per coprire i fabbisogni di tutti in modo pratico e gustoso.`;
      }

      const promptText = `${systemRole}

=== DATI PAZIENTE ===
- Sesso: ${gender}
- Età: ${age}
- Peso: ${weight}
- Altezza: ${height}
${familyInstructions}- Livello Attività (NEAT): ${activityLevel}
- Ore Sport a settimana: ${activeWorkoutHours}
- Obiettivo principale: ${goal}
- Ritmo desiderato (Pacing): ${pacing}
- Tipo di dieta preferita: ${dietType}
- Allergie/Intolleranze: ${allergieStr}
- Alimenti da escludere: ${excludedFoods}
- Pasti al giorno: ${mealsPerDay}
- Budget: ${budget}
- Tempo Preparazione Pranzo: ${prepLunch}
- Tempo Preparazione Cena: ${prepDinner}
${goalInstructions}${gastronomicInstructions}

=== REGOLE GENERALI FERREE ===
1. Le istruzioni dell'obiettivo sopra hanno PRIORITÀ ASSOLUTA sulla composizione dei pasti.
2. Il piano deve coprire ESATTAMENTE 30 giorni, numerati da 1 a 30, divisi in 4 settimane fittizie per comodità visiva.
3. VARIETÀ OBBLIGATORIA: nessun pasto principale può ripetersi identico nei 4 giorni precedenti. Sii creativo, proponi piatti sani ma invitanti. Rispetta il budget e il tempo di preparazione indicati dal paziente.
4. MAI lo stesso proteico principale a pranzo e cena dello stesso giorno.
5. GRAMMATURE SEMPRE PRESENTI: ogni ingrediente deve avere i grammi esatti adeguati al peso e all'obiettivo (es. "Petto di pollo grigliato 150g, riso integrale 80g a secco, zucchine 120g, olio EVO 1 cucchiaio").
6. Colazioni alternate dolci/salate ogni giorno, o comunque varie. Spuntini vari e diversi ogni giorno.
7. RISPETTA RIGOROSAMENTE le allergie, le intolleranze e gli alimenti da escludere. Se il paziente esclude il pesce, non mettere MAI il pesce. Se è intollerante al lattosio, zero latticini (o solo alternative vegetali).
8. DEVI GENERARE ESATTAMENTE ${mealsPerDay} PASTI AL GIORNO. ASSOLUTAMENTE NON UNO DI PIU' E NON UNO DI MENO. Rifiutati categoricamente di inserire spuntini extra se i pasti scelti sono 3 o 4. L'array "meals" deve avere SEMPRE e SOLO esattamente ${mealsPerDay} elementi in ogni singolo giorno. L'intelligenza Artificiale non deve mai aggiungere pasti non richiesti dal paziente.${gastronomicStrictRule}

=== FORMATO OUTPUT - CRITICO ===
Rispondi SOLO con un array JSON. Nessun testo prima. Nessun testo dopo. Nessun markdown. Nessun backtick.
L'array deve avere ESATTAMENTE 30 elementi. Non troncare. Non accorciare.

Struttura di ogni elemento:
[
  {
    "day_number": 1,
    "day_name": "Giorno 1",
    "week": 1,
    "meals": [
${(mealsPerDay === 3) ? `        {"name": "Colazione", "food": "<descrizione con grammi>"},
        {"name": "Pranzo", "food": "<descrizione con grammi>"},
        {"name": "Cena", "food": "<descrizione con grammi>"}` : (mealsPerDay === 4) ? `        {"name": "Colazione", "food": "<descrizione con grammi>"},
        {"name": "Pranzo", "food": "<descrizione con grammi>"},
        {"name": "Spuntino", "food": "<descrizione con grammi>"},
        {"name": "Cena", "food": "<descrizione con grammi>"}` : `        {"name": "Colazione", "food": "<descrizione con grammi>"},
        {"name": "Spuntino mattina", "food": "<descrizione con grammi>"},
        {"name": "Pranzo", "food": "<descrizione con grammi>"},
        {"name": "Spuntino pomeriggio", "food": "<descrizione con grammi>"},
        {"name": "Cena", "food": "<descrizione con grammi>"}`}
    ]
  }
]

Inizia direttamente con [ e termina con ].`;

      console.log("🥗 Generazione piano dietetico standard...");
      const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${xaiKey}`,
        },
        body: JSON.stringify({
          model: "grok-latest", // Usiamo il modello testuale per velocità/costi
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
          temperature: 0.3,
          max_tokens: 16000,
        }),
      });

      if (grokRes.ok) {
        const grokData = await grokRes.json();
        let rawContent = grokData?.choices?.[0]?.message?.content?.trim() ?? "";
        // Rimuove eventuali blocchi markdown
        rawContent = rawContent
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        try {
          const parsed = JSON.parse(rawContent);
          if (Array.isArray(parsed) && parsed.length > 0) {
            planJson = parsed;
            console.log("✅ Grok piano generato:", planJson.length, "giorni");
          } else {
            grokError = "Grok ha restituito un array vuoto o invalido";
            throw new Error(grokError);
          }
        } catch (e) {
          grokError = `Parsing JSON fallito: ${String(e)}`;
          throw new Error(grokError);
        }
      } else {
        const errText = await grokRes.text();
        grokError = `Grok HTTP ${grokRes.status}: ${errText}`;
        throw new Error(grokError);
      }
    } catch (grokErr) {
      console.error("❌ Errore chiamata Grok:", grokErr);
      return new Response(JSON.stringify({ error: String(grokErr) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Elimina piano precedente e salva il nuovo
    await supabase.from("diet_plans").delete().eq("user_id", userId);
    const { error: insertError } = await supabase.from("diet_plans").insert([{
      user_id: userId,
      plan_json: planJson,
      is_sent: false,
    }]);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Piano salvato per userId:", userId, "| Giorni:", planJson.length);
    return new Response(JSON.stringify({
      success: true,
      message: "Dieta generata da Nutri AI con successo!",
      plan: planJson
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("❌ Errore generale:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
