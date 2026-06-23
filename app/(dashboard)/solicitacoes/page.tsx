"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import {
  Plus, Search, Filter, Pencil, Trash2, X,
} from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate, fmtDateTime } from "@/lib/types"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Store      { id: number; code: string; name: string }
interface ClientHint { id: number; name: string; cpf: string | null }

interface RequestRow {
  id:                 number
  source_erp_id:      number | null    // ID original do PHP (sol_id)
  customer_name:      string | null
  customer_cpf:       string | null
  service_type:       string
  frame_type:         string | null
  frame_model:        string | null   // título real da armação (ex: "Fio de nylon")
  notes:              string | null
  situation:          string
  scheduled_delivery: string | null
  created_at:         string
  store:    { id: number; code: string; name: string } | null
  employee: { id: number; full_name: string } | null
}

// Situações reais do PHP TB_Solicitation_Situations
const SITUACOES = [
  "Solicitação Criada", "Análise de recebimento", "Trânsito",
  "No Laboratório", "Surfaçagem", "Controle de qualidade",
  "Pronto p/ Entrega", "Entregue", "Cancelado",
]
const SERVICE_TYPES = ["Adaptação", "Troca", "Manutenção", "Outros", "Transposição", "Montagem", "Ajustes", "Copiar grau"]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SolicitacoesPage() {

  const [stores,     setStores]     = useState<Store[]>([])
  const [loadingRef, setLoadingRef] = useState(true)

  const [requests,       setRequests]       = useState<RequestRow[]>([])
  const [total,          setTotal]          = useState(0)
  const [loadingRequests,setLoadingRequests] = useState(false)

  const [situacaoFilter, setSituacaoFilter] = useState("")
  const [servicoFilter,  setServicoFilter]  = useState("")
  const [lojaFilter,     setLojaFilter]     = useState("")

  const [clientSearch,   setClientSearch]   = useState("")
  const [clientHints,    setClientHints]    = useState<ClientHint[]>([])
  const [searching,      setSearching]      = useState(false)
  const [showHints,      setShowHints]      = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientHint | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [perPage,     setPerPage]     = useState(25)

  // ─── Referência ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const sb = createSupabaseBrowserClient()
    sb.from("stores").select("id, code, name").eq("active", true).then(({ data }) => {
      if (data) setStores(
        [...data].sort((a, b) => (parseInt(a.code) || 0) - (parseInt(b.code) || 0)) as Store[]
      )
      setLoadingRef(false)
    })
  }, [])

  // ─── Requests (server-side) ──────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoadingRequests(true)
      const sb = createSupabaseBrowserClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = sb
        .from("requests")
        .select(
          `id, source_erp_id, customer_name, customer_cpf,
           service_type, frame_type, frame_model, notes, situation, scheduled_delivery, created_at,
           store:stores(id,code,name),
           employee:employees(id,full_name)`,
          { count: "exact" },
        )
        .order("id", { ascending: false })

      if (situacaoFilter) q = q.eq("situation",    situacaoFilter)
      if (servicoFilter)  q = q.eq("service_type", servicoFilter)
      if (lojaFilter)     q = q.eq("store_id",     parseInt(lojaFilter))
      if (selectedClient) q = q.eq("customer_id",  selectedClient.id)

      const from = (currentPage - 1) * perPage
      q = q.range(from, from + perPage - 1)

      const { data, count, error } = await q
      if (error) console.error("[solicitacoes] Supabase error:", error)
      setRequests((data ?? []) as RequestRow[])
      setTotal(count ?? 0)
      setLoadingRequests(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [situacaoFilter, servicoFilter, lojaFilter, selectedClient?.id, currentPage, perPage])

  // ─── Fecha dropdown ──────────────────────────────────────────────────────────

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowHints(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  // ─── Autocomplete ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedClient) return
    if (clientSearch.length < 2) { setClientHints([]); setShowHints(false); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const sb = createSupabaseBrowserClient()
      const { data } = await sb
        .from("customers").select("id, name, cpf")
        .is("deleted_at", null)
        .or(`name.ilike.%${clientSearch}%,cpf.ilike.%${clientSearch}%`)
        .order("name").limit(8)
      setSearching(false)
      setClientHints((data as ClientHint[]) ?? [])
      setShowHints(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearch, selectedClient])

  // ─── Paginação ───────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage   = Math.min(currentPage, totalPages)

  function pageButtons(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | "…")[] = [1]
    if (safePage > 3) pages.push("…")
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++)
      pages.push(p)
    if (safePage < totalPages - 2) pages.push("…")
    pages.push(totalPages)
    return pages
  }

  function selectClient(c: ClientHint) {
    setSelectedClient(c); setClientSearch(c.name); setShowHints(false); setCurrentPage(1)
  }
  function clearClientSearch() {
    setSelectedClient(null); setClientSearch(""); setClientHints([])
  }

  const emAberto = requests.filter(r => r.situation !== "Entregue" && r.situation !== "Cancelado").length


  const selCls = "appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm border outline-none transition-colors cursor-pointer"
  const selStyle = {
    borderColor: "#e2e8f0", color: "#3c4859",
    background: "#f8fafc url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 8px center",
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Header breadcrumbs={["Home", "Solicitações"]} title="Solicitações" />

      <main className="pt-[64px] px-8 py-6 space-y-4">

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "#dbeafe", color: "#1d4ed8" }}>
            {loadingRequests ? "carregando…" : `${emAberto} em aberto`}
          </span>
          <Link href="/solicitacoes/nova">
            <motion.span whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.25)" }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ background: "#0f2744" }}>
              <Plus className="w-4 h-4" /> Nova Solicitação
            </motion.span>
          </Link>
        </motion.div>

        {/* Filtros */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}>
          <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "#7e8b9c" }} />

          <select value={situacaoFilter}
            onChange={e => { setSituacaoFilter(e.target.value); setCurrentPage(1) }}
            className={selCls} style={selStyle}>
            <option value="">Todas as situações</option>
            {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={servicoFilter}
            onChange={e => { setServicoFilter(e.target.value); setCurrentPage(1) }}
            className={selCls} style={selStyle}>
            <option value="">Todos os serviços</option>
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={lojaFilter}
            onChange={e => { setLojaFilter(e.target.value); setCurrentPage(1) }}
            disabled={loadingRef}
            className={selCls} style={selStyle}>
            <option value="">Todas as lojas</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select>

          {/* Busca cliente */}
          <div ref={searchRef} className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#7e8b9c" }} />
            <input value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setSelectedClient(null) }}
              onFocus={() => clientHints.length > 0 && setShowHints(true)}
              placeholder="Buscar cliente..."
              className="w-full pl-9 pr-8 py-1.5 rounded-lg text-sm border outline-none transition-colors"
              style={{ borderColor: "#e2e8f0", color: "#121212", background: "#f8fafc" }}
              onFocusCapture={e => (e.target.style.borderColor = "#1d4ed8")}
              onBlurCapture={e  => (e.target.style.borderColor = "#e2e8f0")}
            />
            {searching && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {selectedClient && !searching && (
              <button onClick={clearClientSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#7e8b9c" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <AnimatePresence>
              {showHints && clientHints.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
                  className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
                  style={{ border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,39,68,0.10)", background: "#fff" }}
                >
                  {clientHints.map(c => (
                    <button key={c.id} onClick={() => selectClient(c)}
                      className="w-full text-left px-4 py-2.5 transition-colors hover:bg-blue-50">
                      <p className="text-sm font-medium" style={{ color: "#121212" }}>{c.name}</p>
                      {c.cpf && <p className="text-xs" style={{ color: "#7e8b9c" }}>{c.cpf}</p>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => { setSituacaoFilter(""); setServicoFilter(""); setLojaFilter(""); clearClientSearch(); setCurrentPage(1) }}
            className="text-sm transition-colors" style={{ color: "#7e8b9c" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#3c4859")}
            onMouseLeave={e => (e.currentTarget.style.color = "#7e8b9c")}
          >Limpar</button>
        </motion.div>

        {/* Tabela */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="rounded-xl border overflow-hidden"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["ID", "Cliente", "Serviço/Armação", "Vendedor(a)", "Entrega", "Status", "Ações"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#556376" }}>{h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingRequests ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: "#f1f5f9" }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: "#f1f5f9", width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: "#7e8b9c" }}>
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : (
                requests.map((r, i) => {
                  const loja    = r.store ? `${r.store.code} · ${r.store.name}` : null
                  // Exibe apenas primeiro nome + sobrenome (primeiras 2 palavras)
                  const nomeCompleto = r.employee?.full_name ?? null
                  const vendedor = nomeCompleto
                    ? nomeCompleto.trim().split(/\s+/).slice(0, 2).join(" ")
                    : null
                  return (
                    <motion.tr key={r.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b"
                      style={{ borderColor: "#f1f5f9" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* ID */}
                      <td className="px-4 py-3">
                        <Link href={`/solicitacoes/${r.id}`}
                          className="font-mono font-bold hover:underline"
                          style={{ fontSize: 14, color: "#1d4ed8" }}>
                          {r.source_erp_id ?? r.id}
                        </Link>
                      </td>

                      {/* CLIENTE */}
                      <td className="px-4 py-3">
                        <span className="font-medium block" style={{ fontSize: 14, color: "#121212" }}>
                          {r.customer_name?.trim() || "—"}
                        </span>
                        {r.customer_cpf && (
                          <span className="block mt-0.5" style={{ fontSize: 11, color: "#7e8b9c" }}>
                            {r.customer_cpf}
                          </span>
                        )}
                      </td>

                      {/* SERVIÇO / ARMAÇÃO */}
                      <td className="px-4 py-3">
                        <span className="block" style={{ fontSize: 14, color: "#121212" }}>{r.service_type}</span>
                        {/* frame_model tem o título real do PHP (ex: "Fio de nylon", "Plástico") */}
                        {(r.frame_model ?? r.frame_type) && (
                          <span className="block mt-0.5" style={{ fontSize: 11, color: "#7e8b9c" }}>
                            {r.frame_model ?? r.frame_type}
                          </span>
                        )}
                      </td>

                      {/* VENDEDOR(A) */}
                      <td className="px-4 py-3">
                        {vendedor ? (
                          <>
                            <span className="font-medium block" style={{ fontSize: 14, color: "#121212" }}>{vendedor}</span>
                            {loja && (
                              <span className="block mt-0.5" style={{ fontSize: 11, color: "#7e8b9c" }}>{loja}</span>
                            )}
                          </>
                        ) : loja ? (
                          <span style={{ fontSize: 14, color: "#556376" }}>{loja}</span>
                        ) : (
                          <span style={{ fontSize: 14, color: "#7e8b9c" }}>—</span>
                        )}
                      </td>

                      {/* ENTREGA */}
                      <td className="px-4 py-3">
                        <span style={{ fontSize: 14, color: "#3c4859" }}>
                          {fmtDate(r.scheduled_delivery)}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3">
                        <StatusBadge status={r.situation} size="sm" />
                        <span className="block mt-0.5" style={{ fontSize: 11, color: "#7e8b9c" }}>
                          {fmtDateTime(r.created_at)}
                        </span>
                      </td>

                      {/* AÇÕES */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Tooltip label="Editar">
                            <Link href={`/solicitacoes/${r.id}`}>
                              <motion.span whileHover={{ scale: 1.15 }}
                                className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#7e8b9c" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <Pencil style={{ width: 14, height: 14 }} />
                              </motion.span>
                            </Link>
                          </Tooltip>
                          <Tooltip label="Excluir">
                            <motion.span whileHover={{ scale: 1.15 }}
                              className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#7e8b9c" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#fee2e2")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </motion.span>
                          </Tooltip>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "#f1f5f9" }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#556376" }}>
              Mostrar
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1) }}
                className="px-2 py-1 rounded border text-xs outline-none" style={{ borderColor: "#e2e8f0" }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              por página · <strong>{total}</strong> solicitaç{total !== 1 ? "ões" : "ão"}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                style={{ color: "#556376" }}>‹</button>
              {pageButtons().map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: "#7e8b9c" }}>…</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p as number)}
                    className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: p === safePage ? "#0f2744" : "transparent", color: p === safePage ? "#fff" : "#556376" }}>
                    {p}
                  </button>
                )
              )}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                style={{ color: "#556376" }}>›</button>
            </div>
          </div>
        </motion.div>
      </main>
    </>
  )
}
