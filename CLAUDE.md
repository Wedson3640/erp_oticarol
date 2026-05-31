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

## Estado atual (2026-05-31)
- Projeto criado, dependências ainda não instaladas
- Schema MySQL do sistema atual está em: `../db_structure.json`
- Código PHP de referência em: `../source_copy/`
- Mockup visual pronto em: `../erp-carol-mockup/` (oticarol_dev)

## Próximo passo imediato
```bash
# 1. Instalar dependências
npm install @mantine/core @mantine/hooks @mantine/dates @mantine/form \
            @mantine/notifications @mantine/charts \
            framer-motion lucide-react recharts \
            @supabase/supabase-js react-hook-form zod

# 2. Criar projeto no Supabase → adicionar credenciais em .env.local
# 3. Implementar AppShell (sidebar + header)
# 4. Implementar Auth (login com username)
```

## Documentação completa
Obsidian: `C:\Users\udpl1652\Documents\Obsidian Vault\otica-carol\`
- `erp_otica_carol - Resumo e Roadmap.md` ← LEIA ESTE PRIMEIRO
- `Arquitetura - Novo ERP (Next.js + Supabase).md`
- `ERP Vision - Documentação Técnica.md`

## Sistemas em produção (não mexer sem backup)
- PHP ERP: https://erp.oticascarolpi.com.br
- Rails (legado): https://app.oticascarolpi.com.br
- SSH Vision: carol@23.239.19.126 (chave: ~/.ssh/vision_carol)
- Banco MySQL: 172.105.149.72 (credenciais em erp_agents/.db_credentials)

## Pendência crítica
219 garantias abertas no Rails ainda não migradas para o PHP.
Arquivo: `../warranties/GARANTIAS_PENDENTES_RAILS.csv`
Status: aguardando aval da gerência.
