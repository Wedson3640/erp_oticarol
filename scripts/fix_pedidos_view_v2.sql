-- ════════════════════════════════════════════════════════════════════════════
-- fix_pedidos_view_v2.sql
-- 1. Adiciona situation_updated_at em service_orders
-- 2. Recria vw_pedidos com os campos novos
-- Rodar no Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Nova coluna: quando a situação mudou pela última vez no PHP
ALTER TABLE sascarol.service_orders
  ADD COLUMN IF NOT EXISTS situation_updated_at TIMESTAMPTZ;

-- 2. Backfill: usa updated_at como aproximação para registros já existentes
UPDATE sascarol.service_orders
SET situation_updated_at = updated_at
WHERE situation_updated_at IS NULL;

-- 3. Recriar a view com os campos que faltavam
-- DROP necessário porque estamos adicionando colunas no meio da lista
DROP VIEW IF EXISTS sascarol.vw_pedidos;
CREATE VIEW sascarol.vw_pedidos AS
SELECT
  so.id,
  so.source_erp_id,
  so.source_rails_id,
  so.source,
  so.os_number,
  so.os_sequence,
  so.situation,
  so.situation_updated_at,
  so.urgent,
  so.purchase_date,
  so.scheduled_delivery,
  so.new_scheduled_delivery,
  so.new_scheduled_reason,
  so.delivered_at,
  so.deleted_at,
  so.notes,
  -- Cliente
  so.customer_id,
  COALESCE(so.customer_name, c.name)              AS customer_name,
  c.cpf                                           AS customer_cpf,
  -- Vendedor(a)
  so.employee_id,
  COALESCE(so.employee_name, e.short_name,
           e.full_name)                           AS employee_name,
  -- Loja
  so.store_id,
  st.code                                         AS store_code,
  st.name                                         AS store_name,
  -- Laboratório
  so.laboratory_id,
  la.name                                         AS laboratory_name
FROM sascarol.service_orders so
LEFT JOIN sascarol.customers    c  ON c.id  = so.customer_id
LEFT JOIN sascarol.employees    e  ON e.id  = so.employee_id
LEFT JOIN sascarol.stores       st ON st.id = so.store_id
LEFT JOIN sascarol.laboratories la ON la.id = so.laboratory_id;

ALTER VIEW sascarol.vw_pedidos OWNER TO postgres;
GRANT SELECT ON sascarol.vw_pedidos TO authenticated;

-- 4. Verificação
SELECT
  COUNT(*)                                    AS total,
  COUNT(situation_updated_at)                 AS com_sit_date,
  COUNT(new_scheduled_delivery)               AS com_nova_entrega,
  COUNT(employee_name)                        AS com_vendedor,
  COUNT(*) FILTER (WHERE deleted_at IS NULL)  AS ativos
FROM sascarol.vw_pedidos;
