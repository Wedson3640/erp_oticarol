"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ShoppingBag, ClipboardList, Shield, MessageCircle,
  Target, Users, UserCheck, Truck, Tag, Eye,
  FlaskConical, Building2, Lock, LogOut, Glasses,
  BarChart3,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

// ─── Dados de navegação ───────────────────────────────────────────────────────

const navGroups = [
  {
    label: "OPERACIONAL",
    items: [
      { icon: ShoppingBag,   label: "Pedidos",      href: "/pedidos"      },
      { icon: ClipboardList, label: "Solicitações",  href: "/solicitacoes" },
      { icon: Shield,        label: "Garantias",     href: "/garantias"    },
      { icon: MessageCircle, label: "Conversas/CRM", href: "/conversas"    },
    ],
  },
  {
    label: "GESTÃO",
    items: [
      { icon: Target,    label: "Metas",        href: "/metas"       },
      { icon: Users,     label: "Funcionários",  href: "/funcionarios" },
      { icon: UserCheck, label: "Usuários",      href: "/usuarios"    },
      { icon: BarChart3, label: "Relatórios",    href: "/relatorios"  },
    ],
  },
  {
    label: "COMPRAS",
    items: [
      { icon: Truck, label: "Remessas", href: "/remessas" },
      { icon: Tag,   label: "Cupons",   href: "/cupons"   },
    ],
  },
  {
    label: "CONFIGURAÇÕES",
    items: [
      { icon: Eye,          label: "Lentes",       href: "/lentes"       },
      { icon: FlaskConical, label: "Laboratórios",  href: "/laboratorios" },
      { icon: Building2,    label: "Empresa",       href: "/empresa"      },
      { icon: Lock,         label: "Permissões",    href: "/permissoes"   },
    ],
  },
]

// ─── Sparkles (mesma lógica do popup de boas-vindas) ─────────────────────────

const SPARKLES = [
  { x: 13, y: 33, size: 36, color: "#fcd34d", dur: 1.8, delay: 0    },
  { x: 20, y: 66, size: 22, color: "#ffffff", dur: 2.2, delay: 0.4  },
  { x:  9, y: 52, size: 16, color: "#fcd34d", dur: 2.0, delay: 0.6  },
  { x:  5, y: 44, size: 12, color: "#c4b5fd", dur: 1.9, delay: 0.75 },
  { x: 17, y: 20, size: 14, color: "#ffffff", dur: 2.3, delay: 0.5  },
  { x: 79, y: 24, size: 30, color: "#ffffff", dur: 1.9, delay: 0.2  },
  { x: 85, y: 54, size: 20, color: "#fcd34d", dur: 2.3, delay: 0.5  },
  { x: 76, y: 71, size: 26, color: "#ffffff", dur: 1.7, delay: 0.9  },
  { x: 88, y: 74, size: 40, color: "#ffffff", dur: 2.1, delay: 0.15 },
  { x: 91, y: 37, size: 14, color: "#93c5fd", dur: 2.0, delay: 0.55 },
  { x: 94, y: 62, size: 18, color: "#fcd34d", dur: 1.8, delay: 0.35 },
  { x: 37, y: 22, size: 14, color: "#fcd34d", dur: 1.5, delay: 0.3  },
  { x: 62, y: 19, size: 12, color: "#c4b5fd", dur: 2.0, delay: 0.7  },
  { x: 25, y: 28, size:  8, color: "#ffffff", dur: 2.4, delay: 0.85 },
  { x: 72, y: 28, size: 10, color: "#ffffff", dur: 1.7, delay: 0.4  },
  { x: 44, y: 82, size: 12, color: "#93c5fd", dur: 1.8, delay: 0.45 },
  { x: 57, y: 81, size: 16, color: "#fcd34d", dur: 2.2, delay: 0.65 },
  { x: 68, y: 85, size: 22, color: "#ffffff", dur: 1.6, delay: 0.35 },
]

function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8 Z" />
    </svg>
  )
}

// ─── Popup de despedida ───────────────────────────────────────────────────────

function PopupDespedida({ nome }: { nome: string }) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(8,15,32,0.78)", backdropFilter: "blur(8px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Sparkles */}
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

      {/* Card */}
      <motion.div
        className="relative mx-4 text-center"
        style={{
          width: "100%",
          maxWidth: 460,
          padding: "44px 44px 38px",
          borderRadius: 28,
          background: "linear-gradient(160deg, #e0d7ff 0%, #bfdbfe 35%, #fbcfe8 70%, #fed7aa 100%)",
          boxShadow: "0 12px 56px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)",
        }}
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0, scale: 0.92, y: -16 }}
        transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.1 }}
      >
        {/* Ícone lua / descanso flutuando */}
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
          transition={{ repeat: Infinity, repeatType: "reverse", duration: 2.4, ease: "easeInOut" }}
        >
          🌙
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
          Até logo, {nome}!
        </motion.h2>

        {/* Divisor */}
        <motion.div
          className="flex items-center justify-center gap-3 my-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.44 }}
        >
          <div style={{ height: 1, width: 56, background: "linear-gradient(90deg,transparent,#cbd5e1)" }} />
          <span style={{ fontSize: 16 }}>✨</span>
          <div style={{ height: 1, width: 56, background: "linear-gradient(90deg,#cbd5e1,transparent)" }} />
        </motion.div>

        {/* Mensagem */}
        <motion.p
          style={{ fontSize: 15, color: "#4c3d8f", marginBottom: 22, lineHeight: 1.6 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.54 }}
        >
          Obrigado pelo seu trabalho hoje.<br />
          Descanse bem e até a próxima! 😊
        </motion.p>

        {/* Barra de progresso */}
        <motion.div
          className="mx-auto rounded-full overflow-hidden"
          style={{ height: 8, maxWidth: 260, background: "rgba(255,255,255,0.45)", position: "relative" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.64 }}
        >
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            style={{ background: "linear-gradient(90deg,#8b5cf6,#a78bfa,#c4b5fd)" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5, delay: 0.64, ease: "easeOut" }}
          >
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

// ─── Componente principal ─────────────────────────────────────────────────────

function formatarNome(raw: string): string {
  return raw.split(/[._]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")
}

export function Sidebar() {
  const pathname = usePathname()

  const [despedida,  setDespedida]  = useState(false)
  const [nomeAdeus,  setNomeAdeus]  = useState("")

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  async function handleLogout() {
    const sb = createSupabaseBrowserClient()

    // Resolve o nome antes de deslogar
    const { data: { user } } = await sb.auth.getUser()
    const meta = user?.user_metadata ?? {}
    const nome = meta.display_name || meta.nome || formatarNome(meta.username || "")

    setNomeAdeus(nome)
    setDespedida(true)

    // Aguarda a animação (3s) e então desloga
    setTimeout(async () => {
      await sb.auth.signOut()
      window.location.href = "/login"
    }, 3200)
  }

  return (
    <>
      {/* Popup despedida */}
      <AnimatePresence>
        {despedida && <PopupDespedida nome={nomeAdeus} />}
      </AnimatePresence>

      <aside
        className="fixed left-0 top-0 h-screen flex flex-col z-30 select-none overflow-hidden"
        style={{
          width: 260,
          background: "linear-gradient(180deg, #001E3C 0%, #004086 60%, #003070 100%)",
          boxShadow: "4px 0 24px rgba(6,26,53,0.3)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}
          >
            <Glasses className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Ótica Carol</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-4 pb-2">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p
                className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#8FB3E6", letterSpacing: "0.08em" }}
              >
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                        style={
                          active
                            ? {
                                background: "linear-gradient(90deg, #0F5BFF 0%, #0646D9 100%)",
                                color: "#ffffff",
                                fontWeight: 600,
                                boxShadow: "0 8px 20px rgba(15,91,255,0.28)",
                              }
                            : { color: "rgba(255,255,255,0.75)" }
                        }
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.background = "transparent"
                        }}
                      >
                        <item.icon className="flex-shrink-0 w-[18px] h-[18px]" strokeWidth={2} />
                        <span style={{ fontSize: 14 }}>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
            style={{ color: "rgba(255,255,255,0.55)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)"
              e.currentTarget.style.color = "rgba(255,255,255,0.9)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "rgba(255,255,255,0.55)"
            }}
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
            <span style={{ fontSize: 14 }}>Sair</span>
          </button>
        </div>
      </aside>
    </>
  )
}
