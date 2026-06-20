-- ════════════════════════════════════════════════════════════════════════════
-- ERP Ótica Carol — sascarol schema v2
-- Rodar no Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Novas colunas em service_orders ──────────────────────────────────────

ALTER TABLE sascarol.service_orders
  ADD COLUMN IF NOT EXISTS situation      text    DEFAULT 'Aguardando',
  ADD COLUMN IF NOT EXISTS laboratory_id  bigint  REFERENCES sascarol.laboratories(id),
  ADD COLUMN IF NOT EXISTS lab_os_number  text;

-- ─── 2. Novas colunas em warranties ──────────────────────────────────────────

ALTER TABLE sascarol.warranties
  ADD COLUMN IF NOT EXISTS situation    text  DEFAULT 'Início',
  ADD COLUMN IF NOT EXISTS problem_id   bigint REFERENCES sascarol.warranty_problems(id),
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_cpf  text,
  ADD COLUMN IF NOT EXISTS request_date  date  DEFAULT CURRENT_DATE;

-- ─── 3. Políticas INSERT / UPDATE — service_orders ───────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='sascarol' AND tablename='service_orders' AND policyname='insert_autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "insert_autenticado" ON sascarol.service_orders
             FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='sascarol' AND tablename='service_orders' AND policyname='update_autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "update_autenticado" ON sascarol.service_orders
             FOR UPDATE TO authenticated USING (true)';
  END IF;
END $$;

-- ─── 4. Políticas INSERT / UPDATE — warranties ────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='sascarol' AND tablename='warranties' AND policyname='insert_autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "insert_autenticado" ON sascarol.warranties
             FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='sascarol' AND tablename='warranties' AND policyname='update_autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "update_autenticado" ON sascarol.warranties
             FOR UPDATE TO authenticated USING (true)';
  END IF;
END $$;

-- ─── 5. service_order_histories ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.service_order_histories (
  id               bigserial   PRIMARY KEY,
  service_order_id bigint      NOT NULL REFERENCES sascarol.service_orders(id) ON DELETE CASCADE,
  situation        text        NOT NULL,
  operator_name    text,
  employee_id      bigint      REFERENCES sascarol.employees(id),
  laboratory_id    bigint      REFERENCES sascarol.laboratories(id),
  lab_os_number    text,
  value            numeric(10,2),
  notes            text,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE sascarol.service_order_histories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='service_order_histories' AND policyname='leitura_autenticado') THEN
    EXECUTE 'CREATE POLICY "leitura_autenticado" ON sascarol.service_order_histories FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='service_order_histories' AND policyname='insert_autenticado') THEN
    EXECUTE 'CREATE POLICY "insert_autenticado" ON sascarol.service_order_histories FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
END $$;

-- ─── 6. warranty_histories ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.warranty_histories (
  id            bigserial   PRIMARY KEY,
  warranty_id   bigint      NOT NULL REFERENCES sascarol.warranties(id) ON DELETE CASCADE,
  situation     text        NOT NULL,
  operator_name text,
  employee_id   bigint      REFERENCES sascarol.employees(id),
  notes         text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE sascarol.warranty_histories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='warranty_histories' AND policyname='leitura_autenticado') THEN
    EXECUTE 'CREATE POLICY "leitura_autenticado" ON sascarol.warranty_histories FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='warranty_histories' AND policyname='insert_autenticado') THEN
    EXECUTE 'CREATE POLICY "insert_autenticado" ON sascarol.warranty_histories FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
END $$;

-- ─── 7. requests (solicitações) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.requests (
  id                 bigserial   PRIMARY KEY,
  customer_id        bigint      REFERENCES sascarol.customers(id),
  customer_name      text,
  customer_cpf       text,
  customer_phone     text,
  store_id           bigint      REFERENCES sascarol.stores(id),
  employee_id        bigint      REFERENCES sascarol.employees(id),
  service_type       text        NOT NULL,
  frame_type         text,
  frame_model        text,
  situation          text        NOT NULL DEFAULT 'Aguardando',
  scheduled_delivery date,
  notes              text,
  deleted_at         timestamptz,
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE sascarol.requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='requests' AND policyname='leitura_autenticado') THEN
    EXECUTE 'CREATE POLICY "leitura_autenticado" ON sascarol.requests FOR SELECT TO authenticated USING (deleted_at IS NULL)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='requests' AND policyname='insert_autenticado') THEN
    EXECUTE 'CREATE POLICY "insert_autenticado" ON sascarol.requests FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='requests' AND policyname='update_autenticado') THEN
    EXECUTE 'CREATE POLICY "update_autenticado" ON sascarol.requests FOR UPDATE TO authenticated USING (true)';
  END IF;
END $$;

-- ─── 8. request_histories ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.request_histories (
  id            bigserial   PRIMARY KEY,
  request_id    bigint      NOT NULL REFERENCES sascarol.requests(id) ON DELETE CASCADE,
  situation     text        NOT NULL,
  operator_name text,
  employee_id   bigint      REFERENCES sascarol.employees(id),
  notes         text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE sascarol.request_histories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='request_histories' AND policyname='leitura_autenticado') THEN
    EXECUTE 'CREATE POLICY "leitura_autenticado" ON sascarol.request_histories FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='sascarol' AND tablename='request_histories' AND policyname='insert_autenticado') THEN
    EXECUTE 'CREATE POLICY "insert_autenticado" ON sascarol.request_histories FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
END $$;
