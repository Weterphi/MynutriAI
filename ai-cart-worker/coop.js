export async function handleCoop(page, email, plainPassword, items) {
    console.log("Inizio automazione su Coop...");

    try {
        await page.goto('https://www.coopshop.it/', { waitUntil: 'domcontentloaded' });
        
        // 1. Accetta Cookie
        const cookieBtn = await page.locator('button:has-text("Accetto"), #iubenda-cs-accept-btn');
        if (await cookieBtn.isVisible()) {
            await cookieBtn.click();
        }

        // 2. Login
        console.log("-> Tentativo di Login...");
        await page.click('button:has-text("Accedi"), a[href*="login"]');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', plainPassword);
        await page.click('button[type="submit"]');
        
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
            
            await page.waitForTimeout(2000);

            const addBtn = page.locator('button:has-text("Aggiungi"), .add-to-cart-btn').first();
            
            if (await addBtn.isVisible()) {
                for (let i = 0; i < quantita; i++) {
                    await addBtn.click();
                    await page.waitForTimeout(1000);
                }
            } else {
                console.warn(`[!] Prodotto non trovato: ${nomeProdotto}`);
            }
        }
        
        console.log("Carrello Coop riempito con successo.");
    } catch (error) {
        console.error("Errore critico su Coop:", error);
        throw error;
    }
}
