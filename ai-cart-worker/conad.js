export async function handleConad(page, email, plainPassword, items) {
    console.log("Inizio automazione su Conad...");
    const missing = [];

    try {
        await page.goto('https://spesaonline.conad.it/', { waitUntil: 'domcontentloaded' });
        
        // 1. Accetta Cookie
        const cookieBtn = await page.locator('button:has-text("Accetta tutti"), #onetrust-accept-btn-handler');
        if (await cookieBtn.isVisible()) {
            await cookieBtn.click();
        }

        // 2. Login
        console.log("-> Tentativo di Login...");
        // I selettori esatti andranno verificati sul sito live
        await page.click('button:has-text("Accedi"), a[href*="login"]');
        await page.fill('input[type="email"], input[name="email"]', email);
        await page.fill('input[type="password"], input[name="password"]', plainPassword);
        await page.click('button[type="submit"], button:has-text("Accedi")');
        
        // Attendi la navigazione post-login
        await page.waitForTimeout(3000); 

        // 3. Loop Prodotti
        for (const item of items) {
            const nomeProdotto = item.item || item.prodotto;
            const quantita = parseInt(item.quantity || item.quantita || 1, 10);
            
            console.log(`Cerco: ${nomeProdotto} (Quantità: ${quantita})`);
            
            // Cerca
            const searchInput = page.locator('input[type="search"], input[placeholder*="Cerca"]');
            await searchInput.fill(nomeProdotto);
            await searchInput.press('Enter');
            
            await page.waitForTimeout(2000); // Attendi i risultati

            // Trova primo bottone Aggiungi
            const addBtn = page.locator('button:has-text("Aggiungi"), .add-to-cart, [aria-label*="Aggiungi"]').first();
            
            try {
                await addBtn.waitFor({ state: 'visible', timeout: 5000 });
                for (let i = 0; i < quantita; i++) {
                    await addBtn.click();
                    await page.waitForTimeout(1000);
                }
            } catch (e) {
                console.warn(`[!] Prodotto non trovato: ${nomeProdotto}`);
                missing.push(item);
            }
        }
        
        console.log("Carrello Conad riempito con successo.");
        return missing;
    } catch (error) {
        console.error("Errore critico su Conad:", error);
        throw error;
    }
}
