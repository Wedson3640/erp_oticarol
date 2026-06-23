"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import {
  ArrowLeft, Search, User, X, Check, Loader2, AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ClientResult {
  id:    number
  name:  string
  cpf:   string | null
  phone: string | null
}

interface StoreOption    { id: number; code: string; name: string }
interface EmployeeOption { id: number; full_name: string; short_name: string | null; store_id: number | null }

// Serviços disponíveis (PHP TB_Solicitation_Services)
const SERVICOS = ["Ajustes", "Aplique", "Copiar grau", "Montagem", "Transposição"]

// Tipos de armação (frame_type)
const TIPOS_ARMACAO = ["Completa", "Fio de nylon", "Parafusada", "Sem aro"]

// Situação inicial de uma nova solicitação
const SITUACAO_INICIAL = "Recebido no laboratório"

const hoje = new Date().toISOString().split("T")[0]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NovaSolicitacaoPage() {

  const router = useRouter()

  // ── Referências
  const [stores,       setStores]       = useState<StoreOption[]>([])
  const [allEmployees, setAllEmployees] = useState<EmployeeOption[]>([])
  const [loadingRef,   setLoadingRef]   = useState(true)

  // ── Busca de cliente
  const [searchTerm,     setSearchTerm]     = useState("")
  const [searchResults,  setSearchResults]  = useState<ClientResult[]>([])
  const [searching,      setSearching]      = useState(false)
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // ── Formulário
  const [storeId,      setStoreId]      = useState<number | "">("")
  const [employeeId,   setEmployeeId]   = useState<number | "">("")
  const [serviceType,  setServiceType]  = useState("")
  const [frameType,    setFrameType]    = useState("")
  const [frameModel,   setFrameModel]   = useState("")
  const [dataEntrega,  setDataEntrega]  = useState("")
  const [notes,        setNotes]        = useState("")

  // ── Submissão
  const [saving,     setSaving]     = useState(false)
  const [savingStep, setSavingStep] = useState("")
  const [error,      setError]      = useState<string | null>(null)

  // ─── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    const sb = createSupabaseBrowserClient()
    Promise.all([
      sb.from("stores").select("id, code, name").eq("active", true),
      sb.from("employees").select("id, full_name, short_name, store_id").eq("active", true),
    ]).then(([sRes, eRes]) => {
      if (sRes.data) setStores(
        [...sRes.data].sort((a, b) =>
          (parseInt(a.code) || 0) - (parseInt(b.code) || 0),
        ) as StoreOption[],
      )
      if (eRes.data) setAllEmployees(eRes.data as EmployeeOption[])
      setLoadingRef(false)
    })
  }, [])

  // ─── Fecha dropdown ao clicar fora ─────────────────────────────────────────

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  // ─── Busca de cliente com debounce ──────────────────────────────────────────

  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); setShowDropdown(false); return }

    const digits   = searchTerm.replace(/\D/g, "")
    const cpfFmt   = digits.length === 11
      ? `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`
      : null
    const filtros  = [
      `name.ilike.%${searchTerm}%`,
      digits.length >= 2 ? `cpf.ilike.%${digits}%`  : null,
      cpfFmt             ? `cpf.ilike.%${cpfFmt}%`   : null,
      `phone.ilike.%${searchTerm}%`,
      digits.length >= 2 ? `phone.ilike.%${digits}%` : null,
    ].filter(Boolean).join(",")

    const timer = setTimeout(async () => {
      setSearching(true)
      const sb = createSupabaseBrowserClient()
      const { data } = await sb
        .from("customers")
        .select("id, name, cpf, phone")
        .is("deleted_at", null)
        .or(filtros)
        .order("name")
        .limit(8)
      setSearching(false)
      setSearchResults((data as ClientResult[]) ?? [])
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const employees = storeId
    ? allEmployees
        .filter(e => e.store_id === Number(storeId))
        .sort((a, b) =>
          (a.short_name ?? a.full_name).toLowerCase()
            .localeCompare((b.short_name ?? b.full_name).toLowerCase(), "pt-BR"),
        )
    : []

  function selectClient(c: ClientResult) {
    setSelectedClient(c)
    setShowDropdown(false)
    setSearchTerm(c.name)
  }

  function clearClient() {
    setSelectedClient(null)
    setSearchTerm("")
    setSearchResults([])
  }

  // ─── Submissão ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!selectedClient) {
      setError("Selecione um cliente.")
      return
    }
    if (!serviceType) {
      setError("Selecione o tipo de serviço.")
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

    setSaving(true)
    setSavingStep("Criando solicitação...")
    setError(null)
    const sb = createSupabaseBrowserClient()

    const emp = allEmployees.find(e => e.id === Number(employeeId))

    const { data: newRequest, error: rErr } = await sb
      .from("requests")
      .insert({
        customer_id:        selectedClient.id,
        customer_name:      selectedClient.name,
        customer_cpf:       selectedClient.cpf?.replace(/\D/g, "") || null,
        customer_phone:     selectedClient.phone?.replace(/\D/g, "") || null,
        store_id:           Number(storeId),
        employee_id:        Number(employeeId),
        service_type:       serviceType,
        frame_type:         frameType || null,
        frame_model:        frameModel.trim() || null,
        situation:          SITUACAO_INICIAL,
        scheduled_delivery: dataEntrega || null,
        notes:              notes.trim() || null,
      })
      .select("id").single()

    if (rErr || !newRequest) {
      setError("Erro ao criar solicitação: " + (rErr?.message ?? "falha desconhecida"))
      setSaving(false)
      return
    }

    // Registra histórico inicial
    setSavingStep("Registrando histórico...")
    await sb.from("request_histories").insert({
      request_id:    newRequest.id,
      situation:     SITUACAO_INICIAL,
      operator_name: emp?.short_name ?? emp?.full_name ?? null,
    })

    router.push(`/solicitacoes/${newRequest.id}`)
  }

  // ─── Helpers de UI ──────────────────────────────────────────────────────────

  const s0  = { borderColor: "#e2e8f0", color: "#121212", background: "#f8fafc" }
  const cls = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors"

  const lbl = (txt: string, req = false) => (
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
      style={{ color: "#556376" }}>
      {txt}{req && <span style={{ color: "#dc2626" }}> *</span>}
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

      <Header breadcrumbs={["Home", "Solicitações", "Nova Solicitação"]} title="Nova Solicitação" />

      <main className="pt-[64px] px-8 py-6 space-y-5">

        <Link href="/solicitacoes" className="inline-flex items-center gap-2 text-sm"
          style={{ color: "#556376" }}>
          <ArrowLeft className="w-4 h-4" /> Voltar para solicitações
        </Link>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>

          {/* ══ COLUNA 1 — CLIENTE ══════════════════════════════════════════ */}
          {card(
            <>
              <h2 className="font-bold mb-5" style={{ fontSize: 16, color: "#121212" }}>
                Dados do Cliente
              </h2>

              {/* Busca */}
              <div ref={searchRef} className="relative mb-5">
                {lbl("Buscar Cliente", true)}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#7e8b9c" }} />
                  <input
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); if (selectedClient) clearClient() }}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    placeholder="Nome, CPF ou telefone..."
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
                      className="absolute right-3 top-1/2 -translate-y-1/2"
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
                              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors">
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

                {selectedClient && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                    <Check className="w-4 h-4" style={{ color: "#1d4ed8" }} />
                    <span className="text-sm font-medium" style={{ color: "#1d4ed8" }}>
                      {selectedClient.name}
                    </span>
                    {selectedClient.cpf && (
                      <span className="text-xs" style={{ color: "#60a5fa" }}>· {selectedClient.cpf}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Info do cliente selecionado */}
              {selectedClient && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="space-y-3 pt-2">
                  <div>
                    {lbl("Nome")}
                    <div className={cls} style={{ ...s0, color: "#3c4859" }}>
                      {selectedClient.name}
                    </div>
                  </div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      {lbl("CPF")}
                      <div className={cls} style={{ ...s0, color: "#3c4859" }}>
                        {selectedClient.cpf ?? "—"}
                      </div>
                    </div>
                    <div>
                      {lbl("Telefone")}
                      <div className={cls} style={{ ...s0, color: "#3c4859" }}>
                        {selectedClient.phone ?? "—"}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </>,
            0,
          )}

          {/* ══ COLUNA 2 — DADOS DA SOLICITAÇÃO ═══════════════════════════ */}
          {card(
            <>
              <h2 className="font-bold mb-5" style={{ fontSize: 16, color: "#121212" }}>
                Dados da Solicitação
              </h2>

              <div className="space-y-4">

                {/* Serviço */}
                <div>
                  {lbl("Tipo de Serviço", true)}
                  {sel({
                    value: serviceType,
                    onChange: e => setServiceType(e.target.value),
                    children: (
                      <>
                        <option value="">Selecione o serviço...</option>
                        {SERVICOS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </>
                    ),
                  })}
                </div>

                {/* Tipo de armação */}
                <div>
                  {lbl("Tipo de Armação")}
                  {sel({
                    value: frameType,
                    onChange: e => setFrameType(e.target.value),
                    children: (
                      <>
                        <option value="">Selecione (opcional)...</option>
                        {TIPOS_ARMACAO.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </>
                    ),
                  })}
                </div>

                {/* Modelo/Referência da armação */}
                <div>
                  {lbl("Modelo / Referência da Armação")}
                  {inp({
                    value: frameModel,
                    onChange: e => setFrameModel(e.target.value),
                    placeholder: "Ex: Ray-Ban RB5228, Vogue VO5091...",
                  })}
                </div>

                {/* Loja */}
                <div>
                  {lbl("Loja", true)}
                  {sel({
                    value: storeId,
                    onChange: e => {
                      setStoreId(e.target.value ? Number(e.target.value) : "")
                      setEmployeeId("")
                    },
                    disabled: loadingRef,
                    children: (
                      <>
                        <option value="">{loadingRef ? "Carregando..." : "Selecione a loja..."}</option>
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                        ))}
                      </>
                    ),
                  })}
                </div>

                {/* Vendedor */}
                <div>
                  {lbl("Vendedor(a)", true)}
                  {sel({
                    value: employeeId,
                    onChange: e => setEmployeeId(e.target.value ? Number(e.target.value) : ""),
                    disabled: loadingRef || !storeId,
                    style: { ...s0, color: !storeId && !loadingRef ? "#7e8b9c" : "#121212" },
                    children: (
                      <>
                        <option value="">
                          {loadingRef ? "Carregando..." : !storeId
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
                  })}
                </div>

                {/* Data prevista de entrega */}
                <div>
                  {lbl("Data Prevista de Entrega")}
                  <input
                    type="date"
                    value={dataEntrega}
                    min={hoje}
                    onChange={e => setDataEntrega(e.target.value)}
                    className={cls}
                    style={s0}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                {/* Observações */}
                <div>
                  {lbl("Observações")}
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Observações sobre a solicitação..."
                    className={`${cls} resize-none`}
                    style={s0}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

              </div>
            </>,
            0.05,
          )}

        </div>

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
            <Link href="/solicitacoes" className="text-sm" style={{ color: "#556376" }}>
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
              {saving ? "Salvando..." : "Criar Solicitação"}
            </motion.button>
          </div>
        </motion.div>

      </main>
    </>
  )
}
