"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import {
  Plus, Search, Filter, Eye, Pencil,
  AlertTriangle, Clock, X,
} from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate, prazoOk } from "@/lib/types"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface WarrantyProblem { id: number; name: string }
interface Store           { id: number; code: string; name: string }
interface ClientHint      { id: number; name: string; cpf: string | null }

interface WarrantyRow {
  id:                number
  situation:         string | null
  customer_name:     string | null
  customer_cpf:      string | null
  request_date:      string | null
  scheduled_delivery:string | null
  store:             { id: number; code: string; name: string } | null
  problem:           { id: number; name: string } | null
  service_order:     {
    id: number
    os_number: string
    os_sequence: string | null
    customer_name: string | null
    purchase_date: string | null
    scheduled_delivery: string | null
  } | null
}

const WARRANTY_SITUATIONS = ["Início", "Intermediário", "Encerrado"]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function GarantiasPage() {

  // ── Referência
  const [problems,   setProblems]   = useState<WarrantyProblem[]>([])
  const [stores,     setStores]     = useState<Store[]>([])
  const [loadingRef, setLoadingRef] = useState(true)

  // ── Garantias (servidor)
  const [warranties,       setWarranties]       = useState<WarrantyRow[]>([])
  const [total,            setTotal]            = useState(0)
  const [loadingWarranties,setLoadingWarranties] = useState(false)

  // ── Filtros
  const [situacaoFilter, setSituacaoFilter] = useState("")
  const [problemaFilter, setProblemaFilter] = useState("")
  const [lojaFilter,     setLojaFilter]     = useState("")

  // ── Busca de cliente
  const [clientSearch,   setClientSearch]   = useState("")
  const [clientHints,    setClientHints]    = useState<ClientHint[]>([])
  const [searching,      setSearching]      = useState(false)
  const [showHints,      setShowHints]      = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientHint | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // ── Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage,     setPerPage]     = useState(25)

  // ─── Carga de referência ────────────────────────────────────────────────────

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

  // ─── Carga de garantias (server-side) ────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoadingWarranties(true)
      const sb = createSupabaseBrowserClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = sb
        .from("warranties")
        .select(
          `id, situation, customer_name, customer_cpf, request_date, scheduled_delivery,
           store:stores!store_id(id,code,name),
           problem:warranty_problems!problem_id(id,name),
           service_order:service_orders!service_order_id(id,os_number,os_sequence,customer_name,purchase_date,scheduled_delivery)`,
          { count: "exact" },
        )
        .is("deleted_at", null)
        .order("id", { ascending: false })

      if (situacaoFilter) q = q.eq("situation", situacaoFilter)
      if (lojaFilter)     q = q.eq("store_id",  parseInt(lojaFilter))
      if (problemaFilter) q = q.eq("problem_id", parseInt(problemaFilter))
      if (selectedClient) q = q.eq("customer_id", selectedClient.id)

      const from = (currentPage - 1) * perPage
      q = q.range(from, from + perPage - 1)

      const { data, count, error } = await q
      if (error) console.error("[garantias] Supabase error:", error)
      setWarranties((data ?? []) as WarrantyRow[])
      setTotal(count ?? 0)
      setLoadingWarranties(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [situacaoFilter, problemaFilter, lojaFilter, selectedClient?.id, currentPage, perPage])

  // ─── Fecha dropdown ao clicar fora ──────────────────────────────────────────

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowHints(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  // ─── Autocomplete de clientes ────────────────────────────────────────────────

  useEffect(() => {
    if (selectedClient) return
    if (clientSearch.length < 2) { setClientHints([]); setShowHints(false); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const sb = createSupabaseBrowserClient()
      const { data } = await sb
        .from("customers")
        .select("id, name, cpf")
        .is("deleted_at", null)
        .or(`name.ilike.%${clientSearch}%,cpf.ilike.%${clientSearch}%`)
        .order("name")
        .limit(8)
      setSearching(false)
      setClientHints((data as ClientHint[]) ?? [])
      setShowHints(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearch, selectedClient])

  // ─── Contadores ──────────────────────────────────────────────────────────────

  const emAberto = warranties.filter(w => w.situation !== "Encerrado").length
  const vencidas = warranties.filter(w => !prazoOk(w.scheduled_delivery) && w.situation !== "Encerrado").length

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

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function selectClient(c: ClientHint) {
    setSelectedClient(c); setClientSearch(c.name); setShowHints(false); setCurrentPage(1)
  }
  function clearClientSearch() {
    setSelectedClient(null); setClientSearch(""); setClientHints([])
  }

  const selCls = "appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm border outline-none transition-colors cursor-pointer"
  const selStyle = {
    borderColor: "#e2e8f0", color: "#475569",
    background: "#f8fafc url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 8px center",
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Header breadcrumbs={["Home", "Garantias"]} title="Garantias" />

      <main className="pt-[64px] px-8 py-6 space-y-4">

        {/* Ações */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "#FFEDD5", color: "#9A3412" }}>
              {loadingWarranties ? "carregando…" : `${emAberto} em aberto`}
            </span>
            {vencidas > 0 && (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "#FEF3C7", color: "#92400E" }}>
                {vencidas} vencida{vencidas !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Link href="/garantias/nova">
            <motion.span
              whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.25)" }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ background: "#0f2744" }}
            >
              <Plus className="w-4 h-4" /> Nova Garantia
            </motion.span>
          </Link>
        </motion.div>

        {/* Filtros */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "#94a3b8" }} />

          <select value={situacaoFilter}
            onChange={e => { setSituacaoFilter(e.target.value); setCurrentPage(1) }}
            className={selCls} style={selStyle}
            onFocus={e => (e.target.style.borderColor = "#93c5fd")}
            onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="">Todas as situações</option>
            {WARRANTY_SITUATIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select value={problemaFilter}
            onChange={e => { setProblemaFilter(e.target.value); setCurrentPage(1) }}
            disabled={loadingRef}
            className={selCls} style={selStyle}
            onFocus={e => (e.target.style.borderColor = "#93c5fd")}
            onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="">Todos os problemas</option>
            {problems.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select value={lojaFilter}
            onChange={e => { setLojaFilter(e.target.value); setCurrentPage(1) }}
            disabled={loadingRef}
            className={selCls} style={selStyle}
            onFocus={e => (e.target.style.borderColor = "#93c5fd")}
            onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="">Todas as lojas</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>

          {/* Busca cliente */}
          <div ref={searchRef} className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            <input
              value={clientSearch}
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
            onClick={() => { setSituacaoFilter(""); setProblemaFilter(""); setLojaFilter(""); clearClientSearch(); setCurrentPage(1) }}
            className="text-sm transition-colors" style={{ color: "#94a3b8" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#475569")}
            onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
          >Limpar</button>
        </motion.div>

        {/* Tabela */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="rounded-xl border overflow-hidden"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["# Garantia", "Pedido Original", "Cliente", "Problema", "Situação", "Loja", "Abertura", "Prazo", "Ações"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#64748b" }}>{h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingWarranties ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: "#f1f5f9" }}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: "#f1f5f9", width: "70%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : warranties.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm" style={{ color: "#94a3b8" }}>
                    Nenhuma garantia encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                warranties.map((w, i) => {
                  const sit    = w.situation ?? "Início"
                  // Fallback em cascata: campo da garantia → campo do pedido pai
                  const prazoRaw   = w.scheduled_delivery ?? w.service_order?.scheduled_delivery ?? null
                  const aberturaRaw= w.request_date       ?? w.service_order?.purchase_date      ?? null
                  const clienteNome= w.customer_name      ?? w.service_order?.customer_name      ?? "—"
                  const clienteCpf = w.customer_cpf
                  const ok         = prazoOk(prazoRaw)
                  const prazoV     = fmtDate(prazoRaw)
                  const abertura   = fmtDate(aberturaRaw ?? undefined)
                  const osLink     = w.service_order
                    ? `${w.service_order.os_number}${w.service_order.os_sequence ? "/" + w.service_order.os_sequence : ""}`
                    : "—"

                  return (
                    <motion.tr key={w.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b"
                      style={{ borderColor: "#f1f5f9" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* # GARANTIA */}
                      <td className="px-4 py-3">
                        <Link href={`/garantias/${w.id}`}
                          className="font-mono font-bold hover:underline" style={{ fontSize: 13, color: "#1d4ed8" }}>
                          GR-{String(w.id).padStart(3, "0")}
                        </Link>
                      </td>

                      {/* PEDIDO ORIGINAL */}
                      <td className="px-4 py-3">
                        {w.service_order ? (
                          <Link href={`/pedidos/${w.service_order.id}`}
                            className="font-mono hover:underline" style={{ fontSize: 13, color: "#64748b" }}>
                            {osLink}
                          </Link>
                        ) : <span style={{ fontSize: 13, color: "#94a3b8" }}>—</span>}
                      </td>

                      {/* CLIENTE */}
                      <td className="px-4 py-3">
                        <span className="font-medium block" style={{ fontSize: 13, color: "#0f172a" }}>
                          {clienteNome}
                        </span>
                        {clienteCpf && (
                          <span className="block mt-0.5" style={{ fontSize: 11, color: "#94a3b8" }}>
                            {clienteCpf}
                          </span>
                        )}
                      </td>

                      {/* PROBLEMA */}
                      <td className="px-4 py-3">
                        {w.problem
                          ? <StatusBadge status={w.problem.name} size="sm" />
                          : <span style={{ fontSize: 13, color: "#94a3b8" }}>—</span>
                        }
                      </td>

                      {/* SITUAÇÃO S/I/E */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {WARRANTY_SITUATIONS.map((step, si) => {
                            const idx      = WARRANTY_SITUATIONS.indexOf(sit)
                            const isActive = si <= idx
                            return (
                              <span key={step}
                                className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
                                style={{
                                  fontSize: 10,
                                  background: isActive
                                    ? (si === 0 ? "#3b82f6" : si === 1 ? "#f59e0b" : "#16a34a")
                                    : "#e2e8f0",
                                  color: isActive ? "#fff" : "#94a3b8",
                                }}>
                                {["S", "I", "E"][si]}
                              </span>
                            )
                          })}
                        </div>
                      </td>

                      {/* LOJA */}
                      <td className="px-4 py-3">
                        {w.store?.code
                          ? <span className="px-2 py-0.5 rounded-full font-semibold"
                              style={{ fontSize: 12, background: "#dbeafe", color: "#1d4ed8" }}>
                              {w.store.code}
                            </span>
                          : <span style={{ fontSize: 13, color: "#94a3b8" }}>—</span>
                        }
                      </td>

                      {/* ABERTURA */}
                      <td className="px-4 py-3" style={{ fontSize: 13, color: "#64748b" }}>{abertura}</td>

                      {/* PRAZO */}
                      <td className="px-4 py-3">
                        {prazoRaw ? (
                          <div className="flex items-center gap-1.5">
                            {ok
                              ? <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3b82f6" }} />
                              : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#dc2626" }} />
                            }
                            <span style={{ fontSize: 13, color: ok ? "#475569" : "#dc2626", fontWeight: ok ? 400 : 600 }}>
                              {prazoV}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Tooltip label="Ver detalhes">
                            <Link href={`/garantias/${w.id}`}>
                              <motion.span whileHover={{ scale: 1.15 }}
                                className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#94a3b8" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <Eye style={{ width: 14, height: 14 }} />
                              </motion.span>
                            </Link>
                          </Tooltip>
                          <Tooltip label="Editar">
                            <motion.span whileHover={{ scale: 1.15 }}
                              className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#94a3b8" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <Pencil style={{ width: 14, height: 14 }} />
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
              por página · <strong>{total}</strong> garantia{total !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                style={{ color: "#64748b" }}>‹</button>
              {pageButtons().map((p, i) =>
                p === "…" ? (
                  <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs"
                    style={{ color: "#94a3b8" }}>…</span>
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
