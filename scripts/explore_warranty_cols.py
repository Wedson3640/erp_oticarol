import json

with open(r'C:\Users\udpl1652\oticarol\db_map_completo.json', encoding='utf-8') as f:
    data = json.load(f)

erp = data['databases']['erp_vision']
tables = erp.get('tables', {})

warranty_tables = [
    'TB_Warranties',
    'TB_Warranty_Interactions',
    'TB_Warranty_Problems',
    'TB_Warranty_Situations',
    'TB_Warranty_Situation_Flows',
    'VW_Warranties',
    'VW_Warranty_Interactions',
]

for tname in warranty_tables:
    t = tables.get(tname)
    if not t:
        print(f"\n{tname}: NOT FOUND")
        continue
    print(f"\n=== {tname} ({t.get('row_count', 0)} rows) ===")
    cols = t.get('columns', [])
    if isinstance(cols, list):
        for col in cols:
            if isinstance(col, dict):
                print(f"  {col.get('name', '?')}: {col.get('type', '?')}")
            else:
                print(f"  {col}")
    elif isinstance(cols, dict):
        for col_name, col_info in cols.items():
            print(f"  {col_name}: {col_info.get('type', '?') if isinstance(col_info, dict) else col_info}")
    else:
        print(f"  cols type: {type(cols)} — {cols}")

# Let's also look at raw structure of one table
print("\n\n=== RAW TB_Warranties ===")
t = tables.get('TB_Warranties', {})
print(json.dumps(t, indent=2, ensure_ascii=False)[:2000])
