export default function IntegrationStep({ formData, updateFormData }) {
  const budgets = ['Economico', 'Medio', 'Premium'];
  const prepTimes = ['< 15 min', '30 min', 'Mi piace cucinare'];

  return (
    <div className="step-container">
      <h2 className="step-title">Integrazione Lifestyle</h2>
      
      {/* Budget Spesa */}
      <div className="form-group">
        <label className="input-label">Budget Spesa Alimentare</label>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '-4px', marginBottom: '8px' }}>Influisce sulla scelta delle fonti proteiche (es. uova vs salmone pescato).</p>
        <div className="pills-group">
          {budgets.map((b) => (
            <button
              key={b}
              type="button"
              className={`pill-option ${formData.budget === b ? 'selected' : ''}`}
              onClick={() => updateFormData({ budget: b })}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Tempo di Preparazione (Pranzo) */}
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="input-label">Tempo di Preparazione (Pranzo)</label>
        <div className="pills-group">
          {prepTimes.map((t) => (
            <button
              key={`pranzo_${t}`}
              type="button"
              className={`pill-option ${formData.prep_pranzo === t ? 'selected' : ''}`}
              onClick={() => updateFormData({ prep_pranzo: t })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tempo di Preparazione (Cena) */}
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="input-label">Tempo di Preparazione (Cena)</label>
        <div className="pills-group">
          {prepTimes.map((t) => (
            <button
              key={`cena_${t}`}
              type="button"
              className={`pill-option ${formData.prep_cena === t ? 'selected' : ''}`}
              onClick={() => updateFormData({ prep_cena: t })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Orario di Sveglia */}
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="input-label" htmlFor="sveglia">Orario di Sveglia Tipico</label>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '-4px', marginBottom: '8px' }}>
          Fondamentale per sincronizzare l'invio del tuo piano alimentare mattutino via WhatsApp.
        </p>
        
        <div className="pills-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'].map((timeStr) => (
            <button
              key={timeStr}
              type="button"
              className={`pill-option ${formData.sveglia === timeStr ? 'selected' : ''}`}
              style={{ padding: '10px 4px', fontSize: '13px' }}
              onClick={() => updateFormData({ sveglia: timeStr })}
            >
              {timeStr}
            </button>
          ))}
        </div>
        
        {/* Fallback per orario personalizzato */}
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Altro orario:</span>
          <input 
            type="time" 
            id="sveglia" 
            className="input-field" 
            style={{ width: 'auto', flex: 1, padding: '8px' }}
            value={formData.sveglia} 
            onChange={(e) => updateFormData({ sveglia: e.target.value })} 
          />
        </div>
      </div>

    </div>
  );
}
