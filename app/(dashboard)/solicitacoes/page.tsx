"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import {
  Plus, Search, Filter, Eye, FileText,
  AlertTriangle, Clock, X,
} from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate, prazoOk } from "@/lib/types"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Store      { id: number; code: string; name: string }
interface ClientHint { id: number; name: string; cpf: string | null }

interface RequestRow {
  id:                number
  source_erp_id:     number | null    // ID original do PHP (sol_id)
  customer_name:     string | null
  service_type:      string
  frame_type:        string | null
  situation:         string
  scheduled_delivery:string | null
  created_at:        string
  store:             { id: number; code: string; name: string } | null
}

const SITUACOES    = ["Aguardando", "Em andamento", "Pronto p/ Entrega", "Entregue", "Cancelado"]
const SERVICE_TYPES = ["Adaptação", "Troca", "Manutenção", "Outros"]

const servicoColor: Record<string, { bg: string; text: string }> = {
  "Adaptação":  { bg: "#CCFBF1", text: "#134E4A" },
  "Troca":      { bg: "#DBEAFE", text: "#1E40AF" },
  "Manutenção": { bg: "#FEF3C7", text: "#92400E" },
  "Outros":     { bg: "#F1F5F9", text: "#475569" },
}

function Chip({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span style={{
      display: "inline-flex", padding: "2px 9px", borderRadius: 999,
      fontSize: 11, fontWeight: 600, background: colors.bg, color: colors.text,
    }}>
      {label}
    </span>
  )
}

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
          "id, source_erp_id, customer_name, service_type, frame_type, situation, scheduled_delivery, created_at, store:stores(id,code,name)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })

      if (situacaoFilter) q = q.eq("situation",    situacaoFilter)
      if (servicoFilter)  q = q.eq("service_type", servicoFilter)
      if (lojaFilter)     q = q.eq("store_id",     parseInt(lojaFilter))
      if (selectedClient) q = q.eq("customer_id",  selectedClient.id)

      const from = (currentPage - 1) * perPage
      q = q.range(from, from + perPage - 1)

      const { data, count } = await q
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
    borderColor: "#e2e8f0", color: "#475569",
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
          <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "#94a3b8" }} />

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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            <input value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setSelectedClient(null) }}
              onFocus={() => clientHints.length > 0 && setShowHints(true)}
              placeholder="Buscar cliente..."
              className="w-full pl-9 pr-8 py-1.5 rounded-lg text-sm border outline-none transition-colors"
              style={{ borderColor: "#e2e8f0", color: "#0f172a", background: "#f8fafc" }}
              onFocusCapture={e => (e.target.style.borderColor = "#1d4ed8")}
              onBlurCapture={e  => (e.target.style.borderColor = "#e2e8f0")}
            />
            {searching && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {selectedClient && !searching && (
              <button onClick={clearClientSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }}>
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
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{c.name}</p>
                      {c.cpf && <p className="text-xs" style={{ color: "#94a3b8" }}>{c.cpf}</p>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => { setSituacaoFilter(""); setServicoFilter(""); setLojaFilter(""); clearClientSearch(); setCurrentPage(1) }}
            className="text-sm transition-colors" style={{ color: "#94a3b8" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#475569")}
            onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
          >Limpar</button>
        </motion.div>

        {/* Tabela */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="rounded-xl border overflow-hidden"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["# Sol.", "Cliente", "Serviço", "Armação", "Situação", "Loja", "Prazo", "Ações"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#64748b" }}>{h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingRequests ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: "#f1f5f9" }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: "#f1f5f9", width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: "#94a3b8" }}>
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : (
                requests.map((r, i) => {
                  const ok    = prazoOk(r.scheduled_delivery)
                  const prazo = fmtDate(r.scheduled_delivery)
                  return (
                    <motion.tr key={r.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b"
                      style={{ borderColor: "#f1f5f9" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/solicitacoes/${r.id}`}
                          className="font-mono font-bold text-xs hover:underline" style={{ color: "#1d4ed8" }}>
                          SOL-{String(r.source_erp_id ?? r.id).padStart(3, "0")}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "#0f172a" }}>
                        {r.customer_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Chip label={r.service_type} colors={servicoColor[r.service_type] ?? { bg: "#f1f5f9", text: "#475569" }} />
                      </td>
                      <td className="px-4 py-3">
                        {r.frame_type
                          ? <Chip label={r.frame_type} colors={{ bg: "#EDE9FE", text: "#4C1D95" }} />
                          : <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                        }
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.situation} size="sm" /></td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                          {r.store?.code ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {ok
                            ? <Clock className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
                            : <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                          }
                          <span className="text-xs" style={{ color: ok ? "#475569" : "#dc2626", fontWeight: ok ? 400 : 600 }}>
                            {prazo}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Tooltip label="Ver detalhes">
                            <Link href={`/solicitacoes/${r.id}`}>
                              <motion.span whileHover={{ scale: 1.15 }}
                                className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#94a3b8" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <Eye style={{ width: 14, height: 14 }} />
                              </motion.span>
                            </Link>
                          </Tooltip>
                          <Tooltip label="Relatório">
                            <motion.span whileHover={{ scale: 1.15 }}
                              className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#94a3b8" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <FileText style={{ width: 14, height: 14 }} />
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
            <div className="flex items-center gap-2 text-xs" style={{ color: "#64748b" }}>
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
                style={{ color: "#64748b" }}>‹</button>
              {pageButtons().map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: "#94a3b8" }}>…</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p as number)}
                    className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: p === safePage ? "#0f2744" : "transparent", color: p === safePage ? "#fff" : "#64748b" }}>
                    {p}
                  </button>
                )
              )}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                style={{ color: "#64748b" }}>›</button>
            </div>
          </div>
        </motion.div>
      </main>
    </>
  )
}
