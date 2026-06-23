-- ═══════════════════════════════════════════════════════════════════════════
-- backfill_situation_from_history.sql
-- Sincroniza service_orders.situation com o último service_order_histories
-- Problema: ETL importou históricos mas deixou situation = 'Aguardando' nos pedidos
-- Executar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Diagnóstico antes ─────────────────────────────────────────────────────
SELECT situation, COUNT(*) AS total
FROM sascarol.service_orders
GROUP BY situation
ORDER BY total DESC;

-- ── 2. Backfill: atualiza situation com a última movimentação do histórico ───
UPDATE sascarol.service_orders so
SET situation = (
  SELECT soh.situation
  FROM sascarol.service_order_histories soh
  WHERE soh.service_order_id = so.id
  ORDER BY soh.created_at DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM sascarol.service_order_histories soh
  WHERE soh.service_order_id = so.id
);

-- ── 3. Diagnóstico depois ────────────────────────────────────────────────────
SELECT situation, COUNT(*) AS total
FROM sascarol.service_orders
GROUP BY situation
ORDER BY total DESC;

-- ── 4. Pedidos SEM nenhum histórico (situation permanece como estava) ─────────
SELECT COUNT(*) AS pedidos_sem_historico
FROM sascarol.service_orders so
WHERE NOT EXISTS (
  SELECT 1 FROM sascarol.service_order_histories soh
  WHERE soh.service_order_id = so.id
);
