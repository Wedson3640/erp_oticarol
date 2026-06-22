"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Plus, Search, Pencil, Key, Trash2, X, Check, ChevronDown, Info } from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import { initials } from "@/lib/utils"

// ─── Mock data ────────────────────────────────────────────────────────────────

const usuarios = [
  { id: 1, username: "ana.souza",   funcionario: "Ana Souza",   cargo: "Vendedora", loja: "488",  dashboard: "Comercial", grupos: ["Vendas"],          ultimoLogin: "Hoje, 10:30",  status: "Ativo"   },
  { id: 2, username: "carlos.lima", funcionario: "Carlos Lima",  cargo: "Vendedor",  loja: "488",  dashboard: "Comercial", grupos: ["Vendas"],          ultimoLogin: "Hoje, 09:15",  status: "Ativo"   },
  { id: 3, username: "juliana.d",   funcionario: "Juliana Dias", cargo: "Gerente",   loja: "488",  dashboard: "Gerente",   grupos: ["Gestão","Vendas"], ultimoLogin: "Hoje, 08:00",  status: "Ativo"   },
  { id: 4, username: "marcos.s",    funcionario: "Marcos Silva", cargo: "Vendedor",  loja: "1060", dashboard: "Comercial", grupos: ["Vendas"],          ultimoLogin: "Ontem, 18:30", status: "Ativo"   },
  { id: 5, username: "dev_teste",   funcionario: "—",            cargo: "—",         loja: "—",    dashboard: "Admin",     grupos: ["Superadmin"],     ultimoLogin: "31/05/2026",   status: "Inativo" },
]

// Funcionários sem usuário vinculado (disponíveis para cadastro)
const funcionariosSemUsuario = [
  { id: 6,  nome: "Carla Mota",      cargo: "Vendedora",  loja: "717"  },
  { id: 7,  nome: "Fernanda Barros", cargo: "Vendedora",  loja: "1249" },
  { id: 8,  nome: "Rodrigo Pereira", cargo: "Técnico",    loja: "488"  },
]

const gruposPermissao = [
  {
    id: 1, nome: "Vendas",
    descricao: "Acesso a pedidos, garantias e CRM",
    flags: ["Visualizar", "Criar", "Editar"],
    cor: "#dbeafe", corTexto: "#1e40af",
  },
  {
    id: 2, nome: "Gestão",
    descricao: "Metas, funcionários e relatórios",
    flags: ["Visualizar", "Criar", "Editar", "Relatório"],
    cor: "#ede9fe", corTexto: "#5b21b6",
  },
  {
    id: 3, nome: "Caixa",
    descricao: "Acertos financeiros e cupons",
    flags: ["Visualizar", "Criar"],
    cor: "#dcfce7", corTexto: "#14532d",
  },
  {
    id: 4, nome: "Admin",
    descricao: "Configurações do sistema e usuários",
    flags: ["Visualizar", "Criar", "Editar", "Excluir", "Aprovar"],
    cor: "#fef3c7", corTexto: "#92400e",
  },
  {
    id: 5, nome: "Superadmin",
    descricao: "Acesso total irrestrito ao sistema",
    flags: ["Todos os acessos"],
    cor: "#fee2e2", corTexto: "#991b1b",
  },
]

const dashboards = ["Comercial", "Gerente", "Admin", "Relatórios"]
const avatarColors = [
  "linear-gradient(135deg,#3B82F6,#0F5BFF)",
  "linear-gradient(135deg,#8B5CF6,#6D28D9)",
  "linear-gradient(135deg,#10B981,#059669)",
  "linear-gradient(135deg,#F59E0B,#D97706)",
  "linear-gradient(135deg,#EF4444,#DC2626)",
]

// ─── Modal Cadastrar Usuário ──────────────────────────────────────────────────

function ModalCadastro({ onClose }: { onClose: () => void }) {
  const [funcionarioId, setFuncionarioId] = useState("")
  const [username, setUsername]           = useState("")
  const [dashboard, setDashboard]         = useState("")
  const [grupos, setGrupos]               = useState<number[]>([])
  const [errors, setErrors]               = useState<Record<string, string>>({})

  const toggleGrupo = (id: number) =>
    setGrupos((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id])

  const funcionarioSelecionado = funcionariosSemUsuario.find(
    (f) => f.id === Number(funcionarioId)
  )

  // Sugestão automática de username baseado no nome do funcionário
  const sugerirUsername = (nome: string) => {
    if (!username) {
      const partes = nome.toLowerCase().split(" ")
      setUsername(`${partes[0]}.${partes[partes.length - 1]}`)
    }
  }

  const validar = () => {
    const e: Record<string, string> = {}
    if (!funcionarioId) e.funcionario = "Selecione um funcionário"
    if (!username || username.length < 5) e.username = "Mínimo 5 caracteres"
    if (username.length > 15) e.username = "Máximo 15 caracteres"
    if (!/^[a-z0-9._]+$/.test(username)) e.username = "Apenas letras minúsculas, números, ponto e underline"
    if (!dashboard) e.dashboard = "Selecione o painel"
    if (grupos.length === 0) e.grupos = "Selecione ao menos um grupo"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validar()) return
    // TODO: integrar com Supabase Auth
    alert(`Usuário "${username}" cadastrado! Senha inicial: 12345678`)
    onClose()
  }

  const inputStyle = (hasError: boolean) => ({
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1.5px solid ${hasError ? "#fca5a5" : "#e2e8f0"}`,
    fontSize: 14,
    color: "#0f172a",
    background: hasError ? "#fff5f5" : "#f8fafc",
    outline: "none",
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="bg-white rounded-2xl w-full overflow-hidden"
          style={{
            maxWidth: 580,
            maxHeight: "90vh",
            boxShadow: "0 24px 64px rgba(15,39,68,0.22)",
          }}
        >
          {/* Header do modal */}
          <div
            className="flex items-center justify-between px-7 py-5"
            style={{ borderBottom: "1px solid #f1f5f9" }}
          >
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                Cadastrar Usuário
              </h2>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                Vincule um funcionário e defina as permissões de acesso
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-colors"
              style={{ color: "#94a3b8" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9"
                e.currentTarget.style.color = "#475569"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "#94a3b8"
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corpo com scroll */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 130px)" }}>
            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-6">

              {/* Funcionário */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Colaborador <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div className="relative">
                  <select
                    value={funcionarioId}
                    onChange={(e) => {
                      setFuncionarioId(e.target.value)
                      const func = funcionariosSemUsuario.find(f => f.id === Number(e.target.value))
                      if (func) sugerirUsername(func.nome)
                      setErrors((prev) => ({ ...prev, funcionario: "" }))
                    }}
                    style={inputStyle(!!errors.funcionario)}
                    onFocus={(e) => !errors.funcionario && (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={(e) => !errors.funcionario && (e.target.style.borderColor = "#e2e8f0")}
                  >
                    <option value="">Selecione o funcionário...</option>
                    {funcionariosSemUsuario.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome} — {f.cargo} (Loja {f.loja})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#94a3b8" }} />
                </div>
                {errors.funcionario && (
                  <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>{errors.funcionario}</p>
                )}
                {funcionarioSelecionado && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg"
                    style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
                      {initials(funcionarioSelecionado.nome)}
                    </div>
                    <span style={{ fontSize: 13, color: "#14532d", fontWeight: 500 }}>
                      {funcionarioSelecionado.nome} · {funcionarioSelecionado.cargo} · Loja {funcionarioSelecionado.loja}
                    </span>
                  </div>
                )}
              </div>

              {/* Nome de usuário */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Nome de Usuário <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))
                    setErrors((prev) => ({ ...prev, username: "" }))
                  }}
                  placeholder="ex: ana.souza"
                  maxLength={15}
                  style={inputStyle(!!errors.username)}
                  onFocus={(e) => !errors.username && (e.target.style.borderColor = "#1d4ed8")}
                  onBlur={(e) => !errors.username && (e.target.style.borderColor = "#e2e8f0")}
                />
                <div className="flex items-center justify-between mt-1.5">
                  {errors.username
                    ? <p style={{ fontSize: 12, color: "#dc2626" }}>{errors.username}</p>
                    : <p style={{ fontSize: 12, color: "#94a3b8" }}>5–15 caracteres · apenas letras, números, ponto e _</p>
                  }
                  <span style={{ fontSize: 11, color: username.length > 12 ? "#f59e0b" : "#94a3b8" }}>
                    {username.length}/15
                  </span>
                </div>
              </div>

              {/* Painel principal */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Painel Principal <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
                  {dashboards.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setDashboard(d); setErrors((prev) => ({ ...prev, dashboard: "" })) }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-left"
                      style={{
                        background: dashboard === d ? "#eff6ff" : "#f8fafc",
                        borderColor: dashboard === d ? "#1d4ed8" : "#e2e8f0",
                        color: dashboard === d ? "#1d4ed8" : "#475569",
                        fontWeight: dashboard === d ? 600 : 400,
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

              {/* Grupos de permissão */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  Grupos de Permissão <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div className="space-y-2">
                  {gruposPermissao.map((g) => {
                    const selecionado = grupos.includes(g.id)
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => { toggleGrupo(g.id); setErrors((prev) => ({ ...prev, grupos: "" })) }}
                        className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all text-left"
                        style={{
                          background: selecionado ? "#f8faff" : "#f8fafc",
                          borderColor: selecionado ? "#1d4ed8" : "#e2e8f0",
                        }}
                      >
                        {/* Checkbox visual */}
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                          style={{
                            background: selecionado ? "#1d4ed8" : "#fff",
                            border: `2px solid ${selecionado ? "#1d4ed8" : "#cbd5e1"}`,
                          }}
                        >
                          {selecionado && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: g.cor, color: g.corTexto }}
                            >
                              {g.nome}
                            </span>
                            <span style={{ fontSize: 13, color: "#475569" }}>{g.descricao}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {g.flags.map((flag) => (
                              <span
                                key={flag}
                                style={{
                                  display: "inline-block", padding: "1px 7px", borderRadius: 999,
                                  fontSize: 10, fontWeight: 600, background: "#f1f5f9", color: "#64748b",
                                }}
                              >
                                {flag}
                              </span>
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
              <div
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
              >
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
                <p style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                  A senha inicial será <strong>12345678</strong>. O usuário deverá trocar no primeiro acesso ao sistema.
                </p>
              </div>

              {/* Rodapé com ações */}
              <div
                className="flex items-center justify-end gap-3 pt-2"
                style={{ borderTop: "1px solid #f1f5f9" }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  style={{ fontSize: 14, color: "#64748b", padding: "10px 20px" }}
                  className="rounded-xl transition-colors hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(15,39,68,0.22)" }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 font-semibold text-white"
                  style={{
                    padding: "10px 24px",
                    borderRadius: 10,
                    fontSize: 14,
                    background: "#0f2744",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Usuário
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Modal Reset Senha ────────────────────────────────────────────────────────

function ModalResetSenha({ username, onClose }: { username: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
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
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#fef3c7" }}
            >
              <Key className="w-7 h-7" style={{ color: "#d97706" }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              Redefinir Senha
            </h2>
            <p className="mt-2" style={{ fontSize: 14, color: "#64748b" }}>
              A senha do usuário <strong style={{ color: "#0f172a" }}>{username}</strong> será
              redefinida para <strong style={{ color: "#0f172a" }}>12345678</strong>.
            </p>
            <p className="mt-1" style={{ fontSize: 13, color: "#94a3b8" }}>
              O usuário precisará trocar no próximo acesso.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border text-sm font-medium transition-colors"
              style={{ borderColor: "#e2e8f0", color: "#475569" }}
            >
              Cancelar
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#d97706" }}
            >
              Confirmar Reset
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const [showCadastro, setShowCadastro]       = useState(false)
  const [resetUsername, setResetUsername]     = useState<string | null>(null)

  return (
    <>
      <Header breadcrumbs={["Home", "Usuários"]} title="Usuários" />

      <main className="pt-[64px] px-8 py-6 space-y-4">

        {/* Topo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "#dbeafe", color: "#1d4ed8" }}>
            4 ativos · 1 inativo
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
          <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
              <input
                placeholder="Buscar usuário..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm border outline-none"
                style={{ borderColor: "#e2e8f0", color: "#0f172a", background: "#f8fafc" }}
              />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Usuário", "Funcionário", "Cargo", "Loja", "Dashboard", "Grupos", "Último Login", "Status", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, stiffness: 220, damping: 24 }}
                  className="border-b"
                  style={{ borderColor: "#f1f5f9", opacity: u.status === "Inativo" ? 0.6 : 1 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8faff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: avatarColors[i % avatarColors.length] }}
                      >
                        {u.funcionario === "—" ? "?" : initials(u.funcionario)}
                      </div>
                      <span className="font-mono font-semibold text-xs" style={{ color: "#0f172a" }}>
                        {u.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#475569" }}>{u.funcionario}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{u.cargo}</td>
                  <td className="px-4 py-3">
                    {u.loja !== "—" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                        {u.loja}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{u.dashboard}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.grupos.map((g) => (
                        <span key={g} style={{
                          display: "inline-block", padding: "1px 8px", borderRadius: 999,
                          fontSize: 10, fontWeight: 600, background: "#ede9fe", color: "#5b21b6",
                        }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{u.ultimoLogin}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Tooltip label="Editar">
                        <motion.button whileHover={{ scale: 1.15 }}
                          className="p-1.5 rounded-lg transition-colors" style={{ color: "#94a3b8" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b" }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8" }}
                        >
                          <Pencil style={{ width: 14, height: 14 }} />
                        </motion.button>
                      </Tooltip>
                      <Tooltip label="Alterar senha">
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          onClick={() => setResetUsername(u.username)}
                          className="p-1.5 rounded-lg transition-colors" style={{ color: "#94a3b8" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fef3c7"; e.currentTarget.style.color = "#d97706" }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8" }}
                        >
                          <Key style={{ width: 14, height: 14 }} />
                        </motion.button>
                      </Tooltip>
                      <Tooltip label="Desativar">
                        <motion.button whileHover={{ scale: 1.15 }}
                          className="p-1.5 rounded-lg transition-colors" style={{ color: "#94a3b8" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626" }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8" }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </motion.button>
                      </Tooltip>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <p className="text-xs text-center" style={{ color: "#94a3b8" }}>
          💡 Senha inicial dos novos usuários: <strong>12345678</strong> · O usuário deverá trocar no primeiro acesso.
        </p>
      </main>

      {/* Modais */}
      {showCadastro && <ModalCadastro onClose={() => setShowCadastro(false)} />}
      {resetUsername && <ModalResetSenha username={resetUsername} onClose={() => setResetUsername(null)} />}
    </>
  )
}
