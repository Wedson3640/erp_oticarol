"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Lock, User, LogIn, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

export default function LoginPage() {
  const router       = useRouter()
  const params       = useSearchParams()
  const [showPwd,  setShowPwd]  = useState(false)
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  return (
    <div className="min-h-screen flex">

      {/* ── Esquerda: foto com máscara escura 45% ─────────────────────────── */}
      <div className="hidden lg:block lg:w-[46%] xl:w-[48%] relative overflow-hidden flex-shrink-0">
        <Image
          src="/imagem_lado_esquerdo_loja_oculos%20(1).png"
          alt="Interior da Ótica Carol"
          fill
          className="object-cover object-center"
          sizes="50vw"
          priority
        />
        {/* Máscara escura 45% com tons navy */}
        <div
          className="absolute inset-0"
          style={{ background: "rgba(8, 20, 40, 0.45)" }}
        />
        {/* Gradiente sutil na borda direita */}
        <div
          className="absolute inset-y-0 right-0 w-20"
          style={{ background: "linear-gradient(to right, transparent, rgba(245,246,250,0.5))" }}
        />
      </div>

      {/* ── Direita: formulário ────────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center px-8 py-10"
        style={{ background: "#f5f6fa" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
          style={{ maxWidth: 447 }}   /* 638 × 0.70 ≈ 447 — redução de 30% */
        >
          {/* ── Card ──────────────────────────────────────────────────────── */}
          <div
            className="bg-white rounded-2xl"
            style={{
              padding: "48px 56px",
              boxShadow:
                "0 2px 8px rgba(15,39,68,0.06), 0 8px 40px rgba(15,39,68,0.09)",
            }}
          >
            {/* Cabeçalho */}
            <div className="text-center mb-10">
              <h1
                className="font-bold leading-tight"
                style={{ fontSize: 30, color: "#0f172a", letterSpacing: "-0.3px" }}
              >
                Acesse o sistema interno
              </h1>
              <p className="mt-2" style={{ fontSize: 15, color: "#64748b" }}>
                Utilize suas credenciais para continuar
              </p>
            </div>

            {/* Formulário */}
            <form
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault()
                setLoading(true)
                setError(null)
                try {
                  const sb = createSupabaseBrowserClient()
                  const { error: authError } = await sb.auth.signInWithPassword({ email, password })
                  if (authError) {
                    setError("E-mail ou senha inválidos.")
                    return
                  }
                  const next = params.get("next") || "/dashboard"
                  router.push(next)
                  router.refresh()
                } catch {
                  setError("Não foi possível conectar. Tente novamente.")
                } finally {
                  setLoading(false)
                }
              }}
            >
              {/* Usuário */}
              <div>
                <label
                  className="block mb-2"
                  style={{ fontSize: 14, color: "#334155" }}
                >
                  E-mail cadastrado
                </label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ width: 18, height: 18, color: "#94a3b8" }}
                  />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full outline-none transition-all"
                    style={{
                      paddingLeft: 48,
                      paddingRight: 16,
                      paddingTop: 15,
                      paddingBottom: 15,
                      borderRadius: 10,
                      border: "1.5px solid #dde3ed",
                      fontSize: 15,
                      color: "#0f172a",
                      background: "#fff",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={(e) => (e.target.style.borderColor = "#dde3ed")}
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label
                  className="block mb-2"
                  style={{ fontSize: 14, color: "#334155" }}
                >
                  senha:
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ width: 18, height: 18, color: "#94a3b8" }}
                  />
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full outline-none transition-all"
                    style={{
                      paddingLeft: 48,
                      paddingRight: 48,
                      paddingTop: 15,
                      paddingBottom: 15,
                      borderRadius: 10,
                      border: "1.5px solid #dde3ed",
                      fontSize: 15,
                      color: "#0f172a",
                      background: "#fff",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#1d4ed8")}
                    onBlur={(e) => (e.target.style.borderColor = "#dde3ed")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? (
                      <EyeOff style={{ width: 18, height: 18, color: "#94a3b8" }} />
                    ) : (
                      <Eye style={{ width: 18, height: 18, color: "#94a3b8" }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Mensagem de erro */}
              {error && (
                <p
                  className="px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
                >
                  {error}
                </p>
              )}

              {/* Botão Entrar */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? {} : {
                  scale: 1.01,
                  boxShadow: "0 10px 28px rgba(17,51,125,0.42)",
                }}
                whileTap={loading ? {} : { scale: 0.985 }}
                className="w-full flex items-center justify-center gap-3 font-semibold text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  paddingTop: 17,
                  paddingBottom: 17,
                  borderRadius: 10,
                  fontSize: 17,
                  background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)",
                  boxShadow: "0 4px 16px rgba(17,51,125,0.30)",
                  marginTop: 4,
                  letterSpacing: "0.01em",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" style={{ width: 20, height: 20 }} />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn style={{ width: 20, height: 20 }} />
                    Entrar
                  </>
                )}
              </motion.button>

              {/* Esqueci */}
              <div className="text-center pt-1">
                <a
                  href="#"
                  className="transition-colors hover:underline"
                  style={{ fontSize: 14, color: "#1d4ed8" }}
                >
                  Esqueci minha senha
                </a>
              </div>
            </form>
          </div>

          {/* Versão */}
          <p className="text-center mt-5" style={{ fontSize: 12, color: "#9daec4" }}>
            Versão: 26.0601
          </p>
        </motion.div>
      </div>
    </div>
  )
}
