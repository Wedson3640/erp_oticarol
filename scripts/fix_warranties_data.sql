-- ─────────────────────────────────────────────────────────────────────────────
-- fix_warranties_data.sql
-- Execute no Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. FK constraint warranty_problems (necessário para o join PostgREST funcionar)
ALTER TABLE sascarol.warranties
  ADD CONSTRAINT IF NOT EXISTS fk_warranties_problem_id
  FOREIGN KEY (problem_id) REFERENCES sascarol.warranty_problems(id)
  ON DELETE SET NULL;

-- 2. Backfill customer_name a partir do service_order vinculado
UPDATE sascarol.warranties w
SET   customer_name = so.customer_name,
      customer_cpf  = so.customer_cpf
FROM  sascarol.service_orders so
WHERE w.service_order_id = so.id
  AND w.customer_name IS NULL
  AND so.customer_name IS NOT NULL;

-- 3. Backfill request_date para garantias Rails sem data
--    (usa a purchase_date do pedido pai como referência)
UPDATE sascarol.warranties w
SET   request_date = so.purchase_date::date
FROM  sascarol.service_orders so
WHERE w.service_order_id = so.id
  AND w.source = 'rails'
  AND w.request_date IS NULL
  AND so.purchase_date IS NOT NULL;

-- 4. Backfill scheduled_delivery para garantias Rails sem prazo
--    (usa o scheduled_delivery do pedido pai como base)
UPDATE sascarol.warranties w
SET   scheduled_delivery = so.scheduled_delivery
FROM  sascarol.service_orders so
WHERE w.service_order_id = so.id
  AND w.source = 'rails'
  AND w.scheduled_delivery IS NULL
  AND so.scheduled_delivery IS NOT NULL;

-- 5. Confirma resultados
SELECT
  COUNT(*)                                         AS total,
  COUNT(*) FILTER (WHERE customer_name IS NOT NULL) AS com_cliente,
  COUNT(*) FILTER (WHERE problem_id    IS NOT NULL) AS com_problema,
  COUNT(*) FILTER (WHERE request_date  IS NOT NULL) AS com_abertura,
  COUNT(*) FILTER (WHERE scheduled_delivery IS NOT NULL) AS com_prazo
FROM sascarol.warranties
WHERE deleted_at IS NULL;
