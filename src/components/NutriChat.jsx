import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function NutriChat({ userId, userName, userPrefs }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Carica la cronologia all'avvio con filtro 7 giorni
  useEffect(() => {
    if (!userId) return;
    const cacheKey = `nutriai_chat_${userId}`;
    const saved = localStorage.getItem(cacheKey);
    const wakeupTime = userPrefs?.wakeup_time ? userPrefs.wakeup_time.substring(0, 5) : '07:00';
    const getWelcomeMessages = () => [
      {
        id: 'welcome-1',
        sender: 'bot',
        text: `Ciao ${userName || 'Amico'}! 🤖🍎 Sono l'Agente NutriAI, il tuo coach nutrizionale intelligente.`,
        timestamp: new Date().toISOString()
      },
      {
        id: 'welcome-2',
        sender: 'bot',
        text: `Ho appena caricato la tua dieta personalizzata di 30 giorni! Ti aiuterò a seguirla giorno dopo giorno per raggiungere il tuo obiettivo di *${userPrefs?.goal || 'Benessere'}*.`,
        timestamp: new Date().toISOString()
      },
      {
        id: 'welcome-3',
        sender: 'bot',
        text: `Ogni mattina alle **${wakeupTime}** riceverai un messaggio in automatico su WhatsApp con i promemoria dei pasti del giorno, così sarà facilissimo rimanere costanti! 📱`,
        timestamp: new Date().toISOString()
      }
    ];

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        // Filtra i messaggi più vecchi di 7 giorni
        const filtered = parsed.filter(m => {
          if (!m.timestamp) return true;
          return new Date(m.timestamp).getTime() > oneWeekAgo;
        });

        if (filtered.length === 0) {
          const welcome = getWelcomeMessages();
          setMessages(welcome);
          localStorage.setItem(cacheKey, JSON.stringify(welcome));
        } else {
          setMessages(filtered);
          if (filtered.length !== parsed.length) {
            localStorage.setItem(cacheKey, JSON.stringify(filtered));
          }
        }
      } catch (e) {
        console.error("Errore caricamento cronologia chat:", e);
      }
    } else {
      const welcome = getWelcomeMessages();
      setMessages(welcome);
      localStorage.setItem(cacheKey, JSON.stringify(welcome));
    }
  }, [userId, userName, userPrefs]);

  // Salva la cronologia quando cambia
  const saveMessages = (newMessages) => {
    setMessages(newMessages);
    if (userId) {
      localStorage.setItem(`nutriai_chat_${userId}`, JSON.stringify(newMessages));
    }
  };

  // Scroll automatico in fondo alla chat
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isLoading, isOpen]);

  // Gestione dell'invio del messaggio dell'utente
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    setInputValue('');

    const userMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    saveMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Prepariamo la cronologia escludendo elementi non di testo o azioni
      const chatHistoryForAPI = updatedMessages
        .filter(m => m.sender === 'user' || (m.sender === 'bot' && !m.type))
        .slice(-8); // prendiamo solo gli ultimi 8 messaggi per mantenere il contesto leggero

      // Chiamata all'Edge Function di Supabase
      const { data, error } = await supabase.functions.invoke('chat-bot', {
        body: {
          userId,
          message: userText,
          history: chatHistoryForAPI
        }
      });

      if (error) throw error;

      const botMessage = {
        id: `msg-${Date.now()}-bot`,
        sender: 'bot',
        text: data?.response || "Scusami, al momento non sono riuscito a elaborare una risposta. Riprova tra poco! 🥦",
        timestamp: new Date().toISOString()
      };

      saveMessages([...updatedMessages, botMessage]);
    } catch (err) {
      console.error("Errore chat-bot:", err);
      const errorMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'bot',
        text: "Oops! C'è stato un problema di connessione. Riprova più tardi! ⚠️",
        timestamp: new Date().toISOString()
      };
      saveMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <>
      <style>{`
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 8px 30px rgba(4, 120, 87, 0.4), 0 0 0 0 rgba(4, 120, 87, 0.6);
          }
          70% {
            box-shadow: 0 8px 30px rgba(4, 120, 87, 0.4), 0 0 0 16px rgba(4, 120, 87, 0);
          }
          100% {
            box-shadow: 0 8px 30px rgba(4, 120, 87, 0.4), 0 0 0 0 rgba(4, 120, 87, 0);
          }
        }
        @keyframes floatUp {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideUpPanel {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pulseNode {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.15); opacity: 1; }
        }
        .pulse-node-anim {
          animation: pulseNode 1.5s infinite alternate ease-in-out;
        }
      `}</style>

      {/* Floating neural chatbot button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '90px', // Posizionato per non sovrapporsi alle bottom bar su mobile
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--celeste-primary) 0%, #064e3b 100%)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            animation: 'pulseGlow 2s infinite, floatUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            outline: 'none',
            transition: 'transform 0.2s'
          }}
          title="Parla con l'Agente NutriAI"
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {/* Neural Network Node Style SVG */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
            <line x1="12" y1="4" x2="6" y2="11" opacity="0.6" strokeDasharray="1.5,1.5"></line>
            <line x1="12" y1="4" x2="18" y2="11" opacity="0.6" strokeDasharray="1.5,1.5"></line>
            <line x1="6" y1="11" x2="12" y2="18" opacity="0.6" strokeDasharray="1.5,1.5"></line>
            <line x1="18" y1="11" x2="12" y2="18" opacity="0.6" strokeDasharray="1.5,1.5"></line>
            <line x1="6" y1="11" x2="18" y2="11" opacity="0.4"></line>
            
            <circle cx="12" cy="4" r="2" fill="#a7f3d0" stroke="#ffffff" strokeWidth="0.75" className="pulse-node-anim"></circle>
            <circle cx="6" cy="11" r="2" fill="#34d399" stroke="#ffffff" strokeWidth="0.75"></circle>
            <circle cx="18" cy="11" r="2" fill="#34d399" stroke="#ffffff" strokeWidth="0.75"></circle>
            <circle cx="12" cy="18" r="2" fill="#a7f3d0" stroke="#ffffff" strokeWidth="0.75"></circle>
            
            <rect x="9.5" y="9" width="5" height="4.5" rx="1" fill="#ffffff" stroke="var(--celeste-primary)" strokeWidth="0.75"></rect>
            <circle cx="11" cy="11" r="0.5" fill="var(--celeste-primary)"></circle>
            <circle cx="13" cy="11" r="0.5" fill="var(--celeste-primary)"></circle>
          </svg>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          width: '380px',
          height: '520px',
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 160px)',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--celeste-border)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 20px rgba(4, 120, 87, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          overflow: 'hidden',
          animation: 'slideUpPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          {/* Intestazione Chat con stile Rete Neurale */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-default)',
            background: 'linear-gradient(135deg, var(--celeste-primary) 0%, #064e3b 100%)',
            color: '#ffffff',
            position: 'relative'
          }}>
            {/* Sfondo a rete accattivante (SVG overlay) */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none' }} viewBox="0 0 100 50">
              <path d="M10,10 L30,40 L50,15 L70,35 L90,10" stroke="#ffffff" strokeWidth="0.5" fill="none" />
              <circle cx="10" cy="10" r="1.5" fill="#ffffff" />
              <circle cx="30" cy="40" r="1.5" fill="#ffffff" />
              <circle cx="50" cy="15" r="1.5" fill="#ffffff" />
              <circle cx="70" cy="35" r="1.5" fill="#ffffff" />
              <circle cx="90" cy="10" r="1.5" fill="#ffffff" />
            </svg>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>
                  🤖
                </div>
                <span style={{
                  position: 'absolute',
                  bottom: '0px',
                  right: '0px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#34d399',
                  border: '1.5px solid #064e3b'
                }} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', margin: 0 }}>Agente NutriAI</h3>
                <span style={{ fontSize: '10px', color: '#a7f3d0' }}>Rete Neurale Attiva • Online</span>
              </div>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.8,
                transition: 'opacity 0.2s',
                zIndex: 1
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = 1}
              onMouseOut={(e) => e.currentTarget.style.opacity = 0.8}
            >
              ✕
            </button>
          </div>

          {/* Area Messaggi */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backgroundColor: 'var(--bg-subtle)'
          }}>
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div key={msg.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isBot ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                  alignSelf: isBot ? 'flex-start' : 'flex-end'
                }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: isBot ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                    backgroundColor: isBot ? 'var(--bg-card)' : 'var(--color-title)',
                    color: isBot ? 'var(--color-body)' : '#ffffff',
                    border: isBot ? '1px solid var(--border-default)' : 'none',
                    boxShadow: isBot ? 'var(--shadow-sm)' : 'none',
                    fontSize: '13.5px',
                    lineHeight: '1.45',
                    whiteSpace: 'pre-line'
                  }}>
                    {msg.text}


                  </div>
                  
                  <span style={{
                    fontSize: '9px',
                    color: 'var(--color-light)',
                    marginTop: '3px',
                    padding: '0 4px'
                  }}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              );
            })}

            {/* Caricamento */}
            {isLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                alignSelf: 'flex-start',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                borderRadius: '16px 16px 16px 4px',
                maxWidth: '90px'
              }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span className="dot" style={{ width: '5px', height: '5px', backgroundColor: 'var(--color-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out' }}></span>
                  <span className="dot" style={{ width: '5px', height: '5px', backgroundColor: 'var(--color-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out 0.2s' }}></span>
                  <span className="dot" style={{ width: '5px', height: '5px', backgroundColor: 'var(--color-muted)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out 0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form di Invio */}
          <form onSubmit={handleSendMessage} style={{
            display: 'flex',
            gap: '10px',
            padding: '12px 16px',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-card)',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Fai una domanda all'Agente..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '20px',
                border: '1px solid var(--border-default)',
                fontSize: '13.5px',
                outline: 'none',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--color-body)'
              }}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: inputValue.trim() && !isLoading ? 'var(--color-title)' : 'var(--border-default)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
