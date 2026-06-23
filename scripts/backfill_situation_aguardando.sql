-- Pedidos sem histórico ficaram com situação antiga do ETL ("Aguardando" / NULL)
-- Mapeia para "Pedido criado" — primeiro nó do fluxo no sascarol

UPDATE sascarol.service_orders
SET situation = 'Pedido criado'
WHERE situation IS NULL
   OR situation IN ('Aguardando', 'Aguardando...', '')
   OR situation NOT IN (
       SELECT title FROM sascarol.order_situations
   );

-- Verificação final
SELECT situation, COUNT(*) AS total
FROM sascarol.service_orders
GROUP BY situation
ORDER BY total DESC;
