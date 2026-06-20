"use client"

import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Plus, Search, Filter, ChevronDown, Eye, MessageCircle } from "lucide-react"
import Link from "next/link"

const conversas = [
  { id: 1,  cliente: "Maria Aparecida Sousa",   tel: "(86) 9 9111-2222", canal: "WhatsApp", interesse: "RX",      situacao: "Em Atendimento",     consultor: "Ana Souza",    loja: "488",  ultima: "Hoje, 10:30",  valor: null    },
  { id: 2,  cliente: "José Ferreira Lima",       tel: "(86) 9 9333-4444", canal: "Loja",    interesse: "Solar",   situacao: "Convertido",         consultor: "Carlos Lima",  loja: "488",  ultima: "Hoje, 09:15",  valor: 450.00  },
  { id: 3,  cliente: "Francisca das Neves",      tel: "(86) 9 9555-6666", canal: "Instagram",interesse: "RX",     situacao: "Aguardando Retorno", consultor: "Juliana Dias", loja: "1060", ultima: "Ontem, 16:45", valor: null    },
  { id: 4,  cliente: "Antônio de Sousa Filho",   tel: "(86) 9 9777-8888", canal: "WhatsApp", interesse: "Montagem",situacao: "Não Convertido",    consultor: "Marcos Silva", loja: "717",  ultima: "29/05, 11:00", valor: null    },
  { id: 5,  cliente: "Raimunda Bezerra Costa",   tel: "(86) 9 9999-0000", canal: "Loja",    interesse: "Solar",   situacao: "Em Atendimento",     consultor: "Ana Souza",    loja: "488",  ultima: "Hoje, 14:20",  valor: null    },
  { id: 6,  cliente: "Carlos Alberto Mendes",    tel: "(86) 9 8111-2222", canal: "WhatsApp", interesse: "RX",     situacao: "Convertido",         consultor: "Juliana Dias", loja: "1249", ultima: "Ontem, 09:00", valor: 780.00  },
]

const canalColor: Record<string, { bg: string; text: string }> = {
  "WhatsApp": { bg: "#DCFCE7", text: "#14532D" },
  "Loja":     { bg: "#DBEAFE", text: "#1E40AF" },
  "Instagram":{ bg: "#EDE9FE", text: "#4C1D95" },
}

const interesseColor: Record<string, { bg: string; text: string }> = {
  "RX":       { bg: "#EEF2FF", text: "#3730A3" },
  "Solar":    { bg: "#FEF3C7", text: "#92400E" },
  "Montagem": { bg: "#CCFBF1", text: "#134E4A" },
}


function MiniChip({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: colors.bg, color: colors.text,
    }}>
      {label}
    </span>
  )
}

export default function ConversasPage() {
  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

  return (
    <>
      <Header breadcrumbs={["Home", "Conversas / CRM"]} title="Conversas / CRM" />

      <main className="pt-[64px] px-8 py-6 space-y-4">

        {/* Stats + ações */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#DBEAFE", color: "#1E40AF" }}>
              <MessageCircle className="inline w-3 h-3 mr-1" />
              3 em atendimento
            </span>
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#FEF3C7", color: "#92400E" }}>
              1 aguardando retorno
            </span>
          </div>
          <Link href="/conversas/nova">
            <motion.span
              whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.25)" }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ background: "#0f2744" }}
            >
              <Plus className="w-4 h-4" /> Nova Conversa
            </motion.span>
          </Link>
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "#94a3b8" }} />
          {["Todas as situações", "Todos os canais", "Todos os interesses", "Todos os consultores"].map((label) => (
            <button key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border"
              style={{ borderColor: "#e2e8f0", color: "#475569", background: "#f8fafc" }}>
              {label} <ChevronDown className="w-3 h-3" />
            </button>
          ))}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            <input placeholder="Buscar cliente..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm border outline-none"
              style={{ borderColor: "#e2e8f0", color: "#0f172a", background: "#f8fafc" }} />
          </div>
          <button className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: "#1d4ed8" }}>
            Filtrar
          </button>
        </motion.div>

        {/* Tabela */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="rounded-xl border overflow-hidden"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Cliente", "Telefone", "Canal", "Interesse", "Situação", "Consultor", "Loja", "Última Atividade", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conversas.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, stiffness: 220, damping: 24 }}
                  className="border-b"
                  style={{
                    borderColor: "#f1f5f9",
                    borderLeft: c.situacao === "Convertido" ? "3px solid #16a34a" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8faff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3">
                    <div>
                      <Link href={`/conversas/${c.id}`}
                        className="font-semibold text-sm hover:underline" style={{ color: "#0f172a" }}>
                        {c.cliente}
                      </Link>
                      {c.situacao === "Convertido" && c.valor && (
                        <span className="block text-xs font-semibold mt-0.5" style={{ color: "#16a34a" }}>
                          Convertido · {fmt(c.valor)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{c.tel}</td>
                  <td className="px-4 py-3">
                    <MiniChip label={c.canal} colors={canalColor[c.canal] ?? { bg: "#f1f5f9", text: "#475569" }} />
                  </td>
                  <td className="px-4 py-3">
                    <MiniChip label={c.interesse} colors={interesseColor[c.interesse] ?? { bg: "#f1f5f9", text: "#475569" }} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.situacao} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#0f172a", fontWeight: 500 }}>{c.consultor}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                      {c.loja}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{c.ultima}</td>
                  <td className="px-4 py-3">
                    <Link href={`/conversas/${c.id}`}>
                      <motion.span whileHover={{ scale: 1.15 }}
                        className="p-1.5 rounded-lg cursor-pointer"
                        style={{ color: "#94a3b8" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <Eye style={{ width: 14, height: 14 }} />
                      </motion.span>
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </main>
    </>
  )
}
