import { useState, useEffect } from 'react';
import BiometricStep from './components/BiometricStep';
import LifestyleStep from './components/LifestyleStep';
import NutritionStep from './components/NutritionStep';
import IntegrationStep from './components/IntegrationStep';
import SummaryStep from './components/SummaryStep';
import AuthSection from './components/AuthSection';
import DashboardPortal from './components/DashboardPortal';
import LandingPage from './components/LandingPage';
import { supabase } from './lib/supabaseClient';
import AILoadingOverlay from './components/AILoadingOverlay';
import { generateAndUploadPdf } from './lib/pdfHelper';

export default function App() {
  const [screen, setScreen] = useState('home'); // 'home', 'form', 'auth', 'portal'
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAILoading, setShowAILoading] = useState(false);
  const [session, setSession] = useState(null);

  // Cache globale dei dati utente
  const [cachedUserData, setCachedUserData] = useState(null);
  const [cachedUserPrefs, setCachedUserPrefs] = useState(null);
  const [cachedDiet, setCachedDiet] = useState(null);
  const [cachedPdfUrl, setCachedPdfUrl] = useState(null);
  const [dietStartDate, setDietStartDate] = useState(null);
  
  const getPdfName = (userData, userPrefs) => {
    const isFam = userPrefs?.sesso === 'Famiglia' || userPrefs?.gender === 'Famiglia';
    if (isFam) {
      return userData?.last_name ? `Famiglia ${userData.last_name}` : 'Famiglia';
    }
    return userData?.first_name || 'Utente';
  };

  const fetchGlobalData = async (userId) => {
    try {
      const [userRes, prefsRes, dietRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).limit(1).maybeSingle(),
        supabase.from('user_preferences').select('*').eq('user_id', userId).limit(1).maybeSingle(),
        supabase.from('diet_plans').select('*').eq('user_id', userId).limit(1).maybeSingle()
      ]);

      if (userRes.data) setCachedUserData(userRes.data);
      if (prefsRes.data) setCachedUserPrefs(prefsRes.data);
      
      if (dietRes.data && dietRes.data.plan_json) {
        setCachedDiet(dietRes.data.plan_json);
        setDietStartDate(dietRes.data.created_at);
        setCachedPdfUrl(dietRes.data.pdf_url);

        // Se c'è una dieta attiva ma non c'è ancora un URL PDF caricato, lo generiamo in background
        if (dietRes.data.plan_json.length > 0 && !dietRes.data.pdf_url) {
          const userName = getPdfName(userRes.data, prefsRes.data);
          const userPrefsData = prefsRes.data || {};
          generateAndUploadPdf(userId, userName, userPrefsData, dietRes.data.plan_json).then((publicUrl) => {
            if (publicUrl) setCachedPdfUrl(publicUrl);
          });
        }
      }
    } catch (err) {
      console.error("Errore fetch globale:", err);
    }
  };
  useEffect(() => {
    // getSession legge solo la cache, getUser verifica il token con il server
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          // Token scaduto o utente cancellato da Supabase, forziamo il logout
          await supabase.auth.signOut();
          setSession(null);
          return;
        }
        setSession(session);
        fetchGlobalData(session.user.id);
        if (screen === 'home') setScreen('portal');
      }
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          await supabase.auth.signOut();
          setSession(null);
          return;
        }
        setSession(newSession);
        fetchGlobalData(newSession.user.id);
      } else {
        setSession(null);
        // Clear cache on logout
        setCachedUserData(null);
        setCachedUserPrefs(null);
        setCachedDiet(null);
        setCachedPdfUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [screen]);

  const [formData, setFormData] = useState({
    // Fase 1: Biometrica
    sesso: '',
    eta: '',
    altezza: '',
    peso: '',
    family_members: [], // [{ name, gender, age, height, weight }]
    // Fase 2: Metriche di Successo
    obiettivo: '',
    peso_target: '',
    pacing: '',
    neat_level: '',
    active_workout_hours: '',
    // Fase 3: Nutrizione
    dieta: [],
    pasti: '',
    allergie: [],
    escludere: '',
    // Fase 4: Integrazione
    budget: '',
    prep_pranzo: '',
    prep_cena: '',
    sveglia: '',
    gastronomic_countries: []
  });

  // Set document title for SEO/tab management
  useEffect(() => {
    document.title = 'NutriAI - Profilo Nutrizionale';
  }, []);

  const updateFormData = (newData) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleNext = () => {
    if (isStepValid() && currentStep < 5) {
      if (formData.sesso === 'Famiglia' && currentStep === 1) {
        setCurrentStep(3); // Salta LifestyleStep
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (formData.sesso === 'Famiglia' && currentStep === 3) {
        setCurrentStep(1); // Torna a Biometric saltando LifestyleStep
      } else {
        setCurrentStep((prev) => prev - 1);
      }
    } else {
      setScreen('home');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStepValid()) return;
    
    setIsSubmitting(true);
    
    if (!session) {
      setTimeout(() => {
        setIsSubmitting(false);
        setAuthMode('register');
        setScreen('auth');
      }, 800);
      return;
    }

    try {
      setShowAILoading(true);
      const userId = session.user.id;

      // FIX: Auto-Healing - Assicuriamoci che l'utente esista in public.users
      const { data: existingUser } = await supabase.from('users').select('id').eq('id', userId).single();
      if (!existingUser) {
        const fullName = session.user.user_metadata?.full_name || 'Utente Sconosciuto';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        const phone = session.user.phone || session.user.user_metadata?.phone || '';
        
        await supabase.from('users').insert([{
          id: userId,
          first_name: firstName,
          last_name: lastName,
          phone_number: phone,
          nationality: 'Italia' // default fallback
        }]);
      }

      // Controllo se l'utente ha già delle preferenze
      const { data: existingPref } = await supabase.from('user_preferences').select('id').eq('user_id', userId).single();

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
        gastronomic_countries: formData.gastronomic_countries
      };

      let prefError = null;
      if (existingPref) {
        const { error } = await supabase.from('user_preferences').update(prefPayload).eq('user_id', userId);
        prefError = error;
      } else {
        const { error } = await supabase.from('user_preferences').insert([prefPayload]);
        prefError = error;
      }
      
      if (prefError) {
        console.error("Errore salvataggio preferenze:", prefError);
        alert(`Errore di salvataggio: ${prefError.message}. Contatta l'assistenza.`);
        setShowAILoading(false);
        setIsSubmitting(false);
        return;
      }

      // Generazione e salvataggio via Grok AI (Edge Function)
      const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-standard-diet', {
        body: { userId, userPrefs: formData }
      });

      if (aiError) {
        console.error("Errore Edge Function Grok:", aiError);
      }

      if (aiData?.plan) {
        setCachedDiet(aiData.plan);
        // Genera e carica il PDF in background, poi invia messaggio WhatsApp
        const userName = getPdfName(cachedUserData, formData);
        const userPhone = cachedUserData?.phone_number;
        generateAndUploadPdf(userId, userName, formData, aiData.plan).then(publicUrl => {
          if (publicUrl && userPhone) {
            supabase.functions.invoke('meta-whatsapp', {
              body: {
                action: 'send_welcome',
                phone: userPhone,
                name: userName,
                pdfUrl: publicUrl
              }
            }).catch(err => console.error("Errore invio WhatsApp:", err));
          }
        });
      }

      // Aggiorna la cache locale con i dati freschi dal DB prima di andare alla dashboard
      await fetchGlobalData(userId);

      // Resetta form ma vai al portale
      setCurrentStep(1);
      setScreen('portal');
    } catch (err) {
      console.error("Errore nel salvataggio diretto:", err);
    } finally {
      setIsSubmitting(false);
      setShowAILoading(false);
    }
  };

  const handleUpdateFamilyMembers = async (newMembers) => {
    if (!session || !cachedUserPrefs) return;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ family_members: newMembers })
        .eq('user_id', session.user.id);
        
      if (error) throw error;
      
      // Update local state
      setCachedUserPrefs(prev => ({
        ...prev,
        family_members: newMembers
      }));
    } catch (err) {
      console.error("Errore aggiornamento membri famiglia:", err);
      alert("Errore nell'aggiornamento dei componenti familiari.");
    }
  };

  const handleRegenerateDiet = async () => {
    if (!session || !cachedUserPrefs) return;
    
    // Mostriamo un feedback all'utente (opzionale, lo gestiremo anche nel pulsante)
    try {
      setShowAILoading(true);
      const userId = session.user.id;
      
      // Elimina la dieta precedente
      await supabase.from('diet_plans').delete().eq('user_id', userId);
      
      // Costruiamo il formData pseudo-compatibile
      const pseudoFormData = {
        peso: cachedUserPrefs.weight_kg,
        altezza: cachedUserPrefs.height_cm,
        eta: cachedUserPrefs.age,
        sesso: cachedUserPrefs.gender,
        neat_level: cachedUserPrefs.neat_level,
        active_workout_hours: cachedUserPrefs.active_workout_hours,
        obiettivo: cachedUserPrefs.goal,
        pacing: cachedUserPrefs.pacing,
        pasti: cachedUserPrefs.meals_per_day,
        dieta: cachedUserPrefs.diet_type,
        allergies: cachedUserPrefs.allergies || [],
        escludere: cachedUserPrefs.excluded_foods,
        budget: cachedUserPrefs.diet_budget,
        prep_pranzo: cachedUserPrefs.prep_time_lunch,
        prep_cena: cachedUserPrefs.prep_time_dinner,
        family_members: cachedUserPrefs.family_members || []
      };

      // Rigenera via Grok AI
      const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-standard-diet', {
        body: { userId, userPrefs: pseudoFormData }
      });

      if (aiError) {
        console.error("Errore rigenerazione Grok:", aiError);
        throw new Error("Errore API Nutri AI");
      }

      if (aiData?.plan) {
        setCachedDiet(aiData.plan);
        // Genera e carica il PDF in background, poi invia messaggio WhatsApp
        const userName = getPdfName(cachedUserData, cachedUserPrefs);
        const userPhone = cachedUserData?.phone_number;
        generateAndUploadPdf(userId, userName, cachedUserPrefs, aiData.plan).then(publicUrl => {
          if (publicUrl && userPhone) {
            supabase.functions.invoke('meta-whatsapp', {
              body: {
                action: 'send_welcome',
                phone: userPhone,
                name: userName,
                pdfUrl: publicUrl
              }
            }).catch(err => console.error("Errore invio WhatsApp:", err));
          }
        });
      }
      
    } catch (err) {
      console.error("Errore rigenerazione:", err);
      alert("Si è verificato un errore durante la rigenerazione.");
    } finally {
      setShowAILoading(false);
    }
  };

  const handleDeleteDiet = async () => {
    if (!session) return;
    try {
      const userId = session.user.id;
      
      // 1. Elimina tutti i file dal bucket Medical
      const { data: files } = await supabase.storage.from('Medical').list(userId);
      if (files && files.length > 0) {
        const filePaths = files.map(x => `${userId}/${x.name}`);
        await supabase.storage.from('Medical').remove(filePaths);
      }

      // 2. Elimina il PDF della dieta dal bucket diet-pdfs
      const { data: pdfFiles } = await supabase.storage.from('diet-pdfs').list(userId);
      if (pdfFiles && pdfFiles.length > 0) {
        const pdfPaths = pdfFiles.map(x => `${userId}/${x.name}`);
        await supabase.storage.from('diet-pdfs').remove(pdfPaths);
      }
      
      // 3. Elimina le righe dal database
      const { error: dietError } = await supabase.from('diet_plans').delete().eq('user_id', userId);
      const { error: prefError } = await supabase.from('user_preferences').delete().eq('user_id', userId);
      
      if (dietError) console.error("Impossibile eliminare diet_plans (manca policy DELETE?):", dietError);
      if (prefError) console.error("Impossibile eliminare user_preferences (manca policy DELETE?):", prefError);

      // 4. Svuota lo stato locale
      setCachedDiet(null);
      setCachedPdfUrl(null);
      setCachedUserPrefs(null);
      setDietStartDate(null);
      
      // 5. Reindirizza alla Home per compilare una nuova dieta
      handleReset();

    } catch (err) {
      console.error("Errore eliminazione:", err);
      alert("Si è verificato un errore durante l'eliminazione.");
    }
  };

  const handleReset = () => {
    setFormData({
      sesso: '',
      eta: '',
      altezza: '',
      peso: '',
      family_members: [],
      obiettivo: '',
      peso_target: '',
      pacing: '',
      neat_level: '',
      active_workout_hours: '',
      dieta: [],
      pasti: '',
      allergie: [],
      escludere: '',
      budget: '',
      prep_pranzo: '',
      prep_cena: '',
      sveglia: ''
    });
    setCurrentStep(1);
    setScreen('home');
  };

  const handleAuthSuccess = () => {
    setScreen('portal');
  };

  // Field validation per step
  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        if (formData.sesso === 'Famiglia') {
          return formData.family_members.length >= 2 && formData.family_members.every(m => m.name && m.gender && m.age > 0 && m.weight > 0);
        }
        return (
          formData.sesso !== '' &&
          formData.eta !== '' && Number(formData.eta) > 0 &&
          formData.altezza !== '' && Number(formData.altezza) > 0 &&
          formData.peso !== '' && Number(formData.peso) > 0
        );
      case 2:
        return formData.obiettivo !== '' && formData.peso_target !== '' && formData.pacing !== '' && formData.neat_level !== '' && formData.active_workout_hours !== '';
      case 3:
        return formData.dieta.length > 0 && formData.pasti !== '';
      case 4:
        return formData.budget !== '' && formData.prep_pranzo !== '' && formData.prep_cena !== '' && formData.sveglia !== '';
      case 5:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BiometricStep formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <LifestyleStep formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <NutritionStep formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <IntegrationStep formData={formData} updateFormData={updateFormData} />;
      case 5:
        return <SummaryStep formData={formData} session={session} onComplete={handleSubmit} isSubmitting={isSubmitting} onBack={handleBack} />;
      default:
        return null;
    }
  };

  // Progress bar calculations
  const stepsArray = formData.sesso === 'Famiglia' ? [1, 3, 4, 5] : [1, 2, 3, 4, 5];
  const progressPercentage = ((stepsArray.indexOf(currentStep)) / (stepsArray.length - 1)) * 100;

  if (screen === 'home') {
    return (
      <main style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', margin: '0 auto' }}>
        <LandingPage 
          onStartDiet={() => setScreen('form')} 
          onLogin={() => { setAuthMode('login'); setScreen('auth'); }} 
        />
      </main>
    );
  }

  if (screen === 'auth') {
    return (
      <main style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', margin: '0 auto', padding: '0 16px' }}>
        <button 
          type="button"
          onClick={() => setScreen('home')}
          style={{ 
            alignSelf: 'flex-start', 
            marginBottom: '16px', 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '20px', 
            fontWeight: '600', 
            color: 'var(--color-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            padding: '0'
          }}
          title="Torna alla Home"
        >
          ←
        </button>
        <header style={{ marginBottom: '8px' }}>
          <img 
            src="/logo.png?v=3" 
            alt="NutriAI Logo"
            style={{ 
              width: '100%',
              maxWidth: '180px', 
              height: 'auto', 
              margin: '0 auto 12px',
              display: 'block'
            }}
          />
          <p className="subtitle" style={{ maxWidth: '350px', margin: '0 auto' }}>Accedi per vedere il tuo piano, modificare o altre utilità</p>
        </header>
        <AuthSection 
          formData={formData} 
          initialMode={authMode} 
          onAuthSuccess={handleAuthSuccess}
          updateCache={(userData, prefs, diet, startDate) => {
            if (userData) setCachedUserData(userData);
            if (prefs) setCachedUserPrefs(prefs);
            if (diet) setCachedDiet(diet);
            if (startDate) setDietStartDate(startDate);
          }} 
        />
      </main>
    );
  }

  if (screen === 'portal') {
    return (
      <>
        {showAILoading && <AILoadingOverlay />}
        <main style={{ width: '100%', maxWidth: '600px', display: showAILoading ? 'none' : 'flex', flexDirection: 'column', margin: '0 auto' }}>
          <DashboardPortal 
          session={session}
          formData={formData}
          cachedUserData={cachedUserData}
          cachedUserPrefs={cachedUserPrefs}
          cachedDiet={cachedDiet}
          cachedPdfUrl={cachedPdfUrl}
          dietStartDate={dietStartDate}
          onLogout={handleReset} 
          onStartDiet={() => setScreen('form')} 
          onRegenerate={handleRegenerateDiet}
          onDietUpdated={() => fetchGlobalData(session.user.id)}
          onDeleteDiet={handleDeleteDiet}
          onUpdateFamilyMembers={handleUpdateFamilyMembers}
        />
      </main>
      </>
    );
  }

  return (
    <>
      {showAILoading && <AILoadingOverlay />}
      <main style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '520px', display: showAILoading ? 'none' : 'flex', flexDirection: 'column', margin: '0 auto', padding: '0 16px' }}>
        <header>
          <img 
            src="/logo.png?v=3" 
            alt="NutriAI Logo"
            style={{ 
              width: '100%',
              maxWidth: '180px', 
              height: 'auto', 
              margin: '0 auto 16px',
              display: 'block'
            }}
          />
          <p className="subtitle">Configura il tuo profilo nutrizionale personalizzato</p>
        </header>

      {/* Progress Dots & Line */}
      <nav aria-label="Avanzamento del modulo" className="progress-container">
        <div className="progress-bar-bg"></div>
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
        {stepsArray.map((stepNum) => (
          <div 
            key={stepNum} 
            className={`progress-dot ${stepNum === currentStep ? 'active' : ''} ${stepsArray.indexOf(stepNum) < stepsArray.indexOf(currentStep) ? 'completed' : ''}`}
            onClick={() => {
              if (stepsArray.indexOf(stepNum) < stepsArray.indexOf(currentStep)) {
                setCurrentStep(stepNum);
              }
            }}
            style={{ cursor: stepsArray.indexOf(stepNum) < stepsArray.indexOf(currentStep) ? 'pointer' : 'default' }}
            title={`Step ${stepsArray.indexOf(stepNum) + 1}`}
          ></div>
        ))}
      </nav>

      <form onSubmit={handleSubmit}>
        {renderStep()}

        {/* Footer Actions (Solo per Step 1-4) */}
        {currentStep < 5 && (
          <footer className="button-footer">
            <button
              type="button"
              id="btn-back"
              className="btn btn-secondary"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Indietro
            </button>
            
            <button
              type="button"
              id="btn-next"
              className="btn btn-primary"
              onClick={handleNext}
              disabled={!isStepValid()}
            >
              Avanti
            </button>
          </footer>
        )}
      </form>
    </main>
    </>
  );
}
