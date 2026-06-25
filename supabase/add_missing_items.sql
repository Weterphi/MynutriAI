-- Aggiunge la colonna missing_items per gestire gli "Out of Stock"
ALTER TABLE shopping_jobs 
ADD COLUMN IF NOT EXISTS missing_items JSONB DEFAULT '[]'::jsonb;
