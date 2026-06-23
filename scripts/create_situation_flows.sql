-- ═══════════════════════════════════════════════════════════════════════════
-- create_situation_flows.sql
-- Tabelas de situações e fluxos de transição — sascarol
-- Executar no Supabase SQL Editor
-- Extraído do MySQL erp_vision em 23/06/2026 via SSH
-- Bootstrap class → Tailwind color: primary→blue, info→sky, warning→amber,
--                                    success→green, danger→red, dark→gray
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. PEDIDOS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.order_situations (
  id          serial       PRIMARY KEY,
  title       varchar(50)  NOT NULL UNIQUE,
  color       varchar(20)  NOT NULL DEFAULT 'gray',
  time_goal   int          NOT NULL DEFAULT 0,
  is_end      boolean      NOT NULL DEFAULT false,
  position    int          NOT NULL DEFAULT 0,
  active      boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sascarol.order_situation_flows (
  id          serial  PRIMARY KEY,
  actual_id   int     NOT NULL REFERENCES sascarol.order_situations(id),
  next_id     int     NOT NULL REFERENCES sascarol.order_situations(id),
  ui_hint     varchar(30),
  active      boolean NOT NULL DEFAULT true,
  UNIQUE(actual_id, next_id)
);

CREATE INDEX IF NOT EXISTS idx_osf_actual
  ON sascarol.order_situation_flows(actual_id) WHERE active = true;

-- ── 2. GARANTIAS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.warranty_situations (
  id             serial      PRIMARY KEY,
  title          varchar(50) NOT NULL UNIQUE,
  color          varchar(20) NOT NULL DEFAULT 'gray',
  flow_position  char(1)     NOT NULL DEFAULT 'I'
                             CHECK (flow_position IN ('S','I','E')),
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sascarol.warranty_situation_flows (
  id          serial  PRIMARY KEY,
  actual_id   int     NOT NULL REFERENCES sascarol.warranty_situations(id),
  next_id     int     NOT NULL REFERENCES sascarol.warranty_situations(id),
  ui_hint     varchar(30),
  active      boolean NOT NULL DEFAULT true,
  UNIQUE(actual_id, next_id)
);

CREATE INDEX IF NOT EXISTS idx_wsf_actual
  ON sascarol.warranty_situation_flows(actual_id) WHERE active = true;

-- ── 3. SOLICITAÇÕES ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.solicitation_situations (
  id          serial      PRIMARY KEY,
  title       varchar(50) NOT NULL UNIQUE,
  color       varchar(20) NOT NULL DEFAULT 'gray',
  time_goal   int         NOT NULL DEFAULT 0,
  is_end      boolean     NOT NULL DEFAULT false,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sascarol.solicitation_situation_flows (
  id          serial  PRIMARY KEY,
  actual_id   int     NOT NULL REFERENCES sascarol.solicitation_situations(id),
  next_id     int     NOT NULL REFERENCES sascarol.solicitation_situations(id),
  ui_hint     varchar(30),
  active      boolean NOT NULL DEFAULT true,
  UNIQUE(actual_id, next_id)
);

CREATE INDEX IF NOT EXISTS idx_ssf_actual
  ON sascarol.solicitation_situation_flows(actual_id) WHERE active = true;

-- ── 4. CONVERSAS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sascarol.talk_situations (
  id          serial      PRIMARY KEY,
  title       varchar(50) NOT NULL UNIQUE,
  color       varchar(20) NOT NULL DEFAULT 'gray',
  is_end      boolean     NOT NULL DEFAULT false,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sascarol.talk_situation_flows (
  id          serial      PRIMARY KEY,
  actual_id   int         NOT NULL REFERENCES sascarol.talk_situations(id),
  next_id     int         NOT NULL REFERENCES sascarol.talk_situations(id),
  ui_hint     varchar(30),
  active      boolean     NOT NULL DEFAULT true,
  UNIQUE(actual_id, next_id)
);

CREATE INDEX IF NOT EXISTS idx_tsf_actual
  ON sascarol.talk_situation_flows(actual_id) WHERE active = true;

-- ── RLS ─────────────────────────────────────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'order_situations','order_situation_flows',
    'warranty_situations','warranty_situation_flows',
    'solicitation_situations','solicitation_situation_flows',
    'talk_situations','talk_situation_flows'
  ] LOOP
    EXECUTE format('ALTER TABLE sascarol.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS "auth_read_%s" ON sascarol.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "auth_read_%s" ON sascarol.%I FOR SELECT TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

GRANT SELECT ON sascarol.order_situations              TO authenticated;
GRANT SELECT ON sascarol.order_situation_flows         TO authenticated;
GRANT SELECT ON sascarol.warranty_situations           TO authenticated;
GRANT SELECT ON sascarol.warranty_situation_flows      TO authenticated;
GRANT SELECT ON sascarol.solicitation_situations       TO authenticated;
GRANT SELECT ON sascarol.solicitation_situation_flows  TO authenticated;
GRANT SELECT ON sascarol.talk_situations               TO authenticated;
GRANT SELECT ON sascarol.talk_situation_flows          TO authenticated;

-- ── SEED: Situações de Pedido ────────────────────────────────────────────────

INSERT INTO sascarol.order_situations (id, title, color, time_goal, is_end, position) VALUES
  ( 1, 'Pedido criado',               'blue',  1,  false,  1),
  ( 2, 'Compras',                     'sky',   1,  false,  2),
  ( 3, 'Compra Interna',              'sky',   1,  false,  3),
  ( 4, 'Surfaçagem',                  'sky',   3,  false,  4),
  ( 5, 'Montagem Interna',            'sky',   4,  false,  5),
  ( 6, 'Compra Externa',              'sky',   8,  false,  6),
  ( 7, 'Montagem Externa',            'sky',  10,  false,  7),
  ( 8, 'Recebido no laboratório',     'sky',   4,  false,  8),
  ( 9, 'Retorno à logística',         'sky',   1,  false,  9),
  (10, 'Aguardando Retirada',         'amber', 1,  false, 10),
  (11, 'Trânsito',                    'amber', 1,  false, 11),
  (13, 'Recebido na Loja',            'amber', 4,  false, 13),
  (14, 'Entregue ao Cliente',         'green', 1,  true,  14),
  (16, 'Armação encaminhada',         'sky',   1,  false, 16),
  (19, 'Análise de recebimento',      'sky',   0,  false, 19),
  (20, 'Enviado ao laboratório',      'sky',   0,  false, 20),
  (21, 'Rejeitado',                   'sky',   0,  false, 21),
  (22, 'Pedido reiniciado',           'sky',   0,  false, 22),
  (23, 'Perda Interna',               'sky',   0,  false, 23),
  (26, 'Controle de Qualidade',       'sky',   0,  false, 26),
  (27, 'Aguardando Armação',          'sky',   0,  false, 27),
  (28, 'Perda Externa',               'red',   0,  false, 28),
  (30, 'Enviado para montagem',       'blue',  22, false, 30),
  (32, 'Transferência entre lojas',   'amber', 5,  false, 32),
  (34, 'Recompra',                    'blue',  1,  false, 34),
  (35, 'Encaminhando para logística', 'blue',  1,  false, 35),
  (36, 'Em montagem',                 'blue',  1,  false, 36),
  (99, 'Revertido',                   'red',   1,  false, 99)
ON CONFLICT (id) DO NOTHING;

SELECT setval('sascarol.order_situations_id_seq', 100);

-- ── SEED: Fluxos de Pedido ───────────────────────────────────────────────────

INSERT INTO sascarol.order_situation_flows (actual_id, next_id, ui_hint) VALUES
  ( 1,  2, 'shopping'),
  ( 2,  3, 'purchase'),
  ( 2,  6, 'purchase'),
  ( 2,  4, 'surfacing'),
  ( 3, 20, NULL),
  ( 3,  4, 'surfacing'),
  ( 4, 20, 'lab'),
  ( 4,  5, 'surfacing'),
  ( 5, 20, NULL),
  ( 6,  7, 'assembly'),
  ( 6,  5, NULL),
  ( 7, 20, NULL),
  (20,  8, NULL),
  ( 8, 27, NULL),
  ( 8, 26, NULL),
  ( 8, 36, NULL),
  ( 8,  9, NULL),
  (16, 19, NULL),
  (19, 35, NULL),
  (35, 30, NULL),
  (30, 36, NULL),
  (36, 26, NULL),
  (36,  9, NULL),
  (26, 10, NULL),
  (26,  9, NULL),
  (27, 16, NULL),
  ( 9, 28, 'loss'),
  ( 9, 23, 'loss'),
  (28, 34, NULL),
  (23, 34, NULL),
  (34,  3, 'purchase'),
  (34,  6, 'purchase'),
  (34,  4, 'surfacing'),
  (10, 11, NULL),
  (11, 13, NULL),
  (13, 14, NULL),
  (13, 32, 'transfer'),
  (32, 32, 'transfer'),
  (32, 11, 'transfer'),
  ( 9,  8, NULL)
ON CONFLICT (actual_id, next_id) DO NOTHING;

-- ── SEED: Situações de Garantia ──────────────────────────────────────────────

INSERT INTO sascarol.warranty_situations (id, title, color, flow_position) VALUES
  ( 1, 'Solicitação Criada',      'blue',  'S'),
  ( 3, 'Em Análise',              'amber', 'I'),
  ( 4, 'Aprovada',                'blue',  'I'),
  ( 5, 'Rejeitada',               'red',   'I'),
  ( 6, 'Recebido na logística',   'blue',  'I'),
  ( 7, 'Enviado ao laboratório',  'sky',   'I'),
  ( 8, 'Recebido no laboratório', 'sky',   'I'),
  ( 9, 'Controle de qualidade',   'sky',   'I'),
  (10, 'Aguardando retirada',     'sky',   'I'),
  (11, 'Recebido em loja',        'sky',   'I'),
  (12, 'Entregue ao cliente',     'green', 'E')
ON CONFLICT (id) DO NOTHING;

SELECT setval('sascarol.warranty_situations_id_seq', 20);

INSERT INTO sascarol.warranty_situation_flows (actual_id, next_id, ui_hint) VALUES
  ( 1,  6, NULL),
  ( 6,  3, 'purchase'),
  ( 3,  4, NULL),
  ( 3,  5, NULL),
  ( 4,  7, NULL),
  ( 7,  8, NULL),
  ( 8,  9, NULL),
  ( 9, 10, NULL),
  (10, 11, NULL),
  (11, 12, NULL)
ON CONFLICT (actual_id, next_id) DO NOTHING;

-- ── SEED: Situações de Solicitação ───────────────────────────────────────────

INSERT INTO sascarol.solicitation_situations (id, title, color, time_goal, is_end) VALUES
  ( 1, 'Solicitação Criada',         'blue',  0, false),
  ( 8, 'Laboratório',                'sky',   0, false),
  ( 9, 'Análise de recebimento',     'sky',   0, false),
  (10, 'Aguardando Retirada',        'sky',   0, false),
  (11, 'Trânsito',                   'sky',   0, false),
  (13, 'Recebido na loja',           'amber', 0, false),
  (14, 'Entregue ao cliente',        'green', 0, true),
  (16, 'Recebido no laboratório',    'sky',   0, false),
  (17, 'Fechado pelo administrador', 'gray',  0, false),
  (23, 'Transferência de loja',      'sky',   0, false),
  (26, 'Controle de qualidade',      'sky',   0, false)
ON CONFLICT (id) DO NOTHING;

SELECT setval('sascarol.solicitation_situations_id_seq', 30);

INSERT INTO sascarol.solicitation_situation_flows (actual_id, next_id, ui_hint) VALUES
  ( 1,  9, NULL),
  ( 9, 16, NULL),
  (16, 26, NULL),
  (26, 10, NULL),
  (10, 11, NULL),
  (11, 13, NULL),
  (13, 14, NULL)
ON CONFLICT (actual_id, next_id) DO NOTHING;

-- ── SEED: Situações de Conversa ──────────────────────────────────────────────

INSERT INTO sascarol.talk_situations (id, title, color, is_end) VALUES
  (1, 'Início',              'blue',  false),
  (2, 'Somente Informações', 'gray',  true),
  (3, 'Em Atendimento',      'amber', false),
  (4, 'Convertido',          'green', true),
  (5, 'Não Convertido',      'red',   true),
  (6, 'Encaminhado',         'amber', false),
  (9, 'Sunglass Hut',        'sky',   false)
ON CONFLICT (id) DO NOTHING;

SELECT setval('sascarol.talk_situations_id_seq', 10);

INSERT INTO sascarol.talk_situation_flows (actual_id, next_id, ui_hint) VALUES
  (1, 3, 'forward'),
  (1, 2, NULL),
  (3, 4, 'converted'),
  (3, 5, 'reason'),
  (3, 6, 'forward'),
  (3, 9, NULL),
  (6, 4, 'converted'),
  (6, 5, 'reason'),
  (6, 6, 'forward'),
  (9, 4, 'converted'),
  (9, 5, 'reason')
ON CONFLICT (actual_id, next_id) DO NOTHING;

-- ── Verificação final ────────────────────────────────────────────────────────
SELECT 'order_situations'             AS tabela, COUNT(*) FROM sascarol.order_situations
UNION ALL
SELECT 'order_situation_flows',                  COUNT(*) FROM sascarol.order_situation_flows
UNION ALL
SELECT 'warranty_situations',                    COUNT(*) FROM sascarol.warranty_situations
UNION ALL
SELECT 'warranty_situation_flows',               COUNT(*) FROM sascarol.warranty_situation_flows
UNION ALL
SELECT 'solicitation_situations',                COUNT(*) FROM sascarol.solicitation_situations
UNION ALL
SELECT 'solicitation_situation_flows',           COUNT(*) FROM sascarol.solicitation_situation_flows
UNION ALL
SELECT 'talk_situations',                        COUNT(*) FROM sascarol.talk_situations
UNION ALL
SELECT 'talk_situation_flows',                   COUNT(*) FROM sascarol.talk_situation_flows;
