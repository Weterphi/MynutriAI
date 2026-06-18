-- Add new lifestyle and clinical fields to user_preferences
ALTER TABLE user_preferences
ADD COLUMN target_weight_kg NUMERIC,
ADD COLUMN pacing TEXT,
ADD COLUMN neat_level TEXT,
ADD COLUMN active_workout_hours NUMERIC,
ADD COLUMN diet_budget TEXT,
ADD COLUMN prep_time_lunch TEXT,
ADD COLUMN prep_time_dinner TEXT,
ADD COLUMN wakeup_time TIME;

-- Update the existing pg_cron job to run every hour instead of 07:00 AM
-- IMPORTANT: Run these only if you have pg_cron enabled
SELECT cron.unschedule('invio-diete-mattutino');

SELECT cron.schedule(
  'invio-diete-orario', -- Nuovo nome del job
  '0 * * * *',          -- Esegue al minuto 0 di ogni ora (es. 06:00, 07:00, 08:00)
  $$
    select net.http_post(
      url:='https://dkguwchycalrtsqxcttv.supabase.co/functions/v1/send-whatsapp',
      headers:='{"Content-Type": "application/json"}'::jsonb
    );
  $$
);
