-- ═══════════════════════════════════════════════════════════════════════════
-- fix_etl_data_v2.sql  —  Correção da coluna customer_name em service_orders
-- (passos 1 e 2 do fix_etl_data.sql já foram executados com sucesso)
-- Rodar no Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Adiciona customer_name em service_orders ─────────────────────────────
-- A coluna estava definida em types.ts e usada no frontend, mas nunca foi
-- criada no banco. Isso causava erro no PostgREST → página de pedidos vazia.

ALTER TABLE sascarol.service_orders
  ADD COLUMN IF NOT EXISTS customer_name text;

-- ─── 2. Popula customer_name em service_orders a partir de customers ──────────

UPDATE sascarol.service_orders so
SET    customer_name = c.name
FROM   sascarol.customers c
WHERE  so.customer_id = c.id
AND    so.customer_name IS NULL;

-- ─── 3. Propaga customer_name para warranties ─────────────────────────────────
-- Agora so.customer_name existe, então o join funciona.

UPDATE sascarol.warranties w
SET    customer_name = so.customer_name
FROM   sascarol.service_orders so
WHERE  w.service_order_id = so.id
AND    w.customer_name IS NULL
AND    so.customer_name IS NOT NULL;

-- ─── 4. Verificação final ─────────────────────────────────────────────────────

SELECT
  (SELECT COUNT(*) FROM sascarol.service_orders WHERE deleted_at IS NULL)        AS pedidos_visiveis,
  (SELECT COUNT(*) FROM sascarol.service_orders WHERE customer_name IS NOT NULL) AS pedidos_com_nome,
  (SELECT COUNT(*) FROM sascarol.warranties    WHERE deleted_at IS NULL)         AS garantias_visiveis,
  (SELECT COUNT(*) FROM sascarol.warranties    WHERE customer_name IS NOT NULL)  AS garantias_com_nome,
  (SELECT COUNT(*) FROM sascarol.requests)                                       AS solicitacoes_total;
