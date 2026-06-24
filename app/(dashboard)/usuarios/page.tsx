"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import {
  Plus, Search, Pencil, Key, Trash2, X, Check, Info, AlertTriangle,
  ShieldCheck, ToggleLeft, ToggleRight, Loader2, UserX, UserCheck,
} from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import { initials } from "@/lib/utils"
import { fmtDate } from "@/lib/types"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UserRow {
  id:          number
  username:    string
  dashboard:   string | null
  groups:      string[] | null
  active:      boolean
  first_login: boolean
  created_at:  string
  employee: {
    id:         number
    full_name:  string
    short_name: string | null
    job:  { name: string } | null
    store:{ code: string; name: string } | null
  } | null
}

interface EmployeeOption {
  id:         number
  full_name:  string
  short_name: string | null
  job:  { name: string } | null
  store:{ code: string } | null
}

// ─── Constantes visuais ───────────────────────────────────────────────────────

const DASHBOARDS = ["Comercial", "Gerente", "Admin", "Relatórios"]

const GRUPOS_PERMISSAO = [
  { id: 1, nome: "Vendas",      descricao: "Pedidos, garantias e CRM",            flags: ["Visualizar","Criar","Editar"],              cor: "#dbeafe", corTexto: "#1e40af" },
  { id: 2, nome: "Gestão",      descricao: "Metas, funcionários e relatórios",     flags: ["Visualizar","Criar","Editar","Relatório"],  cor: "#ede9fe", corTexto: "#5b21b6" },
  { id: 3, nome: "Caixa",       descricao: "Acertos financeiros e cupons",         flags: ["Visualizar","Criar"],                       cor: "#dcfce7", corTexto: "#14532d" },
  { id: 4, nome: "Admin",       descricao: "Configurações e usuários",             flags: ["Visualizar","Criar","Editar","Excluir"],    cor: "#fef3c7", corTexto: "#92400e" },
  { id: 5, nome: "Superadmin",  descricao: "Acesso total irrestrito",              flags: ["Todos os acessos"],                         cor: "#fee2e2", corTexto: "#991b1b" },
]

const AVATAR_COLORS = [
  "linear-gradient(135deg,#3B82F6,#0F5BFF)",
  "linear-gradient(135deg,#8B5CF6,#6D28D9)",
  "linear-gradient(135deg,#10B981,#059669)",
  "linear-gradient(135deg,#F59E0B,#D97706)",
  "linear-gradient(135deg,#EF4444,#DC2626)",
]

// ─── Modal Cadastrar Usuário ──────────────────────────────────────────────────

function ModalCadastro({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [employees,    setEmployees]    = useState<EmployeeOption[]>([])
  const [loadingEmps,  setLoadingEmps]  = useState(true)

  const [employeeId,   setEmployeeId]   = useState("")
  const [username,     setUsername]     = useState("")
  const [dashboard,    setDashboard]    = useState("")
  const [grupos,       setGrupos]       = useState<string[]>([])
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [saving,       setSaving]       = useState(false)
  const [globalErr,    setGlobalErr]    = useState("")
  const [success,      setSuccess]      = useState(false)

  // ── Carrega funcionários sem usuário
  useEffect(() => {
    async function load() {
      const sb = createSupabaseBrowserClient()

      // Primeiro: pega os employee_ids já vinculados a algum usuário
      const { data: usedRows } = await sb
        .from("users")
        .select("employee_id")
        .not("employee_id", "is", null)

      const usedIds: number[] = (usedRows ?? [])
        .map((r: { employee_id: number | null }) => r.employee_id)
        .filter(Boolean) as number[]

      // Depois: funcionários ativos excluindo os já vinculados
      let q = sb
        .from("employees")
        .select("id, full_name, short_name, job:jobs!job_id(name), store:stores!store_id(code,name)")
        .eq("active", true)
        .is("deleted_at", null)
        .order("full_name")

      if (usedIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        q = (q as any).not("id", "in", `(${usedIds.join(",")})`)
      }

      const { data } = await q
      setEmployees((data ?? []) as unknown as EmployeeOption[])
      setLoadingEmps(false)
    }
    load()
  }, [])

  const empSelecionado = employees.find(f => f.id === Number(employeeId))

  function sugerirUsername(nome: string) {
    if (!username) {
      const p = nome.toLowerCase().replace(/[^a-z ]/g, "").split(" ").filter(Boolean)
      setUsername(p.length > 1 ? `${p[0]}.${p[p.length - 1]}` : p[0] ?? "")
    }
  }

  function toggleGrupo(g: string) {
    setGrupos(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  function validar() {
    const e: Record<string, string> = {}
    if (!employeeId)                        e.employee  = "Selecione um funcionário"
    if (!username || username.length < 5)   e.username  = "Mínimo 5 caracteres"
    if (username.length > 20)               e.username  = "Máximo 20 caracteres"
    if (!/^[a-z0-9._]+$/.test(username))    e.username  = "Apenas letras, números, ponto e _"
    if (!dashboard)                         e.dashboard = "Selecione o painel"
    if (grupos.length === 0)                e.grupos    = "Selecione ao menos um grupo"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!validar()) return
    setSaving(true)
    setGlobalErr("")

    const res = await fetch("/api/usuarios/criar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: Number(employeeId), username, dashboard, groups: grupos }),
    })
    const json = await res.json()

    if (!res.ok) {
      setGlobalErr(json.error ?? "Erro ao criar usuário")
      setSaving(false)
      return
    }

    setSuccess(true)
    setTimeout(() => { onSuccess(); onClose() }, 1200)
  }

  const inputStyle = (err?: string): React.CSSProperties => ({
    width: "100%", padding: "10px 14px", borderRadius: 10, outline: "none",
    border: `1.5px solid ${err ? "#fca5a5" : "#e2e8f0"}`,
    fontSize: 14, color: "#121212", background: err ? "#fff5f5" : "#f8fafc",
    fontFamily: "sans-serif",
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="bg-white rounded-2xl w-full overflow-hidden"
          style={{ maxWidth: 580, maxHeight: "90vh", boxShadow: "0 24px 64px rgba(15,39,68,0.22)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5"
            style={{ borderBottom: "1px solid #f1f5f9" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#121212" }}>Cadastrar Usuário</h2>
              <p style={{ fontSize: 14, color: "#556376", marginTop: 2 }}>
                Vincule um funcionário e defina as permissões de acesso
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl transition-colors"
              style={{ color: "#7e8b9c" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9" }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 130px)" }}>
            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-6">

              {/* Erro global */}
              {globalErr && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                  style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <X className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
                  <span style={{ fontSize: 13, color: "#dc2626" }}>{globalErr}</span>
                </motion.div>
              )}

              {/* ── Funcionário ─────────────────────────────────────────── */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#556376", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Funcionário <span style={{ color: "#dc2626" }}>*</span>
                </label>
                {loadingEmps ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                    style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#94a3b8" }} />
                    <span style={{ fontSize: 14, color: "#94a3b8" }}>Carregando funcionários…</span>
                  </div>
                ) : employees.length === 0 ? (
                  <div className="px-4 py-3 rounded-xl text-sm"
                    style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
                    Todos os funcionários ativos já possuem usuário cadastrado.
                  </div>
                ) : (
                  <>
                    <select
                      value={employeeId}
                      onChange={e => {
                        setEmployeeId(e.target.value)
                        const f = employees.find(emp => emp.id === Number(e.target.value))
                        if (f) sugerirUsername(f.full_name)
                        setErrors(prev => ({ ...prev, employee: "" }))
                      }}
                      style={inputStyle(errors.employee)}
                      onFocus={e => !errors.employee && (e.target.style.borderColor = "#1d4ed8")}
                      onBlur={e  => !errors.employee && (e.target.style.borderColor = "#e2e8f0")}
                    >
                      <option value="">Selecione o funcionário...</option>
                      {employees.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.full_name}
                          {f.job  ? ` — ${f.job.name}` : ""}
                          {f.store ? ` (Loja ${f.store.code})` : ""}
                        </option>
                      ))}
                    </select>
                    {errors.employee && (
                      <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{errors.employee}</p>
                    )}
                    {empSelecionado && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg"
                        style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
                          {initials(empSelecionado.full_name)}
                        </div>
                        <span style={{ fontSize: 14, color: "#14532d", fontWeight: 500 }}>
                          {empSelecionado.full_name}
                          {empSelecionado.job ? ` · ${empSelecionado.job.name}` : ""}
                          {empSelecionado.store ? ` · Loja ${empSelecionado.store.code}` : ""}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Usuário ─────────────────────────────────────────────── */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#556376", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Nome de Usuário <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))
                    setErrors(prev => ({ ...prev, username: "" }))
                  }}
                  placeholder="ex: ana.souza"
                  maxLength={20}
                  style={inputStyle(errors.username ? errors.username : undefined)}
                  onFocus={e => !errors.username && (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={e  => !errors.username && (e.target.style.borderColor = "#e2e8f0")}
                />
                <div className="flex items-center justify-between mt-1.5">
                  {errors.username
                    ? <p style={{ fontSize: 12, color: "#dc2626" }}>{errors.username}</p>
                    : <p style={{ fontSize: 12, color: "#7e8b9c" }}>5–20 caracteres · letras, números, ponto e _</p>
                  }
                  <span style={{ fontSize: 11, color: username.length > 16 ? "#f59e0b" : "#7e8b9c" }}>
                    {username.length}/20
                  </span>
                </div>
              </div>

              {/* ── Painel principal ─────────────────────────────────────── */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#556376", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Painel Principal <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
                  {DASHBOARDS.map(d => (
                    <button key={d} type="button"
                      onClick={() => { setDashboard(d); setErrors(prev => ({ ...prev, dashboard: "" })) }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-left"
                      style={{
                        background:  dashboard === d ? "#eff6ff" : "#f8fafc",
                        borderColor: dashboard === d ? "#1d4ed8" : "#e2e8f0",
                        color:       dashboard === d ? "#1d4ed8" : "#3c4859",
                        fontWeight:  dashboard === d ? 600 : 400,
                        fontSize: 14,
                      }}
                    >
                      {dashboard === d && <Check className="w-4 h-4 flex-shrink-0" />}
                      {d}
                    </button>
                  ))}
                </div>
                {errors.dashboard && (
                  <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{errors.dashboard}</p>
                )}
              </div>

              {/* ── Grupos de permissão ──────────────────────────────────── */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#556376", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Grupos de Permissão <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div className="space-y-2">
                  {GRUPOS_PERMISSAO.map(g => {
                    const sel = grupos.includes(g.nome)
                    return (
                      <button key={g.id} type="button"
                        onClick={() => { toggleGrupo(g.nome); setErrors(prev => ({ ...prev, grupos: "" })) }}
                        className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all text-left"
                        style={{ background: sel ? "#f8faff" : "#f8fafc", borderColor: sel ? "#1d4ed8" : "#e2e8f0" }}
                      >
                        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                          style={{ background: sel ? "#1d4ed8" : "#fff", border: `2px solid ${sel ? "#1d4ed8" : "#cbd5e1"}` }}>
                          {sel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: g.cor, color: g.corTexto }}>{g.nome}</span>
                            <span style={{ fontSize: 14, color: "#3c4859" }}>{g.descricao}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {g.flags.map(f => (
                              <span key={f} style={{ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: "#f1f5f9", color: "#556376" }}>{f}</span>
                            ))}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {errors.grupos && (
                  <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{errors.grupos}</p>
                )}
              </div>

              {/* Aviso senha inicial */}
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
                <p style={{ fontSize: 14, color: "#92400e", lineHeight: 1.5 }}>
                  A senha inicial será <strong>12345678</strong>. O usuário deverá trocar no primeiro acesso ao sistema.
                </p>
              </div>

              {/* Rodapé */}
              <div className="flex items-center justify-end gap-3 pt-2"
                style={{ borderTop: "1px solid #f1f5f9" }}>
                <button type="button" onClick={onClose}
                  style={{ fontSize: 14, color: "#556376", padding: "10px 20px" }}
                  className="rounded-xl transition-colors hover:bg-slate-50">
                  Cancelar
                </button>
                <motion.button type="submit" disabled={saving || success}
                  whileHover={!saving ? { scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.22)" } : {}}
                  whileTap={!saving ? { scale: 0.98 } : {}}
                  className="flex items-center gap-2 font-semibold text-white"
                  style={{ padding: "10px 24px", borderRadius: 10, fontSize: 14, background: success ? "#16a34a" : "#0f2744" }}
                >
                  {success ? (
                    <><Check className="w-4 h-4" /> Cadastrado!</>
                  ) : saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Criando…</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Cadastrar Usuário</>
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Modal Editar Usuário ─────────────────────────────────────────────────────

function ModalEditar({ usuario, onClose, onSuccess }: {
  usuario:   UserRow
  onClose:   () => void
  onSuccess: () => void
}) {
  const [dashboard, setDashboard] = useState(usuario.dashboard ?? "")
  const [grupos,    setGrupos]    = useState<string[]>(usuario.groups ?? [])
  const [ativo,     setAtivo]     = useState(usuario.active)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState("")

  function toggleGrupo(g: string) {
    setGrupos(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!dashboard) { setError("Selecione o painel"); return }
    if (grupos.length === 0) { setError("Selecione ao menos um grupo"); return }
    setSaving(true)
    setError("")

    const sb = createSupabaseBrowserClient()
    const { error: dbErr } = await sb
      .from("users")
      .update({ dashboard, groups: grupos, active: ativo })
      .eq("id", usuario.id)

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    onSuccess()
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="bg-white rounded-2xl w-full overflow-hidden"
          style={{ maxWidth: 540, maxHeight: "90vh", boxShadow: "0 24px 64px rgba(15,39,68,0.22)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5"
            style={{ borderBottom: "1px solid #f1f5f9" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#3B82F6,#0F5BFF)" }}>
                {usuario.employee ? initials(usuario.employee.full_name) : "?"}
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#121212" }}>Editar Usuário</h2>
                <p className="font-mono" style={{ fontSize: 12, color: "#7e8b9c" }}>@{usuario.username}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl transition-colors"
              style={{ color: "#7e8b9c" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9" }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 130px)" }}>
            <form onSubmit={handleSave} className="px-7 py-6 space-y-5">

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                  style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <X className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
                  <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>
                </motion.div>
              )}

              {/* Info do funcionário (somente leitura) */}
              {usuario.employee && (
                <div className="px-4 py-3 rounded-xl"
                  style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Funcionário vinculado</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#0f2744" }}>{usuario.employee.full_name}</p>
                  <p style={{ fontSize: 12, color: "#7e8b9c" }}>
                    {usuario.employee.job?.name ?? "Sem cargo"}
                    {usuario.employee.store ? ` · Loja ${usuario.employee.store.code}` : ""}
                  </p>
                </div>
              )}

              {/* Painel principal */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#556376", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Painel Principal <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
                  {DASHBOARDS.map(d => (
                    <button key={d} type="button"
                      onClick={() => setDashboard(d)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-left"
                      style={{
                        background:  dashboard === d ? "#eff6ff" : "#f8fafc",
                        borderColor: dashboard === d ? "#1d4ed8" : "#e2e8f0",
                        color:       dashboard === d ? "#1d4ed8" : "#3c4859",
                        fontWeight:  dashboard === d ? 600 : 400,
                        fontSize: 14,
                      }}
                    >
                      {dashboard === d && <Check className="w-4 h-4 flex-shrink-0" />}
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grupos */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#556376", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Grupos de Permissão <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div className="space-y-2">
                  {GRUPOS_PERMISSAO.map(g => {
                    const sel = grupos.includes(g.nome)
                    return (
                      <button key={g.id} type="button"
                        onClick={() => toggleGrupo(g.nome)}
                        className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                        style={{ background: sel ? "#f8faff" : "#f8fafc", borderColor: sel ? "#1d4ed8" : "#e2e8f0" }}
                      >
                        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: sel ? "#1d4ed8" : "#fff", border: `2px solid ${sel ? "#1d4ed8" : "#cbd5e1"}` }}>
                          {sel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: g.cor, color: g.corTexto }}>{g.nome}</span>
                            <span style={{ fontSize: 13, color: "#3c4859" }}>{g.descricao}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#556376", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Status
                </label>
                <button type="button" onClick={() => setAtivo(v => !v)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all"
                  style={{ background: ativo ? "#f0fdf4" : "#fef2f2", borderColor: ativo ? "#bbf7d0" : "#fecaca" }}
                >
                  {ativo
                    ? <ToggleRight className="w-6 h-6 flex-shrink-0" style={{ color: "#16a34a" }} />
                    : <ToggleLeft  className="w-6 h-6 flex-shrink-0" style={{ color: "#dc2626" }} />
                  }
                  <div className="text-left">
                    <p style={{ fontSize: 14, fontWeight: 600, color: ativo ? "#15803d" : "#dc2626" }}>
                      {ativo ? "Usuário Ativo" : "Usuário Inativo"}
                    </p>
                    <p style={{ fontSize: 12, color: "#7e8b9c" }}>
                      {ativo ? "Pode acessar o sistema normalmente" : "Acesso bloqueado — não consegue fazer login"}
                    </p>
                  </div>
                </button>
              </div>

              {/* Rodapé */}
              <div className="flex items-center justify-end gap-3 pt-2"
                style={{ borderTop: "1px solid #f1f5f9" }}>
                <button type="button" onClick={onClose}
                  style={{ fontSize: 14, color: "#556376", padding: "10px 20px" }}
                  className="rounded-xl transition-colors hover:bg-slate-50">
                  Cancelar
                </button>
                <motion.button type="submit" disabled={saving}
                  whileHover={!saving ? { scale: 1.02 } : {}}
                  whileTap={!saving ? { scale: 0.98 } : {}}
                  className="flex items-center gap-2 font-semibold text-white"
                  style={{ padding: "10px 24px", borderRadius: 10, fontSize: 14, background: "#0f2744" }}
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : <><ShieldCheck className="w-4 h-4" /> Salvar Alterações</>}
                </motion.button>
              </div>

              {/* Aviso: nome/cargo/loja são dados do funcionário */}
              <p className="text-xs text-center" style={{ color: "#94a3b8" }}>
                Para alterar nome, cargo ou loja, edite o{" "}
                {usuario.employee
                  ? <a href={`/funcionarios/${usuario.employee.id}/editar`} className="underline" style={{ color: "#1d4ed8" }}>perfil do funcionário</a>
                  : "perfil do funcionário"
                }.
              </p>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Modal Reset Senha ────────────────────────────────────────────────────────

function ModalResetSenha({ usuario, onClose, onSuccess }: {
  usuario:   UserRow
  onClose:   () => void
  onSuccess: () => void
}) {
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState("")

  async function handleReset() {
    setLoading(true)
    setError("")
    const res = await fetch("/api/usuarios/reset-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usuario.username }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? "Erro ao redefinir senha"); return }
    setSuccess(true)
    setTimeout(() => { onSuccess(); onClose() }, 1500)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="bg-white rounded-2xl p-8 w-full"
          style={{ maxWidth: 420, boxShadow: "0 24px 64px rgba(15,39,68,0.22)" }}
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: success ? "#D1FAE5" : "#fef3c7" }}>
              <Key className="w-7 h-7" style={{ color: success ? "#059669" : "#d97706" }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#121212" }}>
              {success ? "Senha redefinida!" : "Redefinir Senha"}
            </h2>
            <p className="mt-2" style={{ fontSize: 14, color: "#556376" }}>
              A senha de <strong style={{ color: "#121212" }}>@{usuario.username}</strong> será
              redefinida para <strong style={{ color: "#121212" }}>12345678</strong>.
            </p>
            <p className="mt-1" style={{ fontSize: 13, color: "#7e8b9c" }}>
              O usuário precisará trocar no próximo acesso.
            </p>
            {error && <p className="mt-2" style={{ fontSize: 12, color: "#dc2626" }}>{error}</p>}
          </div>
          {!success && (
            <div className="flex gap-3">
              <button onClick={onClose} disabled={loading}
                className="flex-1 py-3 rounded-xl border text-sm font-medium transition-colors"
                style={{ borderColor: "#e2e8f0", color: "#3c4859" }}>
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleReset} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#d97706" }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde…</> : "Confirmar Reset"}
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Modal Desativar / Reativar ───────────────────────────────────────────────

function ModalDesativar({ usuario, onClose, onConfirm, loading }: {
  usuario:   UserRow
  onClose:   () => void
  onConfirm: () => void
  loading:   boolean
}) {
  const jaInativo = !usuario.active

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="bg-white rounded-2xl p-8 w-full"
          style={{ maxWidth: 420, boxShadow: "0 24px 64px rgba(15,39,68,0.22)" }}
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: jaInativo ? "#f0fdf4" : "#fef2f2" }}>
              {jaInativo
                ? <UserCheck className="w-7 h-7" style={{ color: "#16a34a" }} />
                : <UserX     className="w-7 h-7" style={{ color: "#dc2626" }} />
              }
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#121212" }}>
              {jaInativo ? "Reativar usuário?" : "Desativar usuário?"}
            </h2>

            {/* Card do usuário */}
            <div className="flex items-center gap-3 mt-4 px-4 py-3 rounded-xl text-left"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#3B82F6,#0F5BFF)" }}>
                {usuario.employee ? initials(usuario.employee.full_name) : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f2744" }}>
                  {usuario.employee?.full_name ?? "Usuário"}
                </p>
                <p className="font-mono" style={{ fontSize: 12, color: "#7e8b9c" }}>@{usuario.username}</p>
              </div>
            </div>

            <p className="mt-4" style={{ fontSize: 14, color: "#556376", lineHeight: 1.6 }}>
              {jaInativo
                ? "O usuário voltará a ter acesso ao sistema normalmente."
                : <>O usuário <strong>@{usuario.username}</strong> perderá o acesso imediatamente. Os dados não serão apagados.</>
              }
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="flex-1 py-3 rounded-xl border text-sm font-medium transition-colors"
              style={{ borderColor: "#e2e8f0", color: "#3c4859" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              Cancelar
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onConfirm} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
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

// ─── Modal Excluir Usuário ────────────────────────────────────────────────────

function ModalExcluir({ usuario, onClose, onSuccess }: {
  usuario:   UserRow
  onClose:   () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  async function handleExcluir() {
    setLoading(true)
    setError("")
    const res = await fetch("/api/usuarios/excluir", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId: usuario.id }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? "Erro ao excluir"); return }
    onSuccess()
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="bg-white rounded-2xl p-8 w-full"
          style={{ maxWidth: 420, boxShadow: "0 24px 64px rgba(15,39,68,0.25)" }}
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#fef2f2" }}>
              <AlertTriangle className="w-7 h-7" style={{ color: "#dc2626" }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#121212" }}>
              Excluir usuário?
            </h2>

            {/* Card do usuário */}
            <div className="flex items-center gap-3 mt-4 px-4 py-3 rounded-xl text-left"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>
                {usuario.employee ? initials(usuario.employee.full_name) : "?"}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-mono font-semibold text-sm" style={{ color: "#0f2744" }}>
                  @{usuario.username}
                </p>
                {usuario.employee && (
                  <p style={{ fontSize: 12, color: "#7e8b9c" }}>{usuario.employee.full_name}</p>
                )}
              </div>
            </div>

            <p className="mt-4" style={{ fontSize: 14, color: "#556376", lineHeight: 1.6 }}>
              Esta ação é <strong style={{ color: "#dc2626" }}>irreversível</strong>. O usuário será
              removido do sistema de autenticação e não poderá mais fazer login.
            </p>

            {error && (
              <p className="mt-3 px-4 py-2 rounded-xl text-sm"
                style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="flex-1 py-3 rounded-xl border text-sm font-medium transition-colors"
              style={{ borderColor: "#e2e8f0", color: "#3c4859" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              Cancelar
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleExcluir} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#dc2626" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo…</>
                : <><Trash2 className="w-4 h-4" /> Sim, excluir</>
              }
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const [users,   setUsers]   = useState<UserRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState("")
  const [reload,  setReload]  = useState(0)

  const [showCadastro,     setShowCadastro]     = useState(false)
  const [editTarget,       setEditTarget]       = useState<UserRow | null>(null)
  const [resetTarget,      setResetTarget]      = useState<UserRow | null>(null)
  const [desativarTarget,  setDesativarTarget]  = useState<UserRow | null>(null)
  const [desativarLoading, setDesativarLoading] = useState(false)
  const [excluirTarget,    setExcluirTarget]    = useState<UserRow | null>(null)

  // ─── Carga ────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true)
      const sb = createSupabaseBrowserClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = sb
        .from("users")
        .select(
          "id, username, dashboard, groups, active, first_login, created_at, " +
          "employee:employees!employee_id(id, full_name, short_name, job:jobs!job_id(name), store:stores!store_id(code,name))",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })

      if (search.trim().length > 1)
        q = q.ilike("username", `%${search.trim()}%`)

      const { data, count, error } = await q
      if (error) console.error("[usuarios] Supabase:", error.message)
      setUsers((data ?? []) as UserRow[])
      setTotal(count ?? 0)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, reload])

  // ─── Desativar / Reativar ─────────────────────────────────────────────────

  async function handleDesativar() {
    if (!desativarTarget) return
    setDesativarLoading(true)
    const sb = createSupabaseBrowserClient()
    await sb.from("users").update({ active: !desativarTarget.active }).eq("id", desativarTarget.id)
    setDesativarLoading(false)
    setDesativarTarget(null)
    setReload(r => r + 1)
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  const ativos   = users.filter(u =>  u.active).length
  const inativos = users.filter(u => !u.active).length

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Header breadcrumbs={["Home", "Usuários"]} title="Usuários" />

      <main className="pt-[64px] px-8 py-6 space-y-4"
        style={{ fontFamily: "sans-serif", fontSize: 14, fontWeight: 500 }}>

        {/* Topo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "#dbeafe", color: "#1d4ed8" }}>
            {loading ? "carregando…" : `${ativos} ativo${ativos !== 1 ? "s" : ""} · ${inativos} inativo${inativos !== 1 ? "s" : ""}`}
          </span>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.25)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCadastro(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#0f2744" }}
          >
            <Plus className="w-4 h-4" /> Cadastrar Usuário
          </motion.button>
        </motion.div>

        {/* Tabela */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-xl border overflow-hidden"
          style={{ background: "#fff", borderColor: "#e2e8f0" }}
        >
          {/* Busca */}
          <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#7e8b9c" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por usuário..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm border outline-none transition-colors"
                style={{ borderColor: "#e2e8f0", color: "#121212", background: "#f8fafc" }}
                onFocus={e => (e.target.style.borderColor = "#1d4ed8")}
                onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "#7e8b9c", fontSize: 12 }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Usuário", "Funcionário", "Cargo", "Loja", "Dashboard", "Grupos", "Cadastrado", "Status", "Ações"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#556376" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: "#f1f5f9" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full animate-pulse" style={{ background: "#f1f5f9" }} />
                        <div className="h-4 w-24 rounded animate-pulse" style={{ background: "#f1f5f9" }} />
                      </div>
                    </td>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: "#f1f5f9", width: "70%" }} />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 rounded animate-pulse" style={{ background: "#f1f5f9" }} />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm" style={{ color: "#7e8b9c" }}>
                    {search ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado ainda."}
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {users.map((u, i) => (
                    <motion.tr key={u.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b"
                      style={{ borderColor: "#f1f5f9", opacity: u.active ? 1 : 0.6 }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Usuário */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                            {u.employee ? initials(u.employee.full_name) : "?"}
                          </div>
                          <div>
                            <span className="font-mono font-semibold text-xs block" style={{ color: "#121212" }}>
                              {u.username}
                            </span>
                            {u.first_login && (
                              <span className="text-xs" style={{ color: "#f59e0b" }}>⚠ Primeiro acesso</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Funcionário */}
                      <td className="px-4 py-3 text-sm" style={{ color: "#3c4859" }}>
                        {u.employee?.full_name ?? <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>

                      {/* Cargo */}
                      <td className="px-4 py-3 text-xs" style={{ color: "#556376" }}>
                        {u.employee?.job?.name ?? "—"}
                      </td>

                      {/* Loja */}
                      <td className="px-4 py-3">
                        {u.employee?.store ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                            {u.employee.store.code}
                          </span>
                        ) : <span style={{ color: "#7e8b9c", fontSize: 12 }}>—</span>}
                      </td>

                      {/* Dashboard */}
                      <td className="px-4 py-3 text-xs" style={{ color: "#556376" }}>
                        {u.dashboard ?? "—"}
                      </td>

                      {/* Grupos */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(u.groups ?? []).slice(0, 2).map(g => {
                            const gp = GRUPOS_PERMISSAO.find(x => x.nome === g)
                            return (
                              <span key={g} style={{
                                display: "inline-block", padding: "1px 8px", borderRadius: 999,
                                fontSize: 10, fontWeight: 600,
                                background: gp?.cor ?? "#f1f5f9",
                                color: gp?.corTexto ?? "#556376",
                              }}>{g}</span>
                            )
                          })}
                          {(u.groups ?? []).length > 2 && (
                            <span style={{ fontSize: 10, color: "#7e8b9c" }}>+{(u.groups ?? []).length - 2}</span>
                          )}
                        </div>
                      </td>

                      {/* Cadastrado */}
                      <td className="px-4 py-3 text-xs" style={{ color: "#556376" }}>
                        {fmtDate(u.created_at)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={u.active ? "Ativo" : "Inativo"} size="sm" />
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Tooltip label="Editar">
                            <motion.button whileHover={{ scale: 1.15 }}
                              onClick={() => setEditTarget(u)}
                              className="p-1.5 rounded-lg transition-colors" style={{ color: "#7e8b9c" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#556376" }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#7e8b9c" }}>
                              <Pencil style={{ width: 14, height: 14 }} />
                            </motion.button>
                          </Tooltip>
                          <Tooltip label="Redefinir senha">
                            <motion.button whileHover={{ scale: 1.15 }}
                              onClick={() => setResetTarget(u)}
                              className="p-1.5 rounded-lg transition-colors" style={{ color: "#7e8b9c" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#fef3c7"; e.currentTarget.style.color = "#d97706" }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#7e8b9c" }}>
                              <Key style={{ width: 14, height: 14 }} />
                            </motion.button>
                          </Tooltip>
                          <Tooltip label={u.active ? "Desativar" : "Reativar"}>
                            <motion.button whileHover={{ scale: 1.15 }}
                              onClick={() => setDesativarTarget(u)}
                              className="p-1.5 rounded-lg transition-colors" style={{ color: "#7e8b9c" }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = u.active ? "#fee2e2" : "#f0fdf4"
                                e.currentTarget.style.color = u.active ? "#dc2626" : "#16a34a"
                              }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#7e8b9c" }}>
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </motion.button>
                          </Tooltip>
                          <Tooltip label="Excluir permanentemente">
                            <motion.button whileHover={{ scale: 1.15 }}
                              onClick={() => setExcluirTarget(u)}
                              className="p-1.5 rounded-lg transition-colors" style={{ color: "#7e8b9c" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626" }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#7e8b9c" }}>
                              <AlertTriangle style={{ width: 14, height: 14 }} />
                            </motion.button>
                          </Tooltip>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-5 py-3 border-t" style={{ borderColor: "#f1f5f9" }}>
            <p style={{ fontSize: 12, color: "#7e8b9c" }}>
              {total} usuário{total !== 1 ? "s" : ""} no total
            </p>
          </div>
        </motion.div>

        <p className="text-xs text-center" style={{ color: "#7e8b9c" }}>
          💡 Senha inicial dos novos usuários: <strong>12345678</strong> · O usuário deverá trocar no primeiro acesso.
        </p>
      </main>

      {/* Modais */}
      {showCadastro   && <ModalCadastro   onClose={() => setShowCadastro(false)}  onSuccess={() => setReload(r => r + 1)} />}
      {editTarget     && <ModalEditar     usuario={editTarget}    onClose={() => setEditTarget(null)}    onSuccess={() => setReload(r => r + 1)} />}
      {resetTarget    && <ModalResetSenha usuario={resetTarget}   onClose={() => setResetTarget(null)} onSuccess={() => setReload(r => r + 1)} />}
      {desativarTarget && <ModalDesativar usuario={desativarTarget} onClose={() => setDesativarTarget(null)} onConfirm={handleDesativar} loading={desativarLoading} />}
      {excluirTarget   && <ModalExcluir  usuario={excluirTarget}   onClose={() => setExcluirTarget(null)}   onSuccess={() => setReload(r => r + 1)} />}
    </>
  )
}
