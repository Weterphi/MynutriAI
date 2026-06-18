

export default function LifestyleStep({ formData, updateFormData }) {
  const goals = ['Dimagrimento', 'Ricomposizione Corporea', 'Aumento Massa', 'Mantenimento'];
  const pacings = ['Conservativo', 'Moderato', 'Sprint'];
  const neatLevels = ['< 5.000', '5.000 - 10.000', '> 10.000'];

  return (
    <div className="step-container">
      <h2 className="step-title">Metriche di Successo e Pacing</h2>

      {/* Obiettivo Principale (Cards) */}
      <div className="form-group">
        <label className="input-label">Macro-Obiettivo</label>
        <div className="cards-grid two-cols">
          {goals.map((goal) => (
            <div 
              key={goal}
              className={`card-option ${formData.obiettivo === goal ? 'selected' : ''}`}
              onClick={() => updateFormData({ obiettivo: goal })}
            >
              <span className="card-label" style={{ fontSize: '13px', textAlign: 'center' }}>{goal}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="input-label" htmlFor="peso_target">Peso Target (kg)</label>
        <input 
          type="number" 
          id="peso_target" 
          className="input-field" 
          placeholder="Es: 65" 
          value={formData.peso_target} 
          onChange={(e) => updateFormData({ peso_target: e.target.value })} 
        />
      </div>

      {/* Pacing */}
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="input-label">Velocità (Pacing)</label>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '-4px', marginBottom: '8px' }}>Quanto vuoi essere aggressivo nel raggiungere il target?</p>
        <div className="pills-group">
          {pacings.map((p) => (
            <button
              key={p}
              type="button"
              className={`pill-option ${formData.pacing === p ? 'selected' : ''}`}
              onClick={() => updateFormData({ pacing: p })}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* NEAT */}
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="input-label">Media passi giornalieri (NEAT)</label>
        <div className="pills-group">
          {neatLevels.map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`pill-option ${formData.neat_level === lvl ? 'selected' : ''}`}
              onClick={() => updateFormData({ neat_level: lvl })}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Allenamento Attivo */}
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="input-label" htmlFor="active_workout_hours">Ore di sport strutturato a settimana</label>
        <input 
          type="number" 
          id="active_workout_hours" 
          className="input-field" 
          placeholder="Es: 3" 
          value={formData.active_workout_hours} 
          onChange={(e) => updateFormData({ active_workout_hours: e.target.value })} 
        />
      </div>

    </div>
  );
}
