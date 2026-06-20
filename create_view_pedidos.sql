-- ════════════════════════════════════════════════════════════════════════════
-- create_view_pedidos.sql
-- View desnormalizada para a tela de pedidos (sascarol)
-- Rodar no Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

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
  COALESCE(so.customer_name, c.name)  AS customer_name,
  c.cpf                               AS customer_cpf,
  -- Vendedor(a)
  so.employee_id,
  COALESCE(e.short_name, e.full_name) AS employee_name,
  -- Loja
  so.store_id,
  st.code                             AS store_code,
  st.name                             AS store_name,
  -- Laboratório
  so.laboratory_id,
  la.name                             AS laboratory_name
FROM sascarol.service_orders so
LEFT JOIN sascarol.customers    c  ON c.id  = so.customer_id
LEFT JOIN sascarol.employees    e  ON e.id  = so.employee_id
LEFT JOIN sascarol.stores       st ON st.id = so.store_id
LEFT JOIN sascarol.laboratories la ON la.id = so.laboratory_id;

-- ─── RLS na view (Supabase exige policy explícita na view) ───────────────────
ALTER VIEW sascarol.vw_pedidos OWNER TO postgres;

GRANT SELECT ON sascarol.vw_pedidos TO authenticated;

-- ─── Verificação ─────────────────────────────────────────────────────────────
SELECT
  COUNT(*)                                           AS total,
  COUNT(employee_name)                               AS com_vendedor,
  COUNT(*) FILTER (WHERE deleted_at IS NULL)         AS ativos,
  COUNT(*) FILTER (
    WHERE scheduled_delivery >= '2026-06-01'
      AND scheduled_delivery <  '2026-07-01'
      AND deleted_at IS NULL
  )                                                  AS entrega_junho
FROM sascarol.vw_pedidos;
