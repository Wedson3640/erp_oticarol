"use client"

import { useState } from "react"
import { Eye, EyeOff, KeyRound, ShieldCheck, Loader2, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// ─── Regras de validação de senha ────────────────────────────────────────────

interface Rule { label: string; ok: boolean }

function rules(v: string): Rule[] {
  return [
    { label: "Mínimo 8 caracteres",             ok: v.length >= 8 },
    { label: "Pelo menos uma letra maiúscula",   ok: /[A-Z]/.test(v) },
    { label: "Pelo menos uma letra minúscula",   ok: /[a-z]/.test(v) },
    { label: "Pelo menos um número",             ok: /[0-9]/.test(v) },
  ]
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function TrocarSenhaPage() {
  const [novaSenha,    setNovaSenha]    = useState("")
  const [confirmar,    setConfirmar]    = useState("")
  const [showNova,     setShowNova]     = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)

  const validacoes  = rules(novaSenha)
  const tudo_ok     = validacoes.every(r => r.ok)
  const senhas_ok   = tudo_ok && novaSenha === confirmar

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!senhas_ok) return
    setLoading(true)
    setError(null)

    try {
      const sb = createSupabaseBrowserClient()

      // 1. Captura o uid ANTES de alterar a senha (updateUser pode rotacionar a sessão)
      const { data: { user }, error: userErr } = await sb.auth.getUser()
      if (userErr || !user) {
        setError("Sessão expirada. Faça login novamente.")
        setLoading(false)
        return
      }

      // 2. Atualiza a senha no Supabase Auth
      const { error: authErr } = await sb.auth.updateUser({ password: novaSenha })
      if (authErr) {
        setError(authErr.message)
        setLoading(false)
        return
      }

      // 3. Marca first_login = false em sascarol.users (service role via API)
      const res = await fetch("/api/usuarios/primeiro-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supabaseUid: user.id }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `API erro ${res.status}`)
      }

      setSuccess(true)
      setLoading(false)

      // Full reload após 2s — middleware relê first_login do banco atualizado
      setTimeout(() => { window.location.href = "/dashboard" }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao salvar senha")
      setLoading(false)
    }
  }

  // ─── Tela de sucesso ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-10 text-center"
          style={{ maxWidth: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#D1FAE5" }}>
            <ShieldCheck className="w-8 h-8" style={{ color: "#059669" }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#121212", marginBottom: 8 }}>
            Senha atualizada!
          </h2>
          <p style={{ fontSize: 14, color: "#556376" }}>
            Sua senha foi alterada com sucesso.<br />
            Redirecionando para o sistema…
          </p>
          <Loader2 className="w-5 h-5 animate-spin mx-auto mt-4" style={{ color: "#94a3b8" }} />
        </motion.div>
      </div>
    )
  }

  // ─── Formulário ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)" }}>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="bg-white rounded-2xl w-full overflow-hidden"
        style={{ maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center"
          style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg,#0f2744,#1d4ed8)" }}>
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f2744" }}>
            Criar nova senha
          </h1>
          <p style={{ fontSize: 14, color: "#556376", marginTop: 6, lineHeight: 1.5 }}>
            Este é seu primeiro acesso. Defina uma senha pessoal para continuar.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">

          {/* Erro */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
              style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
              <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>
            </motion.div>
          )}

          {/* Nova senha */}
          <div className="space-y-1.5">
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#556376", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Nova Senha <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "#94a3b8" }} />
              <input
                type={showNova ? "text" : "password"}
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoFocus
                className="w-full pl-10 pr-10 py-3 rounded-xl border outline-none transition-colors"
                style={{
                  borderColor: novaSenha && !tudo_ok ? "#fca5a5" : novaSenha && tudo_ok ? "#86efac" : "#e2e8f0",
                  fontSize: 14, color: "#121212", background: "#f8fafc",
                  fontFamily: "sans-serif",
                }}
                onFocus={e => e.target.style.borderColor = "#1d4ed8"}
                onBlur={e => e.target.style.borderColor = novaSenha && !tudo_ok ? "#fca5a5" : novaSenha && tudo_ok ? "#86efac" : "#e2e8f0"}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowNova(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                style={{ color: "#94a3b8" }}>
                {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Checklist de regras */}
          {novaSenha.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-1.5 px-1"
            >
              {validacoes.map(r => (
                <li key={r.label} className="flex items-center gap-2"
                  style={{ fontSize: 12, color: r.ok ? "#16a34a" : "#94a3b8" }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                    background: r.ok ? "#D1FAE5" : "#f1f5f9",
                    fontSize: 9, fontWeight: 700, color: r.ok ? "#16a34a" : "#94a3b8",
                  }}>
                    {r.ok ? "✓" : "·"}
                  </span>
                  {r.label}
                </li>
              ))}
            </motion.ul>
          )}

          {/* Confirmar senha */}
          <div className="space-y-1.5">
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#556376", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Confirmar Senha <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "#94a3b8" }} />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-10 pr-10 py-3 rounded-xl border outline-none transition-colors"
                style={{
                  borderColor: confirmar && confirmar !== novaSenha ? "#fca5a5" : confirmar && confirmar === novaSenha ? "#86efac" : "#e2e8f0",
                  fontSize: 14, color: "#121212", background: "#f8fafc",
                  fontFamily: "sans-serif",
                }}
                onFocus={e => e.target.style.borderColor = "#1d4ed8"}
                onBlur={e => e.target.style.borderColor = confirmar && confirmar !== novaSenha ? "#fca5a5" : confirmar && confirmar === novaSenha ? "#86efac" : "#e2e8f0"}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                style={{ color: "#94a3b8" }}>
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmar && confirmar !== novaSenha && (
              <p style={{ fontSize: 12, color: "#dc2626" }}>As senhas não coincidem</p>
            )}
          </div>

          {/* Botão */}
          <motion.button
            type="submit"
            disabled={!senhas_ok || loading}
            whileHover={senhas_ok && !loading ? { scale: 1.02, boxShadow: "0 6px 20px rgba(15,39,68,0.3)" } : {}}
            whileTap={senhas_ok && !loading ? { scale: 0.98 } : {}}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all"
            style={{
              background: senhas_ok ? "#0f2744" : "#e2e8f0",
              color: senhas_ok ? "#fff" : "#94a3b8",
              fontSize: 15, cursor: senhas_ok ? "pointer" : "not-allowed",
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
              : <><ShieldCheck className="w-4 h-4" /> Definir nova senha</>
            }
          </motion.button>

          <p className="text-center" style={{ fontSize: 12, color: "#94a3b8" }}>
            Sua senha é criptografada e nunca é armazenada em texto puro.
          </p>
        </form>
      </motion.div>
    </div>
  )
}
