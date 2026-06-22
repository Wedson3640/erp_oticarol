"""
Explora tabelas de garantias no banco PHP erp_vision
para planejar o ETL 09.
"""
import subprocess

SSH_KEY = r"C:\Users\udpl1652\.ssh\vision_carol"
SSH_HOST = "carol@23.239.19.126"
DB_HOST = "172.105.149.72"
DB_USER = "carol"
DB_PASS = "Y[;Q2nx7k_LF7z7"
DB_NAME = "erp_vision"


def run_sql(sql: str) -> str:
    result = subprocess.run(
        [
            "ssh", "-i", SSH_KEY, "-o", "StrictHostKeyChecking=no",
            SSH_HOST,
            f"mysql -h{DB_HOST} -u{DB_USER} -p'{DB_PASS}' {DB_NAME} -e \"{sql}\"",
        ],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0 and "Warning" not in result.stderr:
        print("STDERR:", result.stderr[:500])
    return result.stdout


print("=== Tabelas com 'garantia' ===")
print(run_sql(
    "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES "
    "WHERE TABLE_SCHEMA='erp_vision' AND TABLE_NAME LIKE '%garantia%' ORDER BY TABLE_NAME;"
))

print("=== Tabelas com 'historico' ou 'log' ===")
print(run_sql(
    "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES "
    "WHERE TABLE_SCHEMA='erp_vision' AND (TABLE_NAME LIKE '%historico%' OR TABLE_NAME LIKE '%_log%' OR TABLE_NAME LIKE 'log%') "
    "ORDER BY TABLE_NAME;"
))

print("=== Todas as tabelas TB_ com contagem ===")
print(run_sql(
    "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES "
    "WHERE TABLE_SCHEMA='erp_vision' AND TABLE_NAME LIKE 'TB_%' "
    "ORDER BY TABLE_NAME;"
))
