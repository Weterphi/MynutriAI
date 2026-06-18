import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib";

/**
 * Crea un PDF a partire dal piano alimentare JSON.
 * @param planJson Array di giorni con pasti
 * @param userId Id dell'utente (usato per il percorso nel bucket)
 * @param supabase Supabase client già configurato
 * @returns URL pubblico del PDF appena caricato
 */
export async function createPdfFromPlan(planJson: any[], userId: string, supabase: any): Promise<string> {
  // Creazione documento PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 (punti)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const lineHeight = 18;
  let y = page.getHeight() - 50;

  // Titolo del PDF
  const title = `Piano Nutrizionale - ${userId}`;
  page.drawText(title, {
    x: 50,
    y,
    size: 18,
    font,
    color: rgb(0, 0, 0.6),
  });
  y -= lineHeight * 2;

  // Iterate over days
  for (const day of planJson) {
    const header = `${day.day_number}. ${day.day_name}`;
    page.drawText(header, { x: 40, y, size: fontSize + 2, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
    for (const meal of day.meals) {
      const line = `- ${meal.name}: ${meal.food}`;
      page.drawText(line, { x: 60, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
      y -= lineHeight;
      if (y < 60) {
        // Aggiungi nuova pagina se finiamo lo spazio
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        y = newPage.getHeight() - 50;
      }
    }
    y -= lineHeight; // spazio dopo ogni giorno
  }

  const pdfBytes = await pdfDoc.save();

  // Carica su Supabase Storage (bucket 'diets')
  const fileName = `diet_${Date.now()}.pdf`;
  const filePath = `${userId}/${fileName}`;
  const { error: uploadError } = await supabase.storage.from('diets').upload(filePath, pdfBytes, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (uploadError) {
    console.error('Errore upload PDF:', uploadError);
    throw uploadError;
  }

  // Ottieni URL pubblico
  const { data: publicData } = supabase.storage.from('diets').getPublicUrl(filePath);
  return publicData?.publicUrl ?? '';
}
