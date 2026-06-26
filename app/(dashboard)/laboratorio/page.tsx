"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { supabase } from "@/lib/supabase"
import {
  FlaskConical, RefreshCw, CheckCircle2, AlertTriangle,
  Clock, Package, Shield, ClipboardList, Filter,
} from "lucide-react"

// ─── Constantes ───────────────────────────────────────────────────────────────

const FINALIZADAS = ["Entregue ao Cliente", "Entregue", "Cancelado", "Pronto para Entrega"]

type Tipo = "pedido" | "garantia" | "solicitacao"

interface FilaItem {
  id:         number
  tipo:       Tipo
  tipo_label: string
  ref:        string        // OS número ou id formatado
  customer:   string | null
  store:      string | null
  situation:  string | null
  delivery:   string | null // ISO date
  urgent:     boolean
  priority:   "urgente" | "proximo" | "prazo" | "sem_data"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const hoje = () => {
  const d = new Date(); d.setHours(0,0,0,0); return d
}

const calcPriority = (delivery: string | null, urgent: boolean): FilaItem["priority"] => {
  if (urgent) return "urgente"
  if (!delivery) return "sem_data"
  const d = new Date(delivery + "T00:00:00"); d.setHours(0,0,0,0)
  const h = hoje()
  const diff = Math.floor((d.getTime() - h.getTime()) / 86400000)
  if (diff <= 0) return "urgente"
  if (diff <= 3)  return "proximo"
  return "prazo"
}

const PRIORITY_ORDER: Record<FilaItem["priority"], number> = {
  urgente: 0, proximo: 1, prazo: 2, sem_data: 3,
}

const fmtDelivery = (iso: string | null) => {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

const diffDias = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso + "T00:00:00"); d.setHours(0,0,0,0)
  return Math.floor((d.getTime() - hoje().getTime()) / 86400000)
}

// ─── Badges ──────────────────────────────────────────────────────────────────

const PRIORITY_META: Record<FilaItem["priority"], { label: string; bg: string; color: string; icon: typeof AlertTriangle }> = {
  urgente:  { label: "URGENTE",          bg: "#fee2e2", color: "#dc2626", icon: AlertTriangle },
  proximo:  { label: "PRÓXIMO A VENCER", bg: "#fef3c7", color: "#d97706", icon: Clock         },
  prazo:    { label: "NO PRAZO",         bg: "#dcfce7", color: "#16a34a", icon: CheckCircle2  },
  sem_data: { label: "SEM DATA",         bg: "#f1f5f9", color: "#64748b", icon: Clock         },
}

const TIPO_META: Record<Tipo, { label: string; bg: string; color: string; icon: typeof Package }> = {
  pedido:     { label: "PEDIDO",      bg: "#dbeafe", color: "#1d4ed8", icon: Package       },
  garantia:   { label: "GARANTIA",    bg: "#f3e8ff", color: "#7c3aed", icon: Shield        },
  solicitacao:{ label: "SOLICITAÇÃO", bg: "#ffedd5", color: "#c2410c", icon: ClipboardList },
}

// ─── Componente de card ────────────────────────────────────────────────────────

function QueueCard({
  item, onMarcarPronto, marking,
}: {
  item: FilaItem
  onMarcarPronto: (item: FilaItem) => void
  marking: boolean
}) {
  const pm = PRIORITY_META[item.priority]
  const tm = TIPO_META[item.tipo]
  const dias = diffDias(item.delivery)
  const PIcon = pm.icon
  const TIcon = tm.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: "#fff",
        border: `1px solid ${item.priority === "urgente" ? "#fca5a5" : item.priority === "proximo" ? "#fde68a" : "#DDE7F3"}`,
        borderRadius: 14,
        padding: "14px 18px",
        boxShadow: item.priority === "urgente" ? "0 0 0 2px #fca5a520" : "0 2px 8px rgba(15,39,68,0.04)",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      {/* Stripe lateral de prioridade */}
      <div style={{ width: 4, height: 52, borderRadius: 4, background: pm.color, flexShrink: 0 }} />

      {/* Ref + cliente */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: tm.bg, color: tm.color }}>
            <TIcon className="w-3 h-3" />
            {tm.label}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#061A35" }}>{item.ref}</span>
        </div>
        <p style={{ fontSize: 13, color: "#2F4162", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.customer ?? "Cliente não informado"}
        </p>
        {item.store && (
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{item.store}</p>
        )}
      </div>

      {/* Situação atual */}
      <div style={{ textAlign: "center", minWidth: 120 }}>
        {item.situation && (
          <span className="px-2 py-1 rounded-lg text-xs font-medium"
            style={{ background: "#f1f5f9", color: "#475569" }}>
            {item.situation}
          </span>
        )}
      </div>

      {/* Prazo */}
      <div style={{ textAlign: "center", minWidth: 100 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: pm.color }}>{fmtDelivery(item.delivery)}</p>
        <p style={{ fontSize: 11, color: pm.color, marginTop: 2 }}>
          {dias === null ? "sem data" :
           dias < 0  ? `${Math.abs(dias)}d atrasado` :
           dias === 0 ? "vence hoje" :
           `${dias}d restantes`}
        </p>
      </div>

      {/* Badge prioridade */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
        style={{ background: pm.bg, minWidth: 110, justifyContent: "center" }}>
        <PIcon className="w-3.5 h-3.5" style={{ color: pm.color }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: pm.color }}>{pm.label}</span>
      </div>

      {/* Botão */}
      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => onMarcarPronto(item)}
        disabled={marking}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0"
        style={{ background: marking ? "#94a3b8" : "#0f2744", minWidth: 140 }}
      >
        <CheckCircle2 className="w-4 h-4" />
        Marcar Pronto
      </motion.button>
    </motion.div>
  )
}

// ─── Seção por prioridade ────────────────────────────────────────────────────

function PrioritySection({
  priority, items, onMarcarPronto, markingId,
}: {
  priority: FilaItem["priority"]
  items: FilaItem[]
  onMarcarPronto: (item: FilaItem) => void
  markingId: number | null
}) {
  if (items.length === 0) return null
  const meta = PRIORITY_META[priority]
  const Icon = meta.icon
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-1">
        <Icon className="w-5 h-5" style={{ color: meta.color }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#061A35" }}>
          {meta.label}
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: meta.bg, color: meta.color }}>
            {items.length}
          </span>
        </h3>
        <div style={{ flex: 1, height: 1, background: "#EAF2FF" }} />
      </div>
      <AnimatePresence mode="popLayout">
        {items.map(item => (
          <QueueCard
            key={`${item.tipo}-${item.id}`}
            item={item}
            onMarcarPronto={onMarcarPronto}
            marking={markingId === item.id}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function LaboratorioPage() {
  const [fila, setFila]           = useState<FilaItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [markingId, setMarkingId] = useState<number | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<Set<Tipo>>(new Set(["pedido", "garantia", "solicitacao"]))
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdate, setLastUpdate]   = useState<Date>(new Date())

  // ── Carrega dados ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const notIn = `(${FINALIZADAS.join(",")})`

    // Busca os 3 tipos em paralelo
    const [rPedidos, rGarantias, rSolicitacoes] = await Promise.all([
      supabase.schema("sascarol")
        .from("service_orders")
        .select("id, os_number, os_sequence, situation, scheduled_delivery, urgent, customer_name, store:stores!store_id(code,name)")
        .not("situation", "is", null)
        .not("situation", "in", notIn)
        .order("scheduled_delivery", { ascending: true, nullsFirst: false }),

      supabase.schema("sascarol")
        .from("warranties")
        .select("id, situation, scheduled_delivery, customer_name, store:stores!store_id(code,name)")
        .not("situation", "is", null)
        .not("situation", "in", notIn)
        .order("scheduled_delivery", { ascending: true, nullsFirst: false }),

      supabase.schema("sascarol")
        .from("requests")
        .select("id, situation, scheduled_delivery, customer_name, store:stores!store_id(code,name)")
        .not("situation", "is", null)
        .not("situation", "in", notIn)
        .order("scheduled_delivery", { ascending: true, nullsFirst: false }),
    ])

    const items: FilaItem[] = []

    // Pedidos
    for (const p of (rPedidos.data ?? []) as any[]) {
      const store = Array.isArray(p.store) ? p.store[0] : p.store
      const os = p.os_number + (p.os_sequence ? `/${p.os_sequence}` : "")
      items.push({
        id: p.id, tipo: "pedido", tipo_label: "Pedido",
        ref: `OS ${os}`,
        customer: p.customer_name,
        store: store ? `Loja ${store.code} · ${store.name}` : null,
        situation: p.situation,
        delivery: p.scheduled_delivery,
        urgent: !!p.urgent,
        priority: calcPriority(p.scheduled_delivery, !!p.urgent),
      })
    }

    // Garantias
    for (const g of (rGarantias.data ?? []) as any[]) {
      const store = Array.isArray(g.store) ? g.store[0] : g.store
      items.push({
        id: g.id, tipo: "garantia", tipo_label: "Garantia",
        ref: `GAR-${String(g.id).padStart(5, "0")}`,
        customer: g.customer_name,
        store: store ? `Loja ${store.code} · ${store.name}` : null,
        situation: g.situation,
        delivery: g.scheduled_delivery,
        urgent: false,
        priority: calcPriority(g.scheduled_delivery, false),
      })
    }

    // Solicitações
    for (const s of (rSolicitacoes.data ?? []) as any[]) {
      const store = Array.isArray(s.store) ? s.store[0] : s.store
      items.push({
        id: s.id, tipo: "solicitacao", tipo_label: "Solicitação",
        ref: `SOL-${String(s.id).padStart(5, "0")}`,
        customer: s.customer_name,
        store: store ? `Loja ${store.code} · ${store.name}` : null,
        situation: s.situation,
        delivery: s.scheduled_delivery,
        urgent: false,
        priority: calcPriority(s.scheduled_delivery, false),
      })
    }

    // Ordena: prioridade → data de entrega
    items.sort((a, b) => {
      const po = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (po !== 0) return po
      if (!a.delivery && !b.delivery) return 0
      if (!a.delivery) return 1
      if (!b.delivery) return -1
      return a.delivery.localeCompare(b.delivery)
    })

    setFila(items)
    setLastUpdate(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh a cada 60s
  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => load(), 60_000)
    return () => clearInterval(t)
  }, [autoRefresh, load])

  // ── Marcar como Pronto ─────────────────────────────────────────────────────
  const handleMarcarPronto = async (item: FilaItem) => {
    setMarkingId(item.id)
    const tabela = item.tipo === "pedido" ? "service_orders"
                 : item.tipo === "garantia" ? "warranties"
                 : "requests"

    await supabase.schema("sascarol")
      .from(tabela)
      .update({ situation: "Pronto para Entrega" })
      .eq("id", item.id)

    // Remove da fila localmente (otimista)
    setFila(prev => prev.filter(i => !(i.tipo === item.tipo && i.id === item.id)))
    setMarkingId(null)
  }

  // ── Filtragem ──────────────────────────────────────────────────────────────
  const toggleTipo = (t: Tipo) => {
    setFiltroTipo(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next.size === 0 ? prev : next // nunca deixa vazio
    })
  }

  const filaFiltrada = fila.filter(i => filtroTipo.has(i.tipo))

  const byPriority = (p: FilaItem["priority"]) =>
    filaFiltrada.filter(i => i.priority === p)

  // ── Totais ─────────────────────────────────────────────────────────────────
  const totais = {
    urgente: filaFiltrada.filter(i => i.priority === "urgente").length,
    proximo: filaFiltrada.filter(i => i.priority === "proximo").length,
    prazo:   filaFiltrada.filter(i => i.priority === "prazo").length,
    sem_data:filaFiltrada.filter(i => i.priority === "sem_data").length,
  }

  return (
    <>
      <Header breadcrumbs={["Home", "Lab / Produção"]} title="Fila de Produção" />

      <main className="pt-[64px] px-8 py-6 space-y-5">

        {/* ── Barra superior ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-3"
        >
          {/* Filtros de tipo */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" style={{ color: "#94a3b8" }} />
            {(["pedido", "garantia", "solicitacao"] as Tipo[]).map(t => {
              const meta = TIPO_META[t]
              const active = filtroTipo.has(t)
              return (
                <button key={t} onClick={() => toggleTipo(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: active ? meta.bg : "#f1f5f9",
                    color: active ? meta.color : "#94a3b8",
                    border: `1px solid ${active ? meta.color + "40" : "#e2e8f0"}`,
                  }}>
                  {meta.label}
                </button>
              )
            })}
          </div>

          {/* Auto-refresh + atualizar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: autoRefresh ? "#dcfce7" : "#f1f5f9",
                color: autoRefresh ? "#16a34a" : "#64748b",
                border: `1px solid ${autoRefresh ? "#86efac" : "#e2e8f0"}`,
              }}>
              <span className={autoRefresh ? "animate-pulse" : ""}>●</span>
              {autoRefresh ? "Auto 60s" : "Manual"}
            </button>
            <button onClick={load}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </motion.div>

        {/* ── KPI Cards ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {(["urgente", "proximo", "prazo", "sem_data"] as const).map((key, i) => {
            const meta = PRIORITY_META[key]
            const displayLabel = key === "urgente" ? "Urgentes" : key === "proximo" ? "Próx. a Vencer" : key === "prazo" ? "No Prazo" : "Sem Data"
            const count = totais[key]
            const card = { key, ...meta, label: displayLabel }
            const Icon = meta.icon
            return (
              <motion.div key={card.key}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ background: "#fff", border: `1px solid ${card.bg}`, borderRadius: 16, padding: 20, boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#60708A" }}>{card.label}</p>
                  <div className="p-2 rounded-xl" style={{ background: card.bg }}>
                    <Icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                </div>
                <p style={{ fontSize: 28, fontWeight: 800, color: count > 0 ? card.color : "#94a3b8" }}>{count}</p>
                <p style={{ fontSize: 11, color: "#94a3b8" }}>item{count !== 1 ? "s" : ""} na fila</p>
              </motion.div>
            )
          })}
        </div>

        {/* ── Fila ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: "#94a3b8" }}>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Carregando fila de produção…</span>
          </div>
        ) : filaFiltrada.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="p-4 rounded-2xl" style={{ background: "#f0fdf4" }}>
              <FlaskConical className="w-10 h-10" style={{ color: "#16a34a" }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#475569" }}>Fila vazia!</p>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Não há itens pendentes no laboratório.</p>
          </motion.div>
        ) : (
          <div className="space-y-7">
            <PrioritySection priority="urgente"  items={byPriority("urgente")}  onMarcarPronto={handleMarcarPronto} markingId={markingId} />
            <PrioritySection priority="proximo"  items={byPriority("proximo")}  onMarcarPronto={handleMarcarPronto} markingId={markingId} />
            <PrioritySection priority="prazo"    items={byPriority("prazo")}    onMarcarPronto={handleMarcarPronto} markingId={markingId} />
            <PrioritySection priority="sem_data" items={byPriority("sem_data")} onMarcarPronto={handleMarcarPronto} markingId={markingId} />
          </div>
        )}
      </main>
    </>
  )
}
