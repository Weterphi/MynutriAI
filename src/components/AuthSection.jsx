import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import AILoadingOverlay from './AILoadingOverlay';
import { generateAndUploadPdf } from '../lib/pdfHelper';

const COUNTRIES = [
  { code: 'IT', name: 'Italia', dial_code: '+39' },
  { code: 'US', name: 'Stati Uniti', dial_code: '+1' },
  { code: 'GB', name: 'Regno Unito', dial_code: '+44' },
  { code: 'ES', name: 'Spagna', dial_code: '+34' },
  { code: 'FR', name: 'Francia', dial_code: '+33' },
  { code: 'DE', name: 'Germania', dial_code: '+49' },
  { code: 'CH', name: 'Svizzera', dial_code: '+41' }
];

export default function AuthSection({ formData, initialMode = 'login', onAuthSuccess, updateCache }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [isLoading, setIsLoading] = useState(false);
  const [showAILoading, setShowAILoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Auth Form State
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    nome: '',
    cognome: '',
    telefono: '',
    prefix: '+39',
    nazionalita: 'Italia',
    acceptTerms: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAuthData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleModeSwitch = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setErrorMessage('');
    // Keep email and password values but clear others
    setAuthData((prev) => ({
      ...prev,
      nome: '',
      cognome: '',
      telefono: '',
      prefix: '+39',
      nazionalita: 'Italia',
      acceptTerms: false
    }));
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsLoading(true);
    if (mode === 'register' && formData && formData.sesso && formData.sesso !== '') {
      setShowAILoading(true);
    }
    setErrorMessage('');

    try {
      let userId;
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authData.email,
          password: authData.password
        });
        if (error) throw error;
        userId = data.user.id;
        
      } else {
        // Registrazione
        const fullPhone = `${authData.prefix} ${authData.telefono.trim()}`;
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authData.email,
          password: authData.password,
          options: {
            data: {
              full_name: `${authData.nome} ${authData.cognome}`,
              phone: fullPhone,
              display_name: `${authData.nome} ${authData.cognome}`
            }
          }
        });
        
        if (signUpError) throw signUpError;
        userId = data.user?.id;
        
        if (userId) {
          // 1. Inserimento in users
          const { error: userError } = await supabase.from('users').insert([{
            id: userId,
            first_name: authData.nome,
            last_name: authData.cognome,
            phone_number: fullPhone,
            nationality: authData.nazionalita
          }]);
          
          if (userError) console.error("Errore salvataggio user:", userError);

          // 2. Inserimento preferenze e diete se l'utente arriva dal form (SOLO Registrazione)
          if (formData && formData.sesso && formData.sesso !== '') {
            
            const prefPayload = {
              user_id: userId,
              gender: formData.sesso,
              age: formData.sesso === 'Famiglia' ? null : Number(formData.eta),
              height_cm: formData.sesso === 'Famiglia' ? null : Number(formData.altezza),
              weight_kg: formData.sesso === 'Famiglia' ? null : Number(formData.peso),
              goal: formData.sesso === 'Famiglia' ? 'Salute Famigliare' : formData.obiettivo,
              target_weight_kg: formData.sesso === 'Famiglia' ? null : (formData.peso_target ? Number(formData.peso_target) : null),
              pacing: formData.sesso === 'Famiglia' ? 'Standard' : formData.pacing,
              neat_level: formData.sesso === 'Famiglia' ? 'Sedentario' : formData.neat_level,
              active_workout_hours: formData.sesso === 'Famiglia' ? 0 : (formData.active_workout_hours ? Number(formData.active_workout_hours) : 0),
              activity_level: formData.sesso === 'Famiglia' ? 'Non specificato' : (formData.neat_level || 'Non specificato'),
              diet_type: formData.dieta.join(', '),
              meals_per_day: Number(formData.pasti),
              allergies: formData.allergie,
              excluded_foods: formData.escludere,
              diet_budget: formData.budget,
              prep_time_lunch: formData.prep_pranzo,
              prep_time_dinner: formData.prep_cena,
              wakeup_time: formData.sveglia ? (formData.sveglia + ':00') : null,
              family_members: formData.sesso === 'Famiglia' ? formData.family_members : [],
              gastronomic_countries: formData.gastronomic_countries || []
            };

            const { data: existingPref } = await supabase.from('user_preferences').select('id').eq('user_id', userId).single();
            let prefError = null;
            if (existingPref) {
              const { error } = await supabase.from('user_preferences').update(prefPayload).eq('user_id', userId);
              prefError = error;
            } else {
              const { error } = await supabase.from('user_preferences').insert([prefPayload]);
              prefError = error;
            }
            
            if (prefError) console.error("Errore salvataggio preferenze:", prefError);

            // 3. Generazione e salvataggio dei 30 giorni via Grok AI (Edge Function)
            try {
              const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-standard-diet', {
                body: { userId, userPrefs: formData }
              });

              if (aiError) {
                console.error("Errore chiamata Edge Function Grok:", aiError);
              }

              if (aiData?.plan) {
                // Genera e carica il PDF in background, poi invia messaggio WhatsApp
                generateAndUploadPdf(userId, authData.nome, {
                  goal: formData.obiettivo,
                  pacing: formData.pacing,
                  diet_type: formData.dieta.join(', '),
                  wakeup_time: formData.sveglia ? (formData.sveglia + ':00') : null
                }, aiData.plan).then(publicUrl => {
                  if (publicUrl && fullPhone) {
                    supabase.functions.invoke('meta-whatsapp', {
                      body: {
                        action: 'send_welcome',
                        phone: fullPhone,
                        name: authData.nome,
                        pdfUrl: publicUrl
                      }
                    }).catch(err => console.error("Errore invio WhatsApp:", err));
                  }
                });
              }
            } catch (edgeErr) {
              console.error("Eccezione durante la chiamata Edge:", edgeErr);
            }
          }
        }
      }
      
      onAuthSuccess();
    } catch (err) {
      setErrorMessage(err.message || "Si è verificato un errore durante l'autenticazione.");
    } finally {
      setIsLoading(false);
      setShowAILoading(false);
    }
  };

  const isFormValid = () => {
    if (mode === 'login') {
      return authData.email.trim() !== '' && authData.password.trim() !== '';
    } else {
      return (
        authData.nome.trim() !== '' &&
        authData.cognome.trim() !== '' &&
        authData.telefono.trim() !== '' &&
        authData.nazionalita.trim() !== '' &&
        authData.email.trim() !== '' &&
        authData.password.trim() !== '' &&
        authData.acceptTerms === true
      );
    }
  };

  return (
    <>
      {showAILoading && <AILoadingOverlay />}
      <div className="step-container" style={{ width: '100%', display: showAILoading ? 'none' : 'block' }}>



      {errorMessage && (
        <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '14px', textAlign: 'center' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleAuthSubmit}>
        {mode === 'login' ? (
          /* LOGIN FORM */
          <>
            <div className="form-group">
              <label htmlFor="email" className="input-label">E-mail</label>
              <input
                type="text"
                id="email"
                name="email"
                value={authData.email}
                onChange={handleInputChange}
                placeholder="nome@esempio.com"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password" className="input-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={authData.password}
                onChange={handleInputChange}
                placeholder="Inserisci la tua password"
                style={{
                  width: '100%',
                  fontSize: '14px',
                  padding: '12px 14px',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none'
                }}
                required
              />
            </div>
          </>
        ) : (
          /* REGISTRATION FORM */
          <>
            <div className="auth-grid">
              <div className="form-group">
                <label htmlFor="nome" className="input-label">Nome</label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={authData.nome}
                  onChange={handleInputChange}
                  placeholder="Mario"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="cognome" className="input-label">Cognome</label>
                <input
                  type="text"
                  id="cognome"
                  name="cognome"
                  value={authData.cognome}
                  onChange={handleInputChange}
                  placeholder="Rossi"
                  required
                />
              </div>
            </div>

            <div className="auth-grid">
              <div className="form-group">
                <label htmlFor="nazionalita" className="input-label">Nazionalità</label>
                <select
                  id="nazionalita"
                  name="nazionalita"
                  value={authData.nazionalita}
                  onChange={(e) => {
                    const countryName = e.target.value;
                    const countryObj = COUNTRIES.find(c => c.name === countryName);
                    setAuthData(prev => ({
                      ...prev,
                      nazionalita: countryName,
                      prefix: countryObj ? countryObj.dial_code : prev.prefix
                    }));
                  }}
                  required
                  className="input-field"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', fontSize: '14px', outline: 'none' }}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="telefono" className="input-label">Numero di telefono</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    name="prefix"
                    value={authData.prefix}
                    onChange={handleInputChange}
                    style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', fontSize: '14px', outline: 'none', backgroundColor: '#f9f9fb', width: '85px' }}
                  >
                    {COUNTRIES.map(c => (
                      <option key={`${c.code}-prefix`} value={c.dial_code}>{c.dial_code}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    id="telefono"
                    name="telefono"
                    value={authData.telefono}
                    onChange={handleInputChange}
                    placeholder="333 1234567"
                    required
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email" className="input-label">E-mail</label>
              <input
                type="text"
                id="email"
                name="email"
                value={authData.email}
                onChange={handleInputChange}
                placeholder="nome@esempio.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="input-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={authData.password}
                onChange={handleInputChange}
                placeholder="Scegli una password sicura"
                style={{
                  width: '100%',
                  fontSize: '14px',
                  padding: '12px 14px',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none'
                }}
                required
              />
            </div>

            {/* European Terms of Service checkbox */}
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="acceptTerms"
                name="acceptTerms"
                checked={authData.acceptTerms}
                onChange={handleInputChange}
                required
              />
              <label htmlFor="acceptTerms" className="checkbox-label">
                Accetto i termini di servizio europei e acconsento al trattamento dei dati personali in conformità al regolamento GDPR.
              </label>
            </div>
          </>
        )}

        {/* Action button */}
        <button
          type="submit"
          id="btn-auth-submit"
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '24px', marginLeft: 0 }}
          disabled={!isFormValid() || isLoading}
        >
          {isLoading ? (
            <>
              <div className="spinner"></div>
              Elaborazione in corso...
            </>
          ) : mode === 'login' ? (
            'Accedi'
          ) : (
            'Registrati e Invia'
          )}
        </button>

        {/* Toggle Switch */}
        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              Non sei registrato?
              <button type="button" onClick={handleModeSwitch}>
                Registrati ora
              </button>
            </>
          ) : (
            <>
              Hai già un account?
              <button type="button" onClick={handleModeSwitch}>
                Accedi
              </button>
            </>
          )}
        </div>
      </form>
      </div>
    </>
  );
}
