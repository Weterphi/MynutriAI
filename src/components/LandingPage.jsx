

export default function LandingPage({ onStartDiet, onLogin }) {
  return (
    <div className="step-container" style={{ textAlign: 'center', padding: '32px 16px' }}>
      {/* Immagine del Logo Ufficiale Gigante (Niente bordi o sfondi) */}
      <img 
        src="/logo.png?v=3" 
        alt="NutriAI Logo Ufficiale"
        style={{ 
          width: '100%',
          maxWidth: '380px', 
          height: 'auto', 
          margin: '0 auto 24px',
          display: 'block',
          animation: 'pulse 3s infinite alternate'
        }}
      />
      
      
      <p 
        style={{ 
          fontSize: '16px', 
          color: 'var(--color-body)', 
          maxWidth: '440px', 
          margin: '0 auto 48px', 
          lineHeight: '1.7',
          fontWeight: '400'
        }}
      >
        Il primo Nutrizionista basato su <b>Intelligenza Artificiale</b>.
        Piani alimentari iper-personalizzati e invio automatico dei pasti quotidiani su WhatsApp.
      </p>

      {/* Button CTAs Group */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          maxWidth: '300px', 
          margin: '0 auto' 
        }}
      >
        <button
          type="button"
          id="btn-home-start"
          className="btn btn-primary"
          onClick={onStartDiet}
          style={{ 
            width: '100%', 
            padding: '16px 28px', 
            fontSize: '16px', 
            fontWeight: '600',
            marginLeft: 0,
            justifyContent: 'center',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          Genera Piano Nutrizionale
        </button>

        <button
          type="button"
          id="btn-home-login"
          className="btn btn-secondary"
          onClick={onLogin}
          style={{ 
            width: '100%', 
            padding: '16px 28px', 
            fontSize: '15px', 
            fontWeight: '600',
            justifyContent: 'center',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          Accedi al Portale
        </button>
      </div>

      <div style={{ 
        marginTop: '56px', 
        fontSize: '12px', 
        color: '#000000',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px'
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--celeste-primary)', boxShadow: '0 0 8px var(--celeste-primary)' }}></div>
        Sistema AI Online e Operativo
      </div>
      
      {/* Animazione CSS inline per il respiro del logo */}
      <style>{`
        @keyframes pulse {
          0% { filter: drop-shadow(0 4px 10px rgba(16, 185, 129, 0.2)); transform: translateY(0); }
          100% { filter: drop-shadow(0 8px 25px rgba(16, 185, 129, 0.5)); transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
