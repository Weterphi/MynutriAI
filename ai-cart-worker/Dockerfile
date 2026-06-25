# Usa l'immagine ufficiale di Playwright che contiene già tutte le dipendenze di Chromium
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

# Copia i file di dipendenza
COPY package*.json ./
RUN npm install

# Copia il resto del codice
COPY . .

# Avvia il worker in background
CMD ["node", "worker.js"]
