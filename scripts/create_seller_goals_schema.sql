-- ═══════════════════════════════════════════════════════════════════════════
-- create_seller_goals_schema.sql
-- Schema do módulo de Metas por Vendedor
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Adiciona campos à tabela stores ───────────────────────────────────────

ALTER TABLE sascarol.stores
  ADD COLUMN IF NOT EXISTS franchise    text DEFAULT 'carol',   -- 'carol' | 'grandvision' | 'sunglass'
  ADD COLUMN IF NOT EXISTS manager_name text;

-- Marca as lojas Grand Vision e Sunglass Hut
UPDATE sascarol.stores SET franchise = 'grandvision' WHERE code IN ('763', '777');
UPDATE sascarol.stores SET franchise = 'sunglass'    WHERE code = '9632';

-- Preenche gerentes vindos da base de metas (agosto/2023 como referência)
UPDATE sascarol.stores SET manager_name = v.gerente
FROM (VALUES
  ('435',  'SANDREANE MACEDO'),
  ('450',  'NATAN OLIVEIRA'),
  ('488',  'THAYSE JULIANNY'),
  ('564',  'LIDIA ADA'),
  ('717',  'KAMILLA LIMA'),
  ('1023', 'MAYARA LOURENCO'),
  ('1048', 'ANTONIA DE ARAUJO'),
  ('1060', 'MARCIA ADRIANA'),
  ('1249', 'LORENA AMARAL'),
  ('1478', 'ISLANE CARVALHO'),
  ('1489', 'ISABELA AIMEE'),
  ('1499', 'HORTENCIA FONTES'),
  ('1519', 'IZAMARA CARVALHO'),
  ('2057', 'AMANDA MIKAELLY'),
  ('2490', 'WHANNY CARVALHO'),
  ('2291', 'JESSICA FERNANDA')
) AS v(code, gerente)
WHERE sascarol.stores.code = v.code;

-- ─── 2. Tabela principal de metas por vendedor ────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.seller_goals (
  id               bigserial    PRIMARY KEY,

  -- Referências
  store_id         bigint       NOT NULL REFERENCES sascarol.stores(id),
  employee_id      bigint       REFERENCES sascarol.employees(id),  -- nulo se não mapeado
  consultant_name  text         NOT NULL,
  consultant_code  text         NOT NULL,  -- COD. da planilha (shop9_code)

  -- Período e cluster
  ref_month        date         NOT NULL,  -- primeiro dia do mês: 2023-08-01
  cluster          smallint,               -- 1 = baixo | 2 = médio | 3 = alto

  -- Metas de faturamento total
  goal_base        numeric(12,2) DEFAULT 0,  -- META 1 (base)
  goal_projection  numeric(12,2) DEFAULT 0,  -- META 2 (projeção)

  -- Metas por produto
  goal_lo          numeric(12,2) DEFAULT 0,  -- META L.O (Lentes Oftálmicas)
  goal_solar       numeric(12,2) DEFAULT 0,  -- META SOL
  goal_rx          numeric(12,2) DEFAULT 0,  -- META RX

  -- Realizados (lançados manualmente ou calculados)
  actual_total     numeric(12,2) DEFAULT 0,
  actual_lo        numeric(12,2) DEFAULT 0,
  actual_solar     numeric(12,2) DEFAULT 0,
  actual_rx        numeric(12,2) DEFAULT 0,

  -- Controle
  created_at       timestamptz  DEFAULT now(),
  updated_at       timestamptz  DEFAULT now(),

  UNIQUE (store_id, consultant_code, ref_month)
);

ALTER TABLE sascarol.seller_goals ENABLE ROW LEVEL SECURITY;

-- ─── 3. RLS — leitura e escrita para autenticados ────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='seller_goals' AND policyname='leitura_autenticado') THEN
    EXECUTE 'CREATE POLICY "leitura_autenticado" ON sascarol.seller_goals FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='seller_goals' AND policyname='escrita_autenticado') THEN
    EXECUTE 'CREATE POLICY "escrita_autenticado" ON sascarol.seller_goals FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='seller_goals' AND policyname='update_autenticado') THEN
    EXECUTE 'CREATE POLICY "update_autenticado" ON sascarol.seller_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON sascarol.seller_goals TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sascarol.seller_goals_id_seq TO authenticated;

-- ─── 4. Verificação ───────────────────────────────────────────────────────────

SELECT 'stores.franchise' AS check, count(*) FROM sascarol.stores WHERE franchise IS NOT NULL;
SELECT 'stores.manager'   AS check, count(*) FROM sascarol.stores WHERE manager_name IS NOT NULL;
SELECT 'seller_goals criada' AS check, count(*) FROM sascarol.seller_goals;
