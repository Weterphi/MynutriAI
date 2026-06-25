import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ShoppingProgress = ({ jobId, marketId, onComplete }) => {
  const [status, setStatus] = useState('pending');
  const [fade, setFade] = useState('fade-in');
  const [missingItems, setMissingItems] = useState([]);

  useEffect(() => {
    if (!jobId) return;

    // Iscrizione al canale Realtime filtrato per questo specifico Job
    const jobChannel = supabase
      .channel(`public:shopping_jobs:id=eq.${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopping_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const newStatus = payload.new.status;
          
          if (newStatus !== status) {
            // Effetto fade transition
            setFade('fade-out');
            setTimeout(() => {
              setStatus(newStatus);
              if (payload.new.missing_items && Array.isArray(payload.new.missing_items)) {
                  setMissingItems(payload.new.missing_items);
              }
              setFade('fade-in');
            }, 300);
          }
          
          if (newStatus === 'completed' || newStatus === 'failed') {
            // Piccolo delay per far leggere lo stato completed prima di smontare
            setTimeout(() => {
                onComplete(newStatus);
            }, 3000);
          }
        }
      )
      .subscribe();

    // Polling di sicurezza (fallback nel caso WebSocket fallisca/disconnetta)
    const interval = setInterval(async () => {
        const { data } = await supabase.from('shopping_jobs').select('status, missing_items').eq('id', jobId).single();
        if (data && data.status !== status) {
            const newStatus = data.status;
            setFade('fade-out');
            setTimeout(() => {
                setStatus(newStatus);
                if (data.missing_items && Array.isArray(data.missing_items)) {
                    setMissingItems(data.missing_items);
                }
                setFade('fade-in');
            }, 300);
            if (newStatus === 'completed' || newStatus === 'failed') {
                setTimeout(() => { onComplete(newStatus); }, 3000);
            }
        }
    }, 5000);

    return () => {
      supabase.removeChannel(jobChannel);
      clearInterval(interval);
    };
  }, [jobId, status, onComplete]);

  // Gestione dei testi dinamici
  const getStatusText = () => {
    switch (status) {
      case 'pending': return 'In attesa di un agente disponibile...';
      case 'processing': return 'L\'AI sta riempiendo il tuo carrello. Non chiudere l\'app...';
      case 'completed': return 'Carrello pronto!';
      case 'failed': return 'Si è verificato un errore durante l\'inserimento.';
      default: return 'Caricamento...';
    }
  };

  const getSupermarketLink = () => {
      if (!marketId) return '#';
      const m = marketId.toLowerCase();
      if (m.includes('amazon')) return 'https://www.amazon.it/fresh/cart';
      if (m.includes('conad')) return 'https://spesaonline.conad.it/carrello';
      if (m.includes('coop')) return 'https://www.coopshop.it/carrello';
      return '#';
  };

  return (
    <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(18, 18, 18, 0.95)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        color: '#fff',
        fontFamily: 'var(--font-family, "Inter", sans-serif)'
    }}>
      
      {/* Animazione/Spinner Premium */}
      {(status === 'pending' || status === 'processing') && (
        <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '3px solid transparent',
                borderTopColor: '#D4AF37',
                borderBottomColor: '#D4AF37',
                animation: 'spin 1.5s linear infinite'
            }}></div>
            <div style={{
                position: 'absolute',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                border: '2px solid transparent',
                borderLeftColor: 'rgba(212, 175, 55, 0.5)',
                borderRightColor: 'rgba(212, 175, 55, 0.5)',
                animation: 'spin 1s linear infinite reverse'
            }}></div>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        </div>
      )}

      {status === 'completed' && (
          <div style={{ marginBottom: '30px', animation: 'scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
      )}

      {status === 'failed' && (
          <div style={{ marginBottom: '30px', animation: 'scaleUp 0.5s' }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          </div>
      )}

      {/* Testo di Stato con Transizione */}
      <div 
        style={{ 
            color: '#D4AF37', 
            fontSize: '1.25rem', 
            fontWeight: '600',
            marginBottom: '2rem',
            textAlign: 'center',
            opacity: fade === 'fade-in' ? 1 : 0,
            transition: 'opacity 0.3s ease',
            padding: '0 20px'
        }}
      >
        {getStatusText()}
      </div>

      {status === 'completed' && (
          <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'fadeUp 0.5s ease',
              maxWidth: '500px',
              width: '100%'
          }}>
              {missingItems.length > 0 && (
                  <div style={{
                      backgroundColor: 'rgba(26, 26, 26, 0.9)',
                      border: '1px solid #D4AF37',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '24px',
                      width: '100%',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}>
                      <div style={{ color: '#D4AF37', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                          Articoli non trovati
                      </div>
                      <p style={{ fontSize: '14px', color: '#ccc', marginBottom: '12px' }}>
                          Il tuo carrello è pronto! Tuttavia, i seguenti articoli erano esauriti e non sono stati inseriti. Puoi provare a sostituirli manualmente prima di pagare:
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#fff', fontSize: '14px' }}>
                          {missingItems.map((item, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>
                                  {item.item || item.prodotto} ({item.quantity || item.quantita})
                              </li>
                          ))}
                      </ul>
                  </div>
              )}

              <a 
                href={getSupermarketLink()}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    backgroundColor: '#D4AF37',
                    color: '#000',
                    padding: '16px 32px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                    display: 'inline-block'
                }}
              >
                  Apri il sito del supermercato per pagare
              </a>
          </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes scaleUp {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeUp {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default ShoppingProgress;
