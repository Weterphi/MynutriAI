import React from 'react';

export default function CartDrawer({ isOpen, onClose, cartItems, onRemoveItem }) {
  const total = cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`cart-drawer-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-title)', margin: 0 }}>
            Il tuo Carrello
          </h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--color-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="cart-body">
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🛒</div>
              <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Il tuo carrello è vuoto.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cartItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-default)' }}>
                  <div style={{ width: '60px', height: '60px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                    {item.image}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-title)', margin: '0 0 4px 0' }}>{item.name}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>{item.category}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-title)' }}>€{item.price}</span>
                      <button 
                        onClick={() => onRemoveItem(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                      >
                        Rimuovi
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cart-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-muted)' }}>Subtotale</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-title)' }}>€{total.toFixed(2)}</span>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px', fontSize: '15px' }}
            disabled={cartItems.length === 0}
            onClick={() => alert("Checkout in arrivo!")}
          >
            Procedi al Checkout
          </button>
        </div>
      </div>
    </>
  );
}
