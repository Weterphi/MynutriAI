

export default function SummaryStep({ formData, session, onComplete, isSubmitting, onBack }) {
  return (
    <div className="step-container">
      <h2 className="step-title" style={{ marginBottom: '16px' }}>Riepilogo dei Dati</h2>
      
      {formData.sesso === 'Famiglia' ? (
        <div className="summary-section">
          <h3 className="summary-section-title">Composizione Famiglia ({formData.family_members?.length || 0} componenti)</h3>
          {formData.family_members?.map((member) => (
            <div key={member.id} style={{ marginBottom: '16px', padding: '12px', background: 'var(--color-surface-soft)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-primary)' }}>{member.role || 'Familiare'} - {member.name || 'Senza nome'}</div>
              <div className="summary-grid" style={{ marginBottom: '12px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="summary-item"><span className="summary-item-label">Sesso</span><span className="summary-item-value">{member.gender}</span></div>
                <div className="summary-item"><span className="summary-item-label">Età</span><span className="summary-item-value">{member.age} anni</span></div>
                <div className="summary-item"><span className="summary-item-label">Peso</span><span className="summary-item-value">{member.weight} kg</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="summary-item" style={{ marginBottom: 0 }}>
                  <span className="summary-item-label">Allergie o intolleranze</span>
                  <span className="summary-item-value">{(member.allergies && member.allergies.length > 0) ? member.allergies.join(', ') : 'Nessuna'}</span>
                </div>
                <div className="summary-item" style={{ marginBottom: 0 }}>
                  <span className="summary-item-label">Alimenti da escludere</span>
                  <span className="summary-item-value">{member.excluded_foods || 'Nessuno'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Step 1 Summary */}
          <div className="summary-section">
            <h3 className="summary-section-title">Dati Biometrici</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-item-label">Sesso</span>
                <span className="summary-item-value">{formData.sesso}</span>
              </div>
              <div className="summary-item">
                <span className="summary-item-label">Età</span>
                <span className="summary-item-value">{formData.eta} anni</span>
              </div>
              <div className="summary-item">
                <span className="summary-item-label">Altezza</span>
                <span className="summary-item-value">{formData.altezza} cm</span>
              </div>
              <div className="summary-item">
                <span className="summary-item-label">Peso attuale</span>
                <span className="summary-item-value">{formData.peso} kg</span>
              </div>
            </div>
          </div>

          {/* Step 2 Summary */}
          <div className="summary-section">
            <h3 className="summary-section-title">Metriche di Successo</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-item-label">Macro-Obiettivo</span>
                <span className="summary-item-value">{formData.obiettivo}</span>
              </div>
              <div className="summary-item">
                <span className="summary-item-label">Peso Target</span>
                <span className="summary-item-value">{formData.peso_target} kg</span>
              </div>
              <div className="summary-item">
                <span className="summary-item-label">Pacing</span>
                <span className="summary-item-value">{formData.pacing}</span>
              </div>
              <div className="summary-item">
                <span className="summary-item-label">Passi giornalieri</span>
                <span className="summary-item-value">{formData.neat_level}</span>
              </div>
              <div className="summary-item">
                <span className="summary-item-label">Ore di Sport</span>
                <span className="summary-item-value">{formData.active_workout_hours} h/settimana</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Step 3 Summary */}
      <div className="summary-section">
        <h3 className="summary-section-title">Parametri Nutrizionali</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-item-label">Tipologia di dieta</span>
            <span className="summary-item-value">
              {Array.isArray(formData.dieta) ? formData.dieta.join(', ') : formData.dieta}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-item-label">Frequenza pasti</span>
            <span className="summary-item-value">{formData.pasti} al giorno</span>
          </div>
        </div>
        
        {formData.sesso !== 'Famiglia' && (
          <>
            {/* Allergies Summary */}
            <div className="summary-item" style={{ marginTop: '12px' }}>
              <span className="summary-item-label">Allergie o intolleranze</span>
              {formData.allergie.length > 0 ? (
                <div className="summary-tags">
                  {formData.allergie.map((tag, i) => (
                    <span key={i} className="summary-tag">{tag}</span>
                  ))}
                </div>
              ) : (
                <span className="summary-item-value" style={{ color: 'var(--color-muted)', fontWeight: 'normal', fontSize: '13.5px' }}>
                  Nessuna allergia specificata
                </span>
              )}
            </div>

            {/* Exclusions Summary */}
            <div className="summary-item" style={{ marginTop: '12px' }}>
              <span className="summary-item-label">Alimenti da escludere</span>
              <span className="summary-item-value" style={{ 
                fontWeight: 'normal', 
                fontSize: '13.5px',
                color: formData.escludere ? 'var(--color-title)' : 'var(--color-muted)',
                fontStyle: formData.escludere ? 'normal' : 'italic',
                whiteSpace: 'pre-wrap'
              }}>
                {formData.escludere ? formData.escludere : 'Nessuno specificato'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Step 4 Summary (Integration) */}
      <div className="summary-section">
        <h3 className="summary-section-title">Integrazione Lifestyle</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-item-label">Budget Spesa</span>
            <span className="summary-item-value">{formData.budget}</span>
          </div>
          <div className="summary-item">
            <span className="summary-item-label">Orario Sveglia</span>
            <span className="summary-item-value">{formData.sveglia}</span>
          </div>
          <div className="summary-item">
            <span className="summary-item-label">Prep. Pranzo</span>
            <span className="summary-item-value">{formData.prep_pranzo}</span>
          </div>
          <div className="summary-item">
            <span className="summary-item-label">Prep. Cena</span>
            <span className="summary-item-value">{formData.prep_cena}</span>
          </div>
        </div>
      </div>

      {!session && (
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--celeste-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--celeste-border)' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--celeste-hover)', marginBottom: '8px' }}>
            Pronto per la tua Dieta?
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--color-title)', lineHeight: '1.4' }}>
            I tuoi dati sono pronti! Clicca su "Completa Dieta" qui sotto per creare il tuo account. 
            <br/><br/>
            <strong>Notifica giornaliera:</strong> Riceverai automaticamente il tuo piano alimentare giorno per giorno direttamente su WhatsApp, perfettamente in orario con la tua sveglia ({formData.sveglia}).
          </p>
        </div>
      )}

      {/* Pulsanti Integrati nel Riepilogo */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
          disabled={isSubmitting}
          style={{ flex: 1 }}
        >
          Indietro
        </button>
        
        <button
          type="button"
          className="btn btn-primary"
          onClick={onComplete}
          disabled={isSubmitting}
          style={{ flex: 2 }}
        >
          {isSubmitting ? (
            <>
              <div className="spinner"></div>
              Elaborazione...
            </>
          ) : session ? (
            'Salva e Aggiorna Piano'
          ) : (
            'Completa Dieta'
          )}
        </button>
      </div>
    </div>
  );
}
