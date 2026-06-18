

export default function BiometricStep({ formData, updateFormData }) {
  const handleGenderSelect = (gender) => {
    updateFormData({ sesso: gender });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  const handleFamilySizeChange = (size) => {
    // If shrinking, slice. If growing, add new empty members.
    let currentMembers = formData.family_members || [];
    if (currentMembers.length > size) {
      currentMembers = currentMembers.slice(0, size);
    } else {
      while (currentMembers.length < size) {
        currentMembers.push({ id: Date.now() + Math.random(), role: 'Genitore', name: '', gender: 'Uomo', age: '', weight: '' });
      }
    }
    updateFormData({ family_members: currentMembers });
  };

  const updateFamilyMember = (id, field, value) => {
    const updated = formData.family_members.map(m => {
      if (m.id === id) {
        // Auto-set gender based on some roles
        let newGender = m.gender;
        if (field === 'role') {
          if (['Papà', 'Nonno'].includes(value)) newGender = 'Uomo';
          if (['Mamma', 'Nonna'].includes(value)) newGender = 'Donna';
        }
        return { ...m, [field]: value, gender: field === 'role' ? newGender : (field === 'gender' ? value : m.gender) };
      }
      return m;
    });
    updateFormData({ family_members: updated });
  };

  return (
    <div className="step-container">
      <h2 className="step-title">Chi seguirà la dieta?</h2>
      
      {/* Sesso Selection Cards */}
      <div className="form-group">
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div 
            className={`card-option ${formData.sesso === 'Uomo' ? 'selected' : ''}`}
            onClick={() => handleGenderSelect('Uomo')}
          >
            <span className="card-label">Uomo</span>
          </div>
          <div 
            className={`card-option ${formData.sesso === 'Donna' ? 'selected' : ''}`}
            onClick={() => handleGenderSelect('Donna')}
          >
            <span className="card-label">Donna</span>
          </div>
          <div 
            className={`card-option ${formData.sesso === 'Famiglia' ? 'selected' : ''}`}
            onClick={() => handleGenderSelect('Famiglia')}
            style={{ borderColor: formData.sesso === 'Famiglia' ? 'var(--color-primary)' : '' }}
          >
            <span className="card-label">Famiglia</span>
          </div>
        </div>
      </div>

      {formData.sesso === 'Famiglia' ? (
        <div className="family-section" style={{ marginTop: '20px' }}>
          <div className="form-group">
            <label className="input-label">Componenti Familiari</label>
            <div className="pills-group" style={{ marginBottom: '20px' }}>
              {[2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`pill-option ${formData.family_members?.length === num ? 'selected' : ''}`}
                  onClick={() => handleFamilySizeChange(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          
          {(formData.family_members || []).map((member, index) => (
            <div key={member.id} style={{ background: 'var(--color-surface-soft)', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid var(--color-border)' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary)' }}>Componente {index + 1}</strong>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select value={member.role || 'Genitore'} onChange={(e) => updateFamilyMember(member.id, 'role', e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                  <option value="Mamma">Mamma</option>
                  <option value="Papà">Papà</option>
                  <option value="Figlio">Figlio</option>
                  <option value="Figlia">Figlia</option>
                  <option value="Nonno">Nonno</option>
                  <option value="Nonna">Nonna</option>
                  <option value="Nipote">Nipote</option>
                  <option value="Altro">Altro</option>
                </select>

                <select value={member.gender} onChange={(e) => updateFamilyMember(member.id, 'gender', e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                  <option value="Uomo">Uomo</option>
                  <option value="Donna">Donna</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <input type="text" placeholder="Nome" value={member.name} onChange={(e) => updateFamilyMember(member.id, 'name', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '0' }}>
                <input type="number" placeholder="Età" value={member.age} onChange={(e) => updateFamilyMember(member.id, 'age', e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} />
                <input type="number" placeholder="Peso (kg)" value={member.weight} onChange={(e) => updateFamilyMember(member.id, 'weight', e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Età Input */}
          <div className="form-group">
            <label htmlFor="eta" className="input-label">Età</label>
            <input
              type="number"
              id="eta"
              name="eta"
              value={formData.eta}
              onChange={handleInputChange}
              placeholder="es. 28"
              min="1"
              max="120"
            />
          </div>

          {/* Altezza Input */}
          <div className="form-group">
            <label htmlFor="altezza" className="input-label">Altezza (cm)</label>
            <input
              type="number"
              id="altezza"
              name="altezza"
              value={formData.altezza}
              onChange={handleInputChange}
              placeholder="es. 175"
              min="50"
              max="250"
            />
          </div>

          {/* Peso Input */}
          <div className="form-group">
            <label htmlFor="peso" className="input-label">Peso attuale (kg)</label>
            <input
              type="number"
              id="peso"
              name="peso"
              value={formData.peso}
              onChange={handleInputChange}
              placeholder="es. 70"
              min="20"
              max="300"
              step="0.1"
            />
          </div>
        </>
      )}
    </div>
  );
}
