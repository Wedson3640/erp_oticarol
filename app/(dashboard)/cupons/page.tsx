"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import {
  Search, Filter, X, Tag, Loader2, AlertTriangle,
  Percent, DollarSign,
} from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate } from "@/lib/types"

// â”€â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CouponRow {
  id:                number
  source_rails_id:   number | null
  name:              string
  discount_type:     "percent" | "value"
  discount_percent:  number | null
  discount_value:    number | null
  minimum_value:     number | null
  description:       string | null
  expiration:        string | null
  redemptions_count: number
  active:            boolean
  created_at:        string
  created_by:        { id: number; short_name: string | null } | null
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmtDiscount(row: CouponRow): string {
  if (row.discount_type === "percent" && row.discount_percent != null)
    return `${row.discount_percent}%`
  if (row.discount_type === "value" && row.discount_value != null)
    return `R$ ${Number(row.discount_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
  return "â€”"
}

function fmtMinValue(v: number | null): string {
  if (v == null || v === 0) return "Sem mÃ­nimo"
  return `Min. R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
}

function isExpired(expiration: string | null): boolean {
  if (!expiration) return false
  return new Date(expiration) < new Date()
}

// â”€â”€â”€ Componente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function CuponsPage() {

  // Cupons
  const [coupons,        setCoupons]        = useState<CouponRow[]>([])
  const [total,          setTotal]          = useState(0)
  const [loadingCoupons, setLoadingCoupons] = useState(false)

  // Filtros
  const [typeFilter,    setTypeFilter]    = useState("")           // "" | "percent" | "value"
  const [statusFilter,  setStatusFilter]  = useState("active")    // "active" | "expired" | ""
  const [textSearch,    setTextSearch]    = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // PaginaÃ§Ã£o
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage,     setPerPage]     = useState(25)

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(textSearch); setCurrentPage(1) }, 350)
    return () => clearTimeout(t)
  }, [textSearch])

  // â”€â”€â”€ Carga â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    async function load() {
      setLoadingCoupons(true)
      const sb = createSupabaseBrowserClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = sb
        .from("coupons")
        .select(
          `id, source_rails_id, name, discount_type,
           discount_percent, discount_value, minimum_value,
           description, expiration, redemptions_count, active, created_at,
           created_by:employees!created_by_id(id,short_name)`,
          { count: "exact" },
        )
        .is("deleted_at", null)
        .order("id", { ascending: false })

      if (typeFilter) q = q.eq("discount_type", typeFilter)

      if (statusFilter === "active") {
        // ativos = active=true E (sem validade OU validade >= hoje)
        const today = new Date().toISOString().split("T")[0]
        q = q.eq("active", true)
          .or(`expiration.is.null,expiration.gte.${today}`)
      } else if (statusFilter === "expired") {
        const today = new Date().toISOString().split("T")[0]
        q = q.lt("expiration", today)
      }

      if (debouncedSearch) {
        q = q.ilike("name", `%${debouncedSearch.trim()}%`)
      }

      const from = (currentPage - 1) * perPage
      q = q.range(from, from + perPage - 1)

      const { data, count, error } = await q
      if (error) console.error("[cupons] Supabase error:", error)
      setCoupons((data ?? []) as CouponRow[])
      setTotal(count ?? 0)
      setLoadingCoupons(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, debouncedSearch, currentPage, perPage])

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

  // â”€â”€â”€ Estilos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const selCls = "appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm border outline-none transition-colors cursor-pointer"
  const selStyle = {
    borderColor: "#e2e8f0", color: "#3c4859",
    background: "#f8fafc url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 8px center",
  }

  // â”€â”€â”€ Badges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function StatusBadge({ row }: { row: CouponRow }) {
    if (!row.active)
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
               style={{ background: "#F1F5F9", color: "#64748B" }}>Inativo</span>
    if (isExpired(row.expiration))
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
               style={{ background: "#FEF3C7", color: "#92400E" }}>
               <AlertTriangle className="w-3 h-3" /> Expirado
             </span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
             style={{ background: "#D1FAE5", color: "#065F46" }}>Ativo</span>
  }

  function DiscountTypeBadge({ type }: { type: string }) {
    if (type === "percent")
      return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
               style={{ background: "#EDE9FE", color: "#6D28D9" }}>
               <Percent className="w-3 h-3" /> %
             </span>
    return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
             style={{ background: "#ECFDF5", color: "#059669" }}>
             <DollarSign className="w-3 h-3" /> R$
           </span>
  }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <>
      <Header breadcrumbs={["Home", "Compras", "Cupons"]} title="Cupons de Desconto" />

      <main className="pt-[64px] px-8 py-6 space-y-4">

        {/* Totalizador */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "#EDE9FE", color: "#6D28D9" }}>
              <Tag className="w-3.5 h-3.5" />
              {loadingCoupons ? "carregandoâ€¦" : `${total.toLocaleString("pt-BR")} cupom${total !== 1 ? "ns" : ""}`}
            </span>
          </div>
        </motion.div>

        {/* Filtros */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "#7e8b9c" }} />

          {/* Tipo de desconto */}
          <select value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1) }}
            className={selCls} style={selStyle}
          >
            <option value="">Todos os tipos</option>
            <option value="percent">Desconto em %</option>
            <option value="value">Desconto em R$</option>
          </select>

          {/* Status */}
          <select value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            className={selCls} style={selStyle}
          >
            <option value="active">Somente ativos</option>
            <option value="expired">Somente expirados</option>
            <option value="">Todos</option>
          </select>

          {/* Busca por nome */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm flex-1 min-w-[200px]"
            style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Buscar cupom por nomeâ€¦"
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

        {/* Cards de cupons */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="relative"
        >
          {/* Loading overlay */}
          <AnimatePresence>
            {loadingCoupons && (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.7)" }}
              >
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0f2744" }} />
              </motion.div>
            )}
          </AnimatePresence>

          {coupons.length === 0 && !loadingCoupons ? (
            <div className="rounded-xl border py-16 text-center text-sm"
              style={{ background: "#fff", borderColor: "#e2e8f0", color: "#94a3b8" }}>
              Nenhum cupom encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {coupons.map((c, idx) => {
                const expired = isExpired(c.expiration)
                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-xl border p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
                    style={{
                      background: expired ? "#fafafa" : "#fff",
                      borderColor: expired ? "#e2e8f0" : "#e2e8f0",
                      opacity: expired ? 0.75 : 1,
                    }}
                  >
                    {/* Header do card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base truncate" style={{ color: "#0f2744" }}>
                          {c.name}
                        </p>
                        {c.description && (
                          <Tooltip label={c.description}>
                            <p className="text-xs truncate cursor-default mt-0.5"
                              style={{ color: "#64748b" }}>
                              {c.description}
                            </p>
                          </Tooltip>
                        )}
                      </div>
                      <DiscountTypeBadge type={c.discount_type} />
                    </div>

                    {/* Desconto em destaque */}
                    <div className="flex items-center justify-center py-3 rounded-lg"
                      style={{ background: c.discount_type === "percent" ? "#EDE9FE" : "#ECFDF5" }}>
                      <span className="text-3xl font-black"
                        style={{ color: c.discount_type === "percent" ? "#6D28D9" : "#059669" }}>
                        {fmtDiscount(c)}
                      </span>
                    </div>

                    {/* Detalhes */}
                    <div className="space-y-1.5 text-xs" style={{ color: "#64748b" }}>
                      <div className="flex items-center justify-between">
                        <span>Valor mÃ­nimo:</span>
                        <span className="font-medium" style={{ color: "#3c4859" }}>
                          {fmtMinValue(c.minimum_value)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Resgates:</span>
                        <span className="font-medium" style={{ color: "#3c4859" }}>
                          {c.redemptions_count.toLocaleString("pt-BR")}Ã—
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Validade:</span>
                        <span className="font-medium"
                          style={{ color: expired ? "#EF4444" : "#3c4859" }}>
                          {c.expiration ? fmtDate(c.expiration) : "Sem validade"}
                        </span>
                      </div>
                      {c.created_by && (
                        <div className="flex items-center justify-between">
                          <span>Criado por:</span>
                          <span className="font-medium" style={{ color: "#3c4859" }}>
                            {c.created_by.short_name ?? "â€”"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="pt-1 border-t flex items-center justify-between"
                      style={{ borderColor: "#f1f5f9" }}>
                      <StatusBadge row={c} />
                      <span className="text-xs" style={{ color: "#cbd5e1" }}>
                        #{c.source_rails_id ?? c.id}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* PaginaÃ§Ã£o */}
        {totalPages > 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex items-center justify-between pt-1"
          >
            <span className="text-xs" style={{ color: "#94a3b8" }}>
              {total.toLocaleString("pt-BR")} cupom{total !== 1 ? "ns" : ""} â€”
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
