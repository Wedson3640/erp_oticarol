"use client"

import { use, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { ArrowLeft, Save, Loader2, Search, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtOs, fmtCpf, type ServiceOrder } from "@/lib/types"

interface SelectOption { id: number; label: string }

interface CustomerResult {
  id: number
  name: string
  cpf: string | null
  phone: string | null
}

export default function EditarPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router  = useRouter()

  // Dados originais
  const [order,       setOrder]       = useState<ServiceOrder | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null)

  // Opções dos selects
  const [stores,       setStores]       = useState<SelectOption[]>([])
  const [employees,    setEmployees]    = useState<SelectOption[]>([])
  const [laboratories, setLaboratories] = useState<SelectOption[]>([])

  // Campos do formulário
  const [storeId,        setStoreId]        = useState<number | null>(null)
  const [employeeId,     setEmployeeId]     = useState<number | null>(null)
  const [laboratoryId,   setLaboratoryId]   = useState<number | null>(null)
  const [labOsNumber,    setLabOsNumber]    = useState("")
  const [scheduledDate,  setScheduledDate]  = useState("")
  const [urgent,         setUrgent]         = useState(false)
  const [notes,          setNotes]          = useState("")

  // Busca de cliente
  const [cpfSearch,      setCpfSearch]      = useState("")
  const [customerResult, setCustomerResult] = useState<CustomerResult | null>(null)
  const [customerId,     setCustomerId]     = useState<number | null>(null)
  const [customerName,   setCustomerName]   = useState("")
  const [searching,      setSearching]      = useState(false)
  const [searchError,    setSearchError]    = useState<string | null>(null)

  // ── Carga inicial ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    const sb = createSupabaseBrowserClient()

    const [oRes, stRes, empRes, labRes] = await Promise.all([
      sb.from("service_orders")
        .select(`
          *,
          customer:customers!customer_id(id,name,cpf,phone),
          store:stores!store_id(id,code,name),
          employee:employees!employee_id(id,full_name,short_name),
          laboratory:laboratories!laboratory_id(id,name)
        `)
        .eq("id", id)
        .single(),
      sb.from("stores").select("id,code,name").eq("active", true).order("code"),
      sb.from("employees").select("id,full_name,short_name").eq("active", true).order("full_name"),
      sb.from("laboratories").select("id,name").eq("active", true).order("name"),
    ])

    if (oRes.error || !oRes.data) {
      setError("Pedido não encontrado.")
      setLoading(false)
      return
    }

    const o = oRes.data as ServiceOrder

    setOrder(o)
    setStoreId(o.store_id)
    setEmployeeId(o.employee_id)
    setLaboratoryId(o.laboratory_id)
    setLabOsNumber(o.lab_os_number ?? "")
    setScheduledDate(o.scheduled_delivery?.split("T")[0] ?? "")
    setUrgent(o.urgent)
    setNotes(o.notes ?? "")
    setCustomerId(o.customer_id)
    setCustomerName(o.customer_name ?? o.customer?.name ?? "")
    if (o.customer) {
      setCustomerResult({
        id:    o.customer.id,
        name:  o.customer.name,
        cpf:   o.customer.cpf  ?? null,
        phone: o.customer.phone ?? null,
      })
      setCpfSearch(o.customer.cpf ?? "")
    }

    setStores((stRes.data ?? []).map(s => ({ id: s.id, label: `${s.code} — ${s.name}` })))
    setEmployees((empRes.data ?? []).map(e => ({
      id: e.id,
      label: (e.short_name ?? e.full_name) as string,
    })))
    setLaboratories((labRes.data ?? []).map(l => ({ id: l.id, label: l.name })))

    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  // ── Busca por CPF ────────────────────────────────────────────────────────────

  async function handleCpfSearch() {
    const cpf = cpfSearch.replace(/\D/g, "")
    if (cpf.length !== 11) { setSearchError("CPF deve ter 11 dígitos."); return }

    setSearching(true)
    setSearchError(null)
    setCustomerResult(null)

    const sb = createSupabaseBrowserClient()
    const { data, error: e } = await sb
      .from("customers")
      .select("id,name,cpf,phone")
      .eq("cpf", cpf)
      .single()

    if (e || !data) {
      setSearchError("Cliente não encontrado para este CPF.")
      setCustomerId(null)
    } else {
      setCustomerResult(data as CustomerResult)
      setCustomerId(data.id)
      setCustomerName(data.name)
    }
    setSearching(false)
  }

  // ── Salvar ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!order) return
    setSaving(true)
    setError(null)

    const sb = createSupabaseBrowserClient()
    const { error: e } = await sb
      .from("service_orders")
      .update({
        store_id:           storeId,
        employee_id:        employeeId,
        employee_name:      employees.find(e => e.id === employeeId)?.label ?? null,
        laboratory_id:      laboratoryId || null,
        lab_os_number:      labOsNumber  || null,
        scheduled_delivery: scheduledDate || null,
        urgent,
        notes:              notes || null,
        ...(customerId ? { customer_id: customerId, customer_name: customerName } : {}),
      })
      .eq("id", order.id)

    if (e) {
      setError(`Erro ao salvar: ${e.message}`)
    } else {
      setSuccessMsg("Pedido atualizado com sucesso!")
      setTimeout(() => router.push(`/pedidos/${order.id}`), 1000)
    }
    setSaving(false)
  }

  // ── Loading / Erro ───────────────────────────────────────────────────────────

  if (loading) return (
    <>
      <Header breadcrumbs={["Home", "Pedidos", "Editar"]} title="Carregando…" />
      <main className="pt-[64px] px-8 py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1d4ed8" }} />
      </main>
    </>
  )

  if (!order) return (
    <>
      <Header breadcrumbs={["Home", "Pedidos"]} title="Erro" />
      <main className="pt-[64px] px-8 py-8 text-center">
        <p style={{ color: "#dc2626" }}>{error ?? "Pedido não encontrado."}</p>
        <Link href="/pedidos" className="text-sm text-blue-600 underline mt-2 inline-block">
          Voltar
        </Link>
      </main>
    </>
  )

  const os = fmtOs(order.os_number, order.os_sequence)

  return (
    <>
      <Header breadcrumbs={["Home", "Pedidos", os, "Editar"]} title={`Editar Pedido ${os}`} />

      <main className="pt-[64px] px-8 py-6 max-w-3xl mx-auto space-y-5">

        <Link href={`/pedidos/${order.id}`}
          className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#64748b" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0f2744")}
          onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o pedido
        </Link>

        {/* ── Mensagens ──────────────────────────────────────────────────── */}
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

        {/* ── Formulário ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "#fff", borderRadius: 16, padding: 28, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f2744", marginBottom: 24 }}>
            Informações do Pedido
          </h2>

          <div className="grid gap-5">

            {/* ── Cliente por CPF ─────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                Cliente (buscar por CPF)
              </label>
              <div className="flex gap-2">
                <input
                  value={cpfSearch}
                  onChange={e => setCpfSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCpfSearch()}
                  placeholder="000.000.000-00"
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                />
                <button onClick={handleCpfSearch} disabled={searching}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ background: "#1d4ed8", opacity: searching ? 0.7 : 1 }}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>
              </div>
              {searchError && (
                <p className="mt-1.5 text-xs" style={{ color: "#dc2626" }}>{searchError}</p>
              )}
              {customerResult && (
                <div className="mt-2 p-3 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{customerResult.name}</p>
                  <p style={{ fontSize: 12, color: "#64748b" }}>
                    CPF: {fmtCpf(customerResult.cpf)} &nbsp;·&nbsp; Tel: {customerResult.phone ?? "—"}
                  </p>
                </div>
              )}
            </div>

            {/* ── Loja / Vendedor ─────────────────────────────────────── */}
            <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                  Loja
                </label>
                <select value={storeId ?? ""} onChange={e => setStoreId(Number(e.target.value) || null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                >
                  <option value="">Selecione...</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                  Vendedor(a)
                </label>
                <select value={employeeId ?? ""} onChange={e => setEmployeeId(Number(e.target.value) || null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                >
                  <option value="">Selecione...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>
            </div>

            {/* ── Laboratório / Nº OS Lab ─────────────────────────────── */}
            <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                  Laboratório
                </label>
                <select value={laboratoryId ?? ""} onChange={e => setLaboratoryId(Number(e.target.value) || null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                >
                  <option value="">Nenhum</option>
                  {laboratories.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                  Nº OS Laboratório
                </label>
                <input
                  value={labOsNumber}
                  onChange={e => setLabOsNumber(e.target.value)}
                  placeholder="Ex: GV-12345"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
            </div>

            {/* ── Prazo / Urgente ─────────────────────────────────────── */}
            <div className="grid gap-5 items-end" style={{ gridTemplateColumns: "1fr auto" }}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                  Prazo de Entrega
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                  onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                <input
                  type="checkbox"
                  checked={urgent}
                  onChange={e => setUrgent(e.target.checked)}
                  className="w-4 h-4 rounded accent-red-600"
                />
                <span className="text-sm font-semibold" style={{ color: urgent ? "#dc2626" : "#475569" }}>
                  Urgente
                </span>
              </label>
            </div>

            {/* ── Observações ─────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748b" }}>
                Observações
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observações do pedido..."
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
          </div>

          {/* ── Ações ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-6 pt-5" style={{ borderTop: "1px solid #f1f5f9" }}>
            <Link href={`/pedidos/${order.id}`}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border"
              style={{ borderColor: "#e2e8f0", color: "#475569" }}
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
