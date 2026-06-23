"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Plus, Search, Filter, Eye, Pencil, Trash2, X, UserX, UserCheck, Loader2 } from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import Link from "next/link"
import { initials } from "@/lib/utils"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import { fmtDate } from "@/lib/types"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface EmployeeRow {
  id:              number
  full_name:       string
  short_name:      string | null
  cpf:             string | null
  status:          string
  hiring_date:     string | null
  active:          boolean
  store?:          { id: number; code: string; name: string } | null
  job?:            { id: number; name: string } | null
  department?:     { id: number; name: string } | null
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#3B82F6,#0F5BFF)",
  "linear-gradient(135deg,#8B5CF6,#6D28D9)",
  "linear-gradient(135deg,#10B981,#059669)",
  "linear-gradient(135deg,#F59E0B,#D97706)",
  "linear-gradient(135deg,#EF4444,#DC2626)",
  "linear-gradient(135deg,#0891B2,#0E7490)",
]

// "ATIVO" → "Ativo", "AFASTADO" → "Afastado", etc.
function fmtStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

// ─── Modal Desativar / Reativar ───────────────────────────────────────────────

function ModalDesativar({
  employee,
  onClose,
  onConfirm,
  loading,
}: {
  employee:  EmployeeRow
  onClose:   () => void
  onConfirm: () => void
  loading:   boolean
}) {
  const jaInativo = !employee.active || employee.status === "DESLIGADO"

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ backdropFilter: "blur(4px)", background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden"
          style={{ maxWidth: 420 }}
          initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid #f1f5f9" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: jaInativo ? "#D1FAE5" : "#FEE2E2" }}>
                {jaInativo
                  ? <UserCheck className="w-4 h-4" style={{ color: "#16a34a" }} />
                  : <UserX className="w-4 h-4" style={{ color: "#dc2626" }} />
                }
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f2744" }}>
                {jaInativo ? "Reativar funcionário" : "Desativar funcionário"}
              </h3>
            </div>
            <button onClick={onClose} style={{ color: "#7e8b9c" }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corpo */}
          <div className="px-6 py-5 space-y-4">
            {/* Card do funcionário */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: AVATAR_COLORS[employee.id % AVATAR_COLORS.length] }}>
                {employee.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f2744" }}>{employee.full_name}</p>
                <p style={{ fontSize: 12, color: "#7e8b9c" }}>
                  {employee.job?.name ?? "Sem cargo"} · {employee.store?.code ?? "Sem loja"}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 14, color: "#556376", lineHeight: 1.6 }}>
              {jaInativo
                ? "Ao reativar, o funcionário voltará a aparecer como ativo e poderá ser vinculado a pedidos e movimentações."
                : "Ao desativar, o funcionário não poderá ser vinculado a novos pedidos ou movimentações. Este campo pode ser revertido a qualquer momento."
              }
            </p>
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-2 px-6 py-4"
            style={{ borderTop: "1px solid #f1f5f9" }}>
            <button onClick={onClose} disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ color: "#556376" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              Cancelar
            </button>
            <motion.button
              onClick={onConfirm}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: jaInativo ? "#16a34a" : "#dc2626" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde…</>
                : jaInativo
                  ? <><UserCheck className="w-4 h-4" /> Sim, reativar</>
                  : <><UserX className="w-4 h-4" /> Sim, desativar</>
              }
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FuncionariosPage() {
  const [employees,    setEmployees]    = useState<EmployeeRow[]>([])
  const [total,        setTotal]        = useState(0)
  const [loading,      setLoading]      = useState(true)

  // Filtros
  const [search,       setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("")

  // Paginação
  const [page,    setPage]    = useState(1)
  const [perPage, setPerPage] = useState(25)

  // Modal desativar
  const [desativarTarget,  setDesativarTarget]  = useState<EmployeeRow | null>(null)
  const [desativarLoading, setDesativarLoading] = useState(false)
  const [reload,           setReload]           = useState(0)

  // ─── Desativar / Reativar ────────────────────────────────────────────────────

  async function handleDesativar() {
    if (!desativarTarget) return
    setDesativarLoading(true)
    const jaInativo = !desativarTarget.active || desativarTarget.status === "DESLIGADO"
    const sb = createSupabaseBrowserClient()
    await sb.from("employees").update({
      active: jaInativo ? true : false,
      status: jaInativo ? "ATIVO" : "DESLIGADO",
    }).eq("id", desativarTarget.id)
    setDesativarLoading(false)
    setDesativarTarget(null)
    setReload(r => r + 1)
  }

  // ─── Carga ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true)
      const sb = createSupabaseBrowserClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = sb
        .from("employees")
        .select(
          "id, full_name, short_name, cpf, status, hiring_date, active, store:stores!store_id(id,code,name), job:jobs!job_id(id,name), department:departments!department_id(id,name)",
          { count: "exact" },
        )
        .is("deleted_at", null)
        .order("full_name")

      if (statusFilter)            q = q.eq("status", statusFilter)
      if (activeFilter !== "")     q = q.eq("active", activeFilter === "true")
      if (search.trim().length > 1)
        q = q.or(`full_name.ilike.%${search.trim()}%,cpf.ilike.%${search.trim()}%`)

      const from = (page - 1) * perPage
      q = q.range(from, from + perPage - 1)

      const { data, count, error } = await q
      if (error) console.error("[funcionarios] Supabase error:", JSON.stringify(error))
      setEmployees((data ?? []) as EmployeeRow[])
      setTotal(count ?? 0)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, activeFilter, page, perPage, reload])

  // ─── Paginação ───────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const safePage   = Math.min(page, totalPages)

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

  const selCls = `
    appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm border outline-none
    transition-colors cursor-pointer
  `.trim()
  const selStyle = {
    borderColor: "#e2e8f0", color: "#3c4859",
    background: "#f8fafc url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 8px center",
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Header breadcrumbs={["Home", "Funcionários"]} title="Funcionários" />

      <main className="pt-[64px] px-8 py-6 space-y-4">

        {/* Barra de ações */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "#dbeafe", color: "#1d4ed8" }}>
            {loading ? "carregando…" : `${total} funcionário${total !== 1 ? "s" : ""}${statusFilter || activeFilter || search ? " encontrados" : ""}`}
          </span>
          <Link href="/funcionarios/novo">
            <motion.span
              whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.25)" }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ background: "#0f2744" }}
            >
              <Plus className="w-4 h-4" /> Cadastrar Funcionário
            </motion.span>
          </Link>
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "#7e8b9c" }} />

          {/* Status */}
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className={selCls} style={selStyle}
            onFocus={e => (e.target.style.borderColor = "#93c5fd")}
            onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="AFASTADO">Afastado</option>
            <option value="FERIAS">Férias</option>
            <option value="DESLIGADO">Desligado</option>
          </select>

          {/* Ativo/Inativo */}
          <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value as "" | "true" | "false"); setPage(1) }}
            className={selCls} style={selStyle}
            onFocus={e => (e.target.style.borderColor = "#93c5fd")}
            onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="">Ativos e inativos</option>
            <option value="true">Somente ativos</option>
            <option value="false">Somente inativos</option>
          </select>

          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: "#7e8b9c" }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nome ou CPF..."
              className="w-full pl-9 pr-8 py-1.5 rounded-lg text-sm border outline-none transition-colors"
              style={{ borderColor: "#e2e8f0", color: "#121212", background: "#f8fafc" }}
              onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
              onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
            />
            {search && (
              <button onClick={() => { setSearch(""); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#7e8b9c" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => { setStatusFilter(""); setActiveFilter(""); setSearch(""); setPage(1) }}
            className="text-sm transition-colors" style={{ color: "#7e8b9c" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#3c4859")}
            onMouseLeave={e => (e.currentTarget.style.color = "#7e8b9c")}
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
                {["Funcionário", "Cargo", "Departamento", "Loja", "Status", "Admissão", "Ações"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#556376" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: "#f1f5f9" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: "#f1f5f9" }} />
                        <div className="h-4 rounded animate-pulse w-32" style={{ background: "#f1f5f9" }} />
                      </div>
                    </td>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: "#f1f5f9", width: "70%" }} />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="h-4 rounded animate-pulse w-16" style={{ background: "#f1f5f9" }} />
                    </td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: "#7e8b9c" }}>
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {employees.map((f, i) => {
                    const statusLabel = fmtStatus(f.status)
                    return (
                      <motion.tr key={f.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b"
                        style={{
                          borderColor: "#f1f5f9",
                          opacity: f.status === "DESLIGADO" ? 0.6 : 1,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* Funcionário: avatar + nome */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                            >
                              {initials(f.short_name ?? f.full_name)}
                            </div>
                            <div>
                              <span className="font-semibold block" style={{ color: "#121212" }}>
                                {f.full_name}
                              </span>
                              {f.cpf && (
                                <span className="text-xs" style={{ color: "#7e8b9c" }}>{f.cpf}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cargo */}
                        <td className="px-4 py-3 text-sm" style={{ color: "#3c4859" }}>
                          {f.job?.name ?? "—"}
                        </td>

                        {/* Departamento */}
                        <td className="px-4 py-3 text-sm" style={{ color: "#556376" }}>
                          {f.department?.name ?? "—"}
                        </td>

                        {/* Loja */}
                        <td className="px-4 py-3">
                          {f.store ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                              {f.store.code}
                            </span>
                          ) : (
                            <span style={{ color: "#7e8b9c", fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={statusLabel} size="sm" />
                        </td>

                        {/* Admissão */}
                        <td className="px-4 py-3 text-xs" style={{ color: "#556376" }}>
                          {fmtDate(f.hiring_date)}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Tooltip label="Ver perfil">
                              <Link href={`/funcionarios/${f.id}`}>
                                <motion.span whileHover={{ scale: 1.15 }}
                                  className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#7e8b9c" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                  <Eye style={{ width: 14, height: 14 }} />
                                </motion.span>
                              </Link>
                            </Tooltip>
                            <Tooltip label="Editar">
                              <Link href={`/funcionarios/${f.id}/editar`}>
                                <motion.span whileHover={{ scale: 1.15 }}
                                  className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#7e8b9c" }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                  <Pencil style={{ width: 14, height: 14 }} />
                                </motion.span>
                              </Link>
                            </Tooltip>
                            <Tooltip label={!f.active || f.status === "DESLIGADO" ? "Reativar" : "Desativar"}>
                              <motion.button whileHover={{ scale: 1.15 }}
                                onClick={() => setDesativarTarget(f)}
                                className="p-1.5 rounded-lg" style={{ color: "#7e8b9c" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626" }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#7e8b9c" }}>
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
            <div className="flex items-center gap-2 text-xs" style={{ color: "#556376" }}>
              Mostrar
              <select value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                className="px-2 py-1 rounded border text-xs outline-none"
                style={{ borderColor: "#e2e8f0" }}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              por página · <strong>{total}</strong> funcionário{total !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                style={{ color: "#556376" }}>‹</button>

              {pageButtons().map((p, i) =>
                p === "…" ? (
                  <span key={`el-${i}`} className="w-8 h-8 flex items-center justify-center text-xs"
                    style={{ color: "#7e8b9c" }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: p === safePage ? "#0f2744" : "transparent",
                      color:      p === safePage ? "#fff"    : "#556376",
                    }}>{p}</button>
                )
              )}

              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                style={{ color: "#556376" }}>›</button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Modal desativar/reativar */}
      {desativarTarget && (
        <ModalDesativar
          employee={desativarTarget}
          onClose={() => setDesativarTarget(null)}
          onConfirm={handleDesativar}
          loading={desativarLoading}
        />
      )}
    </>
  )
}
