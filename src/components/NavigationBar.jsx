import React from 'react';

export default function NavigationBar({ activeView, setActiveView, cartItemCount, onOpenCart }) {
  const navItems = [
    { id: 'diet', label: 'MyDietaAI', icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Staff */}
        <line x1="12" y1="22" x2="12" y2="4"></line>
        <circle cx="12" cy="3" r="1"></circle>
        {/* Wings */}
        <path d="M12 7 Q 6 2 2 6 Q 6 9 12 8"></path>
        <path d="M12 7 Q 18 2 22 6 Q 18 9 12 8"></path>
        {/* Snakes */}
        <path d="M9.5 9.5 C 10 7 15 8 12 12 C 9 16 14 17 12 20"></path>
        <path d="M14.5 9.5 C 14 7 9 8 12 12 C 15 16 10 17 12 20"></path>
      </svg>
    )}
    // La sezione 'store' è stata temporaneamente nascosta finché non arrivano gli integratori.
  ];

  return (
    <>
      {/* TOPBAR (Desktop) */}
      <header className="app-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png?v=3" alt="NutriAI Logo" style={{ height: '32px' }} />
          <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-title)' }}>NutriAI</span>
        </div>

        <nav className="topbar-nav">
          {navItems.map(item => (
            <button 
              key={item.id} 
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span style={{ width: '20px', height: '20px' }}>{item.icon}</span>
                {item.label}
              </div>
            </button>
          ))}
        </nav>

        {/* Il bottone carrello è stato temporaneamente nascosto */}
        <div style={{ width: '40px' }}></div>
      </header>

      {/* BOTTOM NAV (Mobile) nascosta temporaneamente poiché c'è una sola vista attiva */}
    </>
  );
}
