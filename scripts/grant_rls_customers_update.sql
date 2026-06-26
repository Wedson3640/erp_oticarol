-- ═══════════════════════════════════════════════════════════════════════════
-- grant_rls_customers_update.sql
-- Permite que usuários autenticados atualizem sascarol.customers
-- Necessário para pedidos/novo salvar CPF de volta ao cliente
-- Idempotente: seguro rodar mais de uma vez
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. GRANT UPDATE ──────────────────────────────────────────────────────────

GRANT UPDATE ON sascarol.customers TO authenticated;

-- ─── 2. RLS policy UPDATE ─────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'sascarol'
      AND tablename  = 'customers'
      AND policyname = 'update_autenticado'
  ) THEN
    EXECUTE '
      CREATE POLICY "update_autenticado"
      ON sascarol.customers
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true)
    ';
    RAISE NOTICE 'Policy update_autenticado criada em sascarol.customers';
  ELSE
    RAISE NOTICE 'Policy update_autenticado ja existe em sascarol.customers — nada feito';
  END IF;
END $$;

-- ─── 3. Verificação ───────────────────────────────────────────────────────────

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'sascarol'
  AND tablename  = 'customers'
ORDER BY cmd;
