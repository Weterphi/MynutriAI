CREATE TABLE shopping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    market_id VARCHAR(50) NOT NULL,
    parsed_items JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- Valori: pending, processing, completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shopping_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utenti vedono solo i propri job" 
ON shopping_jobs FOR SELECT 
USING (auth.uid() = user_id);
