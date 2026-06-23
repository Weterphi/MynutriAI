import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, phone, name, pdfUrl, test_day } = await req.json()
    
    const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN')
    const META_PHONE_NUMBER_ID = Deno.env.get('META_PHONE_NUMBER_ID')

    if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
      throw new Error("Missing Meta API credentials in edge function secrets.")
    }

    const apiUrl = `https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`

    // Helper generico per inviare payload a Meta API
    const sendWhatsAppPayload = async (payload: any) => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      return { success: response.ok, data };
    }

    // Helper per inviare un messaggio WhatsApp singolo testuale (usato dal Cron)
    const sendWhatsApp = async (toPhone: string, textBody: string) => {
      const cleanPhone = toPhone?.replace(/[\+\s]/g, '')
      if (!cleanPhone) return { success: false, error: 'No phone' }
      return await sendWhatsAppPayload({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: textBody }
      });
    }

    // 1. Invio messaggio di Benvenuto tramite TEMPLATE
    if (action === 'send_welcome') {
      const cleanPhone = phone?.replace(/[\+\s]/g, '')
      if (!cleanPhone) throw new Error("Phone number is required.")

      // Costruiamo il payload per il Template WhatsApp con PDF allegato
      const templatePayload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: "dieta_pronta_pdf",
          language: { code: "it" },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "document",
                  document: {
                    link: pdfUrl,
                    filename: "Piano_Alimentare_MynutriAI.pdf"
                  }
                }
              ]
            },
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  parameter_name: "nome_cliente",
                  text: name || "Amico"
                }
              ]
            }
          ]
        }
      };
      
      const result = await sendWhatsAppPayload(templatePayload);
      if (!result.success) throw new Error(`Meta API error: ${JSON.stringify(result.data)}`);
      
      return new Response(JSON.stringify({ success: true, meta_response: result.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 2. CRON JOB: Processa tutti gli utenti per le diete quotidiane
    if (action === 'daily_diet') {
      console.log("Avvio procedura cron oraria per l'invio WhatsApp delle diete...")
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Recuperiamo tutti i piani e facciamo un JOIN con la tabella users per avere numero di telefono e nome
      const { data: plans, error: plansError } = await supabase
        .from('diet_plans')
        .select(`
          user_id,
          plan_json,
          created_at,
          users!inner ( first_name, phone_number )
        `)
      
      if (plansError) throw plansError

      // Recuperiamo le preferenze (sveglia)
      const { data: prefs } = await supabase.from('user_preferences').select('user_id, wakeup_time');
      const prefMap: Record<string, string> = {};
      if (prefs) {
        prefs.forEach(p => prefMap[p.user_id] = p.wakeup_time);
      }

      const results = []
      const now = new Date();
      // Usiamo l'orario in Italia (Roma) per capire a chi mandare il messaggio ora
      const romeHour = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false }).format(now);

      for (const plan of plans) {
        const wakeupTime = prefMap[plan.user_id] || "07:00:00";
        const wakeupHour = parseInt(wakeupTime.split(':')[0], 10);

        // Se non è l'ora di sveglia, salta questo utente (a meno che non forziamo con test_day)
        if (wakeupHour !== parseInt(romeHour, 10) && !test_day) {
          continue;
        }

        // Estrazione dati dell'utente (la query !inner restituisce un singolo oggetto e non un array)
        // @ts-ignore (evitiamo errori Deno sul parsing di relationship object/array)
        const userData = Array.isArray(plan.users) ? plan.users[0] : plan.users;
        const phoneNumber = userData?.phone_number;
        
        if (!phoneNumber) {
          console.log(`Nessun numero di telefono per l'utente ${plan.user_id}`);
          continue;
        }

        // Standardizziamo le date sul fuso orario di Roma a mezzanotte
        const getRomeDateString = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);
        const createdRomeStr = getRomeDateString(new Date(plan.created_at));
        const todayRomeStr = getRomeDateString(new Date());

        const createdDate = new Date(`${createdRomeStr}T00:00:00Z`);
        const today = new Date(`${todayRomeStr}T00:00:00Z`);
        
        const diffTime = today.getTime() - createdDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // Giorno 0 è il giorno di creazione (non mandiamo nulla). Da domani sarà Giorno 1.
        let currentDayNumber = diffDays;
        if (test_day) {
          currentDayNumber = test_day; // Override per i test
        }

        // Se abbiamo finito i 30 giorni o siamo ancora nel giorno 0, non mandiamo nulla.
        if (currentDayNumber > 30 || currentDayNumber <= 0) continue;

        // Recuperiamo il menu esatto per oggi dal JSON
        const todayMenu = plan.plan_json.find((d: any) => d.day_number === currentDayNumber)
        
        if (todayMenu) {
          const userName = userData?.first_name || 'Amico'
          
          // I parametri dei template Meta NON accettano ritorni a capo (\n) o tab.
          // Formattiamo in linea usando un separatore visibile.
          const mealsSummaryText = todayMenu.meals
            .map((m: any) => `🍴 *${m.name}*: ${m.food.replace(/\n/g, ' ')}`)
            .join('  •  ');

          const motivationalPhrases = [
            "Inizia un nuovo viaggio! Ogni grande traguardo inizia con un piccolo passo. 🚀",
            "La costanza è la tua arma segreta. Sei sulla strada giusta! 🌟",
            "Senti l'energia che aumenta? Continua così, non fermarti! ⚡",
            "Piccoli progressi ogni giorno portano a risultati incredibili. 📈",
            "Il corpo ascolta tutto ciò che la mente dice. Pensa positivo e nutri la tua forza! 🧠",
            "Non si tratta di essere perfetti, ma di essere migliori di ieri. ✨",
            "Una settimana è quasi passata. Sii fiero/a di te per l'impegno! 👏",
            "Inizia la seconda settimana con ancora più grinta e determinazione! 🔥",
            "Ogni pasto sano è un piccolo grande atto di amore verso te stesso/a. ❤️",
            "Stai costruendo nuove abitudini. Non mollare ora che sei già a un terzo! 🌱",
            "La vera forza viene dal superare ciò che pensavi di non poter fare. 💪",
            "Nutri il tuo corpo con cura, e la tua mente ti ringrazierà sempre. 🥗",
            "Sei quasi a metà del percorso. Guarda quanta strada fantastica hai già fatto! 🎯",
            "La disciplina è il ponte magico tra i tuoi obiettivi e i tuoi risultati. 🌉",
            "Metà del percorso completato! Festeggia i tuoi successi, anche i più piccoli. 🎉",
            "Ora è tutta una questione di mantenimento e pura determinazione. 🏔️",
            "Non fermarti quando sei stanco/a, fermati solo quando hai finito. 🏁",
            "Il benessere non è una destinazione, è uno stile di vita meraviglioso. 🌅",
            "Continua a fare scelte per le quali il tuo 'io' futuro ti ringrazierà. 🤝",
            "Due terzi del percorso andati! Sei diventato/a una vera forza della natura. 🌪️",
            "Inizia l'ultimo sprint. Dai il massimo adesso, stai facendo un lavoro fantastico! 💎",
            "Creare la versione migliore di te richiede tempo e pazienza. Ne vale la pena! ⏳",
            "Ascolta il tuo corpo, rispettalo e nutrilo sempre con amore. 🌻",
            "Sei molto più forte e resiliente di quanto pensi. Avanti tutta! 🚤",
            "Mancano pochissimi giorni. Dimostra a te stesso/a quanto vali davvero! 🏆",
            "Ogni giorno è una nuova meravigliosa opportunità per eccellere. Sfruttala! 🌈",
            "Il traguardo finale è vicinissimo. Tieni duro e mantieni il focus sulle tue vittorie. 🔭",
            "Hai costruito una routine invidiabile e sana. Sii profondamente orgoglioso/a! ⭐",
            "Penultimo giorno! Assapora ogni momento di questa grandissima conquista. 🥇",
            "Ce l'hai fatta! Un mese intero di successi, costanza e amor proprio. Sei un'ispirazione! 🥳"
          ];

          const phraseIndex = Math.min(Math.max(currentDayNumber - 1, 0), 29);
          const dailyPhrase = motivationalPhrases[phraseIndex];

          // Template per i messaggi giornalieri (sostituisce il testo libero)
          const dailyTemplatePayload = {
            messaging_product: "whatsapp",
            to: phoneNumber.replace(/[\+\s]/g, ''),
            type: "template",
            template: {
              name: "menu_del_giorno_utility",
              language: { code: "it" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", parameter_name: "nome_cliente", text: userName },
                    { type: "text", parameter_name: "frase_motivazionale", text: dailyPhrase },
                    { type: "text", parameter_name: "numero_giorno", text: currentDayNumber.toString() },
                    { type: "text", parameter_name: "menu_completo", text: `(${todayMenu.day_name}) - ${mealsSummaryText}` }
                  ]
                }
              ]
            }
          };

          console.log(`Inviando WhatsApp a ${userName} (Giorno ${currentDayNumber}) al numero ${phoneNumber} tramite Template`);

          const result = await sendWhatsAppPayload(dailyTemplatePayload);

          results.push({ 
            userId: plan.user_id, 
            phone: phoneNumber,
            day: currentDayNumber, 
            status: result.success ? 'sent' : 'failed',
            meta_data: result.data
          })
        }
      }

      return new Response(JSON.stringify({ success: true, executedHour: romeHour, processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === 'debug') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      const supabase = createClient(supabaseUrl, supabaseKey)

      const { data: plans } = await supabase.from('diet_plans').select('user_id, created_at, users!inner(first_name, last_name, phone_number)');
      const { data: prefs } = await supabase.from('user_preferences').select('user_id, wakeup_time');

      return new Response(JSON.stringify({ plans, prefs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    throw new Error("Invalid action")
    
  } catch (error: any) {
    console.error("❌ Errore nell'Edge Function meta-whatsapp:", error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
