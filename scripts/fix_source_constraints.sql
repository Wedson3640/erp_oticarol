-- Fix constraints de source em todas as tabelas sascarol
-- Execute no Supabase SQL Editor
-- Adiciona 'app' como valor válido para registros criados diretamente no sascarol

-- ── service_orders ──────────────────────────────────────────────────────────
ALTER TABLE sascarol.service_orders
  DROP CONSTRAINT IF EXISTS service_orders_source_check;

ALTER TABLE sascarol.service_orders
  ALTER COLUMN source TYPE varchar(10);

ALTER TABLE sascarol.service_orders
  ADD CONSTRAINT service_orders_source_check
  CHECK (source IN ('php', 'rails', 'manual', 'both', 'app'));

-- ── warranties ──────────────────────────────────────────────────────────────
ALTER TABLE sascarol.warranties
  DROP CONSTRAINT IF EXISTS warranties_source_check;

ALTER TABLE sascarol.warranties
  ALTER COLUMN source TYPE varchar(10);

ALTER TABLE sascarol.warranties
  ADD CONSTRAINT warranties_source_check
  CHECK (source IN ('php', 'rails', 'manual', 'both', 'app'));

-- ── customers ───────────────────────────────────────────────────────────────
ALTER TABLE sascarol.customers
  DROP CONSTRAINT IF EXISTS customers_source_check;

ALTER TABLE sascarol.customers
  ALTER COLUMN source TYPE varchar(10);

ALTER TABLE sascarol.customers
  ADD CONSTRAINT customers_source_check
  CHECK (source IN ('php', 'rails', 'manual', 'both', 'app'));

-- ── Confirma ────────────────────────────────────────────────────────────────
SELECT
  tc.table_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc USING (constraint_name, constraint_schema)
WHERE tc.table_schema = 'sascarol'
  AND tc.constraint_name LIKE '%source%'
ORDER BY tc.table_name;
