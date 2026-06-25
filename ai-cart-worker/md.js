export async function handleMd(page, email, plainPassword, items) {
    console.log("Inizio automazione su MD Discount...");
    const missing = [];

    try {
        // Vai direttamente alla pagina di login
        await page.goto('https://webstore.mdspa.it/login', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000); // Attendi rendering iniziale
        
        // Accetta cookie se presenti sulla pagina di login
        try {
            const cookieBtn = page.locator('button:has-text("Accetta"), button:has-text("Accept"), button:has-text("ACCETTA"), #CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll').first();
            await cookieBtn.waitFor({ state: 'visible', timeout: 5000 });
            await cookieBtn.click({ force: true });
            await page.waitForTimeout(1000);
            console.log("-> 🍪 Cookie accettati");
        } catch(e) {
            console.log("-> 🍪 Nessun banner cookie rilevato o già chiuso");
        }

        // Effettua il login
        await page.fill('input[type="email"], input[name="email"], input[name="username"]', email);
        await page.fill('input[type="password"], input[name="password"]', plainPassword);
        
        const submitLoginBtn = page.locator('button[type="submit"], button:has-text("Accedi"), button:has-text("Login")').first();
        await submitLoginBtn.click({ force: true });
        
        // Su MD il login potrebbe non ricaricare l'intera pagina (AJAX), quindi aspettiamo semplicemente 5 secondi
        await page.waitForTimeout(5000);
        console.log("-> ✅ Login su MD tentato, procedo alla ricerca");

        // Loop sui prodotti
        for (const item of items) {
            const nomeProdotto = item.item || item.prodotto;
            const quantita = item.quantity || item.quantita || 1;
            console.log(`-> 🛒 Cerco: ${nomeProdotto} (x${quantita})`);

            // Usa la barra di ricerca
            const searchInput = page.locator('input[type="search"], input[name="q"], input[id*="search"], input[placeholder*="cerca" i]').first();
            // Assicuriamoci che la barra sia pronta
            await searchInput.waitFor({ state: 'visible', timeout: 10000 });
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
