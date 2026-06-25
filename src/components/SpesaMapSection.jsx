import React, { useState, useEffect } from 'react';

export default function SpesaMapSection({ cap, address, onSelectSupermarket }) {
  const [loading, setLoading] = useState(true);
  const [supermarkets, setSupermarkets] = useState([]);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLocationAndSupermarkets = async () => {
      try {
        setLoading(true);
        // 1. Geocode CAP e Indirizzo tramite Nominatim
        const query = encodeURIComponent(`${address ? address + ', ' : ''}${cap}, Italy`);
        const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
        const geocodeText = await geocodeRes.text();
        let geocodeData;
        try {
          geocodeData = JSON.parse(geocodeText);
        } catch(e) {
          throw new Error("Servizio mappe sovraccarico. Riprova tra poco.");
        }

        if (!geocodeData || geocodeData.length === 0) {
          throw new Error("Impossibile trovare le coordinate per questo indirizzo.");
        }

        const lat = parseFloat(geocodeData[0].lat);
        const lon = parseFloat(geocodeData[0].lon);
        setLocation({ lat, lon });

        // 2. Cerca supermercati nel raggio di 5km tramite Overpass API
        const overpassQuery = `[out:json];node(around:5000,${lat},${lon})["shop"="supermarket"];out 10;`;
        const overpassRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
        const overpassText = await overpassRes.text();
        let overpassData = null;
        try {
          overpassData = JSON.parse(overpassText);
        } catch(e) {
          console.warn("Overpass API error:", e);
          // Fallback silenzioso: se fallisce mostriamo solo Amazon Fresh e mappa vuota
        }

        if (overpassData && overpassData.elements) {
          const formattedMarkets = overpassData.elements
            .filter(el => el.tags && el.tags.name)
            .map(el => ({
              id: el.id,
              name: el.tags.name,
              brand: el.tags.brand || '',
              lat: el.lat,
              lon: el.lon,
              distance: calculateDistance(lat, lon, el.lat, el.lon)
            }))
            .sort((a, b) => a.distance - b.distance);
          
          setSupermarkets(formattedMarkets);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (cap) {
      fetchLocationAndSupermarkets();
    }
  }, [cap, address]);

  // Helper formula Haversine per calcolare la distanza in km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // raggio terrestre in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const isAmazonFreshSupported = ["201", "001", "101", "401"].some(prefix => cap && cap.startsWith(prefix));

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto 10px', borderTopColor: 'var(--celeste-primary)' }}></div>
        <p style={{ color: 'var(--color-muted)', fontSize: '13px' }}>Ricerca supermercati in zona...</p>
      </div>
    );
  }

  if (error) {
    return <div style={{ color: '#ef4444', padding: '10px', fontSize: '14px' }}>Errore mappa: {error}</div>;
  }

  return (
    <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-default)', paddingTop: '20px' }}>
      <h4 style={{ margin: '0 0 16px 0', color: 'var(--color-title)' }}>Scegli dove fare la spesa</h4>
      
      {/* Opzione Amazon Fresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: isAmazonFreshSupported ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: isAmazonFreshSupported ? '1px solid #22c55e' : '1px solid transparent' }}>
        <div>
          <h5 style={{ margin: 0, color: 'var(--color-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛒 Amazon Fresh
            {isAmazonFreshSupported && <span style={{ fontSize: '11px', backgroundColor: '#22c55e', color: 'white', padding: '2px 6px', borderRadius: '12px' }}>Coperto</span>}
          </h5>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-muted)' }}>
            {isAmazonFreshSupported ? "Ricevi la spesa direttamente a casa in 2 ore." : "Il tuo CAP non è ancora coperto dal servizio Amazon Fresh."}
          </p>
        </div>
        <button className="btn btn-primary" disabled={!isAmazonFreshSupported} onClick={() => onSelectSupermarket('Amazon Fresh')}>
          {isAmazonFreshSupported ? 'Ordina qui' : 'Non disp.'}
        </button>
      </div>

      <h5 style={{ margin: '0 0 12px 0', color: 'var(--color-title)' }}>Supermercati Locali ({supermarkets.length})</h5>
      
      {/* Lista Supermercati */}
      <div style={{ display: 'grid', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
        {supermarkets.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>Nessun supermercato trovato nei dintorni.</p>
        ) : (
          supermarkets.map(market => (
            <div key={market.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--color-title)', fontSize: '14px' }}>{market.name}</strong>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>a {market.distance} km di distanza</span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => onSelectSupermarket(market)}>
                Scegli
              </button>
            </div>
          ))
        )}
      </div>

      {/* Mappa visiva tramite iframe OSM */}
      {location && (
        <div style={{ marginTop: '16px', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '200px', border: '1px solid var(--border-default)' }}>
          <iframe 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            scrolling="no" 
            marginHeight="0" 
            marginWidth="0" 
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lon - 0.02},${location.lat - 0.02},${location.lon + 0.02},${location.lat + 0.02}&layer=mapnik&marker=${location.lat},${location.lon}`}
          ></iframe>
        </div>
      )}
    </div>
  );
}
