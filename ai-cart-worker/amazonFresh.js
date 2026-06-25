export async function handleAmazonFresh(page, email, plainPassword, items) {
    console.log("Inizio automazione su Amazon Fresh...");

    try {
        // 1. Navigazione iniziale e Login
        await page.goto('https://www.amazon.it/fresh', { waitUntil: 'domcontentloaded' });
        
        // Accetta i cookie se il banner è presente (non bloccare se non c'è)
        const cookieBtn = await page.locator('#sp-cc-accept');
        if (await cookieBtn.isVisible()) {
            await cookieBtn.click();
        }

        // Vai alla pagina di login
        await page.click('#nav-link-accountList');
        await page.fill('input[name="email"]', email);
        await page.click('input#continue');
        
        await page.fill('input[name="password"]', plainPassword);
        await page.click('input#signInSubmit');

        // Attendi che il login sia completato verificando un elemento della home
        await page.waitForSelector('#nav-cart', { timeout: 10000 });

        // 2. Loop di riempimento carrello
        for (const item of items) {
            // Estrae dinamicamente il nome e la quantità (visto che i nostri dati possono avere chiavi diverse come 'item' e 'quantity' o 'prodotto' e 'quantita')
            const nomeProdotto = item.item || item.prodotto;
            const quantita = parseInt(item.quantity || item.quantita || 1, 10);

            console.log(`Cerco: ${nomeProdotto} (Quantità: ${quantita})`);
            
            // Cerca il prodotto
            await page.fill('#twotabsearchtextbox', nomeProdotto);
            await page.click('input#nav-search-submit-button');
            
            // Attendi i risultati
            await page.waitForSelector('.s-main-slot', { timeout: 5000 });

            // Trova il primo pulsante "Aggiungi al carrello" utile nei risultati Fresh
            // NOTA: I selettori di Amazon sono complessi, usa locator testuali o ID stabili
            const addToCartBtn = page.locator('button:has-text("Aggiungi al carrello")').first();
            
            if (await addToCartBtn.isVisible()) {
                // Clicca per il numero di quantità richieste
                for (let i = 0; i < quantita; i++) {
                    await addToCartBtn.click();
                    // Breve delay per far aggiornare il contatore del carrello ed evitare blocchi
                    await page.waitForTimeout(800); 
                }
            } else {
                console.warn(`[!] Prodotto non trovato o esaurito: ${nomeProdotto}`);
                // In futuro qui salveremo in un array "outOfStock" per notificare l'utente
            }
        }

        console.log("Carrello Amazon Fresh riempito con successo.");

    } catch (error) {
        console.error("Errore critico durante la navigazione:", error);
        throw error; // Rilancia l'errore per farlo gestire al Worker principale
    }
}
