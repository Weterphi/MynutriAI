import React, { useState, useEffect } from 'react';

const defaultLoadingTexts = [
  "Analizzando i parametri biometrici...",
  "Calcolando il fabbisogno calorico e i macronutrienti...",
  "Nutri AI sta elaborando il piano dei pasti...",
  "Ottimizzazione delle ricette per il tuo obiettivo...",
  "Creazione del piano di 30 giorni in corso..."
];

export default function AILoadingOverlay({ customTexts }) {
  const texts = customTexts || defaultLoadingTexts;
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % texts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [texts.length]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      color: '#fff',
      fontFamily: 'var(--font-family, "Inter", sans-serif)'
    }}>
      
      {/* Pulsing Logo Container */}
      <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '40px' }}>
        
        {/* Animated Rings */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: '2px solid var(--celeste-primary, #10b981)',
          animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          width: '120%',
          height: '120%',
          borderRadius: '50%',
          border: '1px solid rgba(16, 185, 129, 0.5)',
          animation: 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
          animationDelay: '0.5s'
        }}></div>
        
        {/* Logo */}
        <div style={{
          width: '140px',
          height: '140px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2,
          backgroundColor: '#fff',
          borderRadius: '50%',
          boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)',
        }}>
          <img 
            src="/logo.png?v=3" 
            alt="NutriAI Logo" 
            style={{ width: '80%', height: 'auto', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Title */}
      <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', letterSpacing: '0.5px' }}>
        Generando la tua Dieta...
      </h2>

      {/* Rotating Text */}
      <div style={{ height: '24px', overflow: 'hidden', position: 'relative', width: '100%', textAlign: 'center' }}>
        {texts.map((text, idx) => (
          <p
            key={idx}
            style={{
              position: 'absolute',
              width: '100%',
              fontSize: '15px',
              color: 'var(--celeste-primary, #10b981)',
              fontWeight: '500',
              opacity: idx === textIndex ? 1 : 0,
              transform: idx === textIndex ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
              margin: 0
            }}
          >
            {text}
          </p>
        ))}
      </div>
      
      {/* Small disclaimer */}
      <p style={{ marginTop: '40px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', maxWidth: '300px', textAlign: 'center', lineHeight: '1.5' }}>
        La nostra Intelligenza Artificiale sta elaborando milioni di combinazioni. Potrebbe richiedere fino a 15 secondi.
      </p>

      <style>
        {`
          @keyframes ping {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            75%, 100% {
              transform: scale(1.8);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
}
