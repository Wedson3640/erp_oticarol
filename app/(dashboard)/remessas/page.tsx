"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import {
  Search, Filter, ExternalLink, X,
  MapPin, Package, Truck, Loader2,
} from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate } from "@/lib/types"

// â”€â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Store    { id: number; code: string; name: string }
interface Employee { id: number; short_name: string | null }

interface ShipmentRow {
  id:              number
  source:          string
  source_erp_id:   number | null
  source_rails_id: number | null
  customer_name:   string | null
  ship_date:       string | null
  addr_street:     string | null
  addr_number:     string | null
  addr_complement: string | null
  addr_zip:        string | null
  addr_district:   string | null
  addr_city:       string | null
  addr_uf:         string | null
  tracking_number: string | null
  notes:           string | null
  flag:            number
  store:    { id: number; code: string; name: string } | null
  employee: { id: number; short_name: string | null } | null
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** EndereÃ§o compacto para exibiÃ§Ã£o na tabela */
function fmtAddr(row: ShipmentRow): string {
  const parts = [
    row.addr_street,
    row.addr_number && `nÂº ${row.addr_number}`,
    row.addr_complement,
    row.addr_district,
    row.addr_city && row.addr_uf ? `${row.addr_city}/${row.addr_uf}` : row.addr_city,
  ].filter(Boolean)
  return parts.join(", ") || "â€”"
}

/** Link do Correios Rastrear para cÃ³digo de 13 chars */
function correiosUrl(code: string): string {
  return `https://www.correios.com.br/rastreamento/detalhe/${code.toUpperCase()}`
}

// â”€â”€â”€ Componente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function RemessasPage() {

  // ReferÃªncia
  const [stores,     setStores]     = useState<Store[]>([])
  const [loadingRef, setLoadingRef] = useState(true)

  // Remessas
  const [shipments,       setShipments]       = useState<ShipmentRow[]>([])
  const [total,           setTotal]           = useState(0)
  const [loadingShipments,setLoadingShipments] = useState(false)

  // Filtros
  const nowDate     = new Date()
  const defaultMonth = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`
  const [monthFilter,  setMonthFilter]  = useState(defaultMonth)
  const [storeFilter,  setStoreFilter]  = useState("")
  const [flagFilter,   setFlagFilter]   = useState("")    // "" | "0" | "1"
  const [textSearch,   setTextSearch]   = useState("")    // cliente ou rastreamento
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // PaginaÃ§Ã£o
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage,     setPerPage]     = useState(25)

  // â”€â”€â”€ ReferÃªncia â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    const sb = createSupabaseBrowserClient()
    sb.from("stores").select("id, code, name").eq("active", true)
      .then(sRes => {
        if (sRes.data) setStores(
          [...sRes.data].sort((a, b) =>
            (parseInt(a.code) || 0) - (parseInt(b.code) || 0),
          ) as Store[],
        )
        setLoadingRef(false)
      })
  }, [])

  // Debounce da busca textual
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(textSearch); setCurrentPage(1) }, 350)
    return () => clearTimeout(t)
  }, [textSearch])

  // â”€â”€â”€ Carga de remessas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    async function load() {
      setLoadingShipments(true)
      const sb = createSupabaseBrowserClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = sb
        .from("shipments")
        .select(
          `id, source, source_erp_id, source_rails_id,
           customer_name, ship_date,
           addr_street, addr_number, addr_complement,
           addr_zip, addr_district, addr_city, addr_uf,
           tracking_number, notes, flag,
           store:stores!store_id(id,code,name),
           employee:employees!employee_id(id,short_name)`,
          { count: "exact" },
        )
        .is("deleted_at", null)
        .order("ship_date", { ascending: false, nullsFirst: false })
        .order("id",        { ascending: false })

      // Filtro de mÃªs
      if (monthFilter) {
        const [y, m] = monthFilter.split("-").map(Number)
        const start  = `${y}-${String(m).padStart(2, "0")}-01`
        const end    = new Date(y, m, 1)
        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-01`
        q = q.gte("ship_date", start).lt("ship_date", endStr)
      }

      if (storeFilter) q = q.eq("store_id",  parseInt(storeFilter))
      if (flagFilter !== "") q = q.eq("flag", parseInt(flagFilter))

      // Busca por cliente ou cÃ³digo de rastreamento
      if (debouncedSearch) {
        const s = debouncedSearch.trim()
        // se parece um cÃ³digo de rastreamento (alfanum â‰¥ 8 chars, sem espaÃ§os)
        if (/^[A-Z0-9]{8,13}$/i.test(s.replace(/\s/g, ""))) {
          q = q.ilike("tracking_number", `%${s}%`)
        } else {
          q = q.ilike("customer_name", `%${s}%`)
        }
      }

      const from = (currentPage - 1) * perPage
      q = q.range(from, from + perPage - 1)

      const { data, count, error } = await q
      if (error) console.error("[remessas] Supabase error:", error)
      setShipments((data ?? []) as ShipmentRow[])
      setTotal(count ?? 0)
      setLoadingShipments(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, storeFilter, flagFilter, debouncedSearch, currentPage, perPage])

  // â”€â”€â”€ PaginaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage   = Math.min(currentPage, totalPages)

  function pageButtons(): (number | "â€¦")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | "â€¦")[] = [1]
    if (safePage > 3) pages.push("â€¦")
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++)
      pages.push(p)
    if (safePage < totalPages - 2) pages.push("â€¦")
    pages.push(totalPages)
    return pages
  }

  // â”€â”€â”€ Estilos reutilizados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const selCls = "appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm border outline-none transition-colors cursor-pointer"
  const selStyle = {
    borderColor: "#e2e8f0", color: "#3c4859",
    background: "#f8fafc url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 8px center",
  }

  // â”€â”€â”€ Flag badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function FlagBadge({ flag }: { flag: number }) {
    if (flag === 1)
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
               style={{ background: "#D1FAE5", color: "#065F46" }}>Entregue</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
             style={{ background: "#DBEAFE", color: "#1E40AF" }}>Enviado</span>
  }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <>
      <Header breadcrumbs={["Home", "Compras", "Remessas"]} title="Remessas" />

      <main className="pt-[64px] px-8 py-6 space-y-4">

        {/* Totalizador */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "#EFF6FF", color: "#1E40AF" }}>
              <Truck className="w-3.5 h-3.5" />
              {loadingShipments ? "carregandoâ€¦" : `${total.toLocaleString("pt-BR")} remessa${total !== 1 ? "s" : ""}`}
            </span>
          </div>
        </motion.div>

        {/* Filtros */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "#7e8b9c" }} />

          {/* MÃªs */}
          <input
            type="month"
            value={monthFilter}
            onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1) }}
            className={selCls}
            style={{ ...selStyle, background: "#f8fafc" }}
          />

          {/* Loja */}
          <select value={storeFilter}
            onChange={e => { setStoreFilter(e.target.value); setCurrentPage(1) }}
            className={selCls} style={selStyle}
            disabled={loadingRef}
          >
            <option value="">Todas as lojas</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.code} â€” {s.name}</option>
            ))}
          </select>

          {/* Status (flag) */}
          <select value={flagFilter}
            onChange={e => { setFlagFilter(e.target.value); setCurrentPage(1) }}
            className={selCls} style={selStyle}
          >
            <option value="">Todos os status</option>
            <option value="0">Enviado</option>
            <option value="1">Entregue</option>
          </select>

          {/* Busca por cliente / rastreamento */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm flex-1 min-w-[220px]"
            style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Buscar cliente ou rastreamentoâ€¦"
              value={textSearch}
              onChange={e => setTextSearch(e.target.value)}
              className="outline-none bg-transparent w-full text-sm placeholder-slate-400"
              style={{ color: "#3c4859" }}
            />
            {textSearch && (
              <button onClick={() => setTextSearch("")} className="p-0.5 rounded hover:bg-slate-200">
                <X className="w-3 h-3" style={{ color: "#94a3b8" }} />
              </button>
            )}
          </div>

          {/* Registros por pÃ¡gina */}
          <select value={perPage}
            onChange={e => { setPerPage(parseInt(e.target.value)); setCurrentPage(1) }}
            className={selCls} style={selStyle}
          >
            {[25, 50, 100].map(n => <option key={n} value={n}>{n}/pÃ¡g</option>)}
          </select>
        </motion.div>

        {/* Tabela */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border overflow-hidden relative"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          {/* Loading overlay */}
          <AnimatePresence>
            {loadingShipments && (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.7)" }}
              >
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0f2744" }} />
              </motion.div>
            )}
          </AnimatePresence>

          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                  style={{ color: "#7e8b9c" }}>Data</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                  style={{ color: "#7e8b9c" }}>Loja</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                  style={{ color: "#7e8b9c" }}>DestinatÃ¡rio</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                  style={{ color: "#7e8b9c" }}>EndereÃ§o</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                  style={{ color: "#7e8b9c" }}>Rastreamento</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                  style={{ color: "#7e8b9c" }}>Status</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                  style={{ color: "#7e8b9c" }}>Obs.</th>
              </tr>
            </thead>
            <tbody>
              {shipments.length === 0 && !loadingShipments ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm"
                    style={{ color: "#94a3b8" }}>
                    Nenhuma remessa encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : shipments.map((s, idx) => (
                <motion.tr key={s.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.015 }}
                  className="border-b hover:bg-slate-50 transition-colors"
                  style={{ borderColor: "#f1f5f9" }}
                >
                  {/* Data */}
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs"
                    style={{ color: "#3c4859" }}>
                    {fmtDate(s.ship_date)}
                  </td>

                  {/* Loja */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {s.store ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: "#EFF6FF", color: "#1E40AF" }}>
                        {s.store.code}
                      </span>
                    ) : "â€”"}
                  </td>

                  {/* DestinatÃ¡rio */}
                  <td className="px-4 py-3">
                    <span className="font-medium" style={{ color: "#3c4859" }}>
                      {s.customer_name || "â€”"}
                    </span>
                    {s.employee && (
                      <span className="block text-xs" style={{ color: "#94a3b8" }}>
                        por {s.employee.short_name}
                      </span>
                    )}
                  </td>

                  {/* EndereÃ§o */}
                  <td className="px-4 py-3 max-w-[260px]">
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#94a3b8" }} />
                      <span className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                        {fmtAddr(s)}
                        {s.addr_zip && (
                          <span className="block font-mono">{s.addr_zip}</span>
                        )}
                      </span>
                    </div>
                  </td>

                  {/* Rastreamento */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {s.tracking_number ? (
                      <Tooltip label="Rastrear nos Correios">
                        <a
                          href={correiosUrl(s.tracking_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 font-mono text-xs hover:underline"
                          style={{ color: "#0f2744" }}
                        >
                          <Package className="w-3.5 h-3.5" />
                          {s.tracking_number.toUpperCase()}
                          <ExternalLink className="w-3 h-3" style={{ color: "#94a3b8" }} />
                        </a>
                      </Tooltip>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>â€”</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <FlagBadge flag={s.flag} />
                  </td>

                  {/* Obs */}
                  <td className="px-4 py-3 max-w-[200px]">
                    {s.notes ? (
                      <Tooltip label={s.notes}>
                        <span className="text-xs truncate block max-w-[180px] cursor-default"
                          style={{ color: "#64748b" }}>
                          {s.notes}
                        </span>
                      </Tooltip>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>â€”</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* PaginaÃ§Ã£o */}
        {totalPages > 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex items-center justify-between pt-1"
          >
            <span className="text-xs" style={{ color: "#94a3b8" }}>
              {total.toLocaleString("pt-BR")} remessa{total !== 1 ? "s" : ""} â€”
              pÃ¡gina {safePage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40"
                style={{ borderColor: "#e2e8f0", color: "#3c4859" }}
              >â†</button>
              {pageButtons().map((p, i) =>
                p === "â€¦" ? (
                  <span key={`e${i}`} className="px-2 py-1 text-sm" style={{ color: "#94a3b8" }}>â€¦</span>
                ) : (
                  <button key={p}
                    onClick={() => setCurrentPage(p)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                    style={{
                      borderColor: p === safePage ? "#0f2744" : "#e2e8f0",
                      background:  p === safePage ? "#0f2744" : "transparent",
                      color:       p === safePage ? "#fff"    : "#3c4859",
                    }}
                  >{p}</button>
                ),
              )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40"
                style={{ borderColor: "#e2e8f0", color: "#3c4859" }}
              >â†’</button>
            </div>
          </motion.div>
        )}
      </main>
    </>
  )
}
