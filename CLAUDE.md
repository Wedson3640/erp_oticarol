@AGENTS.md

# Projeto: erp_otica_carol — ERP Ótica Carol (Produção)

## Contexto Rápido
Reescrita completa do ERP da Ótica Carol (Teresina/PI) usando stack moderna.
O sistema atual (PHP/CodeIgniter 4) continua em produção enquanto este é desenvolvido em paralelo.

## Stack
- Next.js 16 + TypeScript + Tailwind CSS
- Mantine v7 (AppShell, DataTable, Forms, Notifications)
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Framer Motion + Recharts + Lucide React
- Fonte: Open Sans

## Regra mais importante
**NUNCA mudar os fluxos de trabalho** — os usuários já estão acostumados.
Só muda a tecnologia, não a lógica ou UX dos fluxos.

## Estado atual (2026-06-01)
- Projeto criado, dependências ainda NÃO instaladas
- Análise completa dos dois bancos finalizada
- Mockup visual rodando em `../erp-carol-mockup/` (localhost:3000)
- Apresentação para gerência pronta no Obsidian

## Descobertas importantes (sessão 2026-05-31/06-01)
- **69.972 clientes únicos** identificados por CPF nos dois sistemas
- Rails `customers` tem 11.572 registros (nome+tel apenas, sem CPF)
- PHP não tem tabela de clientes — dados inline e duplicados por pedido
- 126 tabelas mapeadas no app_carolpi (73 TB_/VW_ + 49 Rails nativas + 4 sistema)
- 1.498.082 registros em `history_activities` (Rails) — histórico rico em risco
- Tabela `payoffs` (2.888 acertos financeiros) existe só no Rails
- `customers` do Rails usada só no CRM — pedidos ainda inline sem FK

## ⚠️ Ação urgente antes de começar desenvolvimento
```bash
# Backup do banco Rails (dados em risco)
# Rodar no servidor Vision via SSH:
mysqldump -h192.168.144.167 -ucarol -p app_carolpi_production > backup_app_carolpi_$(date +%Y%m%d).sql
```

## Próximo passo imediato
```bash
# 1. Instalar dependências
cd C:\Users\udpl1652\oticarol\erp_otica_carol
npm install @mantine/core @mantine/hooks @mantine/dates @mantine/form \
            @mantine/notifications @mantine/charts \
            framer-motion lucide-react recharts \
            @supabase/supabase-js react-hook-form zod

# 2. Criar projeto em supabase.com
#    → copiar SUPABASE_URL e SUPABASE_ANON_KEY para .env.local

# 3. Rodar schema inicial no Supabase SQL Editor:
#    → criar schemas: erp, audit
#    → criar tabela erp.customers (a primeira e mais importante)
#    → importar 69.972 CPFs

# 4. Implementar AppShell (sidebar + header com Mantine)
# 5. Implementar Auth (login username → email fictício @oticacarol.internal)
```

## Documentação completa
Obsidian: `C:\Users\udpl1652\Documents\Obsidian Vault\otica-carol\`
- `erp_otica_carol - Resumo e Roadmap.md`      ← LEIA PRIMEIRO (pendências e fases)
- `Apresentação Gerência - Melhorias ERP.md`   ← Proposta completa para gerência
- `Mapeamento Completo dos Dois Bancos.md`     ← 73 + 49 tabelas com colunas
- `Arquitetura - Novo ERP (Next.js + Supabase).md`
- `ERP Vision - Documentação Técnica.md`

## Arquivos de trabalho locais
| Arquivo | Para que serve |
|---------|---------------|
| `../db_map_completo.json` | Schema dos dois bancos em JSON |
| `../db_structure.json` | erp_vision detalhado (original) |
| `../source_copy/` | Código PHP completo (referência) |
| `../warranties/GARANTIAS_PENDENTES_RAILS.csv` | 219 garantias aguardando migração |
| `../USUARIOS_SISTEMA.csv` | 350 usuários com grupos e e-mails |

## Sistemas em produção (não mexer sem backup)
- PHP ERP:    https://erp.oticascarolpi.com.br  (banco: erp_vision)
- Rails legado: https://app.oticascarolpi.com.br (banco: app_carolpi_production)
- SSH Vision: carol@23.239.19.126 — chave: `C:\Users\udpl1652\.ssh\vision_carol`
- MySQL Potencial: 172.105.149.72 — credenciais em `../erp_agents/.db_credentials`
- Rails restart: `bash /home/carol/www/app/current/bin/puma.sh start`

## Pendências aguardando gerência
1. Migrar 219 garantias Rails → PHP (`../warranties/GARANTIAS_PENDENTES_RAILS.csv`)
2. Aprovar backup urgente do banco app_carolpi_production
3. Validar mockup visual (localhost:3000) antes de iniciar Fase 1
