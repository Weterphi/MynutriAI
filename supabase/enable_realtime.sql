-- Abilita Supabase Realtime per la tabella shopping_jobs
-- In questo modo il frontend React può ascoltare gli eventi UPDATE via WebSocket

BEGIN;

DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

ALTER PUBLICATION supabase_realtime ADD TABLE shopping_jobs;

COMMIT;
