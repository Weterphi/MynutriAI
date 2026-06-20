import html2pdf from 'html2pdf.js';
import { supabase } from './supabaseClient';

export async function generateAndUploadPdf(userId, userName, userPrefs, dietPlans) {
  if (!userId || !dietPlans || dietPlans.length === 0) {
    console.warn("Parametri non validi per la generazione PDF.");
    return null;
  }

  console.log("Avvio generazione PDF silente per l'upload...");

  const tempDiv = document.createElement('div');
  tempDiv.className = 'pdf-document is-printing';
  // Posizionalo fuori dallo schermo in modo sicuro per html2canvas
  tempDiv.style.position = 'absolute';
  tempDiv.style.top = '0';
  tempDiv.style.left = '0';
  tempDiv.style.width = '800px';
  tempDiv.style.zIndex = '-9999';
  tempDiv.style.backgroundColor = '#ffffff';
  tempDiv.style.fontFamily = "'Inter', system-ui, sans-serif";
  tempDiv.style.color = '#000000';
  
  // Calcola gli orari dei pasti come nel componente visualizzatore
  const getMealTime = (mealName) => {
    const baseTime = userPrefs?.wakeup_time || '07:00:00';
    let [hours, minutes] = baseTime.split(':').map(Number);
    let addedHours = 1;
    const nameLower = mealName.toLowerCase();
    
    if (nameLower.includes('colazione')) addedHours = 1;
    else if (nameLower.includes('spuntino')) addedHours = 4;
    else if (nameLower.includes('pranzo')) addedHours = 6;
    else if (nameLower.includes('merenda')) addedHours = 10;
    else if (nameLower.includes('cena')) addedHours = 13;
    else addedHours = 8;

    const mealDate = new Date();
    mealDate.setHours(hours + addedHours, minutes, 0);
    return mealDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Costruisce la griglia dei giorni
  const daysHtml = dietPlans.map((dayPlan) => {
    const mealsHtml = (dayPlan.meals || []).map((meal) => `
      <div class="pdf-meal-row" style="display: flex; border-bottom: 1px solid #e4e4e7; padding: 10px 0;">
        <div class="pdf-meal-time-col" style="width: 150px; font-weight: 600; color: #1f2937;">
          <span class="pdf-time-badge" style="background-color: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 8px;">${getMealTime(meal.name)}</span>
          <span class="pdf-meal-name">${meal.name}</span>
        </div>
        <div class="pdf-meal-food-col" style="flex: 1; color: #4b5563; font-size: 13.5px;">
          ${meal.food}
        </div>
      </div>
    `).join('');

    return `
      <div class="pdf-day-card html2pdf__page-break-avoid" style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div class="pdf-day-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #047857; padding-bottom: 8px; margin-bottom: 12px;">
          <h3 style="margin: 0; color: #000000; font-size: 16px;">Giorno ${dayPlan.day_number}</h3>
          <span class="pdf-day-name" style="font-weight: 500; color: #71717a; font-size: 13px;">${dayPlan.day_name}</span>
        </div>
        <div class="pdf-meals-list">
          ${mealsHtml}
        </div>
      </div>
    `;
  }).join('');

  tempDiv.innerHTML = `
    <div class="pdf-cover" style="text-align: center; padding: 40px 20px; border-bottom: 2px solid #e4e4e7; margin-bottom: 30px;">
      <h1 style="font-size: 28px; margin-bottom: 8px; color: #000000;">Piano Nutrizionale ${userName || ''}</h1>
      <p class="pdf-subtitle" style="font-size: 14px; color: #71717a; margin-bottom: 24px;">Generato dall'Agente NutriAI in base al tuo Metabolismo (o referto)</p>
      
      <div class="pdf-user-info" style="display: flex; justify-content: center; gap: 20px; margin-top: 20px;">
        <div class="info-box" style="border: 1px solid #e4e4e7; padding: 12px 20px; border-radius: 6px; background-color: #fafafa;">
          <strong style="display: block; font-size: 11px; text-transform: uppercase; color: #71717a;">Obiettivo</strong>
          <span style="font-size: 14px; font-weight: 600; color: #000000;">${userPrefs?.goal || 'Mantenimento'}</span>
        </div>
        <div class="info-box" style="border: 1px solid #e4e4e7; padding: 12px 20px; border-radius: 6px; background-color: #fafafa;">
          <strong style="display: block; font-size: 11px; text-transform: uppercase; color: #71717a;">Pacing</strong>
          <span style="font-size: 14px; font-weight: 600; color: #000000;">${userPrefs?.pacing || 'Moderato'}</span>
        </div>
        <div class="info-box" style="border: 1px solid #e4e4e7; padding: 12px 20px; border-radius: 6px; background-color: #fafafa;">
          <strong style="display: block; font-size: 11px; text-transform: uppercase; color: #71717a;">Tipologia Dieta</strong>
          <span style="font-size: 14px; font-weight: 600; color: #000000;">${userPrefs?.diet_type || 'Onnivora'}</span>
        </div>
      </div>
    </div>

    <div class="pdf-days-grid">
      ${daysHtml}
    </div>
    
    <div class="pdf-footer" style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa;">
      <p>Questo documento è generato automaticamente. Segui le porzioni indicate per raggiungere il tuo obiettivo.</p>
    </div>
  `;

  document.body.appendChild(tempDiv);

  const opt = {
    margin:       [10, 10, 10, 10],
    filename:     `dieta_${userId}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true,
      windowWidth: 800,
      scrollY: 0,
      scrollX: 0
    },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    const pdf = await html2pdf().set(opt).from(tempDiv).toPdf().get('pdf');
    const pdfBlob = pdf.output('blob');
    
    // Rimuove l'elemento temporaneo dal DOM
    document.body.removeChild(tempDiv);

    const fileName = `pdfs/${userId}_dieta_${Date.now()}.pdf`;
    console.log("Caricamento PDF su Supabase Storage...", fileName);

    const { data, error } = await supabase.storage.from('Medical').upload(fileName, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true
    });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('Medical').getPublicUrl(fileName);
    const publicUrl = publicUrlData?.publicUrl;

    if (publicUrl) {
      await supabase.from('diet_plans').update({ pdf_url: publicUrl }).eq('user_id', userId);
      console.log("✅ PDF integrato correttamente su Supabase:", publicUrl);
      return publicUrl;
    }
  } catch (err) {
    console.error("❌ Errore durante la generazione o caricamento del PDF:", err);
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
  }
  return null;
}
