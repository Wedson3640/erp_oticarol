"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import {
  ArrowLeft, Flame, Search, UserPlus, User,
  Loader2, X, Check, AlertTriangle, ExternalLink,
  Clock, ShoppingBag,
} from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface StoreOption  { id: number; code: string; name: string }
interface Employee     { id: number; full_name: string; short_name: string | null; store_id: number | null }
interface DeliveryTime { id: number; description: string; days: number }

interface ClientResult {
  id:    number
  name:  string
  cpf:   string | null
  phone: string | null
}

// Item unificado: pedido + garantia + solicitação
interface UnifiedHistoryItem {
  id:            number
  type:          "pedido" | "garantia" | "solicitacao"
  reference:     string        // OS "8519/17635" | "Garantia" | service_type
  situation:     string
  date:          string | null // purchase_date / request_date / created_at
  store_id:      number | null
  urgent:        boolean
}

interface UserProfile {
  role:        string
  store_id:    number | null
  employee_id: number | null
  full_name:   string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const primeiroDiaMes = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1,
).toISOString().split("T")[0]

const hoje = new Date().toISOString().split("T")[0]

// ─── Validação matemática de CPF (dígitos verificadores) ─────────────────────

function validarCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "")
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false          // "11111111111" etc.
  let sum = 0
  for (let i = 0; i < 9; i++) sum += +d[i] * (10 - i)
  let r = (sum * 10) % 11; if (r >= 10) r = 0
  if (r !== +d[9]) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += +d[i] * (11 - i)
  r = (sum * 10) % 11; if (r >= 10) r = 0
  return r === +d[10]
}

function mascaraCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

// ─── Badge de situação ────────────────────────────────────────────────────────

const SIT_COLORS: Record<string, { bg: string; text: string }> = {
  "Compras":      { bg: "#eff6ff", text: "#1d4ed8" },
  "Laboratório":  { bg: "#f3e8ff", text: "#7c3aed" },
  "Conferência":  { bg: "#fefce8", text: "#a16207" },
  "Pronto":       { bg: "#f0fdf4", text: "#16a34a" },
  "Entregue":     { bg: "#f1f5f9", text: "#475569" },
  "Cancelado":    { bg: "#fef2f2", text: "#dc2626" },
  "Garantia":     { bg: "#fff7ed", text: "#c2410c" },
  "Transporte":   { bg: "#ecfeff", text: "#0e7490" },
  "Solicitação":  { bg: "#fdf4ff", text: "#86198f" },
}

function SitBadge({ situation, urgent }: { situation: string; urgent?: boolean }) {
  const c = SIT_COLORS[situation] ?? { bg: "#f1f5f9", text: "#475569" }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {urgent && <Flame className="w-3 h-3" />}
      {situation}
    </span>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

function NovoPedidoPageInner() {

  const router       = useRouter()
  const searchParams = useSearchParams()

  // ── Perfil do usuário logado
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // ── Dados de referência
  const [stores,        setStores]        = useState<StoreOption[]>([])
  const [allEmployees,  setAllEmployees]  = useState<Employee[]>([])
  const [deliveryTimes, setDeliveryTimes] = useState<DeliveryTime[]>([])
  const [loading,       setLoading]       = useState(true)

  // ── Busca de cliente
  const [searchTerm,     setSearchTerm]     = useState("")
  const [searchResults,  setSearchResults]  = useState<ClientResult[]>([])
  const [searching,      setSearching]      = useState(false)
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null)
  const [searchedOnce,   setSearchedOnce]   = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // ── CPF do cliente (obrigatório no pedido)
  const [clienteCpf,  setClienteCpf]  = useState("")
  const [cpfError,    setCpfError]    = useState<string | null>(null)

  // ── Histórico unificado do cliente (pedidos + garantias + solicitações)
  const [clientHistory,  setClientHistory]  = useState<UnifiedHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // ── Dados do pedido
  const [urgente,        setUrgente]        = useState(false)
  const [storeId,        setStoreId]        = useState<number | "">("")
  const [employeeId,     setEmployeeId]     = useState<number | "">("")
  const [deliveryTimeId, setDeliveryTimeId] = useState<number | "">("")
  const [dataCompra,     setDataCompra]     = useState(hoje)
  const [dataEntrega,    setDataEntrega]    = useState("")
  const [osNumero,       setOsNumero]       = useState("")   // Ordem (Shop9)
  const [osSequencia,    setOsSequencia]    = useState("")   // Sequência (Shop9)

  // ── Submissão
  const [saving,     setSaving]     = useState(false)
  const [savingStep, setSavingStep] = useState("")
  const [error,      setError]      = useState<string | null>(null)

  // ─── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    const sb = createSupabaseBrowserClient()
    ;(async () => {
      // Perfil do usuário atual
      const { data: { user } } = await sb.auth.getUser()
      const meta        = user?.user_metadata ?? {}
      const role        = (meta.role       ?? user?.app_metadata?.role ?? "admin") as string
      const storeIdMeta = meta.store_id    ? Number(meta.store_id)    : null
      const empIdMeta   = meta.employee_id ? Number(meta.employee_id) : null
      const fullName    = (meta.full_name  ?? user?.email             ?? "") as string

      setProfile({ role, store_id: storeIdMeta, employee_id: empIdMeta, full_name: fullName })

      if (role === "seller" && storeIdMeta) setStoreId(storeIdMeta)
      if (role === "seller" && empIdMeta)   setEmployeeId(empIdMeta)

      const [sRes, eRes, dRes] = await Promise.all([
        sb.from("stores").select("id, code, name").eq("active", true),
        sb.from("employees").select("id, full_name, short_name, store_id").eq("active", true),
        sb.from("delivery_times").select("id, description, days").eq("active", true).order("days"),
      ])

      if (sRes.data) setStores([...sRes.data].sort((a, b) =>
        (parseInt(a.code) || 0) - (parseInt(b.code) || 0),
      ) as StoreOption[])
      if (eRes.data) setAllEmployees(eRes.data as Employee[])
      if (dRes.data) setDeliveryTimes(dRes.data as DeliveryTime[])
      setLoading(false)

      // Auto-seleciona cliente vindo de /clientes/novo?retornar=pedidos/novo
      const clienteId = searchParams.get("cliente")
      if (clienteId) {
        const { data: c } = await sb
          .from("customers")
          .select("id, name, cpf, phone")
          .eq("id", Number(clienteId))
          .single()
        if (c) {
          setSelectedClient(c as ClientResult)
          setSearchTerm(c.name)
        }
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  // ─── Histórico unificado do cliente (pedidos + garantias + solicitações) ───────

  useEffect(() => {
    if (!selectedClient) { setClientHistory([]); return }
    setLoadingHistory(true)
    const sb = createSupabaseBrowserClient()

    Promise.all([
      // Pedidos — join por customer_id
      sb.from("service_orders")
        .select("id, os_number, os_sequence, situation, purchase_date, store_id, urgent")
        .eq("customer_id", selectedClient.id)
        .is("deleted_at", null)
        .order("id", { ascending: false })
        .limit(20),

      // Garantias — sem customer_id na tabela; busca por nome
      sb.from("warranties")
        .select("id, situation, request_date, store_id, urgent")
        .eq("customer_name", selectedClient.name)
        .is("deleted_at", null)
        .order("id", { ascending: false })
        .limit(20),

      // Solicitações — join por customer_id (sem campo urgent)
      sb.from("requests")
        .select("id, service_type, situation, created_at, store_id")
        .eq("customer_id", selectedClient.id)
        .is("deleted_at", null)
        .order("id", { ascending: false })
        .limit(20),
    ]).then(([ordRes, warRes, reqRes]) => {
      const items: UnifiedHistoryItem[] = [
        ...(ordRes.data ?? []).map((o: { id: number; os_number: string; os_sequence: string | null; situation: string; purchase_date: string | null; store_id: number | null; urgent: boolean }) => ({
          id:        o.id,
          type:      "pedido"    as const,
          reference: o.os_sequence ? `${o.os_number}/${o.os_sequence}` : o.os_number,
          situation: o.situation ?? "—",
          date:      o.purchase_date,
          store_id:  o.store_id,
          urgent:    o.urgent,
        })),
        ...(warRes.data ?? []).map((w: { id: number; situation: string | null; request_date: string | null; store_id: number | null; urgent: boolean }) => ({
          id:        w.id,
          type:      "garantia"  as const,
          reference: `Garantia #${w.id}`,
          situation: w.situation ?? "—",
          date:      w.request_date,
          store_id:  w.store_id,
          urgent:    w.urgent,
        })),
        ...(reqRes.data ?? []).map((r: { id: number; service_type: string; situation: string; created_at: string; store_id: number | null }) => ({
          id:        r.id,
          type:      "solicitacao" as const,
          reference: r.service_type ?? `Serviço #${r.id}`,
          situation: r.situation ?? "—",
          date:      r.created_at?.split("T")[0] ?? null,
          store_id:  r.store_id,
          urgent:    false, // requests não têm campo urgent
        })),
      ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))

      setClientHistory(items)
      setLoadingHistory(false)
    })
  }, [selectedClient])

  // ─── Funcionários filtrados por loja ────────────────────────────────────────

  const employees = storeId
    ? allEmployees
        .filter(e => e.store_id === Number(storeId))
        .sort((a, b) =>
          (a.short_name ?? a.full_name).toLowerCase()
            .localeCompare((b.short_name ?? b.full_name).toLowerCase(), "pt-BR"),
        )
    : []

  // ─── Busca de cliente com debounce ──────────────────────────────────────────

  useEffect(() => {
    if (searchTerm.length < 3) { setSearchResults([]); setShowDropdown(false); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const sb = createSupabaseBrowserClient()

      // Busca apenas por nome e telefone — CPF removido
      // (CPF tem problemas de qualidade nos dados históricos; coletado separado no formulário)
      const digits  = searchTerm.replace(/\D/g, "")
      const filtros = [
        `name.ilike.%${searchTerm}%`,
        `phone.ilike.%${searchTerm}%`,
        digits.length >= 3 ? `phone.ilike.%${digits}%` : null,
      ].filter(Boolean).join(",")

      const { data, error } = await sb
        .from("customers")
        .select("id, name, cpf, phone")
        .is("deleted_at", null)
        .or(filtros)
        .order("name")
        .limit(8)

      setSearching(false)
      setSearchedOnce(true)
      if (error) console.error("Busca de clientes:", error.message)
      setSearchResults((data as ClientResult[]) ?? [])
      setShowDropdown(true)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // ─── Selecionar / limpar cliente ────────────────────────────────────────────

  function selectClient(c: ClientResult) {
    setSelectedClient(c)
    setShowDropdown(false)
    setSearchTerm(c.name)
    setClienteCpf(c.cpf ? mascaraCpf(c.cpf) : "")
    setCpfError(null)
  }

  function clearClient() {
    setSelectedClient(null)
    setSearchTerm("")
    setSearchResults([])
    setSearchedOnce(false)
    setClienteCpf("")
    setCpfError(null)
  }

  // ─── Submissão ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!selectedClient) {
      setError("Selecione um cliente.")
      return
    }
    if (!storeId) {
      setError("Selecione a loja.")
      return
    }
    if (!employeeId) {
      setError("Selecione o vendedor.")
      return
    }
    if (!osNumero.trim()) {
      setError("Informe o número da Ordem (Shop9).")
      return
    }
    if (!osSequencia.trim()) {
      setError("Informe a Sequência (Shop9).")
      return
    }

    // Valida CPF
    const cpfDigits = clienteCpf.replace(/\D/g, "")
    if (!cpfDigits) {
      setError("Informe o CPF do cliente.")
      return
    }
    if (!validarCpf(cpfDigits)) {
      setError("CPF inválido — verifique os dígitos.")
      return
    }

    setSaving(true)
    setError(null)
    const sb = createSupabaseBrowserClient()

    // 1. Calcula data de entrega prevista
    let scheduledDelivery: string | null = dataEntrega || null
    if (!scheduledDelivery && deliveryTimeId) {
      const dt = deliveryTimes.find(d => d.id === Number(deliveryTimeId))
      if (dt) {
        const base = new Date(`${dataCompra}T12:00:00`)
        base.setDate(base.getDate() + dt.days)
        scheduledDelivery = base.toISOString().split("T")[0]
      }
    }

    // 2. Nome do funcionário (denormalizado)
    const emp = allEmployees.find(e => e.id === Number(employeeId))
    const employeeName = emp?.short_name ?? emp?.full_name ?? null

    // 3. Cria o pedido
    setSavingStep("Cadastrando pedido...")
    const { data: newOrder, error: orderErr } = await sb
      .from("service_orders")
      .insert({
        os_number:          osNumero.trim(),
        os_sequence:        osSequencia.trim(),
        customer_id:        selectedClient.id,
        customer_name:      selectedClient.name,
        store_id:           Number(storeId),
        employee_id:        Number(employeeId),
        employee_name:      employeeName,
        purchase_date:      dataCompra || null,
        scheduled_delivery: scheduledDelivery,
        urgent:             urgente,
        situation:          "Compras",
        source:             "app",
      })
      .select("id").single()

    if (orderErr || !newOrder) {
      setError("Erro ao criar pedido: " + (orderErr?.message ?? "falha desconhecida"))
      setSaving(false)
      return
    }

    // 4. Salva CPF no cliente se foi inserido ou corrigido
    const cpfFormatado = mascaraCpf(cpfDigits)
    if (cpfFormatado !== selectedClient.cpf) {
      setSavingStep("Atualizando CPF do cliente...")
      await sb.from("customers").update({ cpf: cpfFormatado }).eq("id", selectedClient.id)
    }

    // 5. Registra histórico inicial
    setSavingStep("Registrando histórico...")
    await sb.from("service_order_histories").insert({
      service_order_id: newOrder.id,
      situation:        "Compras",
      operator_name:    profile?.full_name ?? null,
    })

    router.push(`/pedidos/${newOrder.id}`)
  }

  // ─── Helpers de UI ──────────────────────────────────────────────────────────

  const isSeller = profile?.role === "seller"

  const s0  = { borderColor: "#e2e8f0", color: "#121212", background: "#f8fafc" }
  const cls = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors"

  const lbl = (txt: string, req = false) => (
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
      style={{ color: "#556376" }}>
      {txt}{req && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
  )

  const sel = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className={cls} style={s0}
      onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
      onBlur={e  => (e.target.style.borderColor = "#e2e8f0")} />
  )

  const card = (children: React.ReactNode, delay = 0) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ background: "#fff", borderRadius: 16, padding: 28,
        border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)" }}>
      {children}
    </motion.div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Overlay de carregamento ─────────────────────────────────────── */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(15,39,68,0.45)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 px-10 py-8 rounded-2xl"
              style={{ background: "#fff", boxShadow: "0 20px 60px rgba(15,39,68,0.25)" }}
            >
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#0f2744" }} />
              <p className="text-sm font-semibold" style={{ color: "#121212" }}>
                {savingStep || "Processando..."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Header breadcrumbs={["Home", "Pedidos", "Novo Pedido"]} title="Novo Pedido" />

      <main className="pt-[64px] px-8 py-6 space-y-5">

        <Link href="/pedidos" className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#556376" }}>
          <ArrowLeft className="w-4 h-4" /> Voltar para pedidos
        </Link>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>

          {/* ══ COLUNA 1 — CLIENTE ══════════════════════════════════════════ */}
          {card(
            <>
              <h2 className="font-bold mb-5" style={{ fontSize: 16, color: "#121212" }}>
                Buscar Cliente
              </h2>

              {/* Busca */}
              <div ref={searchRef} className="relative mb-4">
                {lbl("Nome, CPF ou telefone", true)}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#7e8b9c" }} />
                  <input
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); if (selectedClient) clearClient() }}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    placeholder="Digite para buscar..."
                    className={`${cls} pl-9 pr-9`}
                    style={s0}
                    disabled={!!selectedClient}
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                      style={{ color: "#7e8b9c" }} />
                  )}
                  {selectedClient && (
                    <button onClick={clearClient}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "#7e8b9c" }}>
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Dropdown */}
                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                        className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
                        style={{ border: "1px solid #e2e8f0",
                          boxShadow: "0 8px 24px rgba(15,39,68,0.10)", background: "#fff" }}>
                        {searchResults.length === 0 ? (
                          <div className="px-4 py-3 text-sm" style={{ color: "#556376" }}>
                            Nenhum cliente encontrado.
                          </div>
                        ) : (
                          searchResults.map(c => (
                            <button key={c.id} onClick={() => selectClient(c)}
                              className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-blue-50">
                              <User className="w-4 h-4 flex-shrink-0" style={{ color: "#1d4ed8" }} />
                              <div>
                                <p className="text-sm font-medium" style={{ color: "#121212" }}>{c.name}</p>
                                <p className="text-xs" style={{ color: "#556376" }}>
                                  {c.cpf ?? "Sem CPF"} · {c.phone ?? "Sem telefone"}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Cliente selecionado */}
              {selectedClient && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl space-y-3"
                  style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: "#1d4ed8" }} />
                    <span className="text-sm font-semibold" style={{ color: "#1d4ed8" }}>
                      Cliente selecionado
                    </span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "#121212" }}>
                    {selectedClient.name}
                  </p>
                  <p className="text-xs" style={{ color: "#556376" }}>
                    {selectedClient.phone ?? "Sem telefone"}
                  </p>

                  {/* CPF — obrigatório */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1"
                      style={{ color: "#1d4ed8" }}>
                      CPF <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      value={clienteCpf}
                      onChange={e => {
                        const v = mascaraCpf(e.target.value)
                        setClienteCpf(v)
                        const d = v.replace(/\D/g, "")
                        if (d.length === 11) {
                          setCpfError(validarCpf(d) ? null : "CPF inválido — verifique os dígitos")
                        } else {
                          setCpfError(null)
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none transition-colors font-mono"
                      style={{
                        background: "#fff",
                        borderColor: cpfError ? "#dc2626" : clienteCpf.replace(/\D/g,"").length === 11 && !cpfError ? "#16a34a" : "#bfdbfe",
                        color: "#121212",
                      }}
                    />
                    {cpfError && (
                      <p className="mt-1 text-xs flex items-center gap-1" style={{ color: "#dc2626" }}>
                        <AlertTriangle className="w-3 h-3" /> {cpfError}
                      </p>
                    )}
                    {!cpfError && clienteCpf.replace(/\D/g,"").length === 11 && (
                      <p className="mt-1 text-xs flex items-center gap-1" style={{ color: "#16a34a" }}>
                        <Check className="w-3 h-3" /> CPF válido
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Não encontrado → botão cadastrar */}
              {searchedOnce && searchResults.length === 0 && !selectedClient && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mt-3 p-4 rounded-xl"
                  style={{ background: "#fafafa", border: "1px dashed #cbd5e1" }}>
                  <p className="text-sm mb-3" style={{ color: "#556376" }}>
                    Cliente não encontrado na base.
                  </p>
                  <Link
                    href={`/clientes/novo?retornar=pedidos/novo`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                    style={{ background: "#1d4ed8" }}
                  >
                    <UserPlus className="w-4 h-4" />
                    Cadastrar Novo Cliente
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </Link>
                </motion.div>
              )}
            </>,
            0,
          )}

          {/* ══ COLUNA 2 — DADOS DO PEDIDO ══════════════════════════════════ */}
          {card(
            <>
              <h2 className="font-bold mb-5" style={{ fontSize: 16, color: "#121212" }}>
                Dados do Pedido
              </h2>

              <div className="space-y-4">

                {/* Ordem e Sequência (Shop9) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {lbl("Ordem (Shop9)", true)}
                    <input
                      type="text"
                      inputMode="numeric"
                      className={cls} style={s0}
                      placeholder="Ex: 8519"
                      maxLength={10}
                      value={osNumero}
                      onChange={e => setOsNumero(e.target.value.replace(/\D/g, ""))}
                      onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                      onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>
                  <div>
                    {lbl("Sequência (Shop9)", true)}
                    <input
                      type="text"
                      inputMode="numeric"
                      className={cls} style={s0}
                      placeholder="Ex: 17635"
                      maxLength={10}
                      value={osSequencia}
                      onChange={e => setOsSequencia(e.target.value.replace(/\D/g, ""))}
                      onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                      onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>
                </div>

                {/* Loja */}
                <div>
                  {lbl("Loja", true)}
                  {isSeller && profile?.store_id ? (
                    <div className={cls} style={{ ...s0, color: "#3c4859" }}>
                      {stores.find(s => s.id === profile.store_id)?.name ?? "—"}
                    </div>
                  ) : (
                    sel({
                      value: storeId,
                      onChange: e => {
                        setStoreId(e.target.value ? Number(e.target.value) : "")
                        setEmployeeId("")
                      },
                      disabled: loading,
                      children: (
                        <>
                          <option value="">{loading ? "Carregando..." : "Selecione a loja..."}</option>
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                          ))}
                        </>
                      ),
                    })
                  )}
                </div>

                {/* Vendedor */}
                <div>
                  {lbl("Vendedor", true)}
                  {isSeller && profile?.employee_id ? (
                    <div className={cls} style={{ ...s0, color: "#3c4859" }}>
                      {allEmployees.find(e => e.id === profile.employee_id)?.short_name
                        ?? allEmployees.find(e => e.id === profile.employee_id)?.full_name
                        ?? profile.full_name}
                    </div>
                  ) : (
                    sel({
                      value: employeeId,
                      onChange: e => setEmployeeId(e.target.value ? Number(e.target.value) : ""),
                      disabled: loading || !storeId,
                      style: { ...s0, color: !storeId && !loading ? "#7e8b9c" : "#121212" },
                      children: (
                        <>
                          <option value="">
                            {loading ? "Carregando..." : !storeId
                              ? "Selecione a loja primeiro..."
                              : employees.length === 0
                                ? "Nenhum vendedor nesta loja"
                                : "Selecione o vendedor..."}
                          </option>
                          {employees.map(e => (
                            <option key={e.id} value={e.id}>
                              {e.short_name ?? e.full_name}
                            </option>
                          ))}
                        </>
                      ),
                    })
                  )}
                </div>

                {/* Prazo de Entrega */}
                <div>
                  {lbl("Prazo de Entrega")}
                  {sel({
                    value: deliveryTimeId,
                    onChange: e => setDeliveryTimeId(e.target.value ? Number(e.target.value) : ""),
                    disabled: loading,
                    children: (
                      <>
                        <option value="">{loading ? "Carregando..." : "Selecione o prazo..."}</option>
                        {deliveryTimes.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.description} ({d.days} {d.days === 1 ? "dia" : "dias"})
                          </option>
                        ))}
                      </>
                    ),
                  })}
                </div>

                {/* Data da Compra */}
                <div>
                  {lbl("Data da Compra", true)}
                  <input
                    type="date"
                    className={cls} style={s0}
                    value={dataCompra}
                    min={isSeller ? primeiroDiaMes : undefined}
                    max={isSeller ? hoje           : undefined}
                    onChange={e => setDataCompra(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                  />
                  {isSeller && (
                    <p className="mt-1 text-xs" style={{ color: "#7e8b9c" }}>
                      Permitido apenas no mês atual
                    </p>
                  )}
                </div>

                {/* Data Prevista de Entrega */}
                <div>
                  {lbl("Data Prevista de Entrega")}
                  <input
                    type="date"
                    className={cls} style={s0}
                    value={dataEntrega}
                    min={dataCompra || hoje}
                    onChange={e => setDataEntrega(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                {/* Urgente */}
                <div>
                  {lbl("Pedido Urgente")}
                  <button
                    type="button"
                    onClick={() => setUrgente(!urgente)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all w-full"
                    style={{
                      background:  urgente ? "#FEF2F2" : "#f8fafc",
                      borderColor: urgente ? "#FECACA" : "#e2e8f0",
                    }}
                  >
                    <div className="w-10 h-6 rounded-full transition-colors relative"
                      style={{ background: urgente ? "#dc2626" : "#e2e8f0" }}>
                      <div
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                        style={{ transform: urgente ? "translateX(20px)" : "translateX(4px)" }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {urgente && <Flame className="w-4 h-4" style={{ color: "#dc2626" }} />}
                      <span className="text-sm font-medium"
                        style={{ color: urgente ? "#dc2626" : "#3c4859" }}>
                        {urgente ? "Pedido marcado como urgente" : "Marcar como urgente"}
                      </span>
                    </div>
                  </button>
                </div>

              </div>
            </>,
            0.05,
          )}

        </div>

        {/* ══ HISTÓRICO DO CLIENTE ══════════════════════════════════════════════ */}
        <AnimatePresence>
          {selectedClient && (
            <motion.div
              key="historico-cliente"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                background: "#fff", borderRadius: 16, padding: 28,
                border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(15,39,68,0.05)",
              }}
            >
              {/* Cabeçalho */}
              <div className="flex items-center gap-3 mb-5">
                <Clock className="w-5 h-5 flex-shrink-0" style={{ color: "#1d4ed8" }} />
                <h2 className="font-bold" style={{ fontSize: 16, color: "#121212" }}>
                  Histórico do Cliente
                </h2>
                {!loadingHistory && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: "#eff6ff", color: "#1d4ed8" }}
                  >
                    {clientHistory.length} {clientHistory.length === 1 ? "registro" : "registros"}
                  </span>
                )}
              </div>

              {/* Loading */}
              {loadingHistory && (
                <div className="flex items-center gap-2 py-4" style={{ color: "#7e8b9c" }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Carregando histórico...</span>
                </div>
              )}

              {/* Sem registros */}
              {!loadingHistory && clientHistory.length === 0 && (
                <div className="py-6 flex flex-col items-center gap-2">
                  <ShoppingBag className="w-9 h-9" style={{ color: "#cbd5e1" }} />
                  <p className="text-sm" style={{ color: "#7e8b9c" }}>
                    Nenhum registro encontrado para este cliente.
                  </p>
                </div>
              )}

              {/* Tabela */}
              {!loadingHistory && clientHistory.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                        {["Tipo", "Referência", "Data", "Loja", "Situação", ""].map(h => (
                          <th key={h} className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wide pr-4"
                            style={{ color: "#556376" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clientHistory.map((h, i) => {
                        const typeStyle = {
                          pedido:      { bg: "#eff6ff", text: "#1d4ed8", label: "Pedido"    },
                          garantia:    { bg: "#fff7ed", text: "#c2410c", label: "Garantia"  },
                          solicitacao: { bg: "#fdf4ff", text: "#7e22ce", label: "Serviço"   },
                        }[h.type]
                        const href = h.type === "pedido"
                          ? `/pedidos/${h.id}`
                          : h.type === "garantia"
                            ? `/garantias/${h.id}`
                            : `/solicitacoes/${h.id}`
                        return (
                          <tr
                            key={`${h.type}-${h.id}`}
                            className="transition-colors hover:bg-slate-50"
                            style={{ borderBottom: i < clientHistory.length - 1 ? "1px solid #f1f5f9" : "none" }}
                          >
                            {/* Tipo */}
                            <td className="py-2.5 pr-4">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ background: typeStyle.bg, color: typeStyle.text }}>
                                {typeStyle.label}
                              </span>
                            </td>

                            {/* Referência */}
                            <td className="py-2.5 pr-4">
                              <span className="font-mono font-medium text-sm" style={{ color: "#121212" }}>
                                {h.reference}
                              </span>
                            </td>

                            {/* Data */}
                            <td className="py-2.5 pr-4 text-sm" style={{ color: "#3c4859" }}>
                              {h.date
                                ? new Date(h.date + "T12:00:00").toLocaleDateString("pt-BR")
                                : "—"}
                            </td>

                            {/* Loja */}
                            <td className="py-2.5 pr-4 text-sm" style={{ color: "#3c4859" }}>
                              {stores.find(s => s.id === h.store_id)?.name ?? "—"}
                            </td>

                            {/* Situação */}
                            <td className="py-2.5 pr-4">
                              <SitBadge situation={h.situation} urgent={h.urgent} />
                            </td>

                            {/* Link */}
                            <td className="py-2.5">
                              <Link href={href}
                                className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
                                style={{ color: "#1d4ed8" }}>
                                Ver
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rodapé */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-4 py-2">
            <Link href="/pedidos" className="text-sm" style={{ color: "#556376" }}>
              Cancelar
            </Link>
            <motion.button
              whileHover={{ scale: saving ? 1 : 1.02, boxShadow: saving ? "none" : "0 4px 16px rgba(15,39,68,0.25)" }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#0f2744", opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Salvando..." : "Cadastrar Pedido"}
            </motion.button>
          </div>
        </motion.div>

      </main>
    </>
  )
}

export default function NovoPedidoPage() {
  return (
    <Suspense fallback={null}>
      <NovoPedidoPageInner />
    </Suspense>
  )
}
