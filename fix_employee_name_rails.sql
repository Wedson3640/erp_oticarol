-- fix_employee_name_rails.sql
-- Preenche employee_name nos pedidos Rails que ficaram sem nome após
-- o vínculo dos 8 funcionários Rails que faltavam source_rails_id.
--
-- Execute no Supabase SQL Editor.

UPDATE sascarol.service_orders so
SET employee_name = COALESCE(e.short_name, e.full_name)
FROM sascarol.employees e
WHERE e.id = so.employee_id
  AND so.employee_name IS NULL;

-- Verificação pós-update
SELECT
  COUNT(*)                                              AS total_pedidos,
  COUNT(*) FILTER (WHERE employee_name IS NOT NULL)    AS com_nome,
  COUNT(*) FILTER (WHERE employee_name IS NULL)        AS sem_nome,
  ROUND(
    COUNT(*) FILTER (WHERE employee_name IS NOT NULL)::numeric
    / COUNT(*) * 100, 1
  )                                                     AS pct_com_nome
FROM sascarol.service_orders;
