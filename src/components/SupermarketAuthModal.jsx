import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function SupermarketAuthModal({ marketId, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Non sei autenticato.");
      }

      // POST AL BACKEND SUPABASE EDGE FUNCTION
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-supermarket-auth`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ marketId, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore durante il salvataggio");
      }

      onSuccess();
    } catch (err) {
      console.error("Errore salvataggio credenziali:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRegistrationLink = () => {
    const market = marketId ? marketId.toLowerCase() : '';
    if (market.includes('amazon')) return 'https://www.amazon.it/register';
    if (market.includes('conad')) return 'https://www.conad.it/registrazione';
    if (market.includes('carrefour')) return 'https://www.carrefour.it/registrazione';
    return '#';
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
      <div className="modal-content" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--color-title)', width: '100%', maxWidth: '400px', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-default)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--celeste-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          Collega {marketId}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
          L'intelligenza artificiale userà queste credenziali esclusivamente per riempire in automatico il tuo carrello su {marketId}. I tuoi dati verranno criptati e salvati in sicurezza.
        </p>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Email / Username</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder={`La tua email su ${marketId}`}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--color-title)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="Inserisci la password"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)', color: 'var(--color-title)', outline: 'none' }}
            />
          </div>
          <div className="actions" style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: '12px' }}>Annulla</button>
            <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '12px', backgroundColor: '#D4AF37', color: '#000', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Salvataggio...' : 'Collega Account'}
            </button>
          </div>
        </form>
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a href={getRegistrationLink()} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--celeste-primary)', textDecoration: 'none' }}>
            Non hai un account su {marketId}? Registrati ora sul sito ufficiale.
          </a>
        </div>
      </div>
    </div>
  );
}
