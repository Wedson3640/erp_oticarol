-- ═══════════════════════════════════════════════════════════════════════════
-- grant_delete_update.sql
-- Concede privilégios DELETE e UPDATE ao role `authenticated`
-- (RLS policies controlam quais linhas; GRANT controla quais operações são
--  permitidas — são duas camadas distintas no PostgreSQL)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── DELETE nas tabelas de histórico ──────────────────────────────────────────

GRANT DELETE ON sascarol.service_order_histories TO authenticated;
GRANT DELETE ON sascarol.warranty_histories      TO authenticated;
GRANT DELETE ON sascarol.request_histories       TO authenticated;

-- ─── UPDATE nos registros pai ─────────────────────────────────────────────────

GRANT UPDATE ON sascarol.service_orders TO authenticated;
GRANT UPDATE ON sascarol.warranties     TO authenticated;
GRANT UPDATE ON sascarol.requests       TO authenticated;
