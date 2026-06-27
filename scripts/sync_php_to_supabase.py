#!/usr/bin/env python3
"""
sync_php_to_supabase.py
========================
Sync incremental: PHP ERP (MySQL erp_vision) → Supabase sascarol

Estratégia PATCH:
  - Lê TB_Orders com ord_updated_at > last_sync_ts
  - Busca situação atual via ord_ori_id → TB_Order_Interactions → TB_Order_Situations
  - Agrupa por situação para minimizar chamadas REST
  - Faz PATCH em service_orders filtrando por source_erp_id (só atualiza campos, não insere)
  - Salva timestamp do sync em /opt/sync/last_sync.txt

Cron (a cada 5 min):
  */5 * * * * /opt/sync/run_sync.sh >> /opt/sync/sync.log 2>&1
"""

import os, sys, datetime, requests, pymysql, traceback
from collections import defaultdict

# ─── Configuração ────────────────────────────────────────────────────────────

MYSQL_HOST = "172.105.149.72"
MYSQL_USER = "carol"
MYSQL_PASS = "Y[;Q2nx7k_LF7z7"
MYSQL_DB   = "erp_vision"

SUPABASE_URL = os.environ.get("SUPABASE_URL",      "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

LAST_SYNC_FILE = "/opt/sync/last_sync.txt"
BATCH_SIZE     = 500
TS_NOW         = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
LOG            = lambda msg: print(f"[{TS_NOW}] {msg}")

# ─── Helpers ────────────────────────────────────────────────────────────────

def read_last_sync() -> str:
    try:
        with open(LAST_SYNC_FILE) as f:
            ts = f.read().strip()
            if ts:
                return ts
    except FileNotFoundError:
        pass
    # Default: 1 hora atrás
    return (datetime.datetime.now() - datetime.timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")

def save_last_sync(ts: str):
    os.makedirs(os.path.dirname(LAST_SYNC_FILE), exist_ok=True)
    with open(LAST_SYNC_FILE, "w") as f:
        f.write(ts)

def supa_headers() -> dict:
    return {
        "apikey":          SUPABASE_KEY,
        "Authorization":   f"Bearer {SUPABASE_KEY}",
        "Content-Type":    "application/json",
        "Accept-Profile":  "sascarol",
        "Content-Profile": "sascarol",
    }

def patch_situation_batch(ids: list[int], payload: dict) -> bool:
    """
    PATCH service_orders onde source='php' e source_erp_id está na lista.
    Atualiza apenas os campos de situação (não toca em customer_id, store_id, etc.).
    """
    # PostgREST aceita source_erp_id=in.(1,2,3)
    ids_str = ",".join(str(i) for i in ids)
    url = f"{SUPABASE_URL}/rest/v1/service_orders?source=eq.php&source_erp_id=in.({ids_str})"
    r = requests.patch(url, headers=supa_headers(), json=payload, timeout=30)
    if not r.ok:
        LOG(f"  ERRO PATCH ids={ids_str[:60]}... → {r.status_code} {r.text[:150]}")
        return False
    return True

# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    if not SUPABASE_KEY or not SUPABASE_URL:
        LOG("ERRO: SUPABASE_URL ou SUPABASE_SERVICE_KEY não definidas")
        sys.exit(1)

    last_sync  = read_last_sync()
    sync_start = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    LOG(f"Iniciando sync — desde: {last_sync}")

    # ── Conecta MySQL ──────────────────────────────────────────────────────────
    try:
        conn = pymysql.connect(
            host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASS,
            database=MYSQL_DB, charset="utf8mb4", connect_timeout=10,
        )
    except Exception as e:
        LOG(f"ERRO conexão MySQL: {e}")
        sys.exit(1)

    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cur:
            sql = """
                SELECT
                    o.ord_id,
                    COALESCE(s.ors_title, '')          AS situation,
                    o.ord_scheduled_delivery_date       AS scheduled_delivery,
                    o.ord_new_scheduled_delivery_date   AS new_scheduled_delivery,
                    o.ord_new_scheduled_reason          AS new_scheduled_reason,
                    o.ord_urgent                        AS urgent,
                    o.ord_note                          AS notes,
                    o.ord_updated_at                    AS updated_at,
                    o.ord_deleted_at                    AS deleted_at
                FROM TB_Orders o
                LEFT JOIN TB_Order_Interactions oi ON oi.ori_id = o.ord_ori_id
                LEFT JOIN TB_Order_Situations   s  ON s.ors_id  = oi.ori_ors_id
                WHERE o.ord_updated_at > %s
                  AND o.ord_flag = 0
                ORDER BY o.ord_updated_at ASC
                LIMIT %s
            """
            cur.execute(sql, (last_sync, BATCH_SIZE))
            rows = cur.fetchall()
    except Exception as e:
        LOG(f"ERRO query MySQL: {e}")
        traceback.print_exc()
        conn.close()
        sys.exit(1)
    finally:
        conn.close()

    if not rows:
        LOG(f"Nenhum registro alterado desde {last_sync}")
        save_last_sync(sync_start)
        return

    LOG(f"{len(rows)} pedidos alterados — sincronizando situações...")

    # ── Agrupa por (situation, scheduled_delivery, urgent) para minimizar requests ──
    # Chave = tupla dos valores; valor = lista de ord_ids
    groups: dict[tuple, list[int]] = defaultdict(list)
    last_updated_at = None

    for r in rows:
        key = (
            r["situation"] or "",
            str(r["scheduled_delivery"])     if r["scheduled_delivery"]     else None,
            str(r["new_scheduled_delivery"]) if r["new_scheduled_delivery"] else None,
            r["new_scheduled_reason"],
            bool(r["urgent"]),
            str(r["deleted_at"])             if r["deleted_at"]             else None,
        )
        groups[key].append(r["ord_id"])
        last_updated_at = str(r["updated_at"]) if r["updated_at"] else last_updated_at

    LOG(f"  {len(groups)} grupos de situação únicos → {sum(len(v) for v in groups.values())} pedidos")

    errors = 0
    updated = 0

    for (situation, sched, new_sched, new_reason, urgent, deleted_at), ids in groups.items():
        payload = {
            "situation":              situation or None,
            "scheduled_delivery":     sched,
            "new_scheduled_delivery": new_sched,
            "new_scheduled_reason":   new_reason,
            "urgent":                 urgent,
            "deleted_at":             deleted_at,
            "updated_at":             sync_start,
        }
        # Remove chaves None para não sobrescrever com null desnecessariamente
        payload = {k: v for k, v in payload.items() if v is not None or k in ("situation", "urgent")}

        # Envia em sub-lotes de 200 ids (URL limit)
        for i in range(0, len(ids), 200):
            sub = ids[i:i+200]
            if patch_situation_batch(sub, payload):
                updated += len(sub)
            else:
                errors  += len(sub)

    if errors == 0:
        save_last_sync(last_updated_at or sync_start)
        LOG(f"✓ {updated} pedidos sincronizados com sucesso.")
    else:
        LOG(f"✗ {errors} erros | {updated} atualizados — last_sync NÃO avançado")
        sys.exit(1)

if __name__ == "__main__":
    main()
