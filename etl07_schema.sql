-- etl07_schema.sql
-- Prepara service_order_histories para receber o histórico do ETL 07.
-- Execute no Supabase SQL Editor ANTES de rodar etl_07_historico.py
-- ════════════════════════════════════════════════════════════════════

-- 1. Colunas novas ---------------------------------------------------
ALTER TABLE sascarol.service_order_histories
  ADD COLUMN IF NOT EXISTS source        text     DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id     text,            -- 'php_204' / 'rails_9999'
  ADD COLUMN IF NOT EXISTS sector        text,            -- setor/depart. (para SLA por setor)
  ADD COLUMN IF NOT EXISTS sla_goal_days smallint;        -- meta em dias úteis (do PHP ors_time_goal)

-- 2. Constraint única para ON CONFLICT funcionar via PostgREST --------
-- (UNIQUE INDEX parcial não é reconhecido — precisa ser CONSTRAINT completa)
ALTER TABLE sascarol.service_order_histories
  DROP CONSTRAINT IF EXISTS uq_history_source_id;

ALTER TABLE sascarol.service_order_histories
  ADD CONSTRAINT uq_history_source_id UNIQUE (source_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Índice parcial ainda útil para performance em queries com IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_history_source_id_notnull
  ON sascarol.service_order_histories(source_id)
  WHERE source_id IS NOT NULL;

-- 3. RLS SELECT (se não existir) ------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'sascarol'
      AND tablename  = 'service_order_histories'
      AND policyname = 'history select authenticated'
  ) THEN
    CREATE POLICY "history select authenticated"
      ON sascarol.service_order_histories
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 4. Confirma -----------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'sascarol'
  AND table_name   = 'service_order_histories'
ORDER BY ordinal_position;
