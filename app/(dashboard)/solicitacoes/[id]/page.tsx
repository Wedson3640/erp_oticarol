"use client"

import { use, useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SlaCard } from "@/components/ui/SlaCard"
import {
  ArrowLeft, ChevronDown, Printer, Pencil,
  Clock, Package, CheckCircle2, Truck, XCircle,
  Building2, Wrench, Tag, Loader2,
  FlaskConical, Store, RotateCcw,
} from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate, fmtDateTime, type Request, type RequestHistory } from "@/lib/types"

// ─── Ícones / cores (situações reais do PHP TB_Solicitation_Situations) ────────

const timelineIcon: Record<string, React.ReactNode> = {
  // Criação
  "Solicitação Criada":       <Package      className="w-4 h-4" />,
  // Laboratório
  "Recebido no laboratório":  <FlaskConical className="w-4 h-4" />,
  "Análise de recebimento":   <FlaskConical className="w-4 h-4" />,
  "Controle de qualidade":    <CheckCircle2 className="w-4 h-4" />,
  // Logística
  "Trânsito":                 <Truck        className="w-4 h-4" />,
  // Loja
  "Recebido na loja":         <Store        className="w-4 h-4" />,
  "Aguardando Retirada":      <Clock        className="w-4 h-4" />,
  // Entrega
  "Entregue ao cliente":      <Truck        className="w-4 h-4" />,
  // Admin
  "Fechado pelo administrador": <XCircle    className="w-4 h-4" />,
  // Legado (inserções manuais pelo sistema novo)
  "Aguardando":               <Clock        className="w-4 h-4" />,
  "Em andamento":             <Package      className="w-4 h-4" />,
  "Pronto p/ Entrega":        <CheckCircle2 className="w-4 h-4" />,
  "Entregue":                 <Truck        className="w-4 h-4" />,
  "Cancelado":                <XCircle      className="w-4 h-4" />,
}

const timelineColor: Record<string, string> = {
  // Criação
  "Solicitação Criada":         "#3b82f6",  // azul
  // Laboratório
  "Recebido no laboratório":    "#7c3aed",  // roxo
  "Análise de recebimento":     "#6d28d9",  // roxo escuro
  "Controle de qualidade":      "#2563eb",  // azul médio
  // Logística
  "Trânsito":                   "#0891b2",  // ciano
  // Loja
  "Recebido na loja":           "#059669",  // verde
  "Aguardando Retirada":        "#16a34a",  // verde médio
  // Entrega
  "Entregue ao cliente":        "#15803d",  // verde escuro
  // Admin
  "Fechado pelo administrador": "#dc2626",  // vermelho
  // Legado
  "Aguardando":                 "#f59e0b",
  "Em andamento":               "#3b82f6",
  "Pronto p/ Entrega":          "#22c55e",
  "Entregue":                   "#15803d",
  "Cancelado":                  "#dc2626",
}

const servicoColor: Record<string, { bg: string; text: string }> = {
  "Adaptação":  { bg: "#CCFBF1", text: "#134E4A" },
  "Troca":      { bg: "#DBEAFE", text: "#1E40AF" },
  "Manutenção": { bg: "#FEF3C7", text: "#92400E" },
  "Outros":     { bg: "#F1F5F9", text: "#3c4859" },
}

function Chip({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span style={{
      display: "inline-flex", padding: "3px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, background: colors.bg, color: colors.text,
    }}>
      {label}
    </span>
  )
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function SolicitacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [request,   setRequest]   = useState<Request | null>(null)
  const [histories, setHistories] = useState<RequestHistory[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const [movimentando, setMovimentando] = useState(false)
  const [novaSituacao, setNovaSituacao] = useState("")
  const [obsInput,     setObsInput]     = useState("")
  const [saving,       setSaving]       = useState(false)
  const [operadorAtual, setOperadorAtual] = useState("")   // nome (display)
  const [operadorUid,   setOperadorUid]   = useState("")   // uuid (comparação robusta)
  const [revertendo,    setRevertendo]    = useState(false)

  // Transições dinâmicas do banco
  const [flowOptions, setFlowOptions] = useState<{ title: string; ui_hint: string | null }[]>([])

  // ── Carga ───────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    const sb = createSupabaseBrowserClient()

    const [rRes, hRes] = await Promise.all([
      sb
        .from("requests")
        .select("*, store:stores(id,code,name), employee:employees(id,full_name), customer:customers(id,name,cpf,phone)")
        .eq("id", id)
        .single(),
      sb
        .from("request_histories")
        .select("*")
        .eq("request_id", id)
        .order("created_at", { ascending: false }),
    ])

    if (rRes.error || !rRes.data) {
      setError("Solicitação não encontrada.")
    } else {
      setRequest(rRes.data as Request)
      const hists = (hRes.data ?? []) as RequestHistory[]
      setHistories(hists)

      // Situação efetiva = último histórico (DESC → index 0 é o mais recente)
      const situacao = hists[0]?.situation ?? (rRes.data as Request).situation
      if (situacao) {
        const sitRes = await sb.from("solicitation_situations").select("id").eq("title", situacao).single()
        if (sitRes.data) {
          const flowRes = await sb
            .from("solicitation_situation_flows")
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
      setOperadorUid(user?.id ?? "")
    })
  }, [])

  // ── Reverter última movimentação ───────────────────────────────────────────

  async function handleReverter() {
    if (!request || histories.length === 0) return
    setRevertendo(true)
    const sb = createSupabaseBrowserClient()
    const ultima   = histories[0]
    const anterior = histories[1]
    const { error: errDel } = await sb
      .from("request_histories").delete().eq("id", ultima.id)
    if (errDel) {
      alert(`Erro ao reverter: ${errDel.message}`)
      setRevertendo(false)
      return
    }
    const { error: errUpd } = await sb.from("requests")
      .update({ situation: anterior?.situation ?? "Solicitação Criada" })
      .eq("id", request.id)
    if (errUpd) {
      alert(`Erro ao atualizar situação: ${errUpd.message}`)
    }
    setRevertendo(false)
    loadData()
  }

  // ── Mover ───────────────────────────────────────────────────────────────────

  async function handleMover() {
    if (!novaSituacao || !request) return
    setSaving(true)
    const sb = createSupabaseBrowserClient()
    const { data: { user } } = await sb.auth.getUser()
    const operador = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Sistema"

    await sb.from("request_histories").insert({
      request_id:    request.id,
      situation:     novaSituacao,
      operator_name: operador,
      operator_uid:  user?.id ?? null,
      notes:         obsInput || null,
    })
    await sb.from("requests").update({ situation: novaSituacao }).eq("id", request.id)

    setMovimentando(false)
    setNovaSituacao(""); setObsInput("")
    setSaving(false)
    loadData()
  }

  // ── Loading / erro ──────────────────────────────────────────────────────────

  if (loading) return (
    <>
      <Header breadcrumbs={["Home", "Solicitações", "…"]} title="Carregando…" />
      <main className="pt-[64px] px-8 py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1d4ed8" }} />
      </main>
    </>
  )

  if (error || !request) return (
    <>
      <Header breadcrumbs={["Home", "Solicitações"]} title="Erro" />
      <main className="pt-[64px] px-8 py-16 text-center">
        <p style={{ color: "#dc2626" }}>{error ?? "Solicitação não encontrada."}</p>
        <Link href="/solicitacoes" className="text-sm text-blue-600 underline mt-2 inline-block">
          Voltar para solicitações
        </Link>
      </main>
    </>
  )

  const num    = `SOL-${String(request.source_erp_id ?? request.id).padStart(4, "0")}`
  const sit    = request.situation
  const prazo  = fmtDate(request.scheduled_delivery)
  const criado = fmtDateTime(request.created_at)


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

  return (
    <>
      <Header breadcrumbs={["Home", "Solicitações", num]} title={`Solicitação ${num}`} />

      <main className="pt-[64px] px-8 py-6 space-y-5">

        <Link href="/solicitacoes"
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#556376" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0f2744")}
          onMouseLeave={e => (e.currentTarget.style.color = "#556376")}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para solicitações
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
                      {num}
                    </span>
                    <StatusBadge status={sit} size="md" />
                  </div>
                  <p style={{ fontSize: 14, color: "#556376" }}>
                    Criado em {criado} · Prazo:{" "}
                    <strong style={{ color: "#121212" }}>{prazo}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/solicitacoes/${request.id}/editar`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                    style={{ borderColor: "#bfdbfe", color: "#1d4ed8", background: "#eff6ff" }}>
                    <Pencil className="w-4 h-4" /> Editar
                  </Link>
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                    style={{ borderColor: "#e2e8f0", color: "#3c4859", background: "#f8fafc" }}>
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                </div>
              </div>

              {/* Grid de info */}
              <div className="mt-5 grid gap-4"
                style={{ gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                {[
                  { icon: null,      label: "Cliente",  value: request.customer_name ?? request.customer?.name ?? "—" },
                  { icon: null,      label: "CPF",      value: request.customer_cpf ?? request.customer?.cpf ?? "—" },
                  { icon: null,      label: "Telefone", value: request.customer_phone ?? request.customer?.phone ?? "—" },
                  { icon: Building2, label: "Loja",     value: request.store ? `${request.store.code} — ${request.store.name}` : "—" },
                  { icon: null,      label: "Vendedor", value: request.employee?.full_name ?? "—" },
                  { icon: Tag,       label: "Modelo",   value: request.frame_model ?? "—" },
                ].map(item => (
                  <div key={item.label}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#7e8b9c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#121212" }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Chips */}
              <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: "1px solid #f1f5f9" }}>
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" style={{ color: "#7e8b9c" }} />
                  <span style={{ fontSize: 12, color: "#7e8b9c" }}>Serviço:</span>
                  <Chip label={request.service_type}
                    colors={servicoColor[request.service_type] ?? { bg: "#f1f5f9", text: "#3c4859" }} />
                </div>
                {request.frame_type && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" style={{ color: "#7e8b9c" }} />
                    <span style={{ fontSize: 12, color: "#7e8b9c" }}>Armação:</span>
                    <Chip label={request.frame_type} colors={{ bg: "#EDE9FE", text: "#4C1D95" }} />
                  </div>
                )}
              </div>

              {request.notes && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#7e8b9c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    Observações
                  </p>
                  <p style={{ fontSize: 14, color: "#3c4859" }}>{request.notes}</p>
                </div>
              )}
            </motion.div>

            {/* ── Resumo (movido da sidebar) ────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
            >
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#121212" }}>Resumo</h3>
              </div>
              <div className="p-6">
                <div className="grid gap-x-8 gap-y-4" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                  {[
                    { label: "Nº",        value: num },
                    { label: "Loja",      value: request.store ? `${request.store.code} — ${request.store.name}` : "—" },
                    { label: "Vendedor",  value: request.employee?.full_name ?? "—" },
                    { label: "Serviço",   value: request.service_type },
                    { label: "Armação",   value: request.frame_type ?? "—" },
                    { label: "Prazo",     value: prazo },
                  ].map(item => (
                    <div key={item.label}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#7e8b9c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                        {item.label}
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#121212" }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── Mover Solicitação ─────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
            >
              <button onClick={() => setMovimentando(!movimentando)}
                className="w-full px-6 py-4 flex items-center justify-between transition-colors"
                style={{ background: movimentando ? "#0f2744" : "#1d4ed8" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#0f2744")}
                onMouseLeave={e => (e.currentTarget.style.background = movimentando ? "#0f2744" : "#1d4ed8")}
              >
                <span className="text-white font-semibold text-sm">Mover Solicitação</span>
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
                          {flowOptions.map(opt => (
                            <option key={opt.title} value={opt.title}>{opt.title}</option>
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
                <span style={{ fontSize: 11, color: "#7e8b9c" }}>{historiesAsc.length} etapa{historiesAsc.length !== 1 ? "s" : ""}</span>
              </div>

              {historiesAsc.length === 0 ? (
                <p className="px-4 py-6 text-xs text-center" style={{ color: "#7e8b9c" }}>
                  Nenhuma movimentação registrada.
                </p>
              ) : (
                <div style={{ padding: "14px 14px 10px" }}>
                  {historiesAsc.map((h, i) => {
                    const cor    = timelineColor[h.situation] ?? "#7e8b9c"
                    const icone  = timelineIcon[h.situation]  ?? <Clock className="w-3 h-3" />
                    const isLast = i === historiesAsc.length - 1
                    const next   = historiesAsc[i + 1]
                    const nextCor = next ? (timelineColor[next.situation] ?? "#7e8b9c") : cor
                    const dur    = next
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
                            {isLast && operadorUid && (
                              h.operator_uid === operadorUid ||
                              (!h.operator_uid && h.operator_name === operadorAtual)
                            ) && (
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
                label="SLA da Solicitação"
                criadoEm={fmtDateTime(request.created_at)}
                prazo={prazo !== "—" ? prazo : fmtDate(request.created_at)}
              />
            </motion.div>
          </div>
        </div>
      </main>
    </>
  )
}
