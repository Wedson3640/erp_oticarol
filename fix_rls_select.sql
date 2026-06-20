-- ═══════════════════════════════════════════════════════════════════════════
-- fix_rls_select.sql v2 — idempotente (DROP IF EXISTS antes de cada CREATE)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── service_orders ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leitura_autenticado" ON sascarol.service_orders;
CREATE POLICY "leitura_autenticado"
  ON sascarol.service_orders FOR SELECT TO authenticated USING (true);

-- ─── warranties ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leitura_autenticado" ON sascarol.warranties;
CREATE POLICY "leitura_autenticado"
  ON sascarol.warranties FOR SELECT TO authenticated USING (true);

-- ─── laboratories ─────────────────────────────────────────────────────────────
ALTER TABLE sascarol.laboratories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leitura_autenticado" ON sascarol.laboratories;
CREATE POLICY "leitura_autenticado"
  ON sascarol.laboratories FOR SELECT TO authenticated USING (true);

-- ─── customers ────────────────────────────────────────────────────────────────
ALTER TABLE sascarol.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leitura_autenticado" ON sascarol.customers;
CREATE POLICY "leitura_autenticado"
  ON sascarol.customers FOR SELECT TO authenticated USING (true);

-- ─── warranty_problems ────────────────────────────────────────────────────────
ALTER TABLE sascarol.warranty_problems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leitura_autenticado" ON sascarol.warranty_problems;
CREATE POLICY "leitura_autenticado"
  ON sascarol.warranty_problems FOR SELECT TO authenticated USING (true);

-- ─── order_statuses ───────────────────────────────────────────────────────────
ALTER TABLE sascarol.order_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leitura_autenticado" ON sascarol.order_statuses;
CREATE POLICY "leitura_autenticado"
  ON sascarol.order_statuses FOR SELECT TO authenticated USING (true);

-- ─── warranty_statuses ────────────────────────────────────────────────────────
ALTER TABLE sascarol.warranty_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leitura_autenticado" ON sascarol.warranty_statuses;
CREATE POLICY "leitura_autenticado"
  ON sascarol.warranty_statuses FOR SELECT TO authenticated USING (true);

-- ─── Verifica: lista todas as policies SELECT do schema ───────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'sascarol' AND cmd = 'SELECT'
ORDER BY tablename;
