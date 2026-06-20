"use client"

import { use, useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SlaCard } from "@/components/ui/SlaCard"
import {
  ArrowLeft, Printer, Shield, ChevronDown,
  AlertTriangle, Clock, User, Building2, FlaskConical,
  CheckCircle2, Package, Truck, Loader2,
  ShoppingCart, Wrench, RotateCcw, Send, Store,
} from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import {
  fmtDate, fmtDateTime, fmtOs, fmtPhone, fmtCpf,
  type ServiceOrder, type ServiceOrderHistory,
} from "@/lib/types"

// ─── Ícones e cores da timeline (situações reais do PHP/Rails) ───────────────

const statusIcon: Record<string, React.ReactNode> = {
  // ── Criação ──────────────────────────────────────────────────────────────
  "Pedido criado":               <Package       className="w-3 h-3" />,
  "Pedido reiniciado":           <RotateCcw     className="w-3 h-3" />,

  // ── Compras ──────────────────────────────────────────────────────────────
  "Compras":                     <ShoppingCart  className="w-3 h-3" />,
  "Compra Interna":              <ShoppingCart  className="w-3 h-3" />,
  "Compra Externa":              <ShoppingCart  className="w-3 h-3" />,
  "Aguardando Armação":          <Clock         className="w-3 h-3" />,
  "Armação encaminhada":         <Send          className="w-3 h-3" />,
  "Recompra":                    <ShoppingCart  className="w-3 h-3" />,
  "Perda Interna":               <AlertTriangle className="w-3 h-3" />,
  "Perda Externa":               <AlertTriangle className="w-3 h-3" />,

  // ── Logística ────────────────────────────────────────────────────────────
  "Trânsito":                    <Truck         className="w-3 h-3" />,
  "Encaminhando para logística": <Truck         className="w-3 h-3" />,
  "Retorno à logística":         <RotateCcw     className="w-3 h-3" />,

  // ── Laboratório ──────────────────────────────────────────────────────────
  "Enviado ao laboratório":      <FlaskConical  className="w-3 h-3" />,
  "Recebido no laboratório":     <FlaskConical  className="w-3 h-3" />,
  "Surfaçagem":                  <FlaskConical  className="w-3 h-3" />,
  "Montagem Interna":            <Wrench        className="w-3 h-3" />,
  "Montagem Externa":            <Wrench        className="w-3 h-3" />,
  "Em montagem":                 <Wrench        className="w-3 h-3" />,
  "Enviado para montagem":       <Wrench        className="w-3 h-3" />,
  "Análise de recebimento":      <FlaskConical  className="w-3 h-3" />,

  // ── QC + Loja ────────────────────────────────────────────────────────────
  "Controle de Qualidade":       <CheckCircle2  className="w-3 h-3" />,
  "Recebido na Loja":            <Store         className="w-3 h-3" />,
  "Transferência entre lojas":   <Building2     className="w-3 h-3" />,
  "Aguardando Retirada":         <Clock         className="w-3 h-3" />,

  // ── Entrega ──────────────────────────────────────────────────────────────
  "Entregue ao Cliente":         <Truck         className="w-3 h-3" />,

  // ── Admin / encerramento ─────────────────────────────────────────────────
  "Revertido":                   <RotateCcw     className="w-3 h-3" />,
  "Fechado pelo Administrador":  <CheckCircle2  className="w-3 h-3" />,
}

const statusColor: Record<string, string> = {
  // ── Criação ──────────────────────────────────────────────────────────────
  "Pedido criado":               "#3b82f6",  // azul
  "Pedido reiniciado":           "#f59e0b",  // âmbar

  // ── Compras ──────────────────────────────────────────────────────────────
  "Compras":                     "#f59e0b",  // âmbar
  "Compra Interna":              "#d97706",  // âmbar escuro
  "Compra Externa":              "#d97706",
  "Aguardando Armação":          "#f59e0b",
  "Armação encaminhada":         "#f97316",  // laranja
  "Recompra":                    "#f97316",
  "Perda Interna":               "#dc2626",  // vermelho
  "Perda Externa":               "#dc2626",

  // ── Logística ────────────────────────────────────────────────────────────
  "Trânsito":                    "#0891b2",  // ciano
  "Encaminhando para logística": "#0891b2",
  "Retorno à logística":         "#f97316",  // laranja (retorno = atenção)

  // ── Laboratório ──────────────────────────────────────────────────────────
  "Enviado ao laboratório":      "#7c3aed",  // roxo
  "Recebido no laboratório":     "#7c3aed",
  "Surfaçagem":                  "#6d28d9",  // roxo escuro
  "Montagem Interna":            "#7c3aed",
  "Montagem Externa":            "#7c3aed",
  "Em montagem":                 "#7c3aed",
  "Enviado para montagem":       "#7c3aed",
  "Análise de recebimento":      "#6d28d9",

  // ── QC + Loja ────────────────────────────────────────────────────────────
  "Controle de Qualidade":       "#2563eb",  // azul médio
  "Recebido na Loja":            "#059669",  // verde
  "Transferência entre lojas":   "#0284c7",  // azul claro
  "Aguardando Retirada":         "#16a34a",  // verde médio

  // ── Entrega ──────────────────────────────────────────────────────────────
  "Entregue ao Cliente":         "#15803d",  // verde escuro

  // ── Admin / encerramento ─────────────────────────────────────────────────
  "Revertido":                   "#dc2626",  // vermelho
  "Fechado pelo Administrador":  "#6b7280",  // cinza
}

// Situações disponíveis no "Mover Pedido" (fluxo real do sistema)
const ORDER_SITUATIONS = [
  "Compras",
  "Compra Interna",
  "Compra Externa",
  "Aguardando Armação",
  "Armação encaminhada",
  "Enviado ao laboratório",
  "Recebido no laboratório",
  "Surfaçagem",
  "Montagem Interna",
  "Montagem Externa",
  "Em montagem",
  "Análise de recebimento",
  "Controle de Qualidade",
  "Encaminhando para logística",
  "Trânsito",
  "Retorno à logística",
  "Recebido na Loja",
  "Aguardando Retirada",
  "Entregue ao Cliente",
  "Revertido",
  "Recompra",
  "Perda Interna",
  "Perda Externa",
  "Fechado pelo Administrador",
]

/** Calcula duração legível entre duas datas ISO */
function calcDuration(from: string, to: string | null): string {
  const diffMs = ((to ? new Date(to) : new Date())).getTime() - new Date(from).getTime()
  if (diffMs <= 0) return "< 1min"
  const mins  = Math.floor(diffMs / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days > 0)  return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${mins % 60}min`
  return `${mins}min`
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  // Dados
  const [order,     setOrder]     = useState<ServiceOrder | null>(null)
  const [histories, setHistories] = useState<ServiceOrderHistory[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // UI
  const [movimentando, setMovimentando] = useState(false)
  const [novaSituacao, setNovaSituacao] = useState("")
  const [obsInput,     setObsInput]     = useState("")
  const [labInput,     setLabInput]     = useState("")
  const [labOsInput,   setLabOsInput]   = useState("")
  const [saving,       setSaving]       = useState(false)

  // ── Carga de dados ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    const sb = createSupabaseBrowserClient()

    const [oRes, hRes] = await Promise.all([
      sb
        .from("service_orders")
        .select(`
          *,
          customer:customers!customer_id(id,name,cpf,phone),
          store:stores!store_id(id,code,name),
          employee:employees!employee_id(id,full_name,short_name),
          laboratory:laboratories!laboratory_id(id,name)
        `)
        .eq("id", id)
        .single(),
      sb
        .from("service_order_histories")
        .select("*, laboratory:laboratories(id,name)")
        .eq("service_order_id", id)
        .order("created_at", { ascending: false }),
    ])

    if (oRes.error || !oRes.data) {
      setError("Pedido não encontrado.")
    } else {
      setOrder(oRes.data as ServiceOrder)
      setHistories((hRes.data ?? []) as ServiceOrderHistory[])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  // ── Confirmar movimentação ──────────────────────────────────────────────────

  async function handleMover() {
    if (!novaSituacao || !order) return
    setSaving(true)
    const sb = createSupabaseBrowserClient()
    const { data: { user } } = await sb.auth.getUser()
    const operador = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Sistema"

    const needsLab = novaSituacao === "No Laboratório" || novaSituacao === "Surfaçagem"

    await sb.from("service_order_histories").insert({
      service_order_id: order.id,
      situation:        novaSituacao,
      operator_name:    operador,
      lab_os_number:    needsLab ? labOsInput || null : null,
      notes:            obsInput || null,
    })

    const updateData: Record<string, unknown> = { situation: novaSituacao }
    if (needsLab && labOsInput) updateData.lab_os_number = labOsInput
    await sb.from("service_orders").update(updateData).eq("id", order.id)

    setMovimentando(false)
    setNovaSituacao(""); setObsInput(""); setLabInput(""); setLabOsInput("")
    setSaving(false)
    loadData()
  }

  // ── Estados de loading / erro ───────────────────────────────────────────────

  if (loading) return (
    <>
      <Header breadcrumbs={["Home", "Pedidos", "…"]} title="Carregando…" />
      <main className="pt-[64px] px-8 py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1d4ed8" }} />
      </main>
    </>
  )

  if (error || !order) return (
    <>
      <Header breadcrumbs={["Home", "Pedidos"]} title="Erro" />
      <main className="pt-[64px] px-8 py-16 text-center">
        <p style={{ color: "#dc2626" }}>{error ?? "Pedido não encontrado."}</p>
        <Link href="/pedidos" className="text-sm text-blue-600 underline mt-2 inline-block">
          Voltar para pedidos
        </Link>
      </main>
    </>
  )

  const os        = fmtOs(order.os_number, order.os_sequence)
  const sit       = order.situation ?? "Aguardando"
  const prazo     = fmtDate(order.scheduled_delivery)
  const criadoEm  = fmtDateTime(order.created_at)
  const showLab   = novaSituacao === "No Laboratório" || novaSituacao === "Surfaçagem"

  // Situações disponíveis = todas menos a atual e as já passadas (simplificado)
  const situacoesDisponiveis = ORDER_SITUATIONS.filter(s => s !== sit)

  // Timeline cronológica (histories chegam desc do Supabase)
  const historiesAsc = [...histories].reverse()

  return (
    <>
      <Header breadcrumbs={["Home", "Pedidos", os]} title={`Pedido ${os}`} />

      <main className="pt-[64px] px-8 py-6 space-y-5">

        <Link href="/pedidos"
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#64748b" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0f2744")}
          onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para pedidos
        </Link>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 280px" }}>

          {/* ── COLUNA PRINCIPAL ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Cabeçalho */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
            >
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-2xl" style={{ color: "#0f2744", letterSpacing: "-0.5px" }}>
                      Nº {os}
                    </span>
                    {sit !== "—" && <StatusBadge status={sit} size="md" />}
                    {order.urgent && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white"
                        style={{ background: "#dc2626" }}>
                        <AlertTriangle className="w-3 h-3" /> URGENTE
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "#64748b" }}>
                    Criado em {criadoEm} · Prazo: <strong style={{ color: "#0f172a" }}>{prazo}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/pedidos/${order.id}/editar`}>
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                      style={{ borderColor: "#e2e8f0", color: "#475569", background: "#f8fafc" }}>
                      Editar
                    </button>
                  </Link>
                  <button
                    onClick={() => window.open(`/imprimir/pedidos/${order.id}`, "_blank")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                    style={{ borderColor: "#e2e8f0", color: "#475569", background: "#f8fafc" }}>
                    <Printer className="w-4 h-4" /> Imprimir OS
                  </button>
                  <Link href="/garantias/nova">
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "#0f2744" }}>
                      <Shield className="w-4 h-4" /> Solicitar Garantia
                    </button>
                  </Link>
                </div>
              </div>

              {/* Grid de informações */}
              <div className="mt-5 grid gap-4"
                style={{ gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                {[
                  { icon: User,        label: "Cliente",       value: order.customer_name ?? order.customer?.name ?? "—"               },
                  { icon: null,        label: "CPF",           value: fmtCpf(order.customer?.cpf)                                     },
                  { icon: null,        label: "Telefone",      value: fmtPhone(order.customer?.phone)                                  },
                  { icon: Building2,   label: "Loja",          value: order.store ? `${order.store.code} — ${order.store.name}` : "—" },
                  { icon: User,        label: "Vendedor",      value: order.employee_name ?? order.employee?.short_name ?? order.employee?.full_name ?? "—" },
                  { icon: FlaskConical,label: "Laboratório",   value: order.laboratory
                    ? `${order.laboratory.name}${order.lab_os_number ? ` (${order.lab_os_number})` : ""}`
                    : "—" },
                ].map(item => (
                  <div key={item.label}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    Observações
                  </p>
                  <p style={{ fontSize: 13, color: "#475569" }}>{order.notes}</p>
                </div>
              )}
            </motion.div>

            {/* ── Resumo (movido da sidebar) ────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
            >
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Resumo</h3>
              </div>
              <div className="p-6">
                <div className="grid gap-x-8 gap-y-4" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                  {[
                    { label: "Nº OS",       value: os },
                    { label: "Loja",        value: order.store ? `${order.store.code} — ${order.store.name}` : "—" },
                    { label: "Vendedor(a)", value: order.employee_name ?? order.employee?.short_name ?? order.employee?.full_name ?? "—" },
                    { label: "Data Compra", value: fmtDate(order.purchase_date) },
                    { label: "Prazo",       value: prazo },
                    { label: "Laboratório", value: order.laboratory ? `${order.laboratory.name}${order.lab_os_number ? ` · ${order.lab_os_number}` : ""}` : "—" },
                  ].map(item => (
                    <div key={item.label}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                        {item.label}
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── Mover Pedido ─────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
            >
              <button onClick={() => setMovimentando(!movimentando)}
                className="w-full px-6 py-4 flex items-center justify-between transition-colors"
                style={{ background: movimentando ? "#0f2744" : "#1d4ed8" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#0f2744")}
                onMouseLeave={e => (e.currentTarget.style.background = movimentando ? "#0f2744" : "#1d4ed8")}
              >
                <span className="text-white font-semibold text-sm">Mover Pedido</span>
                <ChevronDown className="text-white w-4 h-4 transition-transform"
                  style={{ transform: movimentando ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>

              <AnimatePresence>
                {movimentando && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                          Nova Situação
                        </label>
                        <select value={novaSituacao} onChange={e => setNovaSituacao(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                          style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                          onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                          onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                        >
                          <option value="">Selecione a situação...</option>
                          {situacoesDisponiveis.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {showLab && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}
                        >
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                              Nº OS Laboratório
                            </label>
                            <input value={labOsInput} onChange={e => setLabOsInput(e.target.value)}
                              type="text" placeholder="Ex: GV-12345"
                              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                              style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                              onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                              onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                              Laboratório
                            </label>
                            <input value={labInput} onChange={e => setLabInput(e.target.value)}
                              type="text" placeholder="Ex: GrandVision"
                              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                              style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                              onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                              onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                            />
                          </div>
                        </motion.div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                          Observações
                        </label>
                        <textarea rows={2} value={obsInput} onChange={e => setObsInput(e.target.value)}
                          placeholder="Adicionar observação (opcional)..."
                          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                          style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                          onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                          onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                        />
                      </div>

                      <div className="flex justify-end">
                        <motion.button
                          whileHover={{ scale: novaSituacao && !saving ? 1.02 : 1 }}
                          whileTap={{ scale: novaSituacao && !saving ? 0.98 : 1 }}
                          onClick={handleMover}
                          disabled={!novaSituacao || saving}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                          style={{
                            background: "#1d4ed8",
                            opacity: novaSituacao && !saving ? 1 : 0.5,
                            cursor: novaSituacao && !saving ? "pointer" : "not-allowed",
                          }}
                        >
                          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                          Confirmar Movimentação
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ── SIDEBAR ──────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* ── Histórico — Timeline gráfica (movida da coluna principal) ── */}
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Histórico</h4>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{historiesAsc.length} etapa{historiesAsc.length !== 1 ? "s" : ""}</span>
              </div>

              {historiesAsc.length === 0 ? (
                <p className="px-4 py-6 text-xs text-center" style={{ color: "#94a3b8" }}>
                  Nenhuma movimentação registrada.
                </p>
              ) : (
                <div style={{ padding: "14px 14px 10px" }}>
                  {historiesAsc.map((h, i) => {
                    const cor     = statusColor[h.situation] ?? "#94a3b8"
                    const icone   = statusIcon[h.situation]  ?? <Clock className="w-3 h-3" />
                    const isLast  = i === historiesAsc.length - 1
                    const next    = historiesAsc[i + 1]
                    const nextCor = next ? (statusColor[next.situation] ?? "#94a3b8") : cor
                    const dur     = next
                      ? calcDuration(h.created_at, next.created_at)
                      : calcDuration(h.created_at, null)

                    return (
                      <div key={h.id}>
                        {/* ── Entrada ── */}
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>

                          {/* Círculo colorido */}
                          <div style={{
                            width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                            background: isLast ? `${cor}22` : "#f1f5f9",
                            border: `2px solid ${isLast ? cor : "#d1d5db"}`,
                            color: isLast ? cor : "#9ca3af",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {icone}
                          </div>

                          {/* Texto da etapa */}
                          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 700,
                              color: isLast ? cor : "#374151",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {h.situation}
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                              {fmtDateTime(h.created_at)}
                            </div>
                            {h.operator_name && (
                              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>
                                {h.operator_name}
                              </div>
                            )}
                            {h.notes && (
                              <div style={{ fontSize: 10, color: "#6b7280", fontStyle: "italic", marginTop: 1 }}>
                                {h.notes}
                              </div>
                            )}
                            {/* "há X" na última entrada */}
                            {isLast && (
                              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                                há {dur}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Conector com seta e duração ── */}
                        {!isLast && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "4px 0 4px 12px" }}>
                            {/* Linha + seta CSS */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 2 }}>
                              <div style={{ width: 2, height: 8, background: cor, opacity: 0.45 }} />
                              <div style={{
                                width: 0, height: 0,
                                borderLeft: "4px solid transparent",
                                borderRight: "4px solid transparent",
                                borderTop: `6px solid ${nextCor}`,
                                opacity: 0.75,
                              }} />
                              <div style={{ width: 2, height: 8, background: nextCor, opacity: 0.45 }} />
                            </div>
                            {/* Badge de duração */}
                            <div style={{
                              fontSize: 10, color: "#94a3b8", letterSpacing: "0.02em",
                              background: "#f8fafc", border: "1px solid #e2e8f0",
                              borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap",
                            }}>
                              {dur}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>

            {/* SLA */}
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <SlaCard
                label="SLA do Pedido"
                criadoEm={fmtDateTime(order.created_at)}
                prazo={fmtDate(order.scheduled_delivery)}
              />
            </motion.div>

            {/* Garantias relacionadas */}
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Garantias</h4>
                <Link href="/garantias/nova" className="text-xs font-semibold" style={{ color: "#1d4ed8" }}>
                  + Nova
                </Link>
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8" }}>
                Nenhuma garantia para este pedido.
              </p>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  )
}
