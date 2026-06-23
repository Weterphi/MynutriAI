import html2pdf from 'html2pdf.js';

export async function generateAndShareShoppingListPdf(userName, activeWeek, shoppingList) {
  if (!shoppingList) {
    console.warn("Nessuna lista della spesa da condividere.");
    return false;
  }

  console.log("Avvio generazione PDF Lista Spesa per condivisione...");

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.width = '100vw';
  wrapper.style.height = '0';
  wrapper.style.overflow = 'hidden';
  wrapper.style.zIndex = '-1';

  const tempDiv = document.createElement('div');
  tempDiv.className = 'pdf-document is-printing';
  tempDiv.style.width = '600px';
  tempDiv.style.backgroundColor = '#ffffff';
  tempDiv.style.fontFamily = "'Inter', system-ui, sans-serif";
  tempDiv.style.color = '#000000';
  tempDiv.style.padding = '30px';
  
  wrapper.appendChild(tempDiv);
  
  // Costruisci le categorie della spesa
  const categoriesHtml = Object.entries(shoppingList).map(([category, items]) => {
    if (!items || items.length === 0) return '';
    const itemsHtml = items.map(item => `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e4e4e7; padding: 6px 0;">
        <span style="color: #3f3f46; font-size: 14px;">${item.item}</span>
        <span style="font-weight: 600; color: #18181b; font-size: 14px;">${item.quantity}</span>
      </div>
    `).join('');

    return `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #047857; font-size: 16px; text-transform: uppercase;">${category}</h3>
        <div>${itemsHtml}</div>
      </div>
    `;
  }).join('');

  const weekNumber = activeWeek.replace('week', '');

  tempDiv.innerHTML = `
    <div style="text-align: center; border-bottom: 2px solid #047857; margin-bottom: 24px; padding-bottom: 16px;">
      <h1 style="font-size: 24px; margin: 0 0 8px 0; color: #000000;">Lista della Spesa</h1>
      <h2 style="font-size: 16px; margin: 0; color: #71717a; font-weight: normal;">${userName || 'Utente NutriAI'} - Settimana ${weekNumber}</h2>
    </div>
    <div style="margin-bottom: 30px;">
      ${categoriesHtml}
    </div>
    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa;">
      <p>Generato da NutriAI. Ricordati le borse riutilizzabili!</p>
    </div>
  `;

  document.body.appendChild(wrapper);

  const opt = {
    margin:       [10, 10, 10, 10],
    filename:     `lista_spesa_settimana_${weekNumber}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 1, 
      useCORS: true,
      windowWidth: 600,
      scrollY: 0,
      scrollX: 0
    },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    const pdf = await html2pdf().set(opt).from(tempDiv).toPdf().get('pdf');
    const pdfBlob = pdf.output('blob');
    
    document.body.removeChild(wrapper);

    const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Lista della Spesa NutriAI',
        text: `Ecco la lista della spesa per la Settimana ${weekNumber}!`,
        files: [file]
      });
      return true;
    } else {
      // Fallback a semplice download se Web Share API non è supportata per i file
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = opt.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  } catch (err) {
    console.error("❌ Errore durante la condivisione della Lista Spesa:", err);
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
    return false;
  }
}
