"use client"

import { use, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { ArrowLeft, Save, Loader2, AlertTriangle, Flame } from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtOs, type Warranty } from "@/lib/types"

interface SelectOption { id: number; label: string }

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EditarGarantiaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }  = use(params)
  const router  = useRouter()

  const [warranty,   setWarranty]   = useState<Warranty | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Opções
  const [stores,   setStores]   = useState<SelectOption[]>([])
  const [problems, setProblems] = useState<SelectOption[]>([])

  // Campos
  const [storeId,        setStoreId]        = useState<number | null>(null)
  const [problemId,      setProblemId]      = useState<number | null>(null)
  const [requestDate,    setRequestDate]    = useState("")
  const [scheduledDate,  setScheduledDate]  = useState("")
  const [urgent,         setUrgent]         = useState(false)
  const [notes,          setNotes]          = useState("")

  // ── Carga inicial ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    const sb = createSupabaseBrowserClient()

    const [wRes, stRes, prRes] = await Promise.all([
      sb.from("warranties")
        .select(`*, store:stores(id,code,name), problem:warranty_problems(id,name),
          service_order:service_orders(id,os_number,os_sequence,customer_name)`)
        .eq("id", id)
        .single(),
      sb.from("stores").select("id,code,name").eq("active", true).order("code"),
      sb.from("warranty_problems").select("id,name").eq("active", true).order("name"),
    ])

    if (wRes.error || !wRes.data) {
      setError("Garantia não encontrada.")
      setLoading(false)
      return
    }

    const w = wRes.data as Warranty
    setWarranty(w)
    setStoreId(w.store_id)
    setProblemId(w.problem_id)
    setRequestDate(w.request_date?.split("T")[0] ?? "")
    setScheduledDate(w.scheduled_delivery?.split("T")[0] ?? "")
    setUrgent(w.urgent)
    setNotes(w.notes ?? "")

    setStores((stRes.data ?? []).map(s => ({ id: s.id, label: `${s.code} — ${s.name}` })))
    setProblems((prRes.data ?? []).map(p => ({ id: p.id, label: p.name })))

    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  // ── Salvar ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!warranty) return

    setSaving(true)
    setError(null)

    const sb = createSupabaseBrowserClient()
    const { error: e } = await sb
      .from("warranties")
      .update({
        store_id:           storeId,
        problem_id:         problemId || null,
        request_date:       requestDate || null,
        scheduled_delivery: scheduledDate || null,
        urgent,
        notes:              notes || null,
      })
      .eq("id", warranty.id)

    if (e) {
      setError(`Erro ao salvar: ${e.message}`)
    } else {
      setSuccessMsg("Garantia atualizada com sucesso!")
      setTimeout(() => router.push(`/garantias/${warranty.id}`), 1000)
    }
    setSaving(false)
  }

  // ── Loading / Erro ───────────────────────────────────────────────────────────

  if (loading) return (
    <>
      <Header breadcrumbs={["Home", "Garantias", "Editar"]} title="Carregando…" />
      <main className="pt-[64px] px-8 py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1d4ed8" }} />
      </main>
    </>
  )

  if (!warranty) return (
    <>
      <Header breadcrumbs={["Home", "Garantias"]} title="Erro" />
      <main className="pt-[64px] px-8 py-8 text-center">
        <p style={{ color: "#dc2626" }}>{error ?? "Garantia não encontrada."}</p>
        <Link href="/garantias" className="text-sm text-blue-600 underline mt-2 inline-block">
          Voltar
        </Link>
      </main>
    </>
  )

  const num = `GR-${String(warranty.id).padStart(3, "0")}`
  const osRef = warranty.service_order
    ? fmtOs(warranty.service_order.os_number, warranty.service_order.os_sequence)
    : null

  const lbl = (txt: string, req = false) => (
    <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#556376" }}>
      {txt}{req && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
  )

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
  const inputSt  = { borderColor: "#e2e8f0", color: "#121212" }
  const onFocus  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.target.style.borderColor = "#1d4ed8")
  const onBlur   = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.target.style.borderColor = "#e2e8f0")

  return (
    <>
      <Header breadcrumbs={["Home", "Garantias", num, "Editar"]} title={`Editar ${num}`} />

      <main className="pt-[64px] px-8 py-6 max-w-3xl mx-auto space-y-5">

        <Link href={`/garantias/${warranty.id}`}
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#556376" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0f2744")}
          onMouseLeave={e => (e.currentTarget.style.color = "#556376")}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para a garantia
        </Link>

        {/* Mensagens */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl text-sm"
            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a" }}>
            {successMsg}
          </div>
        )}

        {/* Formulário */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "#fff", borderRadius: 16, padding: 28,
            border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f2744", marginBottom: 24 }}>
            Informações da Garantia
          </h2>

          <div className="grid gap-5">

            {/* Cliente (somente leitura) */}
            <div className="grid gap-5" style={{ gridTemplateColumns: osRef ? "1fr 1fr" : "1fr" }}>
              <div>
                {lbl("Cliente")}
                <div className={inputCls} style={{ ...inputSt, background: "#f8fafc", color: "#3c4859" }}>
                  {warranty.customer_name ?? warranty.service_order?.customer_name ?? "—"}
                </div>
              </div>
              {osRef && (
                <div>
                  {lbl("Pedido Vinculado")}
                  <div className={inputCls} style={{ ...inputSt, background: "#f8fafc", color: "#3c4859", fontFamily: "monospace", fontWeight: 700 }}>
                    {osRef}
                  </div>
                </div>
              )}
            </div>

            {/* Loja / Problema */}
            <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                {lbl("Loja")}
                <select value={storeId ?? ""} onChange={e => setStoreId(Number(e.target.value) || null)}
                  className={inputCls} style={inputSt} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Selecione...</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                {lbl("Tipo de Problema")}
                <select value={problemId ?? ""} onChange={e => setProblemId(Number(e.target.value) || null)}
                  className={inputCls} style={inputSt} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Selecione...</option>
                  {problems.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Data Abertura / Prazo */}
            <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                {lbl("Data de Abertura")}
                <input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)}
                  className={inputCls} style={inputSt} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                {lbl("Prazo de Resolução")}
                <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                  className={inputCls} style={inputSt} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            {/* Urgente */}
            <div>
              {lbl("Urgência")}
              <button
                type="button"
                onClick={() => setUrgent(!urgent)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all w-full"
                style={{ background: urgent ? "#FEF2F2" : "#f8fafc", borderColor: urgent ? "#FECACA" : "#e2e8f0" }}
              >
                <div className="w-10 h-6 rounded-full transition-colors relative"
                  style={{ background: urgent ? "#dc2626" : "#e2e8f0" }}>
                  <div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{ transform: urgent ? "translateX(20px)" : "translateX(4px)" }} />
                </div>
                <div className="flex items-center gap-1.5">
                  {urgent && <Flame className="w-4 h-4" style={{ color: "#dc2626" }} />}
                  <span className="text-sm font-medium" style={{ color: urgent ? "#dc2626" : "#3c4859" }}>
                    {urgent ? "Marcado como urgente" : "Marcar como urgente"}
                  </span>
                </div>
              </button>
            </div>

            {/* Observações */}
            <div>
              {lbl("Observações")}
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Observações da garantia..."
                className={`${inputCls} resize-none`} style={inputSt}
                onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between mt-6 pt-5"
            style={{ borderTop: "1px solid #f1f5f9" }}>
            <Link href={`/garantias/${warranty.id}`}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border"
              style={{ borderColor: "#e2e8f0", color: "#3c4859" }}
            >
              Cancelar
            </Link>
            <motion.button
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#0f2744", opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </motion.button>
          </div>
        </motion.div>
      </main>
    </>
  )
}
