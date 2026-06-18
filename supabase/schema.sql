-- Schema Supabase per NutriAI

-- 1. Tabella users
-- Collegata ad auth.users di Supabase
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  nationality TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Abilitiamo RLS per users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti possono leggere e aggiornare solo il proprio profilo
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- 2. Tabella user_preferences
-- Salva i dati biometrici e nutrizionali del form (relazione 1 a 1 con users)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  gender TEXT NOT NULL,
  age INTEGER,
  height_cm INTEGER,
  weight_kg NUMERIC,
  goal TEXT NOT NULL,
  activity_level TEXT NOT NULL,
  diet_type TEXT NOT NULL,
  meals_per_day INTEGER NOT NULL,
  allergies TEXT[],
  excluded_foods TEXT,
  family_members JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Abilitiamo RLS per user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy per user_preferences
CREATE POLICY "Users can view own preferences" 
ON public.user_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
ON public.user_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
ON public.user_preferences FOR UPDATE 
USING (auth.uid() = user_id);

-- 3. Tabella diet_plans (Ottimizzata: 1 riga per utente)
CREATE TABLE IF NOT EXISTS public.diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  plan_json JSONB NOT NULL,
  pdf_url TEXT,
  is_sent BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Abilitiamo RLS per diet_plans
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

-- Funzione per gestire automaticamente l'aggiornamento dell'updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_modtime
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_diet_plans_modtime
BEFORE UPDATE ON public.diet_plans
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
