"use client"

import { use, useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SlaCard } from "@/components/ui/SlaCard"
import {
  ArrowLeft, ChevronDown, ExternalLink,
  Clock, CheckCircle2, AlertCircle, Wrench, Loader2,
} from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate, fmtDateTime, fmtOs, type Warranty, type WarrantyHistory } from "@/lib/types"

// ─── Ícones / cores da timeline ───────────────────────────────────────────────

const timelineIcon: Record<string, React.ReactNode> = {
  "Início":        <Clock        className="w-4 h-4" />,
  "Intermediário": <Wrench       className="w-4 h-4" />,
  "Encerrado":     <CheckCircle2 className="w-4 h-4" />,
}
const timelineColor: Record<string, string> = {
  "Início":        "#3b82f6",
  "Intermediário": "#f59e0b",
  "Encerrado":     "#22c55e",
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
          service_order:service_orders(id,os_number,os_sequence,customer_name,customer_cpf)
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
      setHistories((hRes.data ?? []) as WarrantyHistory[])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

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

  const situacoesDisponiveis = FLUXO.filter(f => f.key !== sit)

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
          style={{ color: "#64748b" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0f2744")}
          onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
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
                      const cor     = ativo || passado ? step.color : "#94a3b8"
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
                <StatusBadge status={sit} size="md" />
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
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {warranty.notes && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    Descrição do problema
                  </p>
                  <p style={{ fontSize: 13, color: "#475569" }}>{warranty.notes}</p>
                </div>
              )}
            </motion.div>

            {/* ── Timeline ──────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)", overflow: "hidden" }}
            >
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Histórico de Movimentações
                  <span className="ml-2 text-sm font-normal" style={{ color: "#94a3b8" }}>({histories.length})</span>
                </h3>
              </div>

              {histories.length === 0 ? (
                <p className="px-6 py-8 text-sm text-center" style={{ color: "#94a3b8" }}>
                  Nenhuma movimentação registrada ainda.
                </p>
              ) : (
                <div className="p-6 space-y-4">
                  {histories.map((h, i) => {
                    const cor   = timelineColor[h.situation] ?? "#94a3b8"
                    const icone = timelineIcon[h.situation]  ?? <AlertCircle className="w-4 h-4" />
                    const atual = i === 0
                    return (
                      <div key={h.id} className="flex gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background: atual ? `${cor}22` : "#f1f5f9",
                              color: atual ? cor : "#94a3b8",
                              border: `2px solid ${atual ? cor : "#e2e8f0"}`,
                            }}>
                            {icone}
                          </div>
                          {i < histories.length - 1 && (
                            <div className="w-px flex-1 min-h-[20px]" style={{ background: "#e2e8f0" }} />
                          )}
                        </div>
                        <div className="flex-1 pb-4 rounded-xl p-4"
                          style={{
                            background: atual ? "#f8faff" : "#fafafa",
                            border: `1px solid ${atual ? "#dbeafe" : "#f1f5f9"}`,
                          }}>
                          <div className="flex items-center justify-between mb-2">
                            <StatusBadge status={h.situation} size="sm" />
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDateTime(h.created_at)}</span>
                          </div>
                          {h.notes && (
                            <p style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>{h.notes}</p>
                          )}
                          {h.operator_name && (
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                              <strong>Operador:</strong> {h.operator_name}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
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
                        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                          Nova Situação
                        </label>
                        <select value={novaSituacao} onChange={e => setNovaSituacao(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                          style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                          onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                          onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                        >
                          <option value="">Selecione...</option>
                          {situacoesDisponiveis.map(s => (
                            <option key={s.key} value={s.key}>{s.key}</option>
                          ))}
                        </select>
                      </div>
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

            {/* Pedido original */}
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
            >
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Pedido Original</h4>
              {warranty.service_order ? (
                <div className="p-3 rounded-xl" style={{ background: "#f8faff", border: "1px solid #dbeafe" }}>
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Nº do Pedido</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm" style={{ color: "#1d4ed8" }}>
                      {fmtOs(warranty.service_order.os_number, warranty.service_order.os_sequence)}
                    </span>
                    <Link href={`/pedidos/${warranty.service_order.id}`}>
                      <ExternalLink className="w-4 h-4" style={{ color: "#1d4ed8" }} />
                    </Link>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "#94a3b8" }}>Sem pedido vinculado.</p>
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
