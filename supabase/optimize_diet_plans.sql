-- Script per ottimizzare la tabella diet_plans (1 riga per utente)
-- ATTENZIONE: Questo cancellerà i dati esistenti nella tabella diet_plans!

DROP TABLE IF EXISTS public.diet_plans;

CREATE TABLE public.diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  plan_json JSONB NOT NULL,
  is_sent BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Abilitiamo RLS
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;

-- Policy per diet_plans
CREATE POLICY "Users can view own diet plans" 
ON public.diet_plans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diet plans" 
ON public.diet_plans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diet plans" 
ON public.diet_plans FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger per l'aggiornamento automatico della data
CREATE TRIGGER update_diet_plans_modtime
BEFORE UPDATE ON public.diet_plans
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
