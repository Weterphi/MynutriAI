import { useState, useRef, useEffect } from 'react';

function FamilyMemberNutrition({ member, familyMembers, updateFormData }) {
  const [tagInput, setTagInput] = useState('');
  const inputRef = useRef(null);

  const addTag = (tagText) => {
    const trimmed = tagText.trim();
    if (!trimmed) return;
    const currentAllergies = member.allergies || [];
    if (!currentAllergies.includes(trimmed)) {
      const updatedMembers = familyMembers.map(m => m.id === member.id ? { ...m, allergies: [...currentAllergies, trimmed] } : m);
      updateFormData({ family_members: updatedMembers });
    }
    setTagInput('');
  };

  const removeTag = (indexToRemove) => {
    const currentAllergies = member.allergies || [];
    const newTags = currentAllergies.filter((_, idx) => idx !== indexToRemove);
    const updatedMembers = familyMembers.map(m => m.id === member.id ? { ...m, allergies: newTags } : m);
    updateFormData({ family_members: updatedMembers });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && (member.allergies || []).length > 0) {
      const currentAllergies = member.allergies || [];
      const newTags = [...currentAllergies];
      newTags.pop();
      const updatedMembers = familyMembers.map(m => m.id === member.id ? { ...m, allergies: newTags } : m);
      updateFormData({ family_members: updatedMembers });
    }
  };

  return (
    <div style={{ background: 'var(--color-surface-soft)', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid var(--color-border)' }}>
      <div style={{ marginBottom: '10px' }}>
        <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary)' }}>{member.role || 'Familiare'} - {member.name || 'Senza nome'}</strong>
      </div>
      
      <div className="form-group" style={{ marginBottom: '10px' }}>
        <label className="input-label" style={{ fontSize: '0.85rem' }}>Allergie o intolleranze</label>
        <div className="tags-wrapper" onClick={() => inputRef.current && inputRef.current.focus()} style={{ minHeight: '38px', padding: '4px 8px' }}>
          {(member.allergies || []).map((tag, index) => (
            <span key={index} className="tag" style={{ fontSize: '0.8rem', padding: '2px 8px' }}>
              {tag}
              <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(index); }}>&times;</button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            className="tag-input-field"
            placeholder={(member.allergies || []).length === 0 ? "es. Lattosio (premi Invio)" : ""}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag(tagInput)}
            style={{ fontSize: '0.85rem' }}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '0' }}>
        <label className="input-label" style={{ fontSize: '0.85rem' }}>Alimenti da escludere</label>
        <textarea
          value={member.excluded_foods || ''}
          onChange={(e) => {
            const updatedMembers = familyMembers.map(m => m.id === member.id ? { ...m, excluded_foods: e.target.value } : m);
            updateFormData({ family_members: updatedMembers });
          }}
          placeholder="Cosa non piace a questa persona?"
          style={{ padding: '8px', fontSize: '0.85rem', minHeight: '60px' }}
        />
      </div>
    </div>
  );
}

export default function NutritionStep({ formData, updateFormData }) {
  const [tagInput, setTagInput] = useState('');
  const inputRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDietSelect = (diet) => {
    const currentDiets = formData.dieta || [];
    const isAlreadySelected = currentDiets.includes(diet);
    let newDiets;
    if (isAlreadySelected) {
      newDiets = currentDiets.filter(d => d !== diet);
    } else {
      newDiets = [...currentDiets, diet];
    }
    updateFormData({ dieta: newDiets });
  };

  const handleMealsSelect = (mealsCount) => {
    updateFormData({ pasti: mealsCount });
  };

  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const addTag = (tagText) => {
    const trimmed = tagText.trim();
    if (!trimmed) return;
    
    // Avoid duplicates
    if (!formData.allergie.includes(trimmed)) {
      updateFormData({
        allergie: [...formData.allergie, trimmed]
      });
    }
    setTagInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && formData.allergie.length > 0) {
      // Remove last tag if backspace pressed on empty input
      const newTags = [...formData.allergie];
      newTags.pop();
      updateFormData({ allergie: newTags });
    }
  };

  const handleBlur = () => {
    addTag(tagInput);
  };

  const removeTag = (indexToRemove) => {
    const newTags = formData.allergie.filter((_, idx) => idx !== indexToRemove);
    updateFormData({ allergie: newTags });
  };

  const handleTextareaChange = (e) => {
    updateFormData({ escludere: e.target.value });
  };

  const diets = ['Onnivora', 'Vegetariana', 'Vegana', 'Pescatariana'];
  const mealsOptions = [1, 2, 3, 4, 5, 6];

  return (
    <div className="step-container">
      <h2 className="step-title">
        {formData.sesso === 'Famiglia' ? 'Preferenze Menu Famigliare' : 'Parametri Nutrizionali'}
      </h2>

      {/* Tipologia di Dieta (Pills) */}
      <div className="form-group">
        <label className="input-label">
          {formData.sesso === 'Famiglia' ? 'Tipo di alimentazione per la famiglia' : 'Tipologia di dieta'}
        </label>
        <div className="pills-group">
          {diets.map((diet) => (
            <button
              key={diet}
              type="button"
              className={`pill-option ${formData.dieta?.includes(diet) ? 'selected' : ''}`}
              onClick={() => handleDietSelect(diet)}
            >
              {diet}
            </button>
          ))}
        </div>
      </div>

      {/* Numero Pasti (Pills) */}
      <div className="form-group" style={{ marginTop: '12px' }}>
        <label className="input-label">Pasti desiderati al giorno</label>
        <div className="pills-group">
          {mealsOptions.map((count) => (
            <button
              key={count}
              type="button"
              className={`pill-option ${Number(formData.pasti) === count ? 'selected' : ''}`}
              onClick={() => handleMealsSelect(count)}
            >
              {count} pasti
            </button>
          ))}
        </div>
      </div>

      {formData.sesso === 'Famiglia' ? (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Restrizioni Individuali</h3>
          {(formData.family_members || []).map((member) => (
            <FamilyMemberNutrition 
              key={member.id} 
              member={member} 
              familyMembers={formData.family_members}
              updateFormData={updateFormData} 
            />
          ))}
        </div>
      ) : (
        <>
          {/* Allergie o Intolleranze (Tag Input) */}
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="input-label" htmlFor="allergy-trigger">
              Allergie o intolleranze
              <span className="optional-tag">Opzionale</span>
            </label>
            
            <div 
              className="tags-wrapper"
              onClick={() => inputRef.current && inputRef.current.focus()}
            >
              {formData.allergie.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(index);
                    }}
                    aria-label={`Rimuovi tag ${tag}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                type="text"
                id="allergy-trigger"
                className="tag-input-field"
                placeholder={formData.allergie.length === 0 ? "es. Lattosio, Glutine (premi Invio)" : ""}
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* Alimenti da escludere (Text Area) */}
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="input-label" htmlFor="escludere">
              Alimenti da escludere
              <span className="optional-tag">Opzionale</span>
            </label>
            <textarea
              id="escludere"
              value={formData.escludere}
              onChange={handleTextareaChange}
              placeholder="C'è qualcosa che proprio non ti piace o preferisci evitare?"
            />
          </div>
        </>
      )}

      {/* Integrazione Gastronomica (per tutti) */}
      <div className="form-group" style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-title)', margin: 0 }}>
            Esplorazione Gastronomica
          </h3>
          <span className="optional-tag" style={{ margin: 0 }}>Opzionale (Max 3)</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
          Desideri includere sapori internazionali nel tuo piano? Seleziona fino a 3 nazioni: la nostra IA integrerà i loro piatti tipici bilanciandoli perfettamente ai tuoi fabbisogni nutrizionali.
        </p>
        
        <div style={{ position: 'relative', marginBottom: '12px', zIndex: 10 }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              width: '100%',
              padding: '14px 18px',
              backgroundColor: 'var(--bg-app)',
              border: `1px solid ${isDropdownOpen ? 'var(--color-title)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-title)',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isDropdownOpen ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            <span>Aggiungi una nazione...</span>
            <svg 
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {isDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '6px',
              animation: 'fadeInUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {[
                'Albania', 'Arabia Saudita', 'Argentina', 'Australia', 'Austria', 'Bahamas', 'Belgio', 'Bolivia', 'Brasile', 'Bulgaria', 
                'Canada', 'Cile', 'Cina', 'Colombia', 'Corea del Sud', 'Croazia', 'Cuba', 'Danimarca', 'Ecuador', 'Egitto', 
                'Emirati Arabi', 'Etiopia', 'Filippine', 'Finlandia', 'Francia', 'Germania', 'Giamaica', 'Giappone', 'Grecia', 'India', 
                'Indonesia', 'Iran', 'Irlanda', 'Israele', 'Italia', 'Kenya', 'Libano', 'Malesia', 'Marocco', 'Messico', 
                'Nigeria', 'Norvegia', 'Nuova Zelanda', 'Paesi Bassi', 'Pakistan', 'Paraguay', 'Perù', 'Polonia', 'Porto Rico', 'Portogallo', 
                'Regno Unito', 'Repubblica Ceca', 'Repubblica Dominicana', 'Romania', 'Senegal', 'Serbia', 'Singapore', 'Spagna', 'Stati Uniti', 'Sudafrica', 
                'Svezia', 'Svizzera', 'Thailandia', 'Turchia', 'Ungheria', 'Uruguay', 'Venezuela', 'Vietnam'
              ].map(c => {
                const isSelected = (formData.gastronomic_countries || []).includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={isSelected}
                    onClick={() => {
                      const currentList = formData.gastronomic_countries || [];
                      if (!currentList.includes(c)) {
                        if (currentList.length < 3) {
                          updateFormData({ gastronomic_countries: [...currentList, c] });
                          setIsDropdownOpen(false); // Close after selection
                        } else {
                          alert("Puoi selezionare al massimo 3 tradizioni culinarie.");
                        }
                      }
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isSelected ? 'var(--border-default)' : 'transparent',
                      color: isSelected ? 'var(--color-muted)' : 'var(--color-body)',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: isSelected ? '400' : '500',
                      cursor: isSelected ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: isSelected ? 0.6 : 1
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-app)';
                        e.currentTarget.style.color = 'var(--color-title)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-body)';
                      }
                    }}
                  >
                    {c}
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Nazioni selezionate (Chips) */}
        {(formData.gastronomic_countries || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(formData.gastronomic_countries || []).map(country => (
              <span key={country} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--color-title)',
                color: '#ffffff',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                {country}
                <button 
                  type="button" 
                  onClick={() => {
                    const currentList = formData.gastronomic_countries || [];
                    updateFormData({ gastronomic_countries: currentList.filter(c => c !== country) });
                  }}
                  style={{ 
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, marginLeft: '4px', transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
