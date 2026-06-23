"use client"

import { use, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { ArrowLeft, Save, Loader2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import type { Request } from "@/lib/types"

// ─── Constantes ───────────────────────────────────────────────────────────────

const SERVICOS      = ["Ajustes", "Aplique", "Copiar grau", "Montagem", "Transposição"]
const TIPOS_ARMACAO = ["Completa", "Fio de nylon", "Parafusada", "Sem aro"]

interface SelectOption { id: number; label: string }

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EditarSolicitacaoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }  = use(params)
  const router  = useRouter()

  const [request,    setRequest]    = useState<Request | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Opções
  const [stores,    setStores]    = useState<SelectOption[]>([])
  const [employees, setEmployees] = useState<SelectOption[]>([])

  // Campos
  const [storeId,        setStoreId]        = useState<number | null>(null)
  const [employeeId,     setEmployeeId]     = useState<number | null>(null)
  const [serviceType,    setServiceType]    = useState("")
  const [frameType,      setFrameType]      = useState("")
  const [frameModel,     setFrameModel]     = useState("")
  const [scheduledDate,  setScheduledDate]  = useState("")
  const [notes,          setNotes]          = useState("")

  // ── Carga inicial ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    const sb = createSupabaseBrowserClient()

    const [rRes, stRes, empRes] = await Promise.all([
      sb.from("requests")
        .select("*, store:stores(id,code,name), employee:employees(id,full_name,short_name)")
        .eq("id", id)
        .single(),
      sb.from("stores").select("id,code,name").eq("active", true).order("code"),
      sb.from("employees").select("id,full_name,short_name").eq("active", true).order("full_name"),
    ])

    if (rRes.error || !rRes.data) {
      setError("Solicitação não encontrada.")
      setLoading(false)
      return
    }

    const r = rRes.data as Request
    setRequest(r)
    setStoreId(r.store_id)
    setEmployeeId(r.employee_id)
    setServiceType(r.service_type)
    setFrameType(r.frame_type ?? "")
    setFrameModel(r.frame_model ?? "")
    setScheduledDate(r.scheduled_delivery?.split("T")[0] ?? "")
    setNotes(r.notes ?? "")

    setStores((stRes.data ?? []).map(s => ({ id: s.id, label: `${s.code} — ${s.name}` })))
    setEmployees((empRes.data ?? []).map(e => ({
      id: e.id,
      label: ((e.short_name ?? e.full_name) as string),
    })))

    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  // ── Salvar ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!request) return
    if (!serviceType) { setError("Selecione o tipo de serviço."); return }

    setSaving(true)
    setError(null)

    const sb = createSupabaseBrowserClient()
    const { error: e } = await sb
      .from("requests")
      .update({
        store_id:           storeId,
        employee_id:        employeeId,
        service_type:       serviceType,
        frame_type:         frameType  || null,
        frame_model:        frameModel || null,
        scheduled_delivery: scheduledDate || null,
        notes:              notes || null,
      })
      .eq("id", request.id)

    if (e) {
      setError(`Erro ao salvar: ${e.message}`)
    } else {
      setSuccessMsg("Solicitação atualizada com sucesso!")
      setTimeout(() => router.push(`/solicitacoes/${request.id}`), 1000)
    }
    setSaving(false)
  }

  // ── Loading / Erro ───────────────────────────────────────────────────────────

  if (loading) return (
    <>
      <Header breadcrumbs={["Home", "Solicitações", "Editar"]} title="Carregando…" />
      <main className="pt-[64px] px-8 py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1d4ed8" }} />
      </main>
    </>
  )

  if (!request) return (
    <>
      <Header breadcrumbs={["Home", "Solicitações"]} title="Erro" />
      <main className="pt-[64px] px-8 py-8 text-center">
        <p style={{ color: "#dc2626" }}>{error ?? "Solicitação não encontrada."}</p>
        <Link href="/solicitacoes" className="text-sm text-blue-600 underline mt-2 inline-block">
          Voltar
        </Link>
      </main>
    </>
  )

  const num = `SOL-${String(request.source_erp_id ?? request.id).padStart(4, "0")}`

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
      <Header breadcrumbs={["Home", "Solicitações", num, "Editar"]} title={`Editar ${num}`} />

      <main className="pt-[64px] px-8 py-6 max-w-3xl mx-auto space-y-5">

        <Link href={`/solicitacoes/${request.id}`}
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#556376" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0f2744")}
          onMouseLeave={e => (e.currentTarget.style.color = "#556376")}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para a solicitação
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
            Informações da Solicitação
          </h2>

          <div className="grid gap-5">

            {/* Cliente (somente leitura) */}
            <div>
              {lbl("Cliente")}
              <div className={inputCls} style={{ ...inputSt, background: "#f8fafc", color: "#3c4859" }}>
                {request.customer_name ?? "—"}
              </div>
            </div>

            {/* Loja / Vendedor */}
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
                {lbl("Vendedor(a)")}
                <select value={employeeId ?? ""} onChange={e => setEmployeeId(Number(e.target.value) || null)}
                  className={inputCls} style={inputSt} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Selecione...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>
            </div>

            {/* Serviço / Armação */}
            <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                {lbl("Tipo de Serviço", true)}
                <select value={serviceType} onChange={e => setServiceType(e.target.value)}
                  className={inputCls} style={inputSt} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Selecione...</option>
                  {SERVICOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                {lbl("Tipo de Armação")}
                <select value={frameType} onChange={e => setFrameType(e.target.value)}
                  className={inputCls} style={inputSt} onFocus={onFocus} onBlur={onBlur}>
                  <option value="">Nenhum</option>
                  {TIPOS_ARMACAO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Modelo / Prazo */}
            <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                {lbl("Modelo da Armação")}
                <input value={frameModel} onChange={e => setFrameModel(e.target.value)}
                  placeholder="Ex: Ray-Ban RB3025"
                  className={inputCls} style={inputSt} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                {lbl("Prazo de Entrega")}
                <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                  className={inputCls} style={inputSt} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            {/* Observações */}
            <div>
              {lbl("Observações")}
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Observações da solicitação..."
                className={`${inputCls} resize-none`} style={inputSt}
                onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between mt-6 pt-5"
            style={{ borderTop: "1px solid #f1f5f9" }}>
            <Link href={`/solicitacoes/${request.id}`}
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
