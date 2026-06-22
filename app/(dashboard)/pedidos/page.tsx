"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import {
  Plus, Barcode, Search, Filter, Pencil, Trash2,
  AlertTriangle, Clock, CheckCircle2, ArrowUpDown, X,
  // Eye removido — não usado na tabela atual
} from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import Link from "next/link"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate, fmtOs, prazoOk } from "@/lib/types"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Laboratory { id: number; name: string }
interface Store      { id: number; code: string; name: string }
interface ClientHint { id: number; name: string; cpf: string | null }

// Linha da view vw_pedidos — colunas planas, sem joins no PostgREST
interface OrderRow {
  id:                number
  source_erp_id:     number | null
  source_rails_id:   number | null
  source:            string
  os_number:         string
  os_sequence:       string | null
  situation:         string | null
  urgent:            boolean
  purchase_date:     string | null
  scheduled_delivery:string | null
  // Cliente
  customer_id:       number | null
  customer_name:     string | null
  customer_cpf:      string | null
  // Vendedor(a)
  employee_id:       number | null
  employee_name:     string | null
  // Loja
  store_id:          number | null
  store_code:        string | null
  store_name:        string | null
  // Lab
  laboratory_id:     number | null
  laboratory_name:   string | null
}

// Situações de pedido — lista fixa (espelha o sistema legado)
const ORDER_SITUATIONS = [
  "Aguardando",
  "No Laboratório",
  "Surfaçagem",
  "Em Andamento",
  "Pronto p/ Entrega",
  "Entregue",
  "Cancelado",
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PedidosPage() {

  // ── Dados de referência
  const [labs,       setLabs]       = useState<Laboratory[]>([])
  const [stores,     setStores]     = useState<Store[]>([])
  const [loadingRef, setLoadingRef] = useState(true)

  // ── Pedidos (servidor)
  const [orders,        setOrders]        = useState<OrderRow[]>([])
  const [total,         setTotal]         = useState(0)
  const [loadingOrders, setLoadingOrders] = useState(false)

  // ── Filtros
  // monthFilter: "YYYY-MM" — padrão = mês atual; "" = todos os meses
  const nowDate = new Date()
  const defaultMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`
  const [monthFilter,  setMonthFilter]  = useState(defaultMonth)
  // statusFilter: "pendente" = exclui Entregue+Cancelado (padrão fila de trabalho)
  const [statusFilter, setStatusFilter] = useState("pendente")
  const [labFilter,    setLabFilter]    = useState("")
  const [storeFilter,  setStoreFilter]  = useState("")

  // ── Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage,     setPerPage]     = useState(25)

  // ── Busca de cliente com autocomplete
  const [clientSearch,   setClientSearch]   = useState("")
  const [clientHints,    setClientHints]    = useState<ClientHint[]>([])
  const [searching,      setSearching]      = useState(false)
  const [showHints,      setShowHints]      = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientHint | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // ─── Carga dos filtros de referência ────────────────────────────────────────

  useEffect(() => {
    const sb = createSupabaseBrowserClient()
    Promise.all([
      sb.from("laboratories").select("id, name").order("name"),
      sb.from("stores").select("id, code, name").eq("active", true),
    ]).then(([lRes, stRes]) => {
      if (lRes.data)  setLabs(lRes.data as Laboratory[])
      if (stRes.data) setStores(
        [...stRes.data].sort((a, b) =>
          (parseInt(a.code) || 0) - (parseInt(b.code) || 0),
        ) as Store[],
      )
      setLoadingRef(false)
    })
  }, [])

  // ─── Carga de pedidos (server-side com filtros) ──────────────────────────────

  useEffect(() => {
    async function load() {
      setLoadingOrders(true)
      const sb = createSupabaseBrowserClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = sb
        .from("vw_pedidos")
        .select("*", { count: "exact" })
        .is("deleted_at", null)
        // mais recente primeiro (ID original do ERP PHP)
        .order("source_erp_id", { ascending: false, nullsFirst: false })

      // ── Filtro de mês (scheduled_delivery — fila de entrega do mês) ──
      if (monthFilter) {
        const [y, m] = monthFilter.split("-").map(Number)
        const start  = `${y}-${String(m).padStart(2, "0")}-01`
        const end    = new Date(y, m, 1)   // 1º do próximo mês (mês é 0-indexed)
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-01`
        q = q.gte("scheduled_delivery", start).lt("scheduled_delivery", endStr)
      }

      // ── Filtro de situação ──
      if (statusFilter === "pendente") {
        // fila de trabalho: exclui entregues e cancelados
        q = q.neq("situation", "Entregue").neq("situation", "Cancelado")
      } else if (statusFilter) {
        q = q.eq("situation", statusFilter)
      }

      if (storeFilter)    q = q.eq("store_id",      parseInt(storeFilter))
      if (labFilter)      q = q.eq("laboratory_id", parseInt(labFilter))
      if (selectedClient) q = q.eq("customer_id",   selectedClient.id)

      const from = (currentPage - 1) * perPage
      q = q.range(from, from + perPage - 1)

      const { data, count, error } = await q
      if (error) console.error("[pedidos] Supabase error:", JSON.stringify(error))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOrders((data ?? []) as any as OrderRow[])
      setTotal(count ?? 0)
      setLoadingOrders(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, statusFilter, labFilter, storeFilter, selectedClient?.id, currentPage, perPage])

  // ─── Fecha dropdown ao clicar fora ──────────────────────────────────────────

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowHints(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  // ─── Autocomplete de clientes (debounce 300ms) ───────────────────────────────

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

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function selectClient(c: ClientHint) {
    setSelectedClient(c); setClientSearch(c.name); setShowHints(false); setCurrentPage(1)
  }
  function clearClientSearch() {
    setSelectedClient(null); setClientSearch(""); setClientHints([]); setCurrentPage(1)
  }

  const selCls = `
    appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm border outline-none
    transition-colors cursor-pointer
  `.trim()
  const selStyle = {
    borderColor: "#e2e8f0", color: "#475569",
    background: "#f8fafc url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 8px center",
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Header breadcrumbs={["Home", "Pedidos"]} title="Pedidos" />

      <main className="pt-[64px] px-8 py-6 space-y-4">

        {/* Barra de ações */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "#dbeafe", color: "#1d4ed8" }}>
            {loadingOrders ? "carregando…" : (() => {
              const [y, m] = (monthFilter || "").split("-")
              const mesLabel = monthFilter
                ? new Date(Number(y), Number(m) - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" })
                : null
              return `${total} pedido${total !== 1 ? "s" : ""}${mesLabel ? ` com entrega em ${mesLabel}` : ""}${statusFilter === "pendente" ? " pendentes" : ""}`
            })()}
          </span>
          <div className="flex items-center gap-2">
            <Link href="/pedidos/codigo-de-barras">
              <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer"
                style={{ background: "#fff", borderColor: "#e2e8f0", color: "#475569" }}>
                <Barcode className="w-4 h-4" /> Código de Barras
              </motion.span>
            </Link>
            <Link href="/pedidos/busca-avancada">
              <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer"
                style={{ background: "#fff", borderColor: "#e2e8f0", color: "#475569" }}>
                <Search className="w-4 h-4" /> Busca Avançada
              </motion.span>
            </Link>
            <Link href="/pedidos/novo">
              <motion.span
                whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.25)" }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                style={{ background: "#0f2744" }}>
                <Plus className="w-4 h-4" /> Novo Pedido
              </motion.span>
            </Link>
          </div>
        </motion.div>

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "#94a3b8" }} />

          {/* Mês */}
          <input
            type="month"
            value={monthFilter}
            onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1) }}
            className="pl-3 pr-2 py-1.5 rounded-lg text-sm border outline-none transition-colors"
            style={{ borderColor: "#e2e8f0", color: "#475569", background: "#f8fafc" }}
            onFocus={e => (e.target.style.borderColor = "#93c5fd")}
            onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
          />

          {/* Situação */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            className={selCls} style={selStyle}
            onFocus={e => (e.target.style.borderColor = "#93c5fd")}
            onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="pendente">Não entregues</option>
            <option value="">Todos os status</option>
            {ORDER_SITUATIONS.map(sit => (
              <option key={sit} value={sit}>{sit}</option>
            ))}
          </select>

          {/* Laboratório */}
          <select
            value={labFilter}
            onChange={e => { setLabFilter(e.target.value); setCurrentPage(1) }}
            disabled={loadingRef}
            className={selCls} style={selStyle}
            onFocus={e => (e.target.style.borderColor = "#93c5fd")}
            onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="">Todos os labs</option>
            {labs.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          {/* Loja */}
          <select
            value={storeFilter}
            onChange={e => { setStoreFilter(e.target.value); setCurrentPage(1) }}
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

          {/* Busca cliente com autocomplete */}
          <div ref={searchRef} className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: "#94a3b8" }} />
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
              <button onClick={clearClientSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "#94a3b8" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <AnimatePresence>
              {showHints && clientHints.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
                  className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
                  style={{ border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15,39,68,0.10)", background: "#fff" }}
                >
                  {clientHints.map(c => (
                    <button key={c.id} onClick={() => selectClient(c)}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-blue-50">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{c.name}</p>
                        {c.cpf && <p className="text-xs" style={{ color: "#94a3b8" }}>{c.cpf}</p>}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => {
              setMonthFilter(defaultMonth); setStatusFilter("pendente")
              setLabFilter(""); setStoreFilter("")
              clearClientSearch()
            }}
            className="text-sm transition-colors"
            style={{ color: "#94a3b8" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#475569")}
            onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
          >
            Limpar
          </button>
        </motion.div>

        {/* Tabela */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="rounded-xl border overflow-hidden"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["ID", "Pedido", "Cliente", "Vendedor(a)", "Entrega", "Status", "Ações"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#64748b" }}>
                    <div className="flex items-center gap-1">
                      {h}
                      {["ID", "Pedido", "Entrega"].includes(h) && (
                        <ArrowUpDown className="w-3 h-3" style={{ color: "#cbd5e1" }} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingOrders ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: "#f1f5f9" }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: "#f1f5f9", width: j === 2 ? "80%" : "60%" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: "#94a3b8" }}>
                    Nenhum pedido encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {orders.map((o, i) => {
                    const os       = fmtOs(o.os_number, o.os_sequence)
                    const sit      = o.situation ?? "—"
                    const prazoOkV = prazoOk(o.scheduled_delivery)
                    // ID a exibir: ID original do sistema legado
                    const displayId = o.source_erp_id ?? o.source_rails_id ?? o.id

                    return (
                      <motion.tr key={o.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b cursor-pointer"
                        style={{
                          borderColor: "#f1f5f9",
                          borderLeft: o.urgent ? "3px solid #dc2626" : "3px solid transparent",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* ID */}
                        <td className="px-4 py-3 w-16">
                          <span className="font-bold text-sm" style={{ color: "#0f172a" }}>
                            {displayId}
                          </span>
                        </td>

                        {/* PEDIDO: número/sequência + data de compra */}
                        <td className="px-4 py-3">
                          <Link href={`/pedidos/${o.id}`}
                            className="font-mono font-bold text-xs hover:underline block"
                            style={{ color: "#1d4ed8" }}>
                            {os}
                            {o.urgent && (
                              <span className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-white"
                                style={{ background: "#dc2626", fontSize: 9, fontWeight: 700 }}>
                                <AlertTriangle style={{ width: 8, height: 8 }} /> URG
                              </span>
                            )}
                          </Link>
                          <span className="text-xs block mt-0.5" style={{ color: "#94a3b8" }}>
                            {fmtDate(o.purchase_date)}
                          </span>
                        </td>

                        {/* CLIENTE: nome + CPF */}
                        <td className="px-4 py-3">
                          <span className="font-medium text-sm block" style={{ color: "#0f172a" }}>
                            {o.customer_name ?? "—"}
                          </span>
                          {o.customer_cpf && (
                            <span className="text-xs block mt-0.5" style={{ color: "#94a3b8" }}>
                              {o.customer_cpf}
                            </span>
                          )}
                        </td>

                        {/* VENDEDOR(A): nome + loja */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium block" style={{ color: "#475569" }}>
                            {o.employee_name ?? "—"}
                          </span>
                          {o.store_code && (
                            <span className="text-xs block mt-0.5" style={{ color: "#94a3b8" }}>
                              {o.store_code} — {o.store_name}
                            </span>
                          )}
                        </td>

                        {/* ENTREGA */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {sit === "Entregue" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#16a34a" }} />
                            ) : prazoOkV ? (
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3b82f6" }} />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#dc2626" }} />
                            )}
                            <span className="text-xs" style={{
                              color: prazoOkV ? "#475569" : "#dc2626",
                              fontWeight: prazoOkV ? 400 : 600,
                            }}>
                              {fmtDate(o.scheduled_delivery)}
                            </span>
                          </div>
                        </td>

                        {/* STATUS: badge de situação + data de compra como referência */}
                        <td className="px-4 py-3">
                          {sit !== "—"
                            ? <StatusBadge status={sit} size="sm" />
                            : <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                          }
                          <span className="text-xs block mt-0.5" style={{ color: "#94a3b8" }}>
                            {fmtDate(o.purchase_date)}
                          </span>
                        </td>

                        {/* AÇÕES */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Tooltip label="Ver pedido">
                              <Link href={`/pedidos/${o.id}`}>
                                <motion.span whileHover={{ scale: 1.15 }}
                                  className="p-1.5 rounded-lg transition-colors cursor-pointer"
                                  style={{ color: "#94a3b8" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                  <Pencil style={{ width: 14, height: 14 }} />
                                </motion.span>
                              </Link>
                            </Tooltip>
                            <Tooltip label="Excluir">
                              <motion.button whileHover={{ scale: 1.15 }}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: "#94a3b8" }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = "#fee2e2"
                                  e.currentTarget.style.color = "#dc2626"
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = "transparent"
                                  e.currentTarget.style.color = "#94a3b8"
                                }}>
                                <Trash2 style={{ width: 14, height: 14 }} />
                              </motion.button>
                            </Tooltip>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: "#f1f5f9" }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#64748b" }}>
              Mostrar
              <select value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1) }}
                className="px-2 py-1 rounded border text-xs outline-none"
                style={{ borderColor: "#e2e8f0" }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              por página · <strong>{total}</strong> pedido{total !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                style={{ color: "#64748b" }}>‹</button>

              {pageButtons().map((p, i) =>
                p === "…" ? (
                  <span key={`el-${i}`} className="w-8 h-8 flex items-center justify-center text-xs"
                    style={{ color: "#94a3b8" }}>…</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p as number)}
                    className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: p === safePage ? "#0f2744" : "transparent",
                      color:      p === safePage ? "#fff"    : "#64748b",
                    }}>{p}</button>
                )
              )}

              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                style={{ color: "#64748b" }}>›</button>
            </div>
          </div>
        </motion.div>
      </main>

    </>
  )
}
