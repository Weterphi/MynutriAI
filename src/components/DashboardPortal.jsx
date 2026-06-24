import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import DietViewerModal from './DietViewerModal';
import StoreSection from './StoreSection';
import NavigationBar from './NavigationBar';
import CartDrawer from './CartDrawer';
import AILoadingOverlay from './AILoadingOverlay';
import NutriChat from './NutriChat';
import SpesaMapSection from './SpesaMapSection';
import { generateAndShareShoppingListPdf } from '../lib/pdfShoppingList';

export default function DashboardPortal({ 
  cachedUserData, 
  cachedUserPrefs, 
  cachedDiet, 
  cachedPdfUrl,
  dietStartDate, 
  onLogout, 
  onStartDiet, 
  onRegenerate,
  onDietUpdated,
  onDeleteDiet,
  onUpdateFamilyMembers
}) {
  const [activeView, setActiveView] = useState('diet'); // 'diet' | 'store' | 'profile'
  const [activeWeek, setActiveWeek] = useState('week1'); 
  const [activeDay, setActiveDay] = useState('Giorno 1');

  useEffect(() => {
    if (dietStartDate) {
      const getRomeDateString = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);
      const createdRomeStr = getRomeDateString(new Date(dietStartDate));
      const todayRomeStr = getRomeDateString(new Date());

      const createdDate = new Date(`${createdRomeStr}T00:00:00Z`);
      const today = new Date(`${todayRomeStr}T00:00:00Z`);
      const diffTime = today.getTime() - createdDate.getTime();
      let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      let dayNumber = diffDays <= 0 ? 1 : diffDays;
      if (dayNumber > 30) dayNumber = 30;

      const weekNum = Math.ceil(dayNumber / 7);
      const activeW = weekNum <= 4 ? `week${weekNum}` : 'week4';
      const dayIndexInWeek = ((dayNumber - 1) % 7) + 1;

      setActiveWeek(activeW);
      setActiveDay(`Giorno ${dayIndexInWeek}`);
    }
  }, [dietStartDate]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(() => {
    return localStorage.getItem('userAvatar') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&style=circle';
  });

  // Spesa States
  const [isSpesaModalOpen, setIsSpesaModalOpen] = useState(false);
  const [spesaForm, setSpesaForm] = useState({ cap: '', address: '' });
  const [isSavingSpesa, setIsSavingSpesa] = useState(false);
  const [isGeneratingSpesa, setIsGeneratingSpesa] = useState(false);
  const [shoppingList, setShoppingList] = useState(null);
  const [hasSavedSpesa, setHasSavedSpesa] = useState(false);
  const [isSyncingCart, setIsSyncingCart] = useState(false);

  useEffect(() => {
    if (cachedUserData?.id) {
      setHasSavedSpesa(localStorage.getItem(`spesa_saved_${cachedUserData.id}_${activeWeek}`) === "true");
    }
  }, [activeWeek, cachedUserData?.id, shoppingList]);

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: cachedUserData?.first_name || '',
    phone: cachedUserData?.phone_number || '',
    cap: cachedUserData?.user_metadata?.cap || '',
    address: cachedUserData?.user_metadata?.address || ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Nuovi state per il flusso in due step (preview -> genera JSON)
  const [dietPreviewText, setDietPreviewText] = useState(null);
  const [isGeneratingFinal, setIsGeneratingFinal] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState(null); 
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  // Stato per la gestione della famiglia
  const isFamily = cachedUserPrefs?.gender === 'Famiglia' || cachedUserPrefs?.sesso === 'Famiglia';
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    role: 'Mamma',
    gender: 'Donna',
    name: '',
    age: '',
    weight: '',
    allergies: [],
    excluded_foods: '',
    tempAllergy: ''
  });

  // Cart State
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem('nutriai_cart');
    if (savedCart) {
      try { setCartItems(JSON.parse(savedCart)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nutriai_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const handleAddToCart = (product) => {
    setCartItems(prev => [...prev, product]);
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const defaultAvatar = "/avatar.png";
  useEffect(() => {
    if (cachedUserData?.id) {
      const savedAvatar = localStorage.getItem(`avatar_${cachedUserData.id}`);
      if (savedAvatar) setCurrentAvatar(savedAvatar);
    }
  }, [cachedUserData]);

  const avatarOptions = [
    "/avatar.png",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&style=circle",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&style=circle",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&style=circle&facialHair=beardLight",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn&style=circle",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=George&style=circle&hairColor=silverGray",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Betty&style=circle&hairColor=silverGray",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Timmy&style=circle",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lily&style=circle",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&style=circle",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&style=circle",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&style=circle"
  ];

  // LOGICA FAMIGLIA
  const handleRemoveMember = async (idToRemove) => {
    if (!window.confirm("Sei sicuro di voler rimuovere questo componente dalla famiglia?")) return;
    const currentMembers = cachedUserPrefs.family_members || [];
    const newMembers = currentMembers.filter(m => m.id !== idToRemove);
    if (onUpdateFamilyMembers) {
      await onUpdateFamilyMembers(newMembers);
    }
  };

  const handleAddAllergyToNewMember = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = newMemberData.tempAllergy.trim();
      if (val && !newMemberData.allergies.includes(val)) {
        setNewMemberData(prev => ({ ...prev, allergies: [...prev.allergies, val], tempAllergy: '' }));
      }
    }
  };

  const handleAddNewMemberSubmit = async () => {
    if (!newMemberData.name || !newMemberData.age || !newMemberData.weight) {
      alert("Compila tutti i campi obbligatori (Nome, Età, Peso).");
      return;
    }
    const currentMembers = cachedUserPrefs.family_members || [];
    const newMember = {
      id: Date.now().toString(),
      role: newMemberData.role,
      gender: newMemberData.gender,
      name: newMemberData.name,
      age: newMemberData.age,
      weight: newMemberData.weight,
      allergies: newMemberData.allergies,
      excluded_foods: newMemberData.excluded_foods
    };
    const newMembers = [...currentMembers, newMember];
    if (onUpdateFamilyMembers) {
      await onUpdateFamilyMembers(newMembers);
    }
    setIsAddMemberModalOpen(false);
    setNewMemberData({
      role: 'Mamma', gender: 'Donna', name: '', age: '', weight: '', allergies: [], excluded_foods: '', tempAllergy: ''
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    e.target.value = null;

    if(!window.confirm('Avviso: la tua dieta attuale verrà cancellata e sostituita in modo definitivo con una nuova dieta clinica basata su queste analisi. Vuoi procedere?')) {
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const userId = cachedUserData?.id || cachedUserPrefs?.user_id;
      if (!userId) throw new Error("Utente non trovato");

      const { data: existingFiles } = await supabase.storage.from('Medical').list(userId);
      if (existingFiles && existingFiles.length > 0) {
        const filePaths = existingFiles.map(x => `${userId}/${x.name}`);
        await supabase.storage.from('Medical').remove(filePaths);
      }

      const filePath = `${userId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('Medical')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: grokData, error: grokError } = await supabase.functions.invoke('generate-medical-diet', {
        body: { userId, filePath, userPrefs: cachedUserPrefs || {}, action: 'preview' }
      });

      if (grokError || grokData?.error) {
        throw new Error(grokError?.message || grokData?.error || "Errore IA Nutri AI");
      }

      setUploadedFilePath(filePath);
      setDietPreviewText(grokData.previewText);
      setIsAnalyzing(false);

    } catch (error) {
      console.error(error);
      alert("Si è verificato un errore: " + error.message);
      setIsAnalyzing(false);
    }
  };

  const handleGenerateFinalDiet = async () => {
    setIsGeneratingFinal(true);
    try {
      const userId = cachedUserData?.id || cachedUserPrefs?.user_id;
      const { data: grokData, error: grokError } = await supabase.functions.invoke('generate-medical-diet', {
        body: { userId, action: 'generate', previewText: dietPreviewText, userPrefs: cachedUserPrefs }
      });
      
      if (grokError || grokData?.error) {
        throw new Error(grokError?.message || grokData?.error || "Errore IA Nutri AI");
      }
      
      setDietPreviewText(null);
      setUploadedFilePath(null);
      if (onDietUpdated) await onDietUpdated();
      
      setIsPdfModalOpen(true);
      
    } catch (error) {
      console.error(error);
      alert("Si è verificato un errore durante la generazione della dieta: " + error.message);
    } finally {
      setIsGeneratingFinal(false);
    }
  };
  const days = ['Giorno 1', 'Giorno 2', 'Giorno 3', 'Giorno 4', 'Giorno 5', 'Giorno 6', 'Giorno 7'];
  useEffect(() => {
    if (cachedUserData !== undefined || cachedUserPrefs !== undefined) {
      setIsLoading(false);
    }
  }, [cachedUserData, cachedUserPrefs, cachedDiet]);

  if (isLoading) {
    return (
      <div className="step-container" style={{ width: '100%', textAlign: 'center', padding: '40px 0' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px', borderTopColor: 'var(--celeste-primary)' }}></div>
        <p style={{ color: 'var(--color-muted)' }}>Sincronizzazione dati dal database...</p>
      </div>
    );
  }

  // === FUNZIONI PER LA SPESA INTELLIGENTE ===
  const handleOpenSpesa = async () => {
    // Controlliamo se abbiamo già i dati nel metadata
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.cap && user?.user_metadata?.address) {
      // Ha già i dati, procediamo direttamente alla generazione
      setSpesaForm({ cap: user.user_metadata.cap, address: user.user_metadata.address });
      generateShoppingList(user.id);
    } else {
      // Mostriamo il form
      setIsSpesaModalOpen(true);
    }
  };

  const handleSaveAndGenerateSpesa = async () => {
    if (!spesaForm.cap || !spesaForm.address) {
      alert("Inserisci CAP e Indirizzo per procedere.");
      return;
    }
    setIsSavingSpesa(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.auth.updateUser({
        data: { cap: spesaForm.cap, address: spesaForm.address }
      });
      setIsSpesaModalOpen(false);
      generateShoppingList(user.id);
    } catch (e) {
      console.error(e);
      alert("Errore nel salvataggio.");
    } finally {
      setIsSavingSpesa(false);
    }
  };

  const generateShoppingList = async (userId) => {
    if (!cachedDiet || cachedDiet.length === 0) {
      alert("Nessuna dieta trovata. Genera prima una dieta.");
      return;
    }

    // Identifica la porzione di dieta per la settimana selezionata (7 giorni)
    const weekIndex = parseInt(activeWeek.replace('week', '')) - 1;
    const startDay = weekIndex * 7;
    const endDay = startDay + 7;
    const weeklyDiet = cachedDiet.slice(startDay, endDay);

    // Crea un hash/identificatore per la cache locale in modo da risparmiare token
    const dietHash = weeklyDiet.map(d => d.meals[0]?.food?.substring(0, 10)).join('').replace(/\s/g, '');
    const cacheKey = `spesa_${userId}_${activeWeek}_${dietHash}`;
    const cachedSpesa = localStorage.getItem(cacheKey);

    setIsGeneratingSpesa(true);

    if (cachedSpesa) {
      // Se abbiamo già generato questa lista per questa esatta dieta, usiamo la cache
      setTimeout(() => {
        setShoppingList(JSON.parse(cachedSpesa));
        setIsGeneratingSpesa(false);
      }, 500); // Piccolo ritardo per UX
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("https://dkguwchycalrtsqxcttv.supabase.co/functions/v1/generate-shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId, dietJson: weeklyDiet }),
      });
      if (!res.ok) throw new Error("Errore durante la generazione della spesa");
      const data = await res.json();
      if (data.shoppingList) {
        setShoppingList(data.shoppingList);
        // Salviamo nella cache locale
        localStorage.setItem(cacheKey, JSON.stringify(data.shoppingList));
      }
    } catch (error) {
      console.error(error);
      alert("Si è verificato un errore durante la generazione della spesa.");
    } finally {
      setIsGeneratingSpesa(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      // 1. Aggiorna Auth Metadata
      await supabase.auth.updateUser({
        data: { cap: profileForm.cap, address: profileForm.address }
      });
      // 2. Aggiorna tabella users per nome e telefono se necessario
      if (cachedUserData?.id) {
        await supabase.from('users').update({
          first_name: profileForm.firstName,
          phone_number: profileForm.phone
        }).eq('id', cachedUserData.id);
      }
      setIsProfileModalOpen(false);
      alert("Profilo aggiornato con successo! Le modifiche verranno applicate al prossimo accesso o ricaricamento.");
    } catch (error) {
      console.error(error);
      alert("Errore durante l'aggiornamento del profilo.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const formatName = (str) => str ? str.replace(/\b\w/g, c => c.toUpperCase()) : '';
  let nomeCompleto = 'Utente NutriAI';
  if (isFamily) {
    nomeCompleto = cachedUserData?.last_name ? `Famiglia ${formatName(cachedUserData.last_name)}` : 'Famiglia';
  } else if (cachedUserData?.first_name) {
    nomeCompleto = `${formatName(cachedUserData.first_name)} ${formatName(cachedUserData.last_name || '')}`.trim();
  }

  // currentDay è ricalcolato poco sotto, ma serve per il "Corrente"
  let currentDay = 1;
  let estimatedWeight = cachedUserPrefs?.weight_kg || 0;
  let phaseName = 'Fase di Adattamento';
  let isLoss = cachedUserPrefs?.goal?.toLowerCase().includes('dimagrimento');

  if (dietStartDate && cachedUserPrefs) {
    const getRomeDateString = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d);
    const createdRomeStr = getRomeDateString(new Date(dietStartDate));
    const todayRomeStr = getRomeDateString(new Date());

    const createdDate = new Date(`${createdRomeStr}T00:00:00Z`);
    const today = new Date(`${todayRomeStr}T00:00:00Z`);
    const diffTime = today.getTime() - createdDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    currentDay = diffDays <= 0 ? 1 : diffDays;
    if (currentDay > 30) currentDay = 30;

    if (currentDay > 7 && currentDay <= 21) phaseName = 'Fase di Accelerazione';
    if (currentDay > 21) phaseName = 'Fase di Consolidamento';

    if (isLoss && cachedUserPrefs.target_weight_kg) {
      const startingWeight = Number(cachedUserPrefs.weight_kg);
      const target = Number(cachedUserPrefs.target_weight_kg);
      let weeklyDrop = 0.8;
      if (cachedUserPrefs.pacing === 'Conservativo') weeklyDrop = 0.5;
      if (cachedUserPrefs.pacing === 'Sprint') weeklyDrop = 1.2;

      const totalDropSoFar = (weeklyDrop / 7) * currentDay;
      estimatedWeight = startingWeight - totalDropSoFar;
      if (estimatedWeight < target) estimatedWeight = target;
    }
  }

  const currentWeekNum = Math.ceil(currentDay / 7);
  const activeWeekNum = Number(activeWeek.replace('week', ''));
  const isCurrentWeek = activeWeekNum === currentWeekNum;
  
  const getWeekRange = (w) => {
    if (w === 1) return '1-7';
    if (w === 2) return '8-14';
    if (w === 3) return '15-21';
    return '22-30';
  };
  
  const activeWeekDays = `Giorni ${getWeekRange(activeWeekNum)}${isCurrentWeek ? ' (Corrente)' : ''}`;

  const getActiveMeals = () => {
    if (!cachedDiet || !Array.isArray(cachedDiet)) return [];
    const weekNum = Number(activeWeek.replace('week', ''));
    const dayIndex = days.indexOf(activeDay);
    const targetDayNumber = (weekNum - 1) * 7 + dayIndex + 1;
    const dayItem = cachedDiet.find(d => d.day_number === targetDayNumber);
    return dayItem ? dayItem.meals : [];
  };



  const progressPercentage = (currentDay / 30) * 100;
    const hasNoDiet = !cachedDiet || !cachedUserPrefs;

    if (dietPreviewText) {
      return (
        <div className="view-enter" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-default)', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-title)', borderBottom: '2px solid var(--border-default)', paddingBottom: '12px' }}>
            Anteprima Analisi e Piano Nutrizionale
          </h2>
          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '12px', marginBottom: '24px', fontSize: '15px', lineHeight: '1.6', color: 'var(--color-body)' }}>
            {/* Convertiamo i line breaks in tag br */}
            {dietPreviewText.split('\\n').map((line, i) => (
              <span key={i}>
                {line.startsWith('- ') || line.startsWith('* ') ? (
                  <li style={{ marginLeft: '20px', marginBottom: '8px' }}>{line.substring(2)}</li>
                ) : line.startsWith('#') ? (
                  <h3 style={{ marginTop: '24px', marginBottom: '12px', color: 'var(--color-title)' }}>{line.replace(/#/g, '').trim()}</h3>
                ) : line.startsWith('**') && line.endsWith('**') ? (
                  <strong style={{ display: 'block', marginTop: '16px', marginBottom: '8px' }}>{line.replace(/\\*\\*/g, '')}</strong>
                ) : (
                  <span style={{ display: 'block', minHeight: '1rem' }}>{line}</span>
                )}
              </span>
            ))}
          </div>
          
          <div style={{ padding: '16px 0', borderTop: '1px solid var(--border-default)', marginTop: '8px', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '14px', color: 'var(--color-body)' }}>
              <input 
                type="checkbox" 
                checked={hasAcceptedDisclaimer} 
                onChange={(e) => setHasAcceptedDisclaimer(e.target.checked)} 
                style={{ marginTop: '4px', width: '20px', height: '20px', accentColor: 'var(--celeste-primary)' }} 
              />
              <span style={{ lineHeight: '1.5' }}>
                Ho letto le <strong>Avvertenze Importanti</strong>. Sono consapevole che questo piano è generato da un'intelligenza artificiale e non sostituisce in alcun modo il parere di un medico curante o di un dietista professionista.
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-default)' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                if(window.confirm('Vuoi annullare questa dieta e tornare alla dashboard?')) {
                  setDietPreviewText(null);
                  setUploadedFilePath(null);
                  setHasAcceptedDisclaimer(false);
                }
              }}
              disabled={isGeneratingFinal}
            >
              Annulla
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleGenerateFinalDiet}
              disabled={isGeneratingFinal || !hasAcceptedDisclaimer}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: (!hasAcceptedDisclaimer) ? 0.6 : 1 }}
            >
              {isGeneratingFinal ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'var(--bg-app)' }}></div>
                  Creazione in corso...
                </>
              ) : (
                'Completa Dieta'
              )}
            </button>
          </div>
        </div>
      );
    }

  if (hasNoDiet) {
    return (
      <div className="step-container" style={{ width: '100%', textAlign: 'center', padding: '10px 0' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--celeste-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--celeste-primary)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
        </div>
        <h2 className="step-title" style={{ marginBottom: '12px' }}>Nessun Piano Attivo</h2>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '32px', lineHeight: '1.5' }}>Non hai ancora configurato i tuoi dati biometrici e nutrizionali per generare la dieta con l'agente IA.</p>
        <button type="button" className="btn btn-primary" onClick={onStartDiet} style={{ margin: '0 auto', display: 'flex', justifyContent: 'center' }}>Genera la tua Dieta</button>
        <button type="button" className="btn btn-secondary" onClick={async () => { await supabase.auth.signOut(); onLogout(); }} style={{ margin: '12px auto 0', display: 'flex', justifyContent: 'center' }}>Esci</button>
      </div>
    );
  }

  // ==== RENDER UNIFIED VIEW ====
  const renderUnifiedView = () => (
    <div className="view-enter" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* 1. Header Profilo */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '24px', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isFamily ? (
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--celeste-light)', border: '2px solid var(--border-default)', color: 'var(--celeste-primary)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
            ) : (
              <img 
                src={currentAvatar} 
                alt="Profilo Utente" 
                onClick={() => setIsAvatarModalOpen(true)}
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '2px solid var(--border-default)', backgroundColor: 'var(--bg-card)' }}
              />
            )}
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-title)', margin: 0 }}>Ciao, {isFamily ? nomeCompleto : nomeCompleto.split(' ')[0]}</h2>
              <p style={{ fontSize: '14px', color: 'var(--color-muted)', margin: '4px 0 0 0' }}>
                {cachedUserData?.email || 'Utente Verificato'}
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '4px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', fontSize: '12px', fontWeight: '600', color: 'var(--celeste-primary)' }}>
                <span>{cachedUserPrefs.goal}</span>
                <span>•</span>
                <span>{cachedUserPrefs.diet_type}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                setProfileForm({
                  firstName: cachedUserData?.first_name || '',
                  phone: cachedUserData?.phone_number || '',
                  cap: user?.user_metadata?.cap || spesaForm.cap || '',
                  address: user?.user_metadata?.address || spesaForm.address || ''
                });
                setIsProfileModalOpen(true);
              }}
              style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}
            >
              Modifica Profilo
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={async () => { await supabase.auth.signOut(); onLogout(); }} 
              style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}
            >
              Esci
            </button>
          </div>
        </div>
      </section>

      {/* 2. Monitoraggio & Dati */}
      <section>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-title)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          I Tuoi Dati & Progresso
        </h3>
        
        {/* Widget Progresso Obiettivi */}
        <div style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(16, 185, 129, 0.05))', border: '1px solid var(--celeste-border)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--celeste-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{phaseName}</span>
              <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-title)', margin: '4px 0 0 0' }}>Giorno {currentDay} <span style={{ fontSize: '16px', color: 'var(--color-muted)', fontWeight: '600' }}>/ 30</span></h3>
            </div>
            {isLoss && cachedUserPrefs?.target_weight_kg && !isFamily && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', fontWeight: '500' }}>Proiezione Peso</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-title)' }}>{estimatedWeight.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--color-muted)' }}>kg</span></div>
              </div>
            )}
          </div>
          <div style={{ height: '8px', backgroundColor: 'var(--border-default)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progressPercentage}%`, background: 'linear-gradient(90deg, var(--celeste-primary), var(--celeste-hover))', borderRadius: '4px', transition: 'width 1s ease-in-out' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--color-muted)', fontWeight: '500' }}>
            <span>Inizio</span>
            <span>Target ({isFamily ? 'Salute Famigliare' : (cachedUserPrefs?.target_weight_kg ? cachedUserPrefs.target_weight_kg + ' kg' : 'Mantenimento')})</span>
          </div>
        </div>

        {!isFamily ? (
          /* Metriche Corporee Individuali */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Età</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-title)', marginTop: '6px' }}>{cachedUserPrefs.age}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Alt</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-title)', marginTop: '6px' }}>{cachedUserPrefs.height_cm}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Peso</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-title)', marginTop: '6px' }}>{cachedUserPrefs.weight_kg}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Attività</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--celeste-primary)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cachedUserPrefs.activity_level}</div>
            </div>
          </div>
        ) : (
          /* Componenti Famiglia */
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-title)', margin: 0 }}>
                Componenti Famiglia <span style={{ color: 'var(--color-muted)', fontWeight: 'normal', fontSize: '14px' }}>({(cachedUserPrefs.family_members || []).length})</span>
              </h4>
              <button type="button" className="btn btn-primary" onClick={() => setIsAddMemberModalOpen(true)} style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}>+ Aggiungi Membro</button>
            </div>
            
            {(!cachedUserPrefs.family_members || cachedUserPrefs.family_members.length === 0 || !Array.isArray(cachedUserPrefs.family_members)) ? (
              <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--color-title)', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Nessun familiare registrato</p>
                <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '16px' }}>Aggiungi i componenti della tua famiglia per personalizzare i menù.</p>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddMemberModalOpen(true)}>Inizia ad aggiungerne uno</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {cachedUserPrefs.family_members.map(member => (
                <div key={member.id} style={{ padding: '16px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', position: 'relative', transition: 'transform 0.2s', cursor: 'default' }}>
                  <button type="button" onClick={() => handleRemoveMember(member.id)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }} title="Rimuovi Componente">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--color-title)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {member.role} - {member.name}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--color-muted)', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-default)' }}>
                    <span style={{ backgroundColor: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>{member.age} anni</span>
                    <span style={{ backgroundColor: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}>{member.weight} kg</span>
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', color: '#ef4444' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--color-title)', display: 'block', marginBottom: '2px' }}>Allergie:</strong>
                        <span style={{ color: 'var(--color-muted)' }}>{member.allergies?.length > 0 ? member.allergies.join(', ') : 'Nessuna'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', color: '#f59e0b' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--color-title)', display: 'block', marginBottom: '2px' }}>Da Escludere:</strong>
                        <span style={{ color: 'var(--color-muted)' }}>{member.excluded_foods || 'Nessuna preferenza'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            )}
            <div style={{ marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={onRegenerate} style={{ width: '100%', borderColor: 'var(--celeste-primary)', color: 'var(--celeste-primary)', fontWeight: '600' }}>Rigenera Menù Famigliare</button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Il tuo Menù (Spostato sotto i dati di progresso) */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-title)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Il Tuo Piano Alimentare
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleOpenSpesa} 
              style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--celeste-primary)', color: 'var(--celeste-primary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              {hasSavedSpesa ? 'Completa Spesa' : 'Ordina Spesa'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setIsPdfModalOpen(true)} style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Scarica PDF
            </button>
          </div>
        </div>
        
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', padding: '24px' }}>
          {/* Week Selector */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-default)', scrollbarWidth: 'none' }}>
            {['week1', 'week2', 'week3', 'week4'].map((week, idx) => (
              <button key={week} type="button" className={`pill-option ${activeWeek === week ? 'selected' : ''}`} onClick={() => setActiveWeek(week)} style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '24px', whiteSpace: 'nowrap', fontWeight: '600' }}>
                Settimana {idx + 1}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '24px', fontWeight: '500' }}>Validità nutrizionale: <span style={{ color: 'var(--color-title)' }}>{activeWeekDays}</span></p>

          {/* Days Selector Tabs */}
          <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', marginBottom: '32px', scrollbarWidth: 'none' }}>
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                style={{
                  padding: '14px 16px', fontSize: '15px', fontWeight: '700', borderRadius: 'var(--radius-md)',
                  backgroundColor: activeDay === day ? 'var(--color-title)' : 'var(--bg-subtle)',
                  color: activeDay === day ? '#ffffff' : 'var(--color-muted)',
                  border: activeDay === day ? 'none' : '1px solid var(--border-default)',
                  cursor: 'pointer', whiteSpace: 'nowrap', flex: '1', textAlign: 'center', transition: 'all 0.2s ease'
                }}
              >
                {day.replace('Giorno ', 'G. ')}
              </button>
            ))}
          </div>

          {/* Active Day Meals List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
            {getActiveMeals().length > 0 ? (
              getActiveMeals().map((meal, index) => {
                const getMealImage = (mealName, idx) => {
                  const name = mealName.toLowerCase();
                  if (name.includes('colazione')) return "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600"; // Pancakes/Frutta
                  if (name.includes('spuntino') || name.includes('merenda')) {
                    return idx % 2 === 0 
                      ? "https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=600" // Ciotola di frutta
                      : "https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=600"; // Cibo salutare flatlay
                  }
                  if (name.includes('pranzo')) return "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600"; // Insalatona sana
                  if (name.includes('cena')) return "https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg?auto=compress&cs=tinysrgb&w=600"; // Piatto di pesce/salmone
                  return "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=600"; // Fallback piatto generico
                };

                return (
                  <div key={index} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--bg-app)', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <img src={getMealImage(meal.name, index)} alt={meal.name} style={{ width: '100%', height: '160px', objectFit: 'cover', borderBottom: '1px solid var(--border-default)' }} />
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--celeste-primary)', letterSpacing: '0.1em' }}>{meal.name}</div>
                      <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--color-title)', lineHeight: '1.6' }}>{meal.food}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '64px 0', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-default)' }}>
                <p style={{ color: 'var(--color-title)', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Nessun pasto registrato</p>
                <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Seleziona un altro giorno o rigenera la dieta.</p>
              </div>
            )}
          </div>

          {/* Gestione Piano */}
          <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--border-default)', paddingTop: '24px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => { 
                if(window.confirm('Vuoi eliminare definitivamente la dieta attuale (incluso il PDF) e generarne una nuova? L\'operazione non è reversibile.')) {
                  if(onDeleteDiet) onDeleteDiet(); 
                }
              }} 
              style={{ 
                color: '#ffffff', 
                backgroundColor: '#059669', // Verde speranza scuro
                borderColor: '#047857',
                fontWeight: '600',
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#047857'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            >
              Elimina e genera nuova dieta
            </button>
          </div>
        </div>
      </section>

      {/* 4. Analisi Medica */}
      <section>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-title)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Servizi Clinici
        </h3>
        <div style={{ padding: '32px 24px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--bg-subtle)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--celeste-primary)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          </div>
          <h4 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-title)', margin: '0 0 8px 0' }}>Analisi Clinica Avanzata</h4>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: '1.6', maxWidth: '400px' }}>Carica le tue analisi del sangue. L'Intelligenza Artificiale le interpreterà per calibrare la tua dieta sui veri valori ematici.</p>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf" style={{ display: 'none' }} />
          <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 24px', fontWeight: '600' }}>
            {isAnalyzing ? "Analisi in corso..." : "Carica Referto Medico"}
          </button>
        </div>
      </section>

    </div>
  );



  const medicalLoadingTexts = [
    "Scansione del referto medico in corso...",
    "Lettura e interpretazione dei valori ematici...",
    "Nutri AI sta analizzando colesterolo, glicemia e altri parametri...",
    "Definizione delle restrizioni e degli obiettivi terapeutici...",
    "Calcolo del fabbisogno calorico personalizzato...",
    "Elaborazione del piano dei pasti clinico di 30 giorni..."
  ];

  return (
    <div className="is-app-mode" style={{ width: '100vw', minHeight: '100vh', backgroundColor: 'var(--bg-app)', position: 'absolute', top: 0, left: 0 }}>
      {isAnalyzing && <AILoadingOverlay customTexts={medicalLoadingTexts} />}
      {/* Global Navigation & Modals */}
      <NavigationBar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        cartItemCount={cartItems.length}
        onOpenCart={() => setIsCartOpen(true)}
      />
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cartItems={cartItems} 
        onRemoveItem={handleRemoveFromCart}
      />

      {/* Main Content Area */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px 100px 16px' }}>
        {activeView === 'diet' && renderUnifiedView()}
        {activeView === 'store' && <StoreSection onAddToCart={handleAddToCart} />}
      </main>

      {/* PDF Modal & Avatar Modal (Hidden by default) */}
        {isAddMemberModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--color-title)' }}>Nuovo Familiare</h3>
                <button onClick={() => setIsAddMemberModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-muted)' }}>&times;</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Ruolo</label>
                  <select className="form-input" value={newMemberData.role} onChange={(e) => setNewMemberData({...newMemberData, role: e.target.value, gender: (e.target.value==='Papà'||e.target.value==='Figlio'||e.target.value==='Nonno') ? 'Uomo' : 'Donna'})}>
                    <option value="Mamma">Mamma</option><option value="Papà">Papà</option><option value="Figlio">Figlio</option><option value="Figlia">Figlia</option><option value="Nonna">Nonna</option><option value="Nonno">Nonno</option><option value="Zio">Zio</option><option value="Zia">Zia</option>
                  </select>
                </div>
                <div><label className="form-label">Nome</label><input type="text" className="form-input" placeholder="Es. Giulia" value={newMemberData.name} onChange={e => setNewMemberData({...newMemberData, name: e.target.value})} /></div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}><label className="form-label">Età</label><input type="number" className="form-input" value={newMemberData.age} onChange={e => setNewMemberData({...newMemberData, age: e.target.value})} /></div>
                  <div style={{ flex: 1 }}><label className="form-label">Peso (kg)</label><input type="number" className="form-input" value={newMemberData.weight} onChange={e => setNewMemberData({...newMemberData, weight: e.target.value})} /></div>
                </div>
                <div>
                  <label className="form-label">Allergie</label>
                  <input type="text" className="form-input" placeholder="Scrivi e premi Invio" value={newMemberData.tempAllergy} onChange={e => setNewMemberData({...newMemberData, tempAllergy: e.target.value})} onKeyDown={handleAddAllergyToNewMember} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {newMemberData.allergies.map((al, idx) => (
                      <span key={idx} style={{ padding: '4px 8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {al} <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setNewMemberData(prev => ({...prev, allergies: prev.allergies.filter((_, i) => i !== idx)}))}>&times;</button>
                      </span>
                    ))}
                  </div>
                </div>
                <div><label className="form-label">Cibi da escludere</label><input type="text" className="form-input" placeholder="Es. Funghi, Peperoni..." value={newMemberData.excluded_foods} onChange={e => setNewMemberData({...newMemberData, excluded_foods: e.target.value})} /></div>
                <button type="button" className="btn btn-primary" onClick={handleAddNewMemberSubmit} style={{ marginTop: '8px' }}>Aggiungi alla Famiglia</button>
              </div>
            </div>
          </div>
        )}

        {isSpesaModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--color-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--celeste-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  Consegna Spesa
                </h3>
                <button onClick={() => setIsSpesaModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-muted)' }}>&times;</button>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
                Inserisci l'indirizzo per verificare la copertura di Amazon Fresh o trovare i supermercati convenzionati vicino a te. Lo chiederemo solo questa volta.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Nome e Cognome</label>
                  <input type="text" className="form-input" value={nomeCompleto} disabled style={{ backgroundColor: 'var(--bg-subtle)' }} />
                </div>
                <div>
                  <label className="form-label">Numero di Telefono</label>
                  <input type="text" className="form-input" value={cachedUserData?.phone_number || ''} disabled style={{ backgroundColor: 'var(--bg-subtle)' }} />
                </div>
                <div>
                  <label className="form-label">CAP (Codice Avviamento Postale)</label>
                  <input type="text" className="form-input" placeholder="Es. 20100" value={spesaForm.cap} onChange={e => setSpesaForm({...spesaForm, cap: e.target.value})} maxLength={5} />
                </div>
                <div>
                  <label className="form-label">Indirizzo di Consegna</label>
                  <input type="text" className="form-input" placeholder="Es. Via Roma 10" value={spesaForm.address} onChange={e => setSpesaForm({...spesaForm, address: e.target.value})} />
                </div>
                <button type="button" className="btn btn-primary" onClick={handleSaveAndGenerateSpesa} disabled={isSavingSpesa} style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                  {isSavingSpesa ? 'Salvataggio...' : 'Salva e Genera Spesa'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isProfileModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--color-title)' }}>Modifica Profilo</h3>
                <button onClick={() => setIsProfileModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-muted)' }}>&times;</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Nome</label>
                  <input type="text" className="form-input" value={profileForm.firstName} onChange={e => setProfileForm({...profileForm, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Numero di Telefono</label>
                  <input type="text" className="form-input" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">CAP</label>
                  <input type="text" className="form-input" maxLength={5} value={profileForm.cap} onChange={e => setProfileForm({...profileForm, cap: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Indirizzo di Consegna</label>
                  <input type="text" className="form-input" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} />
                </div>
                <button type="button" className="btn btn-primary" onClick={handleSaveProfile} disabled={isSavingProfile} style={{ marginTop: '8px' }}>
                  {isSavingProfile ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isGeneratingSpesa && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div className="spinner" style={{ width: '50px', height: '50px', borderTopColor: 'var(--celeste-primary)', marginBottom: '20px' }}></div>
            <h3 style={{ color: 'white', margin: 0 }}>Preparazione Lista Spesa...</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>L'IA sta elaborando gli ingredienti della tua settimana.</p>
          </div>
        )}

        {shoppingList && !isGeneratingSpesa && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-default)', paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: 'var(--color-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--celeste-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  La tua Lista della Spesa
                </h3>
                <button onClick={() => setShoppingList(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--color-muted)' }}>&times;</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {Object.entries(shoppingList).map(([category, items]) => {
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={category} style={{ backgroundColor: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--celeste-primary)' }}>{category}</h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map((item, idx) => (
                          <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', paddingBottom: '4px' }}>
                            <span style={{ color: 'var(--color-title)' }}>{item.item}</span>
                            <span style={{ fontWeight: '600', color: 'var(--color-muted)' }}>{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 24px', borderRadius: 'var(--radius-md)', fontWeight: '600' }} 
                  onClick={() => generateAndShareShoppingListPdf(nomeCompleto, activeWeek, shoppingList)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                  Condividi Lista
                </button>
              </div>

              <SpesaMapSection 
                cap={cachedUserData?.user_metadata?.cap || spesaForm.cap} 
                address={cachedUserData?.user_metadata?.address || spesaForm.address}
                onSelectSupermarket={(market) => {
                  setIsSyncingCart(true);
                  const marketName = market.name || market;
                  setTimeout(() => {
                    setIsSyncingCart(false);
                    const searchUrl = marketName.includes('Amazon') 
                      ? 'https://www.amazon.it/fmc/m/300030560' // Link diretto ad Amazon Fresh
                      : `https://www.google.com/search?q=${encodeURIComponent(marketName + " spesa online")}`;
                    window.open(searchUrl, '_blank');
                    alert(`💡 DEMO MODE: L'integrazione automatica del carrello B2B con ${marketName} sarà attiva nella versione Enterprise. Per ora sei stato reindirizzato al loro sito web ufficiale.`);
                  }, 2500);
                }}
              />

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-default)', display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShoppingList(null)}>Chiudi</button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1, backgroundColor: '#059669', borderColor: '#047857' }} 
                  onClick={() => {
                    if (cachedUserData?.id) {
                      localStorage.setItem(`spesa_saved_${cachedUserData.id}_${activeWeek}`, "true");
                    }
                    setShoppingList(null);
                  }}
                >
                  Ordina Dopo
                </button>
              </div>
            </div>
          </div>
        )}

        <DietViewerModal 
          isOpen={isPdfModalOpen} 
          userName={nomeCompleto}
          userId={cachedUserData?.id}
          userPhone={cachedUserData?.phone_number}
          onClose={() => { setIsPdfModalOpen(false); }} 
          dietPlans={cachedDiet && Array.isArray(cachedDiet) ? cachedDiet : null}
          userPrefs={cachedUserPrefs} 
        />

      {isAvatarModalOpen && (
        <div className="pdf-modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--border-default)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '8px', textAlign: 'center', color: 'var(--color-title)' }}>Scegli il tuo Avatar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' }}>
              {avatarOptions.map((avatarUrl, idx) => (
                <div key={idx} onClick={() => { setCurrentAvatar(avatarUrl); if (cachedUserData?.id) localStorage.setItem(`avatar_${cachedUserData.id}`, avatarUrl); setIsAvatarModalOpen(false); }} style={{ cursor: 'pointer', borderRadius: '50%', border: currentAvatar === avatarUrl ? '3px solid var(--celeste-primary)' : '3px solid transparent', padding: '2px', transition: 'all 0.2s' }}>
                  <img src={avatarUrl} alt={`Avatar ${idx}`} style={{ width: '100%', borderRadius: '50%', backgroundColor: avatarUrl.includes('dicebear') ? '#f1f5f9' : 'transparent' }} />
                </div>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={() => setIsAvatarModalOpen(false)} style={{ width: '100%', marginTop: '24px' }}>Chiudi</button>
          </div>
        </div>
      )}

      {/* Rende l'Agente NutriAI fluttuante in basso a destra */}
      <NutriChat 
        userId={cachedUserData?.id || cachedUserPrefs?.user_id} 
        userName={cachedUserData?.first_name} 
        userPrefs={cachedUserPrefs} 
      />
    </div>
  );
}
