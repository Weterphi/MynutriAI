import React from 'react';

export default function StoreSection({ onAddToCart }) {
  const products = [
    {
      id: 1,
      name: "Focus Formula AI",
      category: "Nootropo",
      description: "Ottimizza concentrazione e memoria per affrontare la giornata con lucidità assoluta.",
      price: "34.00",
      image: "🧠", // Placeholder for 3D mockup
      benefits: ["Memoria", "Focus", "Energia"]
    },
    {
      id: 2,
      name: "Night Recovery",
      category: "Recupero",
      description: "Miscela studiata dall'IA per massimizzare il riposo REM e il recupero muscolare notturno.",
      price: "29.00",
      image: "🌙",
      benefits: ["Sonno REM", "Recupero", "Relax"]
    },
    {
      id: 3,
      name: "Metabolic Boost",
      category: "Metabolismo",
      description: "Accelera il metabolismo basale in sinergia con il tuo piano nutrizionale NutriAI.",
      price: "39.00",
      image: "⚡",
      benefits: ["Termogenico", "Energia", "Controllo Peso"]
    }
  ];

  return (
    <div className="store-section view-enter">
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-title)' }}>MyNutriAI Store</h2>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>Integratori raccomandati dalla tua Intelligenza Artificiale</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px' 
      }}>
        {products.map(product => (
          <div 
            key={product.id}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all var(--transition-normal)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--celeste-border)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            {/* Immagine / Icona */}
            <div style={{ 
              height: '160px', 
              backgroundColor: 'var(--bg-subtle)', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '64px'
            }}>
              {product.image}
            </div>

            {/* Dettagli */}
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--celeste-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {product.category}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-title)', margin: '4px 0 8px 0' }}>
                {product.name}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                {product.description}
              </p>

              {/* Tag benefits */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                {product.benefits.map((benefit, idx) => (
                  <span key={idx} style={{ 
                    fontSize: '11px', 
                    backgroundColor: 'var(--bg-app)', 
                    border: '1px solid var(--border-default)',
                    padding: '2px 8px', 
                    borderRadius: '20px',
                    color: 'var(--color-body)'
                  }}>
                    {benefit}
                  </span>
                ))}
              </div>
            </div>

            {/* Prezzo e CTA */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-default)', paddingTop: '16px', marginTop: 'auto' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-title)' }}>
                €{product.price}
              </span>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px', margin: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddToCart) onAddToCart(product);
                }}
              >
                Aggiungi
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
