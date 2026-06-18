import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';

export default function DietViewerModal({ isOpen, onClose, dietPlans, userPrefs, userName, userId, userPhone }) {
  const contentRef = useRef(null);

  if (!isOpen || !dietPlans) return null;

  function handleDownload() {
    const element = contentRef.current;
    
    // Aggiungiamo temporaneamente una classe per lo styling di stampa
    element.classList.add('is-printing');

    const opt = {
      margin:       10,
      filename:     'La_Mia_Dieta_IA.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        pdf.save('La_Mia_Dieta_IA.pdf');
        element.classList.remove('is-printing');
      });
  };

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
    else addedHours = 8; // fallback

    const mealDate = new Date();
    mealDate.setHours(hours + addedHours, minutes, 0);
    
    return mealDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="pdf-modal-overlay">
      <div className="pdf-modal-container">
        <div className="pdf-modal-header">
          <h2>La Tua Dieta Personalizzata</h2>
          <div className="pdf-modal-actions">
            <button className="btn-primary" onClick={handleDownload} style={{ background: '#10b981', color: 'white' }}>
              <i className="fas fa-file-pdf" style={{ marginRight: '8px' }}></i> Scarica in PDF
            </button>
            <button className="btn-secondary" onClick={onClose}>Chiudi</button>
          </div>
        </div>

        <div className="pdf-modal-scroll-area">
          <div ref={contentRef} className="pdf-document">
            <div className="pdf-cover">
              <h1>Piano Nutrizionale {userName || ''}</h1>
              <p className="pdf-subtitle">Generato dall'Agente NutrIAI in base al tuo Metabolismo (o referto)</p>
              
              <div className="pdf-user-info">
                <div className="info-box">
                  <strong>Obiettivo</strong>
                  <span>{userPrefs?.goal || 'Mantenimento'}</span>
                </div>
                <div className="info-box">
                  <strong>Pacing</strong>
                  <span>{userPrefs?.pacing || 'Moderato'}</span>
                </div>
                <div className="info-box">
                  <strong>Tipologia Dieta</strong>
                  <span>{userPrefs?.diet_type || 'Onnivora'}</span>
                </div>
              </div>
            </div>

            <div className="pdf-days-grid">
              {dietPlans.map((dayPlan, i) => (
                <div key={i} className="pdf-day-card html2pdf__page-break-avoid">
                  <div className="pdf-day-header">
                    <h3>Giorno {dayPlan.day_number}</h3>
                    <span className="pdf-day-name">{dayPlan.day_name}</span>
                  </div>
                  
                  <div className="pdf-meals-list">
                    {(dayPlan.meals || []).map((meal, idx) => (
                      <div key={idx} className="pdf-meal-row">
                        <div className="pdf-meal-time-col">
                          <span className="pdf-time-badge">{getMealTime(meal.name)}</span>
                          <span className="pdf-meal-name">{meal.name}</span>
                        </div>
                        <div className="pdf-meal-food-col">
                          {meal.food}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pdf-footer">
              <p>Questo documento è generato automaticamente. Segui le porzioni indicate per raggiungere il tuo obiettivo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
