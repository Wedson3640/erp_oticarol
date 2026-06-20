-- ═══════════════════════════════════════════════════════════════════════════
-- fix_etl_data.sql  —  Correções pós-ETL (rodar no SQL Editor do Supabase)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Limpa deleted_at de service_orders ────────────────────────────────────
-- O ETL copiou deleted_at dos sistemas legados (PHP ord_deleted_at / Rails Paranoia).
-- No novo sistema, deleted_at só deve ser setado quando o USUÁRIO excluir
-- explicitamente um registro. Pedidos "Entregue" NÃO são deletados.
-- Resultado esperado: todos os 146.043 service_orders ficam visíveis no frontend.

UPDATE sascarol.service_orders SET deleted_at = NULL;

-- ─── 2. Limpa deleted_at de warranties ───────────────────────────────────────
-- Mesmo motivo acima. O RLS join de garantias → pedido_original falhava
-- porque o service_orders estava "invisível" (deleted_at IS NOT NULL).

UPDATE sascarol.warranties SET deleted_at = NULL;

-- ─── 3. Popula customer_name em service_orders ───────────────────────────────
-- ETL 04 não populou customer_name (campo desnormalizado para exibição rápida).
-- Aqui preenchemos via JOIN com customers usando o customer_id já armazenado.

UPDATE sascarol.service_orders so
SET    customer_name = c.name
FROM   sascarol.customers c
WHERE  so.customer_id = c.id
AND    so.customer_name IS NULL;

-- ─── 4. Popula customer_name em warranties ────────────────────────────────────
-- Cascateia o customer_name do service_order pai para a warranty.
-- Rodar DEPOIS do passo 3 para aproveitar os nomes já preenchidos.

UPDATE sascarol.warranties w
SET    customer_name = so.customer_name
FROM   sascarol.service_orders so
WHERE  w.service_order_id = so.id
AND    w.customer_name IS NULL
AND    so.customer_name IS NOT NULL;

-- ─── 5. Adiciona source_erp_id à tabela requests ─────────────────────────────
-- Permite preservar o sol_id original do PHP e exibir SOL-2383 corretamente.

ALTER TABLE sascarol.requests
  ADD COLUMN IF NOT EXISTS source_erp_id bigint;

CREATE INDEX IF NOT EXISTS idx_requests_source_erp_id
  ON sascarol.requests(source_erp_id);

-- ─── 6. Verifica contagens após as correções ──────────────────────────────────

SELECT
  (SELECT COUNT(*) FROM sascarol.service_orders WHERE deleted_at IS NULL)     AS pedidos_visiveis,
  (SELECT COUNT(*) FROM sascarol.service_orders WHERE customer_name IS NOT NULL) AS pedidos_com_nome,
  (SELECT COUNT(*) FROM sascarol.warranties    WHERE deleted_at IS NULL)       AS garantias_visiveis,
  (SELECT COUNT(*) FROM sascarol.warranties    WHERE customer_name IS NOT NULL) AS garantias_com_nome,
  (SELECT COUNT(*) FROM sascarol.requests)                                     AS solicitacoes_total;
