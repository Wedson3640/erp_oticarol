"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ShoppingBag, ClipboardList, Shield, MessageCircle,
  Target, Users, UserCheck, Truck, Tag, Eye,
  FlaskConical, Building2, Lock, LogOut, Glasses,
  BarChart3,
} from "lucide-react"
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

// ─── Componente ──────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  async function handleLogout() {
    const sb = createSupabaseBrowserClient()
    await sb.auth.signOut()
    router.push("/login")
  }

  return (
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
  )
}
