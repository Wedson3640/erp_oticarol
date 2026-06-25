-- ═══════════════════════════════════════════════════════════════════════════
-- add_rls_delete_update.sql
-- • Adiciona operator_uid uuid nas 3 tabelas de histórico
--   (para comparação robusta na reversão — não depende de nome string)
-- • Cria policies DELETE nas histórias (autenticado pode excluir)
-- • Cria policy UPDATE em service_orders e warranties
-- Idempotente: usa IF NOT EXISTS em todo lugar
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Coluna operator_uid ────────────────────────────────────────────────────

ALTER TABLE sascarol.service_order_histories
  ADD COLUMN IF NOT EXISTS operator_uid uuid;

ALTER TABLE sascarol.warranty_histories
  ADD COLUMN IF NOT EXISTS operator_uid uuid;

ALTER TABLE sascarol.request_histories
  ADD COLUMN IF NOT EXISTS operator_uid uuid;

-- ─── 2. DELETE nas tabelas de histórico ───────────────────────────────────────

DO $$
BEGIN

  -- service_order_histories DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='sascarol' AND tablename='service_order_histories' AND policyname='delete_autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "delete_autenticado"
             ON sascarol.service_order_histories
             FOR DELETE TO authenticated USING (true)';
  END IF;

  -- warranty_histories DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='sascarol' AND tablename='warranty_histories' AND policyname='delete_autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "delete_autenticado"
             ON sascarol.warranty_histories
             FOR DELETE TO authenticated USING (true)';
  END IF;

  -- request_histories DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='sascarol' AND tablename='request_histories' AND policyname='delete_autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "delete_autenticado"
             ON sascarol.request_histories
             FOR DELETE TO authenticated USING (true)';
  END IF;

  -- service_orders UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='sascarol' AND tablename='service_orders' AND policyname='update_autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "update_autenticado"
             ON sascarol.service_orders
             FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;

  -- warranties UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='sascarol' AND tablename='warranties' AND policyname='update_autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "update_autenticado"
             ON sascarol.warranties
             FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;

END $$;

-- ─── 3. Verificação ───────────────────────────────────────────────────────────

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'sascarol'
ORDER BY tablename, cmd;
