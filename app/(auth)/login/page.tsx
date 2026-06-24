"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff, Lock, User, LogIn, Loader2, MessageCircle, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// Converte "wedson.veras" → "Wedson Veras"
function formatarNome(raw: string): string {
  return raw
    .split(/[._]/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
}

// ─── Sparkles ao redor do popup ───────────────────────────────────────────────

// Posições fixas (%) concentradas ao redor do centro da tela onde o modal aparece
const SPARKLES = [
  // esquerda
  { x: 13, y: 33, size: 42, color: "#fcd34d", dur: 1.8, delay: 0    },
  { x: 20, y: 66, size: 28, color: "#ffffff", dur: 2.2, delay: 0.4  },
  { x:  9, y: 52, size: 20, color: "#fcd34d", dur: 2.0, delay: 0.6  },
  { x:  5, y: 44, size: 14, color: "#c4b5fd", dur: 1.9, delay: 0.75 },
  { x: 17, y: 20, size: 18, color: "#ffffff", dur: 2.3, delay: 0.5  },
  // direita
  { x: 79, y: 24, size: 36, color: "#ffffff", dur: 1.9, delay: 0.2  },
  { x: 85, y: 54, size: 24, color: "#fcd34d", dur: 2.3, delay: 0.5  },
  { x: 76, y: 71, size: 32, color: "#ffffff", dur: 1.7, delay: 0.9  },
  { x: 88, y: 74, size: 46, color: "#ffffff", dur: 2.1, delay: 0.15 },
  { x: 91, y: 37, size: 16, color: "#93c5fd", dur: 2.0, delay: 0.55 },
  { x: 94, y: 62, size: 22, color: "#fcd34d", dur: 1.8, delay: 0.35 },
  // cima
  { x: 37, y: 22, size: 18, color: "#fcd34d", dur: 1.5, delay: 0.3  },
  { x: 62, y: 19, size: 16, color: "#c4b5fd", dur: 2.0, delay: 0.7  },
  { x: 25, y: 28, size:  9, color: "#ffffff", dur: 2.4, delay: 0.85 },
  { x: 72, y: 28, size: 12, color: "#ffffff", dur: 1.7, delay: 0.4  },
  // baixo
  { x: 44, y: 82, size: 14, color: "#93c5fd", dur: 1.8, delay: 0.45 },
  { x: 57, y: 81, size: 20, color: "#fcd34d", dur: 2.2, delay: 0.65 },
  { x: 68, y: 85, size: 26, color: "#ffffff", dur: 1.6, delay: 0.35 },
  { x: 32, y: 84, size: 16, color: "#fcd34d", dur: 2.0, delay: 0.6  },
  { x: 20, y: 78, size: 10, color: "#c4b5fd", dur: 1.9, delay: 0.25 },
]

// SVG de estrela de 4 pontas (sparkle)
function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8 Z" />
    </svg>
  )
}

// ─── Boas-vindas ──────────────────────────────────────────────────────────────

function BoasVindas({ nome }: { nome: string }) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(8,15,32,0.78)", backdropFilter: "blur(8px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Sparkles flutuando ao redor ── */}
      {SPARKLES.map((s, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%,-50%)" }}
          animate={{ opacity: [0.15, 1, 0.15], scale: [0.7, 1.25, 0.7] }}
          transition={{ repeat: Infinity, duration: s.dur, delay: s.delay, ease: "easeInOut" }}
        >
          <Sparkle size={s.size} color={s.color} />
        </motion.div>
      ))}

      {/* ── Card branco com gradiente suave ── */}
      <motion.div
        className="relative mx-4 text-center"
        style={{
          width: "100%",
          maxWidth: 460,
          padding: "44px 44px 38px",
          borderRadius: 28,
          background: "linear-gradient(145deg, #e0d7ff 0%, #bfdbfe 35%, #fbcfe8 70%, #fed7aa 100%)",
          boxShadow: "0 12px 56px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)",
        }}
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0, scale: 0.92, y: -16 }}
        transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.1 }}
      >
        {/* Ícone foguete flutuando */}
        <motion.div
          className="flex items-center justify-center mx-auto mb-5"
          style={{
            width: 84, height: 84, borderRadius: "50%",
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(6px)",
            boxShadow: "0 0 0 2px rgba(255,255,255,0.7), 0 6px 24px rgba(139,92,246,0.22)",
            fontSize: 44,
          }}
          animate={{ y: [-6, 6] }}
          transition={{ repeat: Infinity, repeatType: "reverse", duration: 2.2, ease: "easeInOut" }}
        >
          🚀
        </motion.div>

        {/* Título */}
        <motion.h2
          style={{
            fontSize: 26, fontWeight: 800, color: "#1e1b4b", lineHeight: 1.35,
            marginBottom: 8, fontFamily: "system-ui,-apple-system,sans-serif",
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Seja bem vindo {nome},<br />bom trabalho
        </motion.h2>

        {/* Divisor com estrela */}
        <motion.div
          className="flex items-center justify-center gap-3 my-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.44 }}
        >
          <div style={{ height: 1, width: 56, background: "linear-gradient(90deg,transparent,#cbd5e1)" }} />
          <span style={{ fontSize: 16 }}>⭐</span>
          <div style={{ height: 1, width: 56, background: "linear-gradient(90deg,#cbd5e1,transparent)" }} />
        </motion.div>

        {/* Subtítulo */}
        <motion.p
          style={{ fontSize: 15, color: "#4c3d8f", marginBottom: 22 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.54 }}
        >
          Preparando tudo para você...
        </motion.p>

        {/* Barra de progresso com shimmer */}
        <motion.div
          className="mx-auto rounded-full overflow-hidden"
          style={{ height: 8, maxWidth: 260, background: "rgba(255,255,255,0.45)", position: "relative" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.64 }}
        >
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            style={{ background: "linear-gradient(90deg,#3b82f6,#60a5fa,#93c5fd)" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3.2, delay: 0.64, ease: "easeOut" }}
          >
            {/* Shimmer que passa sobre a barra */}
            <motion.div
              className="absolute inset-y-0"
              style={{ width: 64, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)", skewX: "-12deg" }}
              animate={{ x: ["-100%", "400%"] }}
              transition={{ repeat: Infinity, duration: 1.1, delay: 1.1, ease: "linear" }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// ─── Modal "Esqueci minha senha" ──────────────────────────────────────────────

function ModalEsqueci({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl overflow-hidden w-full"
        style={{ maxWidth: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho colorido */}
        <div className="px-6 pt-7 pb-5 text-center" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg transition-colors hover:bg-slate-100"
          >
            <X className="w-4 h-4" style={{ color: "#94a3b8" }} />
          </button>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#fef3c7" }}
          >
            <MessageCircle className="w-7 h-7" style={{ color: "#d97706" }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
            Esqueceu sua senha?
          </h3>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Sem problema — o RH pode ajudar.
          </p>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5">
          <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.7, textAlign: "center" }}>
            Para redefinir sua senha, entre em contato com o setor de{" "}
            <strong style={{ color: "#0f2744" }}>Recursos Humanos</strong>.
            Eles irão gerar uma nova senha provisória para seu usuário.
          </p>

          <div
            className="mt-4 px-4 py-3 rounded-xl text-center"
            style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}
          >
            <p style={{ fontSize: 12, color: "#0369a1", fontWeight: 600 }}>
              📋 Informe seu nome completo e setor ao solicitar o reset.
            </p>
          </div>
        </div>

        {/* Botão */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)", fontSize: 15 }}
          >
            Entendi
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Formulário de login ───────────────────────────────────────────────────────

function LoginPageInner() {
  const params       = useSearchParams()
  const [showPwd,       setShowPwd]       = useState(false)
  const [username,      setUsername]      = useState("")
  const [password,      setPassword]      = useState("")
  const [error,         setError]         = useState<string | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [boasVindas,    setBoasVindas]    = useState(false)
  const [nomeUsuario,   setNomeUsuario]   = useState("")
  const [showEsqueci,   setShowEsqueci]   = useState(false)

  const motivo = params.get("motivo")

  return (
    <>
      {/* ── Overlay de boas-vindas ──────────────────────────────────────────── */}
      <AnimatePresence>
        {boasVindas && <BoasVindas nome={nomeUsuario} />}
      </AnimatePresence>

      {/* ── Modal esqueci senha ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEsqueci && <ModalEsqueci onClose={() => setShowEsqueci(false)} />}
      </AnimatePresence>

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
          <div className="absolute inset-0" style={{ background: "rgba(8,20,40,0.45)" }} />
          <div className="absolute inset-y-0 right-0 w-20"
            style={{ background: "linear-gradient(to right, transparent, rgba(245,246,250,0.5))" }} />
        </div>

        {/* ── Direita: formulário ────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center px-8 py-10" style={{ background: "#f5f6fa" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
            style={{ maxWidth: 447 }}
          >
            <div
              className="bg-white rounded-2xl"
              style={{ padding: "48px 56px", boxShadow: "0 2px 8px rgba(15,39,68,0.06), 0 8px 40px rgba(15,39,68,0.09)" }}
            >
              {/* Cabeçalho */}
              <div className="text-center mb-10">
                <h1 className="font-bold leading-tight" style={{ fontSize: 30, color: "#0f172a", letterSpacing: "-0.3px" }}>
                  Acesse o sistema interno
                </h1>
                <p className="mt-2" style={{ fontSize: 15, color: "#64748b" }}>
                  Utilize suas credenciais para continuar
                </p>
                {motivo === "inatividade" && (
                  <p className="mt-3 px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                    ⏱ Sessão encerrada por inatividade. Faça login novamente.
                  </p>
                )}
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
                    const email = `${username.trim().toLowerCase()}@oticacarol.internal`
                    const { error: authError } = await sb.auth.signInWithPassword({ email, password })
                    if (authError) {
                      setError("Usuário ou senha inválidos.")
                      return
                    }

                    // Resolve o nome de exibição
                    const { data: { user } } = await sb.auth.getUser()
                    const meta = user?.user_metadata ?? {}
                    const nome =
                      meta.display_name ||
                      meta.nome ||
                      formatarNome(meta.username || username)

                    const next = params.get("next") || "/dashboard"
                    setNomeUsuario(nome)
                    setBoasVindas(true)

                    // Redireciona após a animação de boas-vindas (3s)
                    setTimeout(() => { window.location.href = next }, 4000)

                  } catch {
                    setError("Não foi possível conectar. Tente novamente.")
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                {/* Usuário */}
                <div>
                  <label className="block mb-2" style={{ fontSize: 14, color: "#334155" }}>Usuário</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2" style={{ width: 18, height: 18, color: "#94a3b8" }} />
                    <input
                      type="text"
                      placeholder="nome.sobrenome"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                      className="w-full outline-none transition-all"
                      style={{ paddingLeft: 48, paddingRight: 16, paddingTop: 15, paddingBottom: 15, borderRadius: 10, border: "1.5px solid #dde3ed", fontSize: 15, color: "#0f172a", background: "#fff" }}
                      onFocus={(e) => (e.target.style.borderColor = "#1d4ed8")}
                      onBlur={(e) => (e.target.style.borderColor = "#dde3ed")}
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <label className="block mb-2" style={{ fontSize: 14, color: "#334155" }}>Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2" style={{ width: 18, height: 18, color: "#94a3b8" }} />
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full outline-none transition-all"
                      style={{ paddingLeft: 48, paddingRight: 48, paddingTop: 15, paddingBottom: 15, borderRadius: 10, border: "1.5px solid #dde3ed", fontSize: 15, color: "#0f172a", background: "#fff" }}
                      onFocus={(e) => (e.target.style.borderColor = "#1d4ed8")}
                      onBlur={(e) => (e.target.style.borderColor = "#dde3ed")}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors" tabIndex={-1}>
                      {showPwd
                        ? <EyeOff style={{ width: 18, height: 18, color: "#94a3b8" }} />
                        : <Eye   style={{ width: 18, height: 18, color: "#94a3b8" }} />}
                    </button>
                  </div>
                </div>

                {/* Erro */}
                {error && (
                  <p className="px-4 py-3 rounded-xl text-sm font-medium"
                    style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                    {error}
                  </p>
                )}

                {/* Botão Entrar */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : { scale: 1.01, boxShadow: "0 10px 28px rgba(17,51,125,0.42)" }}
                  whileTap={loading ? {} : { scale: 0.985 }}
                  className="w-full flex items-center justify-center gap-3 font-semibold text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ paddingTop: 17, paddingBottom: 17, borderRadius: 10, fontSize: 17, background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)", boxShadow: "0 4px 16px rgba(17,51,125,0.30)", marginTop: 4, letterSpacing: "0.01em" }}
                >
                  {loading
                    ? <><Loader2 className="animate-spin" style={{ width: 20, height: 20 }} /> Entrando...</>
                    : <><LogIn style={{ width: 20, height: 20 }} /> Entrar</>}
                </motion.button>

                {/* Esqueci */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowEsqueci(true)}
                    className="transition-colors hover:underline"
                    style={{ fontSize: 14, color: "#1d4ed8", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Esqueci minha senha
                  </button>
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
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
