"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { fmt } from "@/lib/utils"
import { Plus, Target, ChevronLeft, ChevronRight } from "lucide-react"

const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })

const metas = [
  { nome: "Ana Souza",    metaRX: 2000, realRX: 1200, metaSol: 3000, realSol: 2500, metaLen: 1500, realLen: 900,  folga: false },
  { nome: "Carlos Lima",  metaRX: 2000, realRX: 850,  metaSol: 3000, realSol: 1200, metaLen: 1500, realLen: 500,  folga: false },
  { nome: "Juliana Dias", metaRX: 2000, realRX: 1700, metaSol: 3000, realSol: 2900, metaLen: 1500, realLen: 1400, folga: false },
  { nome: "Marcos Silva", metaRX: 2000, realRX: 650,  metaSol: 3000, realSol: 900,  metaLen: 1500, realLen: 300,  folga: true  },
  { nome: "Carla Mota",   metaRX: 2000, realRX: 1900, metaSol: 3000, realSol: 3100, metaLen: 1500, realLen: 1500, folga: false },
]

const pct = (real: number, meta: number) => Math.round((real / meta) * 100)
const pctColor = (p: number) => p >= 100 ? "#16A34A" : p >= 60 ? "#F59E0B" : "#EF4444"
const rowBg = (p: number, folga: boolean) =>
  folga ? "#f8fafc" : p >= 100 ? "#f0fdf4" : p >= 60 ? "#fffbeb" : "#fff5f5"

export default function MetasPage() {
  const [lançando, setLançando] = useState<number | null>(null)

  const totals = metas.filter((m) => !m.folga).reduce(
    (acc, m) => ({
      metaRX: acc.metaRX + m.metaRX,
      realRX: acc.realRX + m.realRX,
      metaSol: acc.metaSol + m.metaSol,
      realSol: acc.realSol + m.realSol,
      metaLen: acc.metaLen + m.metaLen,
      realLen: acc.realLen + m.realLen,
    }),
    { metaRX: 0, realRX: 0, metaSol: 0, realSol: 0, metaLen: 0, realLen: 0 }
  )

  return (
    <>
      <Header breadcrumbs={["Home", "Metas"]} title="Metas Diárias" />

      <main className="pt-[64px] px-8 py-6 space-y-5">

        {/* Barra superior */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
              <ChevronLeft className="w-4 h-4" style={{ color: "#556376" }} />
            </button>
            <div className="px-4 py-2 rounded-xl font-semibold text-sm" style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#121212" }}>
              {hoje}
            </div>
            <button className="p-2 rounded-xl" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
              <ChevronRight className="w-4 h-4" style={{ color: "#556376" }} />
            </button>
            <span className="text-sm" style={{ color: "#556376" }}>Loja 488 — Teresina Shopping</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border"
              style={{ background: "#fff", borderColor: "#e2e8f0", color: "#3c4859" }}>
              Relatório
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#0f2744" }}
            >
              <Plus className="w-4 h-4" /> Cadastrar Meta
            </motion.button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {[
            { label: "Meta Total Loja", meta: totals.metaRX + totals.metaSol + totals.metaLen, real: totals.realRX + totals.realSol + totals.realLen },
            { label: "Meta RX",   meta: totals.metaRX,  real: totals.realRX  },
            { label: "Meta Solar",meta: totals.metaSol, real: totals.realSol },
            { label: "Meta Lentes",meta: totals.metaLen, real: totals.realLen },
          ].map((card, i) => {
            const p = pct(card.real, card.meta)
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ background: "#fff", border: "1px solid #DDE7F3", borderRadius: 16, padding: 22, boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#2F4162" }}>{card.label}</p>
                  <Target style={{ width: 18, height: 18, color: pctColor(p) }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#061A35" }}>{fmt(card.real)}</p>
                <p style={{ fontSize: 12, color: "#60708A" }}>{fmt(card.meta)} · <strong style={{ color: pctColor(p) }}>{p}%</strong></p>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#E8EEF7" }}>
                  <div style={{ width: `${Math.min(p, 100)}%`, height: "100%", background: pctColor(p), borderRadius: 999 }} />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Tabela */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ background: "#fff", border: "1px solid #DDE7F3", borderRadius: 16, boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
        >
          <div className="px-6 py-4" style={{ borderBottom: "1px solid #EAF2FF" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#061A35" }}>Metas por Funcionário</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F6FAFF" }}>
                {["FUNCIONÁRIO", "META RX", "REAL. RX", "% RX", "META SOL", "REAL. SOL", "% SOL", "META LEN", "REAL. LEN", "% LEN", "AÇÕES"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#60708A", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #EAF2FF" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metas.map((m, i) => {
                const totalReal = m.realRX + m.realSol + m.realLen
                const totalMeta = m.metaRX + m.metaSol + m.metaLen
                const totalPct = pct(totalReal, totalMeta)
                return (
                  <tr key={m.nome}
                    style={{ background: rowBg(totalPct, m.folga), borderBottom: i < metas.length - 1 ? "1px solid #F0F5FF" : "none", opacity: m.folga ? 0.6 : 1 }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#061A35" }}>
                      {m.nome}
                      {m.folga && <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: "#e2e8f0", color: "#556376", fontSize: 10 }}>FOLGA</span>}
                    </td>
                    {[
                      { meta: m.metaRX,  real: m.realRX  },
                      { meta: m.metaSol, real: m.realSol },
                      { meta: m.metaLen, real: m.realLen },
                    ].map((cat, ci) => (
                      <>
                        <td key={`m${ci}`} style={{ padding: "12px 16px", fontSize: 14, color: "#40516F" }}>{fmt(cat.meta)}</td>
                        <td key={`r${ci}`} style={{ padding: "12px 16px", fontSize: 14, color: "#40516F" }}>{fmt(cat.real)}</td>
                        <td key={`p${ci}`} style={{ padding: "12px 16px" }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: pctColor(pct(cat.real, cat.meta)) }}>
                            {pct(cat.real, cat.meta)}%
                          </span>
                        </td>
                      </>
                    ))}
                    <td style={{ padding: "12px 16px" }}>
                      {!m.folga && (
                        <button
                          onClick={() => setLançando(lançando === i ? null : i)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ background: "#dbeafe", color: "#1d4ed8" }}
                        >
                          Lançar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}

              {/* Totais */}
              <tr style={{ background: "#0f2744" }}>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#fff", fontSize: 14 }}>TOTAL</td>
                {[
                  { meta: totals.metaRX,  real: totals.realRX  },
                  { meta: totals.metaSol, real: totals.realSol },
                  { meta: totals.metaLen, real: totals.realLen },
                ].map((cat, ci) => (
                  <>
                    <td key={`tm${ci}`} style={{ padding: "12px 16px", color: "#93c5fd", fontSize: 14 }}>{fmt(cat.meta)}</td>
                    <td key={`tr${ci}`} style={{ padding: "12px 16px", color: "#fff", fontWeight: 700, fontSize: 14 }}>{fmt(cat.real)}</td>
                    <td key={`tp${ci}`} style={{ padding: "12px 16px" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: pctColor(pct(cat.real, cat.meta)) }}>
                        {pct(cat.real, cat.meta)}%
                      </span>
                    </td>
                  </>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </motion.div>
      </main>
    </>
  )
}
