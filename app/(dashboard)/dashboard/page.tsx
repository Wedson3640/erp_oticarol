"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { fmt } from "@/lib/utils"
import {
  ShoppingBag, Target, MessageCircle,
  AlertTriangle, Clock, FlaskConical, Eye, Settings,
} from "lucide-react"
import {
  PieChart, Pie, Tooltip as ChartTooltip, ResponsiveContainer,
} from "recharts"
import { motion } from "framer-motion"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// ─── Situações e cores ────────────────────────────────────────────────────────

const ORDER_SITUATIONS = [
  "Aguardando",
  "No Laboratório",
  "Surfaçagem",
  "Em Andamento",
  "Pronto p/ Entrega",
  "Entregue",
  "Cancelado",
]

const STATUS_COLORS: Record<string, string> = {
  "Aguardando":        "#F59E0B",
  "Em Andamento":      "#3B82F6",
  "No Laboratório":    "#8B5CF6",
  "Surfaçagem":        "#EC4899",
  "Pronto p/ Entrega": "#22C55E",
  "Entregue":          "#16A34A",
  "Cancelado":         "#EF4444",
}

// Situações exibidas no gráfico (Entregue domina — excluído do pie)
const PIE_SITUATIONS = [
  "Aguardando", "Em Andamento", "No Laboratório",
  "Surfaçagem", "Pronto p/ Entrega", "Cancelado",
]

// ─── Mock: vendedores (metas ainda não têm dados no banco) ────────────────────

const sellers = [
  { name: "Ana Souza",    metaRX: 2000, realRX: 1200, pctRX: 60,  metaSol: 3000, realSol: 2500, pctSol: 83 },
  { name: "Carlos Lima",  metaRX: 2000, realRX: 850,  pctRX: 42,  metaSol: 3000, realSol: 1200, pctSol: 40 },
  { name: "Juliana Dias", metaRX: 2000, realRX: 1700, pctRX: 85,  metaSol: 3000, realSol: 2900, pctSol: 97 },
  { name: "Marcos Silva", metaRX: 2000, realRX: 650,  pctRX: 32,  metaSol: 3000, realSol: 900,  pctSol: 30 },
]

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DashMetrics {
  byStatus:           Record<string, number>
  atrasados:          number
  urgentes:           number
  garantiasPendentes: number
}

interface KpiCard {
  label:     string
  value:     string | null
  icon:      React.ComponentType<{ style?: React.CSSProperties }>
  iconBg:    string
  iconColor: string
  sub?:      string
  subColor?: string
  sub2?:     string
  pct?:      number | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="px-3 py-2 rounded-xl text-xs shadow-lg"
         style={{ background: "#fff", border: "1px solid #DDE7F3", color: "#061A35" }}>
      <strong>{d.name}</strong>: {d.value} pedidos
    </div>
  )
}

function Skeleton({ w = "60%" }: { w?: string }) {
  return <div className="h-8 rounded animate-pulse" style={{ background: "#E8EEF7", width: w }} />
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [hoveredCard,    setHoveredCard]    = useState<number | null>(null)
  const [metrics,        setMetrics]        = useState<DashMetrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  // ── Carrega métricas reais do Supabase ────────────────────────────────────

  useEffect(() => {
    async function load() {
      const sb    = createSupabaseBrowserClient()
      const today = new Date().toISOString().slice(0, 10)

      const [sitRes, atrasadosRes, urgentesRes, garantiasRes] = await Promise.all([
        // Contagem por situação (7 queries de HEAD — sem retornar linhas)
        Promise.all(
          ORDER_SITUATIONS.map(sit =>
            sb.from("service_orders")
              .select("*", { count: "exact", head: true })
              .eq("situation", sit)
          ),
        ),
        // Atrasados: prazo < hoje e ainda pendentes
        sb.from("service_orders")
          .select("*", { count: "exact", head: true })
          .lt("scheduled_delivery", today)
          .neq("situation", "Entregue")
          .neq("situation", "Cancelado"),
        // Urgentes: flag urgent = true e ainda pendentes
        sb.from("service_orders")
          .select("*", { count: "exact", head: true })
          .eq("urgent", true)
          .neq("situation", "Entregue")
          .neq("situation", "Cancelado"),
        // Garantias em aberto
        sb.from("warranties")
          .select("*", { count: "exact", head: true })
          .neq("situation", "Encerrado"),
      ])

      const byStatus: Record<string, number> = {}
      ORDER_SITUATIONS.forEach((sit, i) => {
        byStatus[sit] = sitRes[i].count ?? 0
      })

      setMetrics({
        byStatus,
        atrasados:          atrasadosRes.count ?? 0,
        urgentes:           urgentesRes.count  ?? 0,
        garantiasPendentes: garantiasRes.count ?? 0,
      })
      setLoadingMetrics(false)
    }
    load()
  }, [])

  // ── Derivados ─────────────────────────────────────────────────────────────

  const pendentes = metrics
    ? ["Aguardando", "No Laboratório", "Surfaçagem", "Em Andamento", "Pronto p/ Entrega"]
        .reduce((s, k) => s + (metrics.byStatus[k] ?? 0), 0)
    : null

  // 'fill' é lido diretamente pelo recharts v3 para colorir segmentos sem Cell
  const pieData = PIE_SITUATIONS
    .map(sit => ({ name: sit, value: metrics?.byStatus[sit] ?? 0, color: STATUS_COLORS[sit], fill: STATUS_COLORS[sit] }))
    .filter(d => d.value > 0)

  const totalPie = pieData.reduce((s, d) => s + d.value, 0)

  const bottomCards = [
    {
      label: "Pedidos Atrasados",
      value: metrics?.atrasados,
      icon: AlertTriangle, iconBg: "#FEF3C7", iconColor: "#F59E0B",
    },
    {
      label: "Pedidos Urgentes",
      value: metrics?.urgentes,
      icon: Clock, iconBg: "#FEE2E2", iconColor: "#EF4444",
    },
    {
      label: "No Laboratório",
      value: metrics?.byStatus["No Laboratório"],
      icon: FlaskConical, iconBg: "#F3E8FF", iconColor: "#8B5CF6",
    },
    {
      label: "Prontos p/ Entrega",
      value: metrics?.byStatus["Pronto p/ Entrega"],
      icon: Eye, iconBg: "#DCFCE7", iconColor: "#16A34A",
    },
    {
      label: "Garantias Pendentes",
      value: metrics?.garantiasPendentes,
      icon: Settings, iconBg: "#FEF3C7", iconColor: "#F59E0B",
    },
    {
      label: "Conversas S/ Resposta",
      value: 12,   // TODO: conectar ao módulo de conversas
      icon: MessageCircle, iconBg: "#EAF2FF", iconColor: "#3B82F6",
    },
  ]

  // ─── Render ──────────────────────────────────────────────────────────────

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
              Bom dia! 👋
            </h2>
            <p className="mt-1" style={{ fontSize: 15, color: "#40516F" }}>
              Hoje é {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </motion.div>

        {/* KPI Cards */}
        {(() => {
          const kpiCards: KpiCard[] = [
            {
              label: "Pedidos Pendentes",
              value: loadingMetrics ? null : String(pendentes ?? 0),
              icon: ShoppingBag, iconBg: "#EAF2FF", iconColor: "#0F5BFF",
              sub: "em aberto agora", subColor: "#40516F",
            },
            {
              label: "Atrasados",
              value: loadingMetrics ? null : String(metrics?.atrasados ?? 0),
              icon: AlertTriangle, iconBg: "#FEF3C7", iconColor: "#F59E0B",
              sub: "prazo vencido", subColor: "#F59E0B",
            },
            {
              label: "Meta RX",
              value: "R$ —",
              sub2: "metas — em breve",
              icon: Target, iconBg: "#EAF2FF", iconColor: "#0F5BFF",
            },
            {
              label: "Meta Solar",
              value: "R$ —",
              sub2: "metas — em breve",
              icon: Target, iconBg: "#DCFCE7", iconColor: "#16A34A",
            },
          ]
          return (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
              {kpiCards.map((card, i) => (
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

                  {card.value === null ? (
                    <Skeleton w="50%" />
                  ) : (
                    <p style={{ fontSize: 34, fontWeight: 700, color: "#061A35", lineHeight: 1 }}>
                      {card.value}
                    </p>
                  )}

                  {card.pct != null && (
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#E8EEF7" }}>
                      <div style={{ width: `${card.pct}%`, height: "100%", background: card.iconColor, borderRadius: 999 }} />
                    </div>
                  )}
                  {card.sub && (
                    <p className="mt-2" style={{ fontSize: 13, color: card.subColor, fontWeight: 500 }}>
                      {card.sub}
                    </p>
                  )}
                  {card.sub2 && (
                    <p className="mt-2" style={{ fontSize: 12, color: "#94A3B8" }}>{card.sub2}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )
        })()}

        {/* Tabela de metas + Gráfico */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 320px" }}>

          {/* Tabela de metas — mock enquanto não há dados reais */}
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
                    style={{ background: "#FEF3C7", color: "#92400E" }}>
                dados simulados
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

          {/* Gráfico donut — dados reais de situação */}
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

            {loadingMetrics ? (
              <div className="flex items-center justify-center" style={{ height: 180 }}>
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%"
                       innerRadius={50} outerRadius={72}
                       paddingAngle={2} dataKey="value"
                       stroke="transparent" />
                  <ChartTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}

            <div className="mt-1 space-y-1.5">
              {loadingMetrics
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-3 rounded animate-pulse w-28" style={{ background: "#E8EEF7" }} />
                      <div className="h-3 rounded animate-pulse w-6"  style={{ background: "#E8EEF7" }} />
                    </div>
                  ))
                : pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span style={{ fontSize: 12, color: "#40516F" }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#061A35" }}>{d.value}</span>
                    </div>
                  ))
              }
              {!loadingMetrics && (
                <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid #EAF2FF" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#061A35" }}>Total (ativos)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F5BFF" }}>{totalPie}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Quick stats — dados reais */}
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
              {loadingMetrics && card.label !== "Conversas S/ Resposta" ? (
                <Skeleton w="40%" />
              ) : (
                <p style={{ fontSize: 28, fontWeight: 700, color: "#061A35", lineHeight: 1 }}>
                  {card.value ?? 0}
                </p>
              )}
            </motion.div>
          ))}
        </div>

      </main>
    </>
  )
}
