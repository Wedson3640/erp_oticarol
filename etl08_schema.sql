-- etl08_schema.sql
-- Prepara request_histories para receber o histórico ETL 08.
-- Execute no Supabase SQL Editor ANTES de rodar etl_08_historico_solicitacoes.py
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. Colunas novas ─────────────────────────────────────────────────────────────
ALTER TABLE sascarol.request_histories
  ADD COLUMN IF NOT EXISTS source    text DEFAULT 'manual',  -- 'php' | 'manual'
  ADD COLUMN IF NOT EXISTS source_id text;                   -- 'php_1234'

-- 2. Constraint única (necessária para ON CONFLICT via PostgREST) ──────────────
ALTER TABLE sascarol.request_histories
  DROP CONSTRAINT IF EXISTS uq_req_history_source_id;

ALTER TABLE sascarol.request_histories
  ADD CONSTRAINT uq_req_history_source_id UNIQUE (source_id);

CREATE INDEX IF NOT EXISTS idx_req_history_source_id
  ON sascarol.request_histories(source_id)
  WHERE source_id IS NOT NULL;

-- 3. RLS SELECT ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'sascarol'
      AND tablename  = 'request_histories'
      AND policyname = 'req_history select authenticated'
  ) THEN
    CREATE POLICY "req_history select authenticated"
      ON sascarol.request_histories
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 4. Confirma ──────────────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'sascarol'
  AND table_name   = 'request_histories'
ORDER BY ordinal_position;
