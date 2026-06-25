"use client"

import { use, useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SlaCard } from "@/components/ui/SlaCard"
import {
  ArrowLeft, ChevronDown, ExternalLink, Pencil,
  Clock, CheckCircle2, AlertCircle, Wrench, Loader2,
  Package, FlaskConical, Search, Truck, Store, ThumbsUp, RotateCcw,
} from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate, fmtDateTime, fmtOs, type Warranty, type WarrantyHistory } from "@/lib/types"

// ─── Ícones / cores da timeline ───────────────────────────────────────────────
// Cobre as 3 situações macro + as 11 situações granulares do PHP ETL

const timelineIcon: Record<string, React.ReactNode> = {
  // Macro (movimentação manual no ERP novo)
  "Início":                   <Clock        className="w-4 h-4" />,
  "Intermediário":             <Wrench       className="w-4 h-4" />,
  "Encerrado":                 <CheckCircle2 className="w-4 h-4" />,
  // Granulares do PHP (TB_Warranty_Situations)
  "Solicitação Criada":        <Clock        className="w-4 h-4" />,
  "Em Análise":                <Search       className="w-4 h-4" />,
  "Aprovada":                  <ThumbsUp     className="w-4 h-4" />,
  "Rejeitada":                 <AlertCircle  className="w-4 h-4" />,
  "Recebido na logística":     <Package      className="w-4 h-4" />,
  "Enviado ao laboratório":    <Truck        className="w-4 h-4" />,
  "Recebido no laboratório":   <FlaskConical className="w-4 h-4" />,
  "Controle de qualidade":     <Wrench       className="w-4 h-4" />,
  "Aguardando retirada":       <Clock        className="w-4 h-4" />,
  "Recebido em loja":          <Store        className="w-4 h-4" />,
  "Entregue ao cliente":       <CheckCircle2 className="w-4 h-4" />,
}

const timelineColor: Record<string, string> = {
  // Macro
  "Início":                   "#3b82f6",
  "Intermediário":             "#f59e0b",
  "Encerrado":                 "#22c55e",
  // Granulares
  "Solicitação Criada":        "#3b82f6",
  "Em Análise":                "#f59e0b",
  "Aprovada":                  "#22c55e",
  "Rejeitada":                 "#ef4444",
  "Recebido na logística":     "#556376",
  "Enviado ao laboratório":    "#8b5cf6",
  "Recebido no laboratório":   "#6366f1",
  "Controle de qualidade":     "#f59e0b",
  "Aguardando retirada":       "#0ea5e9",
  "Recebido em loja":          "#1d4ed8",
  "Entregue ao cliente":       "#16a34a",
}

const FLUXO = [
  { key: "Início",        short: "S", color: "#3b82f6" },
  { key: "Intermediário", short: "I", color: "#f59e0b" },
  { key: "Encerrado",     short: "E", color: "#22c55e" },
]

// ─── Componente ──────────────────────────────────────────────────────────────

export default function GarantiaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [warranty,  setWarranty]  = useState<Warranty | null>(null)
  const [histories, setHistories] = useState<WarrantyHistory[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const [movimentando, setMovimentando] = useState(false)
  const [novaSituacao, setNovaSituacao] = useState("")
  const [obsInput,     setObsInput]     = useState("")
  const [saving,       setSaving]       = useState(false)
  const [operadorAtual, setOperadorAtual] = useState("")
  const [revertendo,    setRevertendo]    = useState(false)

  // Transições dinâmicas do banco
  const [flowOptions, setFlowOptions] = useState<{ title: string; ui_hint: string | null }[]>([])

  // ── Carga de dados ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    const sb = createSupabaseBrowserClient()

    const [wRes, hRes] = await Promise.all([
      sb
        .from("warranties")
        .select(`
          *,
          store:stores(id,code,name),
          problem:warranty_problems(id,name),
          service_order:service_orders(id,os_number,os_sequence,customer_name)
        `)
        .eq("id", id)
        .single(),
      sb
        .from("warranty_histories")
        .select("*")
        .eq("warranty_id", id)
        .order("created_at", { ascending: false }),
    ])

    if (wRes.error || !wRes.data) {
      setError("Garantia não encontrada.")
    } else {
      setWarranty(wRes.data as Warranty)
      const hists = (hRes.data ?? []) as WarrantyHistory[]
      setHistories(hists)

      // Situação efetiva = último histórico (DESC → index 0 é o mais recente)
      const situacao = hists[0]?.situation ?? (wRes.data as Warranty).situation
      if (situacao) {
        const sitRes = await sb.from("warranty_situations").select("id").eq("title", situacao).single()
        if (sitRes.data) {
          const flowRes = await sb
            .from("warranty_situation_flows")
            .select("ui_hint, next:next_id(title)")
            .eq("actual_id", sitRes.data.id)
            .eq("active", true)
          setFlowOptions((flowRes.data ?? []).map(f => ({
            title:   ((f.next as unknown) as { title: string }).title,
            ui_hint: f.ui_hint as string | null,
          })))
        } else {
          setFlowOptions([])
        }
      }
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    createSupabaseBrowserClient().auth.getUser().then(({ data: { user } }) => {
      const nome = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ""
      setOperadorAtual(nome)
    })
  }, [])

  // ── Reverter última movimentação ───────────────────────────────────────────

  async function handleReverter() {
    if (!warranty || histories.length === 0) return
    setRevertendo(true)
    const sb = createSupabaseBrowserClient()
    const ultima   = histories[0]
    const anterior = histories[1]
    await sb.from("warranty_histories").delete().eq("id", ultima.id)
    await sb.from("warranties")
      .update({ situation: anterior?.situation ?? "Solicitação Criada" })
      .eq("id", warranty.id)
    setRevertendo(false)
    loadData()
  }

  // ── Confirmar movimentação ──────────────────────────────────────────────────

  async function handleMover() {
    if (!novaSituacao || !warranty) return
    setSaving(true)
    const sb = createSupabaseBrowserClient()
    const { data: { user } } = await sb.auth.getUser()
    const operador = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Sistema"

    await sb.from("warranty_histories").insert({
      warranty_id:   warranty.id,
      situation:     novaSituacao,
      operator_name: operador,
      notes:         obsInput || null,
    })
    await sb.from("warranties").update({ situation: novaSituacao }).eq("id", warranty.id)

    setMovimentando(false)
    setNovaSituacao(""); setObsInput("")
    setSaving(false)
    loadData()
  }

  // ── Estados de loading / erro ───────────────────────────────────────────────

  if (loading) return (
    <>
      <Header breadcrumbs={["Home", "Garantias", "…"]} title="Carregando…" />
      <main className="pt-[64px] px-8 py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1d4ed8" }} />
      </main>
    </>
  )

  if (error || !warranty) return (
    <>
      <Header breadcrumbs={["Home", "Garantias"]} title="Erro" />
      <main className="pt-[64px] px-8 py-16 text-center">
        <p style={{ color: "#dc2626" }}>{error ?? "Garantia não encontrada."}</p>
        <Link href="/garantias" className="text-sm text-blue-600 underline mt-2 inline-block">
          Voltar para garantias
        </Link>
      </main>
    </>
  )

  const num      = `GR-${String(warranty.id).padStart(3, "0")}`
  const sit      = warranty.situation ?? "Início"
  const prazo    = fmtDate(warranty.scheduled_delivery)
  const abertura = fmtDate(warranty.request_date ?? warranty.created_at)
  const fluxoIdx = FLUXO.findIndex(f => f.key === sit)

  // Timeline cronológica (histories chegam desc do Supabase)
  const historiesAsc = [...histories].reverse()

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

  // Próximas situações válidas vêm do banco (warranty_situation_flows)
  const situacoesDisponiveis = flowOptions

  const clienteNome = warranty.customer_name
    ?? warranty.service_order?.customer_name
    ?? "—"
  const clienteCpf  = warranty.customer_cpf
    ?? "—"

  return (
    <>
      <Header breadcrumbs={["Home", "Garantias", num]} title={`Garantia ${num}`} />

      <main className="pt-[64px] px-8 py-6 space-y-5">

        <Link href="/garantias"
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#556376" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0f2744")}
          onMouseLeave={e => (e.currentTarget.style.color = "#556376")}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para garantias
        </Link>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 280px" }}>

          {/* ── COLUNA PRINCIPAL ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Cabeçalho */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
            >
              <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono font-bold text-2xl" style={{ color: "#0f2744" }}>{num}</span>
                    {warranty.problem && <StatusBadge status={warranty.problem.name} />}
                  </div>

                  {/* Fluxo S → I → E */}
                  <div className="flex items-center gap-2">
                    {FLUXO.map((step, si) => {
                      const ativo   = sit === step.key
                      const passado = si < fluxoIdx
                      const cor     = ativo || passado ? step.color : "#7e8b9c"
                      return (
                        <div key={step.key} className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                              style={{
                                background: ativo ? step.color : passado ? `${step.color}22` : "#f1f5f9",
                                color: ativo ? "#fff" : cor,
                                border: `2px solid ${ativo ? step.color : passado ? step.color : "#e2e8f0"}`,
                              }}>
                              {step.short}
                            </span>
                            <span className="text-xs" style={{ color: ativo ? step.color : cor, fontWeight: ativo ? 700 : 400 }}>
                              {step.key}
                            </span>
                          </div>
                          {si < FLUXO.length - 1 && (
                            <span style={{ color: "#cbd5e1", fontSize: 16 }}>→</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/garantias/${warranty.id}/editar`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                    style={{ borderColor: "#bfdbfe", color: "#1d4ed8", background: "#eff6ff" }}>
                    <Pencil className="w-4 h-4" /> Editar
                  </Link>
                  <StatusBadge status={sit} size="md" />
                </div>
              </div>

              {/* Grid de info */}
              <div className="grid gap-4 mt-4"
                style={{ gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                {[
                  { label: "Cliente",  value: clienteNome },
                  { label: "CPF",      value: clienteCpf  },
                  { label: "Loja",     value: warranty.store ? `${warranty.store.code} — ${warranty.store.name}` : "—" },
                  { label: "Abertura", value: abertura     },
                  { label: "Prazo",    value: prazo        },
                  { label: "Problema", value: warranty.problem?.name ?? "—" },
                ].map(item => (
                  <div key={item.label}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#7e8b9c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#121212" }}>{item.value}</p>
                  </div>
                ))}
                {warranty.service_order && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#7e8b9c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      Pedido Original
                    </p>
                    <Link href={`/pedidos/${warranty.service_order.id}`}
                      className="inline-flex items-center gap-1.5 font-mono font-bold hover:underline"
                      style={{ fontSize: 14, color: "#1d4ed8" }}>
                      {fmtOs(warranty.service_order.os_number, warranty.service_order.os_sequence)}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {warranty.notes && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#7e8b9c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    Descrição do problema
                  </p>
                  <p style={{ fontSize: 14, color: "#3c4859" }}>{warranty.notes}</p>
                </div>
              )}
            </motion.div>

            {/* ── Mover Garantia ────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
            >
              <button onClick={() => setMovimentando(!movimentando)}
                className="w-full px-6 py-4 flex items-center justify-between transition-colors"
                style={{ background: movimentando ? "#0f2744" : "#1d4ed8" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#0f2744")}
                onMouseLeave={e => (e.currentTarget.style.background = movimentando ? "#0f2744" : "#1d4ed8")}
              >
                <span className="text-white font-semibold text-sm">Mover Garantia</span>
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
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#556376" }}>
                          Nova Situação
                        </label>
                        <select value={novaSituacao} onChange={e => setNovaSituacao(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                          style={{ borderColor: "#e2e8f0", color: "#121212" }}
                          onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                          onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                        >
                          <option value="">Selecione...</option>
                          {situacoesDisponiveis.map(({ title }) => (
                            <option key={title} value={title}>{title}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#556376" }}>
                          Observações
                        </label>
                        <textarea rows={2} value={obsInput} onChange={e => setObsInput(e.target.value)}
                          placeholder="Adicionar observação (opcional)..."
                          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                          style={{ borderColor: "#e2e8f0", color: "#121212" }}
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
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
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

            {/* ── Histórico — Timeline compacta vertical ───────────────── */}
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9" }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#121212" }}>Histórico</h4>
                <span style={{ fontSize: 11, color: "#7e8b9c" }}>
                  {historiesAsc.length} etapa{historiesAsc.length !== 1 ? "s" : ""}
                </span>
              </div>

              {historiesAsc.length === 0 ? (
                <p className="px-4 py-6 text-xs text-center" style={{ color: "#7e8b9c" }}>
                  Nenhuma movimentação registrada.
                </p>
              ) : (
                <div style={{ padding: "14px 14px 10px" }}>
                  {historiesAsc.map((h, i) => {
                    const cor     = timelineColor[h.situation] ?? "#7e8b9c"
                    const icone   = timelineIcon[h.situation]  ?? <Clock className="w-3 h-3" />
                    const isLast  = i === historiesAsc.length - 1
                    const next    = historiesAsc[i + 1]
                    const nextCor = next ? (timelineColor[next.situation] ?? "#7e8b9c") : cor
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
                            color: isLast ? cor : "#858b95",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {icone}
                          </div>

                          {/* Texto da etapa */}
                          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 700,
                              color: isLast ? cor : "#2f3745",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {h.situation}
                            </div>
                            <div style={{ fontSize: 11, color: "#5b616d", marginTop: 1 }}>
                              {fmtDateTime(h.created_at)}
                            </div>
                            {h.operator_name && (
                              <div style={{ fontSize: 10, color: "#858b95", marginTop: 1 }}>
                                {h.operator_name}
                              </div>
                            )}
                            {h.notes && (
                              <div style={{ fontSize: 10, color: "#5b616d", fontStyle: "italic", marginTop: 1 }}>
                                {h.notes}
                              </div>
                            )}
                            {isLast && (
                              <div style={{ fontSize: 10, color: "#7e8b9c", marginTop: 2 }}>
                                há {dur}
                              </div>
                            )}
                            {isLast && operadorAtual && h.operator_name === operadorAtual && (
                              <motion.button
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                onClick={handleReverter}
                                disabled={revertendo}
                                className="flex items-center gap-1 mt-2 px-2 py-1 rounded-lg text-xs font-semibold"
                                style={{
                                  background: "#FEE2E2", color: "#B91C1C",
                                  border: "1px solid #FECACA",
                                  opacity: revertendo ? 0.6 : 1,
                                  cursor: revertendo ? "not-allowed" : "pointer",
                                }}
                              >
                                <RotateCcw className="w-3 h-3" />
                                {revertendo ? "Revertendo…" : "Reverter movimentação"}
                              </motion.button>
                            )}
                          </div>
                        </div>

                        {/* ── Conector com seta e duração ── */}
                        {!isLast && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "4px 0 4px 12px" }}>
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
                            <div style={{
                              fontSize: 10, color: "#7e8b9c", letterSpacing: "0.02em",
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
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
              <SlaCard
                label="SLA da Garantia"
                criadoEm={abertura}
                prazo={prazo !== "—" ? prazo : fmtDate(warranty.created_at)}
              />
            </motion.div>
          </div>
        </div>
      </main>
    </>
  )
}
