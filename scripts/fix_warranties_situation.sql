-- Backfill warranties.situation + updated_at a partir da última interação
-- Execute no Supabase SQL Editor

UPDATE sascarol.warranties w
SET situation  = h.situation,
    updated_at = h.created_at
FROM (
    SELECT DISTINCT ON (warranty_id)
        warranty_id, situation, created_at
    FROM sascarol.warranty_histories
    ORDER BY warranty_id, created_at DESC
) h
WHERE w.id = h.warranty_id;

-- Confirma
SELECT situation, COUNT(*) n
FROM sascarol.warranties
WHERE deleted_at IS NULL
GROUP BY situation
ORDER BY n DESC
LIMIT 20;
