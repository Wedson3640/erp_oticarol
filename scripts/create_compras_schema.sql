-- ═══════════════════════════════════════════════════════════════════════════════
-- create_compras_schema.sql  —  Módulo COMPRAS: remessas e cupons
-- Executar no Supabase SQL Editor (schema sascarol já existente)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. sascarol.shipments  (Remessas — envio postal a clientes)
-- Origem: TB_Shipments (erp_vision PHP) + shipments (app_carolpi Rails)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.shipments (
  id               BIGSERIAL PRIMARY KEY,
  source           TEXT        NOT NULL DEFAULT 'php',   -- 'php' | 'rails' | 'manual'
  source_erp_id    INT,                                   -- shi_id  (PHP)
  source_rails_id  INT,                                   -- id (Rails)
  store_id         INT REFERENCES sascarol.stores(id),    -- shi_wor_id
  employee_id      INT REFERENCES sascarol.employees(id), -- shi_emp_id
  customer_name    TEXT,                                  -- shi_customer_name
  ship_date        DATE,                                  -- shi_date
  addr_street      TEXT,                                  -- shi_addr_public_place
  addr_number      TEXT,                                  -- shi_addr_number
  addr_complement  TEXT,                                  -- shi_addr_complement
  addr_zip         TEXT,                                  -- shi_addr_cep
  addr_district    TEXT,                                  -- shi_addr_district
  addr_city        TEXT,                                  -- shi_addr_city
  addr_uf          CHAR(2),                               -- shi_addr_uf
  tracking_number  TEXT,                                  -- shi_tracking_number (13 chars Correios)
  notes            TEXT,                                  -- shi_notes
  flag             SMALLINT    DEFAULT 0,                 -- shi_flag (0=ativo,1=entregue...)
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_erp_id),
  UNIQUE (source_rails_id)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_shipments_store      ON sascarol.shipments (store_id);
CREATE INDEX IF NOT EXISTS idx_shipments_employee   ON sascarol.shipments (employee_id);
CREATE INDEX IF NOT EXISTS idx_shipments_ship_date  ON sascarol.shipments (ship_date DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking   ON sascarol.shipments (tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_customer   ON sascarol.shipments (customer_name);
CREATE INDEX IF NOT EXISTS idx_shipments_deleted    ON sascarol.shipments (deleted_at) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. sascarol.coupons  (Cupons de desconto)
-- Origem: coupons (app_carolpi Rails — não existe no PHP)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.coupons (
  id                BIGSERIAL PRIMARY KEY,
  source_rails_id   INT UNIQUE,                            -- id (Rails coupons)
  name              TEXT        NOT NULL,                  -- name / código
  discount_type     TEXT        NOT NULL DEFAULT 'percent', -- 'percent' | 'value'
  discount_percent  INT,                                   -- discount_percent (Rails)
  discount_value    NUMERIC(10,2),                         -- discount_value (Rails)
  minimum_value     NUMERIC(10,2),                         -- minimum_value
  description       TEXT,                                  -- description
  expiration        DATE,                                  -- expiration
  redemptions_count INT         NOT NULL DEFAULT 0,        -- redemptions_count
  created_by_id     INT REFERENCES sascarol.employees(id), -- created_by (Rails user_id → mapeado)
  active            BOOLEAN     NOT NULL DEFAULT TRUE,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_name       ON sascarol.coupons (name);
CREATE INDEX IF NOT EXISTS idx_coupons_expiration ON sascarol.coupons (expiration);
CREATE INDEX IF NOT EXISTS idx_coupons_active     ON sascarol.coupons (active);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS — mesmas políticas do restante do schema sascarol
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- shipments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'sascarol' AND tablename = 'shipments'
  ) THEN
    ALTER TABLE sascarol.shipments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "auth_read_shipments"  ON sascarol.shipments FOR SELECT TO authenticated USING (TRUE);
    CREATE POLICY "auth_write_shipments" ON sascarol.shipments FOR ALL    TO authenticated USING (TRUE) WITH CHECK (TRUE);
  END IF;

  -- coupons
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'sascarol' AND tablename = 'coupons'
  ) THEN
    ALTER TABLE sascarol.coupons ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "auth_read_coupons"  ON sascarol.coupons FOR SELECT TO authenticated USING (TRUE);
    CREATE POLICY "auth_write_coupons" ON sascarol.coupons FOR ALL    TO authenticated USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON sascarol.shipments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sascarol.coupons   TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sascarol.shipments_id_seq  TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sascarol.coupons_id_seq    TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Verificação final
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  'shipments' AS tabela, COUNT(*) AS registros FROM sascarol.shipments
UNION ALL
SELECT
  'coupons',             COUNT(*) FROM sascarol.coupons;
