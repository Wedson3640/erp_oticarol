-- Solução definitiva para os_number em service_orders
-- Execute no Supabase SQL Editor
-- Após executar, o banco gera os_number automaticamente — o código não precisa mais calcular.

-- 1. Descobre o max atual de os_number numérico
SELECT MAX(os_number::bigint) AS max_atual
FROM sascarol.service_orders
WHERE os_number ~ '^\d+$';

-- 2. Cria a sequence começando acima do máximo
--    (ajuste o START se o SELECT acima retornar um valor maior que 80000)
CREATE SEQUENCE IF NOT EXISTS sascarol.so_os_number_seq
  START  80000
  INCREMENT 1
  MINVALUE 70000
  NO MAXVALUE;

-- 3. Avança a sequence para garantir que começa acima do max atual
SELECT setval(
  'sascarol.so_os_number_seq',
  GREATEST(
    (SELECT COALESCE(MAX(os_number::bigint), 70000) FROM sascarol.service_orders WHERE os_number ~ '^\d+$'),
    79999
  )
);

-- 4. Define DEFAULT na coluna
ALTER TABLE sascarol.service_orders
  ALTER COLUMN os_number SET DEFAULT nextval('sascarol.so_os_number_seq')::text;

-- 5. Confirma
SELECT last_value FROM sascarol.so_os_number_seq;
