"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import {
  ArrowLeft, Search, User, X, Check, Loader2,
  ShoppingBag, Calendar, Store, Clock,
} from "lucide-react"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ClientResult {
  id: number
  name: string
  cpf:   string | null
  phone: string | null
}

interface WarrantyProblem { id: number; name: string }
interface Store           { id: number; code: string; name: string }

// Histórico de compras (mock — substituir por service_orders quando conectado)
interface OrderHistory {
  id: number
  os: string
  loja: string
  data: string
  prazo: string
  situacao: string
}

const mockHistory: OrderHistory[] = [
  { id: 1, os: "63210/48957", loja: "488 — Leste", data: "15/05/2026", prazo: "02/06/2026", situacao: "Entregue"        },
  { id: 2, os: "61050/46700", loja: "488 — Leste", data: "12/03/2026", prazo: "28/03/2026", situacao: "Entregue"        },
  { id: 3, os: "58900/44500", loja: "717 — Norte", data: "05/01/2026", prazo: "20/01/2026", situacao: "Entregue"        },
  { id: 4, os: "55210/41100", loja: "488 — Leste", data: "10/10/2025", prazo: "25/10/2025", situacao: "Cancelado"       },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NovaGarantiaPage() {

  // ── Referências
  const [problems, setProblems] = useState<WarrantyProblem[]>([])
  const [stores,   setStores]   = useState<Store[]>([])
  const [loadingRef, setLoadingRef] = useState(true)

  // ── Busca de cliente
  const [searchTerm,     setSearchTerm]     = useState("")
  const [searchResults,  setSearchResults]  = useState<ClientResult[]>([])
  const [searching,      setSearching]      = useState(false)
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // ── Formulário da garantia
  const [pedidoOs,    setPedidoOs]    = useState("")
  const [problemaId,  setProblemaId]  = useState("")
  const [lojaId,      setLojaId]      = useState("")
  const [descricao,   setDescricao]   = useState("")
  const [dataAbertura, setDataAbertura] = useState(new Date().toISOString().split("T")[0])

  // ── Histórico do cliente selecionado
  const [history,      setHistory]      = useState<OrderHistory[]>([])
  const [loadingHist,  setLoadingHist]  = useState(false)

  // ─── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    const sb = createSupabaseBrowserClient()
    Promise.all([
      sb.from("warranty_problems").select("id, name").eq("active", true).order("name"),
      sb.from("stores").select("id, code, name").eq("active", true),
    ]).then(([pRes, sRes]) => {
      if (pRes.data) setProblems(pRes.data as WarrantyProblem[])
      if (sRes.data) setStores(
        [...sRes.data].sort((a, b) =>
          (parseInt(a.code) || 0) - (parseInt(b.code) || 0),
        ) as Store[],
      )
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
    const digits  = searchTerm.replace(/\D/g, "")
    const cpfFmt  = digits.length === 11
      ? `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`
      : null
    const filtros = [
      `name.ilike.%${searchTerm}%`,
      digits.length >= 2 ? `cpf.ilike.%${digits}%` : null,
      cpfFmt             ? `cpf.ilike.%${cpfFmt}%` : null,
      `phone.ilike.%${searchTerm}%`,
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

  // ─── Selecionar cliente e carregar histórico ────────────────────────────────

  async function selectClient(c: ClientResult) {
    setSelectedClient(c)
    setShowDropdown(false)
    setSearchTerm(c.name)

    // Carrega histórico de pedidos do cliente
    setLoadingHist(true)
    // TODO: substituir por query real em service_orders quando conectado
    // const sb = createSupabaseBrowserClient()
    // const { data } = await sb.from("service_orders")
    //   .select("id, os_number, store:stores(code,name), created_at, delivery_date, status:order_statuses(title)")
    //   .eq("customer_id", c.id).order("created_at", { ascending: false }).limit(10)
    await new Promise(r => setTimeout(r, 400)) // simula latência
    setHistory(mockHistory)
    setLoadingHist(false)
  }

  function clearClient() {
    setSelectedClient(null)
    setSearchTerm("")
    setSearchResults([])
    setHistory([])
    setPedidoOs("")
  }

  // ─── Helpers de UI ──────────────────────────────────────────────────────────

  const s0  = { borderColor: "#e2e8f0", color: "#0f172a", background: "#f8fafc" }
  const cls = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors"

  const lbl = (txt: string, req = false) => (
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
      style={{ color: "#64748b" }}>
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
      <Header breadcrumbs={["Home", "Garantias", "Nova Garantia"]} title="Nova Garantia" />

      <main className="pt-[64px] px-8 py-6 space-y-5">

        <Link href="/garantias" className="inline-flex items-center gap-2 text-sm"
          style={{ color: "#64748b" }}>
          <ArrowLeft className="w-4 h-4" /> Voltar para garantias
        </Link>

        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>

          {/* ══ COLUNA 1 — CLIENTE ══════════════════════════════════════════ */}
          {card(
            <>
              <h2 className="font-bold mb-5" style={{ fontSize: 16, color: "#0f172a" }}>
                Buscar Cliente
              </h2>

              {/* Busca */}
              <div className="mb-5">
                {lbl("Nome ou CPF", true)}
                <div ref={searchRef} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#94a3b8" }} />
                  <input
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); if (selectedClient) clearClient() }}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    placeholder="Digite o nome ou CPF do cliente..."
                    className={`${cls} pl-9 pr-9`}
                    style={s0}
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                      style={{ color: "#94a3b8" }} />
                  )}
                  {selectedClient && !searching && (
                    <button onClick={clearClient}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "#94a3b8" }}>
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
                          <div className="px-4 py-3 text-sm" style={{ color: "#64748b" }}>
                            Nenhum cliente encontrado.
                          </div>
                        ) : (
                          searchResults.map(c => (
                            <button key={c.id} onClick={() => selectClient(c)}
                              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors">
                              <User className="w-4 h-4 flex-shrink-0" style={{ color: "#1d4ed8" }} />
                              <div>
                                <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{c.name}</p>
                                <p className="text-xs" style={{ color: "#64748b" }}>
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

              {/* Histórico de pedidos */}
              {(selectedClient || loadingHist) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-4 h-4" style={{ color: "#64748b" }} />
                    <span className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#64748b" }}>
                      Histórico de Pedidos
                    </span>
                    <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
                  </div>

                  {loadingHist ? (
                    <div className="flex items-center gap-2 py-4" style={{ color: "#94a3b8" }}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Carregando histórico...</span>
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-sm py-3" style={{ color: "#94a3b8" }}>
                      Nenhum pedido encontrado para este cliente.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {history.map(h => (
                        <button
                          key={h.id}
                          onClick={() => setPedidoOs(h.os)}
                          className="w-full text-left p-3 rounded-xl border transition-all"
                          style={{
                            borderColor: pedidoOs === h.os ? "#1d4ed8" : "#e2e8f0",
                            background:  pedidoOs === h.os ? "#eff6ff"  : "#f8fafc",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs" style={{ color: "#1d4ed8" }}>
                              {h.os}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: h.situacao === "Entregue" ? "#dcfce7" : "#fee2e2",
                                color:      h.situacao === "Entregue" ? "#16a34a" : "#dc2626",
                              }}
                            >
                              {h.situacao}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1 text-xs" style={{ color: "#64748b" }}>
                              <Store className="w-3 h-3" />
                              {h.loja}
                            </div>
                            <div className="flex items-center gap-1 text-xs" style={{ color: "#64748b" }}>
                              <Calendar className="w-3 h-3" />
                              {h.data}
                            </div>
                            <div className="flex items-center gap-1 text-xs" style={{ color: "#64748b" }}>
                              <Clock className="w-3 h-3" />
                              Entrega: {h.prazo}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </>,
            0,
          )}

          {/* ══ COLUNA 2 — DADOS DA GARANTIA ══════════════════════════════ */}
          {card(
            <>
              <h2 className="font-bold mb-5" style={{ fontSize: 16, color: "#0f172a" }}>
                Dados da Garantia
              </h2>

              <div className="space-y-4">

                {/* Pedido vinculado */}
                <div>
                  {lbl("Pedido / OS vinculado", true)}
                  {inp({
                    value: pedidoOs,
                    onChange: e => setPedidoOs(e.target.value),
                    placeholder: "Ex: 63210/48957 — ou selecione ao lado",
                  })}
                  {pedidoOs && (
                    <p className="mt-1 text-xs" style={{ color: "#16a34a" }}>
                      ✓ OS selecionada do histórico
                    </p>
                  )}
                </div>

                {/* Problema */}
                <div>
                  {lbl("Tipo de Problema", true)}
                  {sel({
                    value: problemaId,
                    onChange: e => setProblemaId(e.target.value),
                    disabled: loadingRef,
                    children: (
                      <>
                        <option value="">{loadingRef ? "Carregando..." : "Selecione o problema..."}</option>
                        {problems.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </>
                    ),
                  })}
                </div>

                {/* Loja */}
                <div>
                  {lbl("Loja", true)}
                  {sel({
                    value: lojaId,
                    onChange: e => setLojaId(e.target.value),
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

                {/* Data abertura */}
                <div>
                  {lbl("Data de Abertura", true)}
                  <input
                    type="date"
                    value={dataAbertura}
                    onChange={e => setDataAbertura(e.target.value)}
                    className={cls} style={s0}
                    onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>

                {/* Descrição */}
                <div>
                  {lbl("Descrição do Problema")}
                  <textarea
                    rows={4}
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    placeholder="Descreva o problema relatado pelo cliente..."
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
          className="flex items-center justify-end gap-4 py-2"
        >
          <Link href="/garantias" className="text-sm" style={{ color: "#64748b" }}>
            Cancelar
          </Link>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.25)" }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#0f2744" }}
          >
            Abrir Garantia
          </motion.button>
        </motion.div>

      </main>
    </>
  )
}
