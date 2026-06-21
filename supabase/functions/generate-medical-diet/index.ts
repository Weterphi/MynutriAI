import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildMockPlan() {
  const days = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
  const colazioni = [
    "Fiocchi d'avena 60g con latte parzialmente scremato 150ml e 1 banana",
    "2 uova strapazzate con pane integrale 40g e 1 pomodoro",
    "Yogurt greco 125g con granola 30g e frutti di bosco 80g",
    "Pane integrale 50g con ricotta 60g e miele 1 cucchiaino",
    "Pancakes di avena 3 pezzi con sciroppo d'acero 1 cucchiaio e fragole 100g",
    "Smoothie proteico: latte scremato 200ml, banana, 1 cucchiaio burro mandorle",
    "Fette biscottate integrali 4 pz con marmellata senza zuccheri aggiunti 20g",
  ];
  const pranzi = [
    "Petto di pollo grigliato 150g, riso integrale 80g, zucchine 100g con olio EVO",
    "Pasta integrale 80g al pomodoro fresco, insalata verde 150g",
    "Merluzzo al forno 180g con patate 200g e broccoli 150g",
    "Insalata di lenticchie 150g con tonno al naturale 100g e cetrioli",
    "Risotto integrale 80g con funghi 100g e parmigiano 20g",
    "Tacchino al forno 160g con quinoa 70g e fagiolini 150g",
    "Zuppa di ceci 250ml con crostini integrali 30g e carote",
  ];
  const cene = [
    "Filetto di salmone 180g al forno, patate dolci 150g, spinaci saltati 150g",
    "Scaloppine di tacchino 150g con purè di cavolfiore 200g e insalata",
    "Orata al cartoccio 200g con verdure miste grigliate 200g",
    "Frittata 2 uova con verdure miste 150g e pane integrale 40g",
    "Zuppa di fagioli neri 250ml con pane di segale 40g",
    "Polpo in umido 180g con patate lesse 200g e rucola",
    "Tofu saltato 150g con riso basmati 70g e broccoletti 150g",
  ];
  const spuntiniMattina = [
    "1 mela e 15g mandorle",
    "Kiwi 2 pz e 10g noci",
    "Banana media",
    "Yogurt bianco 100g",
    "Crackers integrali 20g con hummus 30g",
    "Arancia e 10g nocciole",
    "1 pera e 15g pistacchi",
  ];
  const spuntiniPomeriggio = [
    "Yogurt greco 0% 125g con 1 cucchiaino miele",
    "2 gallette di riso con 20g ricotta",
    "Frullato di frutta fresca 200ml",
    "1 quadretto di cioccolato fondente 85% 20g e 1 frutto",
    "Hummus 40g con bastoncini di carota",
    "Kefir 150ml",
    "Mix di frutta secca 20g",
  ];

  return Array.from({ length: 30 }, (_, i) => ({
    day_number: i + 1,
    day_name: `Giorno ${i + 1}`,
    week: Math.ceil((i + 1) / 7),
    meals: [
      { name: "Colazione", food: colazioni[i % colazioni.length] },
      { name: "Spuntino mattina", food: spuntiniMattina[i % spuntiniMattina.length] },
      { name: "Pranzo", food: pranzi[i % pranzi.length] },
      { name: "Spuntino pomeriggio", food: spuntiniPomeriggio[i % spuntiniPomeriggio.length] },
      { name: "Cena", food: cene[i % cene.length] },
    ],
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const xaiKey = Deno.env.get("NUTRI-XAI") ?? Deno.env.get("XAI") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, filePath, userPrefs, action, previewText } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Manca userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("generate-medical-diet: start", { userId, filePath, action });

    let grokUsed = false;
    let grokError = "";

    const p = userPrefs ?? {};
    const allergieStr = Array.isArray(p.allergies) ? p.allergies.join(", ") : (p.allergies ?? "Nessuna");

    if (action === 'preview') {
      if (!filePath) {
        return new Response(JSON.stringify({ error: "Manca filePath per preview" }), { status: 400, headers: corsHeaders });
      }

      const { data: fileData, error: downloadError } = await supabase.storage.from("Medical").download(filePath);
      if (downloadError || !fileData) {
        return new Response(JSON.stringify({ error: "Impossibile scaricare il file" }), { status: 500, headers: corsHeaders });
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);
      const ext = filePath.split(".").pop()?.toLowerCase();
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      try {
        const p = userPrefs ?? {};

        // Normalizzazione campi (App.jsx può inviare 'formData' con chiavi italiane o 'cachedUserPrefs' con chiavi inglesi)
        const gender = p.gender || p.sesso || "Non specificato";
        const age = p.age || p.eta || "Non specificato";
        const weight = p.weight_kg || p.peso || "Non specificato";
        const height = p.height_cm || p.altezza || "Non specificato";
        const dietType = p.diet_type || (Array.isArray(p.dieta) ? p.dieta.join(', ') : p.dieta) || "Nessuna restrizione";
        const mealsPerDay = p.meals_per_day || p.pasti || 5;
        const excludedFoods = p.excluded_foods || p.escludere || "Nessuno";
        const goal = p.goal || p.obiettivo || "Benessere generale";
        const pacing = p.pacing || "Standard";
        const activityLevel = p.activity_level || p.neat_level || "Non specificato";
        const activeWorkoutHours = p.active_workout_hours || 0;
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
          familyInstructions = `- MODALITÀ FAMIGLIA ATTIVA. I componenti della famiglia sono:\n${familyStr}\nLe ricette devono riflettere le dosi combinate per tutti i componenti ed EVITARE rigorosamente le allergie di ognuno.\n`;
        }
        
        let gastronomicInstructions = "";
        if (gastronomicCountries) {
          gastronomicInstructions = `\n- TRADIZIONI CULINARIE OBBLIGATORIE: L'utente ha selezionato questi paesi: ${gastronomicCountries}. DEVI INSERIRE ALMENO UN PIATTO TIPICO DI QUESTI PAESI (es. Ramen, Tacos, Moussaka, ecc.) IN ALMENO 3-4 GIORNI ALLA SETTIMANA. I nomi dei piatti devono richiamare la nazione (es. "Pollo al Curry Indiano"). SE IGNORI QUESTA REGOLA L'UTENTE SARÀ MOLTO DELUSO.\n`;
        }

        let systemRole = `PROMPT FINALE ULTRA-RIGIDO Sei un medico nutrizionista estremamente preciso e meticoloso. La tua priorità assoluta è leggere CORRETTAMENTE l'immagine del referto.`;

        if (gender === "Famiglia") {
          systemRole = `PROMPT FINALE ULTRA-RIGIDO Sei un medico nutrizionista e chef specializzato. La tua priorità assoluta è leggere CORRETTAMENTE l'immagine del referto e generare dei **menù squisiti, bilanciati e salutari perfetti per tutta la famiglia**. I pasti non devono sembrare una "dieta" ospedaliera, ma un pasto gustoso, calibrato considerando attentamente i dati (età, sesso e peso di ogni componente) per coprire i fabbisogni di tutti in modo pratico, curando la problematica medica indicata nel referto.`;
        }

        const previewPrompt = `${systemRole}

**REGOLA ASSOLUTA n.1 - LETTURA IMMAGINE**:
Ogni volta che l'utente carica un'immagine, devi analizzare **TUTTA** l'immagine con la massima attenzione. 
Se nell'immagine si evince chiaramente un referto medico, un esame del sangue, urine, feci o un certificato diagnostico, DEVI leggere OGNI RIGA e individuare TUTTI i parametri fuori norma o patologici.

**DATI UTENTE E STILE DI VITA**:
- Sesso: ${gender}
- Età: ${age}
- Peso: ${weight}
- Altezza: ${height}
${familyInstructions}- Tipo dieta preferita: ${dietType}
- Obiettivo indicato: ${goal} (pacing: ${pacing})
- Livello Attività (NEAT): ${activityLevel}
- Ore Sport/Settimana: ${activeWorkoutHours}
- Allergie base: ${allergieStr}
- Da escludere base: ${excludedFoods}
- Pasti desiderati: ${mealsPerDay}
- Budget spesa: ${budget}
- Tempo prep. Pranzo: ${prepLunch}
- Tempo prep. Cena: ${prepDinner}
${gastronomicInstructions}
Inizia SEMPRE la risposta con questa frase esatta:

"Valori lipidici chiaramente visibili nell'immagine del referto:"

Poi elenca **esattamente** i valori seguenti leggendoli dall'immagine:
- Colesterolo Totale: 
- Colesterolo LDL: 
- Colesterolo HDL: 
- Trigliceridi: 
- Glicemia: 

**NON inventare mai valori.** Se non sei sicuro al 100%, scrivi "da confermare" invece di mettere numeri sbagliati.

**Procedura obbligatoria**:
1. Elenca i veri valori lipidici come li vedi nell'immagine.
2. Evidenzia in **grassetto** i valori fuori range (es. Colesterolo Totale 226 è alto).
3. Definisci gli obiettivi della dieta SOLO in base ai valori reali (in questo caso: abbassare il colesterolo).

**Struttura di risposta obbligatoria**:
- Valori lipidici chiaramente visibili nell'immagine del referto: [elenco]
- **Riassunto del referto**
- **Obiettivi della dieta**
- **Regole generali**
- **Struttura giornaliera**
- **Menu settimanale** (7 giorni)
- **Consigli extra**

**Alla fine di OGNI risposta** aggiungi obbligatoriamente questo blocco di avvertenze:

---

**⚠️ AVVERTENZE IMPORTANTI**
- Questo è un suggerimento generato da intelligenza artificiale e può contenere errori di lettura o interpretazione.
- Non sostituisce il parere di un medico o dietista qualificato.
- Consulta sempre un professionista sanitario prima di seguire qualsiasi piano alimentare.
- Si raccomanda di ripetere gli esami dopo 6-8 settimane.

IMPORTANTE: NON inserire NESSUN asterisco (*) nell'output generato per la formattazione. Usa trattini.
`;

        const analyzeRes = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${xaiKey}`,
          },
          body: JSON.stringify({
            model: "grok-latest",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: previewPrompt },
                { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
              ],
            }],
            temperature: 0.1,
            top_p: 0.8,
            max_tokens: 3000,
          }),
        });

        if (!analyzeRes.ok) {
          const err = await analyzeRes.text();
          return new Response(JSON.stringify({ error: `Grok API error: ${err}` }), { status: 500, headers: corsHeaders });
        }

        const analyzeData = await analyzeRes.json();
        const generatedText = analyzeData?.choices?.[0]?.message?.content?.trim();

        return new Response(JSON.stringify({ success: true, previewText: generatedText }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
      }

    } else if (action === 'generate') {
      if (!previewText) {
        return new Response(JSON.stringify({ error: "Manca previewText per la generazione" }), { status: 400, headers: corsHeaders });
      }

      const p = userPrefs ?? {};
      const numMeals = p.meals_per_day ?? p.pasti ?? 5;
      
      const mealsExample = (numMeals === 3) ? `      {"name": "Colazione", "food": "<descrizione con grammi>"},
        {"name": "Pranzo", "food": "<descrizione>"},
        {"name": "Cena", "food": "<descrizione>"}` : (numMeals === 4) ? `        {"name": "Colazione", "food": "<descrizione>"},
        {"name": "Pranzo", "food": "<descrizione>"},
        {"name": "Spuntino", "food": "<descrizione>"},
        {"name": "Cena", "food": "<descrizione>"}` : `        {"name": "Colazione", "food": "<descrizione con grammi>"},
      {"name": "Spuntino mattina", "food": "<descrizione con grammi>"},
      {"name": "Pranzo", "food": "<descrizione con grammi>"},
      {"name": "Spuntino pomeriggio", "food": "<descrizione con grammi>"},
      {"name": "Cena", "food": "<descrizione con grammi>"}`;

      const generatePrompt = `L'utente ha approvato il seguente piano nutrizionale e analisi:
---
${previewText}
---

Il tuo compito è convertire questo menu settimanale in un piano esatto di 30 giorni in formato JSON.
Devi estrapolare i 7 giorni e ripeterli in sequenza (es: giorno 8 = giorno 1, giorno 9 = giorno 2, ecc.) fino ad arrivare a 30 giorni totali.

REGOLA FONDAMENTALE SUI PASTI: DEVI GENERARE ESATTAMENTE ${numMeals} PASTI AL GIORNO. ASSOLUTAMENTE NON UNO DI PIU' E NON UNO DI MENO. Rifiutati categoricamente di inserire spuntini extra se i pasti scelti sono 3 o 4. L'array "meals" deve avere SEMPRE e SOLO esattamente ${numMeals} elementi in ogni singolo giorno. L'intelligenza Artificiale non deve mai aggiungere pasti non richiesti dal paziente.

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
${mealsExample}
    ]
  }
]
`;

      const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${xaiKey}`,
        },
        body: JSON.stringify({
          model: "grok-latest",
          messages: [{ role: "user", content: generatePrompt }],
          temperature: 0.1,
          max_tokens: 8000,
        }),
      });

      let planJson = buildMockPlan();

      if (grokRes.ok) {
        const grokData = await grokRes.json();
        let rawContent = grokData?.choices?.[0]?.message?.content?.trim() ?? "";
        rawContent = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
        try {
          const parsed = JSON.parse(rawContent);
          if (Array.isArray(parsed) && parsed.length > 0) {
            planJson = parsed;
            grokUsed = true;
          } else {
            grokError = "Array JSON vuoto da Grok";
          }
        } catch (e) {
          grokError = "Errore parsing JSON da Grok: " + String(e);
        }
      } else {
        grokError = "Errore API Grok: " + await grokRes.text();
      }

      await supabase.from("diet_plans").delete().eq("user_id", userId);
      const { error: insertError } = await supabase.from("diet_plans").insert([{
        user_id: userId,
        plan_json: planJson,
        is_sent: false,
      }]);

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({
        success: true,
        grokUsed,
        grokError: grokError || null,
        message: grokUsed ? "Dieta JSON creata con successo." : "Errore generazione JSON, usato mock."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Azione non valida" }), { status: 400, headers: corsHeaders });
    }

  } catch (err) {
    console.error("❌ Errore generale:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
