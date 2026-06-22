import json

with open(r'C:\Users\udpl1652\oticarol\db_map_completo.json', encoding='utf-8') as f:
    data = json.load(f)

erp = data['databases']['erp_vision']
tables = erp.get('tables', {})

print("=== Tabelas TB_ (erp_vision) ===")
tb_tables = [(name, t.get('row_count', 0)) for name, t in tables.items() if name.startswith('TB_')]
for name, count in sorted(tb_tables):
    print(f"  {name}: {count} rows")
print(f"\nTotal TB_: {len(tb_tables)} tabelas")
print(f"Total erp_vision: {len(tables)} tabelas")

print("\n=== Busca por 'garantia' em qualquer tabela ===")
for name in sorted(tables.keys()):
    if 'garantia' in name.lower():
        print(f"  {name}: {tables[name].get('row_count', 0)}")

print("\n=== Todas as tabelas erp_vision ===")
for name in sorted(tables.keys()):
    print(f"  {name}: {tables[name].get('row_count', 0)}")

# Rails
rails = data['databases']['app_carolpi_production']
rails_tables = rails.get('tables', {})
print("\n=== Busca por 'garantia' no Rails ===")
for name in sorted(rails_tables.keys()):
    if 'garantia' in name.lower() or 'warrant' in name.lower():
        print(f"  {name}: {rails_tables[name].get('row_count', 0)}")
