"use client"

import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { fmt } from "@/lib/utils"
import {
  ShoppingBag, Target, MessageCircle, TrendingUp, TrendingDown,
  AlertTriangle, Clock, FlaskConical, Eye, Settings,
} from "lucide-react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts"
import { motion } from "framer-motion"

// ─── Mock data ────────────────────────────────────────────────────────────────

const sellers = [
  { name: "Ana Souza",    metaRX: 2000, realRX: 1200, pctRX: 60,  metaSol: 3000, realSol: 2500, pctSol: 83 },
  { name: "Carlos Lima",  metaRX: 2000, realRX: 850,  pctRX: 42,  metaSol: 3000, realSol: 1200, pctSol: 40 },
  { name: "Juliana Dias", metaRX: 2000, realRX: 1700, pctRX: 85,  metaSol: 3000, realSol: 2900, pctSol: 97 },
  { name: "Marcos Silva", metaRX: 2000, realRX: 650,  pctRX: 32,  metaSol: 3000, realSol: 900,  pctSol: 30 },
]

const pieData = [
  { name: "Aguardando",        value: 12, color: "#F59E0B" },
  { name: "Em andamento",      value: 8,  color: "#3B82F6" },
  { name: "No Laboratório",    value: 7,  color: "#8B5CF6" },
  { name: "Pronto p/ Entrega", value: 6,  color: "#22C55E" },
  { name: "Entregue",          value: 24, color: "#16A34A" },
  { name: "Cancelado",         value: 2,  color: "#EF4444" },
]

const bottomCards = [
  { label: "Pedidos Atrasados",      value: 11, icon: AlertTriangle, iconBg: "#FEF3C7", iconColor: "#F59E0B" },
  { label: "Pedidos Urgentes",       value: 7,  icon: Clock,         iconBg: "#FEE2E2", iconColor: "#EF4444" },
  { label: "No Laboratório",         value: 7,  icon: FlaskConical,  iconBg: "#F3E8FF", iconColor: "#8B5CF6" },
  { label: "Prontos p/ Entrega",     value: 6,  icon: Eye,           iconBg: "#DCFCE7", iconColor: "#16A34A" },
  { label: "Garantias Pendentes",    value: 5,  icon: Settings,      iconBg: "#FEF3C7", iconColor: "#F59E0B" },
  { label: "Conversas Sem Resposta", value: 12, icon: MessageCircle, iconBg: "#EAF2FF", iconColor: "#3B82F6" },
]

const pctColor = (p: number) =>
  p >= 70 ? "#16A34A" : p >= 50 ? "#F59E0B" : "#EF4444"

function PctBar({ pct }: { pct: number }) {
  const color = pctColor(pct)
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold w-10 text-right" style={{ color }}>{pct}%</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#E8EEF7" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 rounded-xl text-xs shadow-lg"
         style={{ background: "#fff", border: "1px solid #DDE7F3", color: "#061A35" }}>
      <strong>{d.name}</strong>: {d.value} pedidos
    </div>
  )
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  return (
    <>
      <Header breadcrumbs={["Home", "Dashboard"]} title="Dashboard Comercial" />

      <main className="pt-[64px] px-8 py-6 space-y-6">
        {/* Saudação */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-end gap-4 flex-wrap"
        >
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "#061A35", lineHeight: 1.1 }}>
              Bom dia, Ana! 👋
            </h2>
            <p className="mt-1" style={{ fontSize: 15, color: "#40516F" }}>
              Hoje é {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <span
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: "#EEF5FF", border: "1px solid #BFD7FF", color: "#0F5BFF" }}
          >
            Loja 488 — Teresina Shopping
          </span>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {[
            {
              label: "Pedidos Hoje",
              value: "18",
              icon: ShoppingBag, iconBg: "#EAF2FF", iconColor: "#0F5BFF",
              sub: "+12% vs ontem", subColor: "#16A34A", subIcon: TrendingUp,
            },
            {
              label: "Meta RX",
              value: "R$ 1.200",
              sub2: "R$ 2.000 · 60%",
              pct: 60,
              icon: Target, iconBg: "#EAF2FF", iconColor: "#0F5BFF",
            },
            {
              label: "Meta Solar",
              value: "R$ 3.400",
              sub2: "R$ 4.000 · 85%",
              pct: 85,
              icon: Target, iconBg: "#DCFCE7", iconColor: "#16A34A",
            },
            {
              label: "Conversas Abertas",
              value: "32",
              icon: MessageCircle, iconBg: "#EAF2FF", iconColor: "#0F5BFF",
              sub: "+5% vs ontem", subColor: "#16A34A", subIcon: TrendingUp,
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: "#fff",
                border: "1px solid #DDE7F3",
                borderRadius: 16,
                padding: 24,
                boxShadow: hoveredCard === i
                  ? "0 12px 30px rgba(15,39,68,0.10)"
                  : "0 4px 16px rgba(15,39,68,0.05)",
                transform: hoveredCard === i ? "translateY(-2px)" : "translateY(0)",
                transition: "all 0.2s ease",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <p style={{ fontSize: 14, fontWeight: 500, color: "#2F4162" }}>{card.label}</p>
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                     style={{ background: card.iconBg }}>
                  <card.icon style={{ width: 18, height: 18, color: card.iconColor }} />
                </div>
              </div>
              <p style={{ fontSize: card.pct ? 20 : 34, fontWeight: 700, color: "#061A35", lineHeight: 1 }}>
                {card.value}
              </p>
              {card.pct && (
                <>
                  <p className="mt-1" style={{ fontSize: 12, color: "#60708A" }}>{card.sub2}</p>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#E8EEF7" }}>
                    <div style={{ width: `${card.pct}%`, height: "100%", background: card.iconColor, borderRadius: 999 }} />
                  </div>
                </>
              )}
              {card.subIcon && (
                <p className="mt-2 flex items-center gap-1" style={{ fontSize: 13, color: card.subColor, fontWeight: 500 }}>
                  <card.subIcon style={{ width: 13, height: 13 }} /> {card.sub}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Tabela de metas + Gráfico */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 320px" }}>

          {/* Tabela */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              background: "#fff", border: "1px solid #DDE7F3",
              borderRadius: 16, boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden"
            }}
          >
            <div className="px-6 py-5 flex items-center justify-between"
                 style={{ borderBottom: "1px solid #EAF2FF" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#061A35" }}>
                Acompanhamento de Metas
              </h2>
              <span className="text-xs px-2 py-1 rounded-lg font-medium"
                    style={{ background: "#EAF2FF", color: "#0F5BFF" }}>
                Hoje · Loja 488
              </span>
            </div>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F6FAFF" }}>
                    {["VENDEDOR", "META RX", "REALIZ. RX", "% RX", "META SOL", "REALIZ. SOL", "% SOL"].map((h) => (
                      <th key={h} style={{
                        padding: "10px 20px", textAlign: "left",
                        fontSize: 11, fontWeight: 600, color: "#60708A",
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        borderBottom: "1px solid #EAF2FF",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sellers.map((s, i) => (
                    <tr key={s.name}
                        style={{ height: 52, borderBottom: i < sellers.length - 1 ? "1px solid #F0F5FF" : "none" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFCFF")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "0 20px", fontSize: 14, fontWeight: 600, color: "#061A35" }}>{s.name}</td>
                      <td style={{ padding: "0 20px", fontSize: 13, color: "#40516F" }}>{fmt(s.metaRX)}</td>
                      <td style={{ padding: "0 20px", fontSize: 13, color: "#40516F" }}>{fmt(s.realRX)}</td>
                      <td style={{ padding: "0 20px", minWidth: 120 }}><PctBar pct={s.pctRX} /></td>
                      <td style={{ padding: "0 20px", fontSize: 13, color: "#40516F" }}>{fmt(s.metaSol)}</td>
                      <td style={{ padding: "0 20px", fontSize: 13, color: "#40516F" }}>{fmt(s.realSol)}</td>
                      <td style={{ padding: "0 20px", minWidth: 120 }}><PctBar pct={s.pctSol} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Gráfico donut */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{
              background: "#fff", border: "1px solid #DDE7F3",
              borderRadius: 16, boxShadow: "0 4px 16px rgba(15,39,68,0.05)", padding: 24,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#061A35", marginBottom: 12 }}>
              Pedidos por Situação
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%"
                     innerRadius={50} outerRadius={72}
                     paddingAngle={2} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 space-y-1.5">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span style={{ fontSize: 12, color: "#40516F" }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#061A35" }}>{d.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid #EAF2FF" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#061A35" }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0F5BFF" }}>
                  {pieData.reduce((s, d) => s + d.value, 0)}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom quick stats */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
          {bottomCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              style={{
                background: "#fff", border: "1px solid #DDE7F3",
                borderRadius: 14, padding: "18px 20px",
                boxShadow: "0 4px 16px rgba(15,39,68,0.05)",
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"
                ;(e.currentTarget as HTMLElement).style.boxShadow = "0 12px 30px rgba(15,39,68,0.10)"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.transform = "translateY(0)"
                ;(e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(15,39,68,0.05)"
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <p style={{ fontSize: 12, fontWeight: 500, color: "#60708A", lineHeight: 1.3 }}>
                  {card.label}
                </p>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ background: card.iconBg }}>
                  <card.icon style={{ width: 16, height: 16, color: card.iconColor, strokeWidth: 2 }} />
                </div>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: "#061A35", lineHeight: 1 }}>
                {card.value}
              </p>
            </motion.div>
          ))}
        </div>
      </main>
    </>
  )
}
