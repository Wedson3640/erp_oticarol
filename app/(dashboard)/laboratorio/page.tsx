"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { AlertTriangle, Clock, CheckCircle2, RefreshCw, FlaskConical, Filter } from "lucide-react"

// ─── Constantes ───────────────────────────────────────────────────────────────

const SITUACOES_VISIVEIS = [
  "Pedido criado",
  "Compras",
  "Compras interna",
  "Enviado ao laboratório",
  "Recebido no laboratório",
  "Em montagem",
  "Controle de qualidade",
]

type Prioridade = "urgente" | "proximo" | "prazo" | "sem_data"
type TipoItem  = "pedido" | "garantia" | "solicitacao"

interface FilaRow {
  id:          number
  tipo:        TipoItem
  os:          string          // "OS 1234/5678" ou "GAR-00001"
  loja:        string | null
  cliente:     string | null
  vendedor:    string | null
  produto:     string | null   // notes / lab_os_number
  compra:      string | null   // purchase_date ISO
  prazo:       string | null   // scheduled_delivery ISO
  situacao:    string | null   // situação atual (do campo situation)
  urgente:     boolean
  prioridade:  Prioridade
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const hojeMs = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
}

const calcPrioridade = (prazo: string | null, urgente: boolean): Prioridade => {
  if (urgente) return "urgente"
  if (!prazo)  return "sem_data"
  const diff = Math.floor(
    (new Date(prazo + "T00:00:00").setHours(0, 0, 0, 0) - hojeMs()) / 86400000
  )
  if (diff <= 0) return "urgente"
  if (diff <= 3) return "proximo"
  return "prazo"
}

const ORDEM_PRIORIDADE: Record<Prioridade, number> = {
  urgente: 0, proximo: 1, prazo: 2, sem_data: 3,
}

const fmtData = (iso: string | null) => {
  if (!iso) return "—"
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

const diasRestantes = (iso: string | null): string => {
  if (!iso) return ""
  const diff = Math.floor(
    (new Date(iso + "T00:00:00").setHours(0, 0, 0, 0) - hojeMs()) / 86400000
  )
  if (diff < 0)  return `${Math.abs(diff)}d atrasado`
  if (diff === 0) return "hoje"
  return `+${diff}d`
}

const PRIORIDADE_STYLE: Record<Prioridade, {
  rowBg: string; stripe: string; badge: string; badgeTxt: string
  icon: typeof AlertTriangle; label: string
}> = {
  urgente:  { rowBg: "#fff5f5", stripe: "#dc2626", badge: "#fee2e2", badgeTxt: "#dc2626", icon: AlertTriangle, label: "URGENTE"          },
  proximo:  { rowBg: "#fffbeb", stripe: "#d97706", badge: "#fef3c7", badgeTxt: "#d97706", icon: Clock,         label: "PRÓXIMO A VENCER" },
  prazo:    { rowBg: "#f0fdf4", stripe: "#16a34a", badge: "#dcfce7", badgeTxt: "#16a34a", icon: CheckCircle2,  label: "NO PRAZO"         },
  sem_data: { rowBg: "#f8fafc", stripe: "#94a3b8", badge: "#f1f5f9", badgeTxt: "#64748b", icon: Clock,         label: "SEM DATA"         },
}

const TIPO_LABEL: Record<TipoItem, string> = {
  pedido: "PED", garantia: "GAR", solicitacao: "SOL",
}
const TIPO_COLOR: Record<TipoItem, { bg: string; txt: string }> = {
  pedido:      { bg: "#dbeafe", txt: "#1d4ed8" },
  garantia:    { bg: "#f3e8ff", txt: "#7c3aed" },
  solicitacao: { bg: "#ffedd5", txt: "#c2410c" },
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function LaboratorioPage() {
  const [fila,        setFila]        = useState<FilaRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [ultimaAtt,   setUltimaAtt]   = useState<Date>(new Date())
  const [filtroTipo,  setFiltroTipo]  = useState<Set<TipoItem>>(new Set(["pedido", "garantia", "solicitacao"]))
  const [hora, setHora] = useState("")

  // Relógio em tempo real
  useEffect(() => {
    const tick = () => setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // ── Carrega dados ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const sb = createSupabaseBrowserClient()

    const [rPed, rGar, rSol] = await Promise.all([
      sb.from("service_orders")
        .select("id, os_number, os_sequence, situation, urgent, purchase_date, scheduled_delivery, notes, lab_os_number, customer_name, employee_name, store:stores!store_id(code,name)")
        .in("situation", SITUACOES_VISIVEIS)
        .gte("purchase_date", "2026-01-01")
        .order("scheduled_delivery", { ascending: true, nullsFirst: false })
        .limit(500),

      sb.from("warranties")
        .select("id, situation, scheduled_delivery, customer_name, request_date, store:stores!store_id(code,name)")
        .in("situation", SITUACOES_VISIVEIS)
        .gte("request_date", "2026-01-01")
        .order("scheduled_delivery", { ascending: true, nullsFirst: false })
        .limit(200),

      sb.from("requests")
        .select("id, situation, scheduled_delivery, customer_name, created_at, store:stores!store_id(code,name)")
        .in("situation", SITUACOES_VISIVEIS)
        .gte("created_at", "2026-01-01")
        .order("scheduled_delivery", { ascending: true, nullsFirst: false })
        .limit(200),
    ])

    const rows: FilaRow[] = []

    // Pedidos
    for (const p of (rPed.data ?? []) as any[]) {
      const store = Array.isArray(p.store) ? p.store[0] : p.store
      const lojaStr = store ? `${store.code} · ${store.name}` : null
      const osSuffix = p.os_sequence ? `/${p.os_sequence}` : ""
      const produto = p.lab_os_number
        ? `OS Lab: ${p.lab_os_number}`
        : p.notes
          ? p.notes.slice(0, 60)
          : null
      rows.push({
        id: p.id, tipo: "pedido",
        os: `${p.os_number}${osSuffix}`,
        loja: lojaStr,
        cliente: p.customer_name,
        vendedor: p.employee_name,
        produto,
        compra: p.purchase_date,
        prazo: p.scheduled_delivery,
        situacao: p.situation,
        urgente: !!p.urgent,
        prioridade: calcPrioridade(p.scheduled_delivery, !!p.urgent),
      })
    }

    // Garantias
    for (const g of (rGar.data ?? []) as any[]) {
      const store = Array.isArray(g.store) ? g.store[0] : g.store
      rows.push({
        id: g.id, tipo: "garantia",
        os: `GAR-${String(g.id).padStart(5, "0")}`,
        loja: store ? `${store.code} · ${store.name}` : null,
        cliente: g.customer_name,
        vendedor: null,
        produto: null,
        compra: g.request_date ?? null,
        prazo: g.scheduled_delivery,
        situacao: g.situation,
        urgente: false,
        prioridade: calcPrioridade(g.scheduled_delivery, false),
      })
    }

    // Solicitações
    for (const s of (rSol.data ?? []) as any[]) {
      const store = Array.isArray(s.store) ? s.store[0] : s.store
      rows.push({
        id: s.id, tipo: "solicitacao",
        os: `SOL-${String(s.id).padStart(5, "0")}`,
        loja: store ? `${store.code} · ${store.name}` : null,
        cliente: s.customer_name,
        vendedor: null,
        produto: null,
        compra: s.created_at ? s.created_at.slice(0, 10) : null,
        prazo: s.scheduled_delivery,
        situacao: s.situation,
        urgente: false,
        prioridade: calcPrioridade(s.scheduled_delivery, false),
      })
    }

    // Ordenação: prioridade → prazo
    rows.sort((a, b) => {
      const po = ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade]
      if (po !== 0) return po
      if (!a.prazo && !b.prazo) return 0
      if (!a.prazo) return 1
      if (!b.prazo) return -1
      return a.prazo.localeCompare(b.prazo)
    })

    setFila(rows)
    setUltimaAtt(new Date())
    setLoading(false)
  }, [])

  // Carga inicial + auto-refresh a cada 60s
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  // ── Filtragem ──────────────────────────────────────────────────────────────
  const toggleTipo = (t: TipoItem) =>
    setFiltroTipo(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next.size === 0 ? prev : next
    })

  const filaFiltrada = fila.filter(r => filtroTipo.has(r.tipo))

  // ── Contadores ─────────────────────────────────────────────────────────────
  const contadores = {
    urgente:  filaFiltrada.filter(r => r.prioridade === "urgente").length,
    proximo:  filaFiltrada.filter(r => r.prioridade === "proximo").length,
    prazo:    filaFiltrada.filter(r => r.prioridade === "prazo").length,
    sem_data: filaFiltrada.filter(r => r.prioridade === "sem_data").length,
    total:    filaFiltrada.length,
  }

  return (
    <>
      <Header breadcrumbs={["Home", "Lab / Produção"]} title="Fila de Produção" />

      <main className="pt-[64px] px-6 py-4 space-y-4">

        {/* ── Cabeçalho do painel ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-3"
        >
          {/* Contadores de prioridade */}
          <div className="flex items-center gap-3 flex-wrap">
            {(["urgente", "proximo", "prazo", "sem_data"] as Prioridade[]).map(p => {
              const s = PRIORIDADE_STYLE[p]
              const Icon = s.icon
              const count = contadores[p]
              return (
                <div key={p} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: s.badge, border: `1px solid ${s.badgeTxt}30` }}>
                  <Icon className="w-4 h-4" style={{ color: s.badgeTxt }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.badgeTxt }}>
                    {count} {s.label}
                  </span>
                </div>
              )
            })}
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
              Total: {contadores.total} item{contadores.total !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Filtros tipo + relógio + refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4" style={{ color: "#94a3b8" }} />
            {(["pedido", "garantia", "solicitacao"] as TipoItem[]).map(t => {
              const c = TIPO_COLOR[t]
              const active = filtroTipo.has(t)
              return (
                <button key={t} onClick={() => toggleTipo(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: active ? c.bg : "#f1f5f9",
                    color: active ? c.txt : "#94a3b8",
                    border: `1px solid ${active ? c.txt + "50" : "#e2e8f0"}`,
                  }}>
                  {TIPO_LABEL[t]}
                </button>
              )
            })}
            <button onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <div className="text-right" style={{ minWidth: 130 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#0f2744", fontVariantNumeric: "tabular-nums" }}>{hora}</p>
              <p style={{ fontSize: 10, color: "#94a3b8" }}>
                Att: {ultimaAtt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Tabela ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3" style={{ color: "#94a3b8" }}>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span style={{ fontSize: 15 }}>Carregando fila de produção…</span>
          </div>
        ) : filaFiltrada.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-4 rounded-2xl" style={{ background: "#f0fdf4" }}>
              <FlaskConical className="w-12 h-12" style={{ color: "#16a34a" }} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#16a34a" }}>Fila vazia!</p>
            <p style={{ fontSize: 14, color: "#94a3b8" }}>Não há itens pendentes na produção.</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: "#fff", border: "1px solid #DDE7F3", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 16px rgba(15,39,68,0.06)" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="w-full" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
                {/* Larguras fixas de cada coluna */}
                <colgroup>
                  <col style={{ width: 5   }} />  {/* stripe */}
                  <col style={{ width: 56  }} />  {/* TIPO */}
                  <col style={{ width: 130 }} />  {/* OS / REF */}
                  <col style={{ width: 170 }} />  {/* LOJA */}
                  <col style={{ width: 180 }} />  {/* CLIENTE */}
                  <col style={{ width: 140 }} />  {/* VENDEDOR */}
                  <col style={{ width: 160 }} />  {/* PRODUTO / OBS */}
                  <col style={{ width: 90  }} />  {/* COMPRA */}
                  <col style={{ width: 120 }} />  {/* PRAZO */}
                  <col style={{ width: 200 }} />  {/* SITUAÇÃO ATUAL */}
                </colgroup>
                <thead>
                  <tr style={{ background: "#0f2744" }}>
                    {["", "TIPO", "OS / REF", "LOJA", "CLIENTE", "VENDEDOR", "PRODUTO / OBS", "COMPRA", "PRAZO", "SITUAÇÃO ATUAL"].map((h, i) => (
                      <th key={i} style={{
                        padding: "12px 14px", textAlign: "left",
                        fontSize: 11, fontWeight: 700, color: "#93c5fd",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                        whiteSpace: "nowrap", overflow: "hidden",
                        borderBottom: "2px solid #1e3a5f",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filaFiltrada.map((row, i) => {
                    const s = PRIORIDADE_STYLE[row.prioridade]
                    const tc = TIPO_COLOR[row.tipo]
                    const Icon = s.icon
                    const dias = diasRestantes(row.prazo)
                    const isLast = i === filaFiltrada.length - 1
                    return (
                      <tr key={`${row.tipo}-${row.id}`}
                        style={{
                          background: row.prioridade === "urgente"
                            ? (i % 2 === 0 ? "#fff5f5" : "#fef2f2")
                            : row.prioridade === "proximo"
                            ? (i % 2 === 0 ? "#fffbeb" : "#fefce8")
                            : (i % 2 === 0 ? "#fff" : "#fafbff"),
                          borderBottom: isLast ? "none" : "1px solid #f0f5ff",
                        }}>

                        {/* Stripe colorida */}
                        <td style={{ width: 5, padding: 0 }}>
                          <div style={{ width: 5, height: "100%", minHeight: 52, background: s.stripe }} />
                        </td>

                        {/* Tipo */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                            style={{ background: tc.bg, color: tc.txt }}>
                            {TIPO_LABEL[row.tipo]}
                          </span>
                        </td>

                        {/* OS */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "#0f2744" }}>{row.os}</span>
                        </td>

                        {/* Loja */}
                        <td style={{ padding: "10px 14px", overflow: "hidden" }}>
                          <span style={{ fontSize: 13, color: "#2F4162", fontWeight: 500,
                            display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.loja ?? "—"}
                          </span>
                        </td>

                        {/* Cliente */}
                        <td style={{ padding: "10px 14px", overflow: "hidden" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#061A35",
                            display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.cliente ?? "—"}
                          </span>
                        </td>

                        {/* Vendedor */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 13, color: "#40516F" }}>
                            {row.vendedor ?? "—"}
                          </span>
                        </td>

                        {/* Produto / Obs */}
                        <td style={{ padding: "10px 14px", maxWidth: 180 }}>
                          <span style={{ fontSize: 12, color: "#64748b", fontStyle: row.produto ? "normal" : "italic",
                            display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.produto ?? "—"}
                          </span>
                        </td>

                        {/* Compra */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 13, color: "#60708A" }}>{fmtData(row.compra)}</span>
                        </td>

                        {/* Prazo */}
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: s.stripe, display: "block", whiteSpace: "nowrap" }}>
                            {fmtData(row.prazo)}
                          </span>
                          {dias && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                              style={{ background: s.badge, color: s.badgeTxt, display: "inline-block", marginTop: 2, whiteSpace: "nowrap" }}>
                              {dias}
                            </span>
                          )}
                        </td>

                        {/* Situação */}
                        <td style={{ padding: "10px 20px 10px 14px", whiteSpace: "nowrap", minWidth: 200 }}>
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: s.stripe }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#2F4162" }}>
                              {row.situacao ?? "—"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé */}
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: "1px solid #EAF2FF", background: "#f8faff" }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                Atualização automática a cada 60 segundos · {filaFiltrada.length} item{filaFiltrada.length !== 1 ? "s" : ""} na fila
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#16a34a" }} />
                <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>AO VIVO</span>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </>
  )
}
