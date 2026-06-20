-- ════════════════════════════════════════════════════════════════════════════
-- fix_employee_name.sql
-- Desnormaliza employee_name em service_orders (igual ao customer_name)
-- Rodar no Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Adiciona coluna (idempotente)
ALTER TABLE sascarol.service_orders
  ADD COLUMN IF NOT EXISTS employee_name text;

-- 2. Popula a partir do JOIN com employees (onde employee_id já está preenchido)
UPDATE sascarol.service_orders so
SET    employee_name = COALESCE(e.short_name, e.full_name)
FROM   sascarol.employees e
WHERE  e.id = so.employee_id
AND    so.employee_name IS NULL;

-- 3. Atualiza a view para usar o campo desnormalizado como prioridade
CREATE OR REPLACE VIEW sascarol.vw_pedidos AS
SELECT
  so.id,
  so.source_erp_id,
  so.source_rails_id,
  so.source,
  so.os_number,
  so.os_sequence,
  so.situation,
  so.urgent,
  so.purchase_date,
  so.scheduled_delivery,
  so.delivered_at,
  so.deleted_at,
  so.notes,
  -- Cliente
  so.customer_id,
  COALESCE(so.customer_name, c.name)            AS customer_name,
  c.cpf                                         AS customer_cpf,
  -- Vendedor(a): campo desnormalizado tem prioridade; fallback no JOIN
  so.employee_id,
  COALESCE(so.employee_name,
           e.short_name,
           e.full_name)                         AS employee_name,
  -- Loja
  so.store_id,
  st.code                                       AS store_code,
  st.name                                       AS store_name,
  -- Laboratório
  so.laboratory_id,
  la.name                                       AS laboratory_name
FROM sascarol.service_orders so
LEFT JOIN sascarol.customers    c  ON c.id  = so.customer_id
LEFT JOIN sascarol.employees    e  ON e.id  = so.employee_id
LEFT JOIN sascarol.stores       st ON st.id = so.store_id
LEFT JOIN sascarol.laboratories la ON la.id = so.laboratory_id;

GRANT SELECT ON sascarol.vw_pedidos TO authenticated;

-- 4. Verificação
SELECT
  COUNT(*)                          AS total,
  COUNT(employee_name)              AS com_nome_vendedor,
  COUNT(*) - COUNT(employee_name)   AS sem_nome_vendedor
FROM sascarol.service_orders
WHERE deleted_at IS NULL;
