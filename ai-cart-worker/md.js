export async function handleMd(page, email, plainPassword, items) {
    console.log("Inizio automazione su MD Discount...");
    const missing = [];

    try {
        await page.goto('https://webstore.mdspa.it/', { waitUntil: 'domcontentloaded' });
        
        // Accetta cookie se presenti
        const cookieBtn = page.locator('button:has-text("Accetta"), button:has-text("Accept"), #CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
        if (await cookieBtn.count() > 0) {
            await cookieBtn.first().click();
            await page.waitForTimeout(1000);
        }

        // Vai direttamente alla pagina di login per evitare problemi con i bottoni nascosti
        await page.goto('https://webstore.mdspa.it/login', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Effettua il login
        await page.fill('input[type="email"], input[name="email"], input[name="username"]', email);
        await page.fill('input[type="password"], input[name="password"]', plainPassword);
        
        const submitLoginBtn = page.locator('button[type="submit"], button:has-text("Accedi"), button:has-text("Login")').first();
        await submitLoginBtn.click();
        
        await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => console.log('Timeout attesa navigazione login'));
        console.log("-> ✅ Login su MD completato");

        // Loop sui prodotti
        for (const item of items) {
            const nomeProdotto = item.item || item.prodotto;
            const quantita = item.quantity || item.quantita || 1;
            console.log(`-> 🛒 Cerco: ${nomeProdotto} (x${quantita})`);

            // Usa la barra di ricerca
            const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="Cerca"]').first();
            await searchInput.fill(nomeProdotto);
            await searchInput.press('Enter');
            
            // Attendi caricamento risultati
            await page.waitForTimeout(3000);

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
        
        console.log("Carrello MD riempito con successo.");
        return missing;
    } catch (error) {
        console.error("Errore critico su MD:", error);
        throw error;
    }
}
