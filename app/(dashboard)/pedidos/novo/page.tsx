"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import {
  ArrowLeft, Flame, Search, UserPlus, User,
  MapPin, Loader2, X, Check, MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Store        { id: number; code: string; name: string }
interface Employee     { id: number; full_name: string; short_name: string | null; store_id: number | null }
interface DeliveryTime { id: number; description: string; days: number }

interface ClientResult {
  id: number
  name: string
  cpf:   string | null
  phone: string | null
}

interface ClientForm {
  // customers
  name: string; cpf: string; phone: string; phone_is_whatsapp: boolean
  // customer_addresses (nomes = colunas do banco)
  zip_code: string; street: string; number: string
  complement: string; district: string; city: string; state: string
  reference_point: string
}

interface UserProfile {
  role:       string          // 'admin' | 'manager' | 'seller' | ...
  store_id:   number | null
  employee_id: number | null
  full_name:  string
}

// ─── CEP → ViaCEP ─────────────────────────────────────────────────────────────

async function buscaCep(cep: string) {
  const c = cep.replace(/\D/g, "")
  if (c.length !== 8) return null
  try {
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`)
    const d = await r.json()
    return d.erro ? null : d
  } catch { return null }
}

// ─── Primeiro dia do mês corrente (min date para vendedor) ────────────────────

const primeiroDiaMes = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1,
).toISOString().split("T")[0]

const hoje = new Date().toISOString().split("T")[0]

const emptyClient = {
  name: "", cpf: "", phone: "", phone_is_whatsapp: false,
  zip_code: "", street: "", number: "",
  complement: "", district: "", city: "", state: "",
  reference_point: "",
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NovoPedidoPage() {

  // ── Perfil do usuário logado
  const [profile,   setProfile]   = useState<UserProfile | null>(null)

  // ── Dados de referência
  const [stores,        setStores]        = useState<Store[]>([])
  const [allEmployees,  setAllEmployees]  = useState<Employee[]>([])
  const [deliveryTimes, setDeliveryTimes] = useState<DeliveryTime[]>([])
  const [loading,       setLoading]       = useState(true)

  // ── Busca de cliente
  const [searchTerm,     setSearchTerm]     = useState("")
  const [searchResults,  setSearchResults]  = useState<ClientResult[]>([])
  const [searching,      setSearching]      = useState(false)
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null)
  const [isNewClient,    setIsNewClient]    = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // ── Formulário do cliente
  const [client, setClient] = useState<ClientForm>(emptyClient)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError,   setCepError]   = useState<string | null>(null)

  // ── Dados do pedido
  const [urgente,        setUrgente]        = useState(false)
  const [storeId,        setStoreId]        = useState<number | "">("")
  const [employeeId,     setEmployeeId]     = useState<number | "">("")
  const [deliveryTimeId, setDeliveryTimeId] = useState<number | "">("")
  const [dataCompra,     setDataCompra]     = useState(hoje)
  const [dataEntrega,    setDataEntrega]    = useState("")

  // ─── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    const sb = createSupabaseBrowserClient()
    ;(async () => {
      // Perfil do usuário atual
      const { data: { user } } = await sb.auth.getUser()
      const meta = user?.user_metadata ?? {}
      const role        = (meta.role        ?? user?.app_metadata?.role ?? "admin") as string
      const storeIdMeta = meta.store_id     ? Number(meta.store_id)     : null
      const empIdMeta   = meta.employee_id  ? Number(meta.employee_id)  : null
      const fullName    = (meta.full_name   ?? user?.email             ?? "") as string

      setProfile({ role, store_id: storeIdMeta, employee_id: empIdMeta, full_name: fullName })

      // Vendedor: pré-preenche loja e funcionário a partir do perfil
      if (role === "seller" && storeIdMeta)  setStoreId(storeIdMeta)
      if (role === "seller" && empIdMeta)    setEmployeeId(empIdMeta)

      // Carrega referências em paralelo
      const [sRes, eRes, dRes] = await Promise.all([
        sb.from("stores").select("id, code, name").eq("active", true),
        sb.from("employees").select("id, full_name, short_name, store_id").eq("active", true),
        sb.from("delivery_times").select("id, description, days").eq("active", true).order("days"),
      ])

      if (sRes.data) {
        setStores([...sRes.data].sort((a, b) =>
          (parseInt(a.code) || 0) - (parseInt(b.code) || 0),
        ) as Store[])
      }
      if (eRes.data) setAllEmployees(eRes.data as Employee[])
      if (dRes.data) setDeliveryTimes(dRes.data as DeliveryTime[])
      setLoading(false)
    })()
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

  // ─── Funcionários filtrados ─────────────────────────────────────────────────

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

      // Normaliza o termo: dígitos puros para buscar CPF com ou sem formatação
      const digits = searchTerm.replace(/\D/g, "")
      const cpfFormatado = digits.length === 11
        ? `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`
        : null

      // Monta filtros OR: nome, CPF sem formatação, CPF com formatação, telefone
      const filtros = [
        `name.ilike.%${searchTerm}%`,
        digits.length >= 3 ? `cpf.ilike.%${digits}%` : null,
        cpfFormatado       ? `cpf.ilike.%${cpfFormatado}%` : null,
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
      if (error) console.error("Busca de clientes:", error.message)
      setSearchResults((data as ClientResult[]) ?? [])
      setShowDropdown(true)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // ─── CEP auto-fill ──────────────────────────────────────────────────────────

  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, "")
    if (digits.length !== 8) return
    setCepLoading(true)
    setCepError(null)
    const d = await buscaCep(digits)
    setCepLoading(false)
    if (!d) { setCepError("CEP não encontrado"); return }
    setClient(f => ({
      ...f,
      street:   d.logradouro ?? "",
      district: d.bairro     ?? "",
      city:     d.localidade ?? "",
      state:    d.uf         ?? "",
    }))
  }

  function handleCepChange(raw: string) {
    // Formata enquanto digita: 64000-000
    const digits = raw.replace(/\D/g, "").slice(0, 8)
    const formatted = digits.length > 5
      ? `${digits.slice(0, 5)}-${digits.slice(5)}`
      : digits
    setClient(f => ({ ...f, zip_code: formatted }))
    setCepError(null)
    // Busca automática ao completar 8 dígitos
    if (digits.length === 8) lookupCep(digits)
  }

  // ─── Selecionar cliente existente ───────────────────────────────────────────

  function selectClient(c: ClientResult) {
    setSelectedClient(c)
    setIsNewClient(false)
    setShowDropdown(false)
    setSearchTerm(c.name)
    setClient(f => ({
      ...f,
      name:  c.name         ?? "",
      cpf:   c.cpf          ?? "",
      phone: c.phone        ?? "",
    }))
  }

  function clearClient() {
    setSelectedClient(null)
    setIsNewClient(false)
    setSearchTerm("")
    setSearchResults([])
    setClient(emptyClient)
  }

  // ─── Regra: CPF ou Telefone — pelo menos um obrigatório ────────────────────

  const hasCpf   = client.cpf.replace(/\D/g, "").length > 0
  const hasPhone = client.phone.replace(/\D/g, "").length > 0

  // Se não tem CPF, telefone vira obrigatório; se não tem telefone, CPF vira obrigatório
  const cpfRequired   = !hasPhone
  const phoneRequired = !hasCpf

  // ─── Helpers de UI ──────────────────────────────────────────────────────────

  const isSeller = profile?.role === "seller"

  const s0 = { borderColor: "#e2e8f0", color: "#0f172a", background: "#f8fafc" }
  const cls = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors"

  const label = (txt: string, req = false) => (
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
      style={{ color: "#64748b" }}>
      {txt} {req && <span style={{ color: "#dc2626" }}>*</span>}
    </label>
  )

  const inp = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={cls} style={s0}
      onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
      onBlur={e  => (e.target.style.borderColor = "#e2e8f0")} />
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
      <Header breadcrumbs={["Home", "Pedidos", "Novo Pedido"]} title="Novo Pedido" />

      <main className="pt-[64px] px-8 py-6 space-y-5">

        <Link href="/pedidos" className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "#64748b" }}>
          <ArrowLeft className="w-4 h-4" /> Voltar para pedidos
        </Link>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>

          {/* ══════════════════════════════════════════════════════════════════
              COLUNA 1 — DADOS DO CLIENTE
          ══════════════════════════════════════════════════════════════════ */}
          {card(
            <>
              <h2 className="font-bold mb-5" style={{ fontSize: 16, color: "#0f172a" }}>
                Dados do Cliente
              </h2>

              {/* ── Busca ──────────────────────────────────────────────── */}
              <div className="mb-5">
                {label("Buscar Cliente", true)}
                <div ref={searchRef} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#94a3b8" }} />
                  <input
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setSelectedClient(null) }}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    placeholder="Nome, CPF ou telefone..."
                    className={`${cls} pl-9 pr-9`}
                    style={s0}
                    disabled={!!selectedClient}
                  />
                  {/* Ícone direito: loading / limpar */}
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                      style={{ color: "#94a3b8" }} />
                  )}
                  {selectedClient && (
                    <button onClick={clearClient}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "#94a3b8" }}>
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Dropdown de resultados */}
                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                        className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
                        style={{ border: "1px solid #e2e8f0",
                          boxShadow: "0 8px 24px rgba(15,39,68,0.10)", background: "#fff" }}>

                        {searchResults.length === 0 ? (
                          <div className="px-4 py-3 text-sm" style={{ color: "#64748b" }}>
                            Nenhum cliente encontrado.
                          </div>
                        ) : (
                          searchResults.map(c => (
                            <button key={c.id} onClick={() => selectClient(c)}
                              className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-blue-50">
                              <User className="w-4 h-4 flex-shrink-0" style={{ color: "#1d4ed8" }} />
                              <div>
                                <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{c.name}</p>
                                <p className="text-xs" style={{ color: "#64748b" }}>
                                  {c.cpf ?? "—"} · {c.phone ?? "—"}
                                </p>
                              </div>
                            </button>
                          ))
                        )}

                        {/* Botão "Cadastrar novo" */}
                        <button
                          onClick={() => {
                            setIsNewClient(true)
                            setSelectedClient(null)
                            setShowDropdown(false)
                            setClient(f => ({ ...f, name: searchTerm }))
                          }}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                          style={{ borderTop: "1px solid #e2e8f0", color: "#1d4ed8" }}>
                          <UserPlus className="w-4 h-4" />
                          <span className="text-sm font-medium">Cadastrar como novo cliente</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Badge cliente selecionado */}
                {selectedClient && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                    <Check className="w-4 h-4" style={{ color: "#1d4ed8" }} />
                    <span className="text-sm font-medium" style={{ color: "#1d4ed8" }}>
                      {selectedClient.name}
                    </span>
                    <span className="text-xs ml-1" style={{ color: "#60a5fa" }}>
                      (cliente existente)
                    </span>
                  </div>
                )}

                {isNewClient && !selectedClient && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <UserPlus className="w-4 h-4" style={{ color: "#16a34a" }} />
                    <span className="text-sm font-medium" style={{ color: "#16a34a" }}>
                      Novo cliente — preencha os dados abaixo
                    </span>
                  </div>
                )}
              </div>

              {/* ── Dados básicos ───────────────────────────────────────── */}
              <div className="space-y-4">
                <div>
                  {label("Nome completo", true)}
                  {inp({
                    value: client.name,
                    onChange: e => setClient(f => ({ ...f, name: e.target.value })),
                    placeholder: "Nome completo do cliente",
                    readOnly: !!selectedClient,
                  })}
                </div>

                <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  {/* CPF — obrigatório quando não há telefone */}
                  <div>
                    {label("CPF", cpfRequired)}
                    {inp({
                      value: client.cpf,
                      onChange: e => setClient(f => ({ ...f, cpf: e.target.value })),
                      placeholder: "000.000.000-00",
                      readOnly: !!selectedClient,
                      required: cpfRequired,
                    })}
                    {!hasCpf && !hasPhone && (
                      <p className="mt-1 text-xs" style={{ color: "#f59e0b" }}>
                        Obrigatório na ausência de telefone
                      </p>
                    )}
                  </div>

                  {/* Telefone — obrigatório quando não há CPF */}
                  <div>
                    {label("Telefone", phoneRequired)}
                    {inp({
                      value: client.phone,
                      onChange: e => setClient(f => ({ ...f, phone: e.target.value })),
                      placeholder: "(86) 99999-9999",
                      readOnly: !!selectedClient,
                      required: phoneRequired,
                    })}
                    {!hasCpf && !hasPhone && (
                      <p className="mt-1 text-xs" style={{ color: "#f59e0b" }}>
                        Obrigatório na ausência de CPF
                      </p>
                    )}
                    {/* WhatsApp flag */}
                    {hasPhone && (
                      <button
                        type="button"
                        onClick={() => setClient(f => ({ ...f, phone_is_whatsapp: !f.phone_is_whatsapp }))}
                        className="mt-1.5 flex items-center gap-1.5 text-xs transition-colors"
                        style={{ color: client.phone_is_whatsapp ? "#16a34a" : "#94a3b8" }}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{client.phone_is_whatsapp ? "WhatsApp ✓" : "É WhatsApp?"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Endereço (só para novos clientes ou cliente selecionado) ─── */}
                {(isNewClient || selectedClient) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="space-y-4 pt-1">

                    <div className="flex items-center gap-2 pt-1">
                      <MapPin className="w-4 h-4" style={{ color: "#64748b" }} />
                      <span className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#64748b" }}>Endereço</span>
                      <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
                    </div>

                    {/* CEP */}
                    <div>
                      {label("CEP", true)}
                      <div className="relative">
                        <input
                          value={client.zip_code}
                          onChange={e => handleCepChange(e.target.value)}
                          placeholder="64000-000"
                          maxLength={9}
                          required
                          className={cls}
                          style={s0}
                          onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                          onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                          inputMode="numeric"
                        />
                        {cepLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                            style={{ color: "#94a3b8" }} />
                        )}
                      </div>
                      {cepError && (
                        <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{cepError}</p>
                      )}
                    </div>

                    {/* Logradouro + Número */}
                    <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 100px" }}>
                      <div>
                        {label("Logradouro", true)}
                        {inp({
                          value: client.street,
                          onChange: e => setClient(f => ({ ...f, street: e.target.value })),
                          placeholder: "Rua, Av., Travessa...",
                          required: true,
                        })}
                      </div>
                      <div>
                        {label("Nº", true)}
                        {inp({
                          value: client.number,
                          onChange: e => setClient(f => ({ ...f, number: e.target.value })),
                          placeholder: "123",
                          required: true,
                        })}
                      </div>
                    </div>

                    {/* Complemento */}
                    <div>
                      {label("Complemento")}
                      {inp({
                        value: client.complement,
                        onChange: e => setClient(f => ({ ...f, complement: e.target.value })),
                        placeholder: "Apto, Bloco, Casa...",
                      })}
                    </div>

                    {/* Bairro */}
                    <div>
                      {label("Bairro", true)}
                      {inp({
                        value: client.district,
                        onChange: e => setClient(f => ({ ...f, district: e.target.value })),
                        placeholder: "Bairro",
                        required: true,
                      })}
                    </div>

                    {/* Cidade + UF */}
                    <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 80px" }}>
                      <div>
                        {label("Cidade", true)}
                        {inp({
                          value: client.city,
                          onChange: e => setClient(f => ({ ...f, city: e.target.value })),
                          placeholder: "Teresina",
                          required: true,
                        })}
                      </div>
                      <div>
                        {label("UF", true)}
                        {inp({
                          value: client.state,
                          onChange: e => setClient(f => ({ ...f, state: e.target.value })),
                          placeholder: "PI",
                          maxLength: 2,
                          required: true,
                        })}
                      </div>
                    </div>

                    {/* Ponto de Referência */}
                    <div>
                      {label("Ponto de Referência")}
                      {inp({
                        value: client.reference_point,
                        onChange: e => setClient(f => ({ ...f, reference_point: e.target.value })),
                        placeholder: "Ex: Próximo ao Supermercado X, portão azul...",
                      })}
                    </div>

                  </motion.div>
                )}

              </div>
            </>,
            0,
          )}

          {/* ══════════════════════════════════════════════════════════════════
              COLUNA 2 — DADOS DO PEDIDO
          ══════════════════════════════════════════════════════════════════ */}
          {card(
            <>
              <h2 className="font-bold mb-5" style={{ fontSize: 16, color: "#0f172a" }}>
                Dados do Pedido
              </h2>

              <div className="space-y-4">

                {/* ── Loja ──────────────────────────────────────────────── */}
                <div>
                  {label("Loja", true)}
                  {isSeller && profile?.store_id ? (
                    // Vendedor: exibe apenas o nome da loja (read-only)
                    <div className={cls} style={{ ...s0, color: "#475569" }}>
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

                {/* ── Vendedor ──────────────────────────────────────────── */}
                <div>
                  {label("Vendedor", true)}
                  {isSeller && profile?.employee_id ? (
                    // Vendedor: exibe seu próprio nome (read-only)
                    <div className={cls} style={{ ...s0, color: "#475569" }}>
                      {allEmployees.find(e => e.id === profile.employee_id)?.short_name
                        ?? allEmployees.find(e => e.id === profile.employee_id)?.full_name
                        ?? profile.full_name}
                    </div>
                  ) : (
                    sel({
                      value: employeeId,
                      onChange: e => setEmployeeId(e.target.value ? Number(e.target.value) : ""),
                      disabled: loading || !storeId,
                      style: {
                        ...s0,
                        color: !storeId && !loading ? "#94a3b8" : "#0f172a",
                      },
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

                {/* ── Prazo de Entrega ──────────────────────────────────── */}
                <div>
                  {label("Prazo de Entrega", true)}
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

                {/* ── Data da Compra ────────────────────────────────────── */}
                <div>
                  {label("Data da Compra", true)}
                  <input
                    type="date"
                    className={cls}
                    style={s0}
                    value={dataCompra}
                    min={isSeller ? primeiroDiaMes : undefined}
                    max={isSeller ? hoje : undefined}
                    onChange={e => setDataCompra(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                  />
                  {isSeller && (
                    <p className="mt-1 text-xs" style={{ color: "#94a3b8" }}>
                      Permitido apenas no mês atual
                    </p>
                  )}
                </div>

                {/* ── Data Prevista de Entrega ──────────────────────────── */}
                <div>
                  {label("Data Prevista de Entrega")}
                  <input
                    type="date"
                    className={cls}
                    style={s0}
                    value={dataEntrega}
                    min={dataCompra || hoje}
                    onChange={e => setDataEntrega(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                {/* ── Urgente ───────────────────────────────────────────── */}
                <div>
                  {label("Pedido Urgente")}
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
                        style={{ color: urgente ? "#dc2626" : "#475569" }}>
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

        {/* ── Rodapé ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="flex items-center justify-end gap-4 py-2"
        >
          <Link href="/pedidos" className="text-sm" style={{ color: "#64748b" }}>
            Cancelar
          </Link>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.25)" }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#0f2744" }}
          >
            Cadastrar Pedido
          </motion.button>
        </motion.div>

      </main>
    </>
  )
}
