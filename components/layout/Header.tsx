"use client"

import { useEffect, useState } from "react"
import { Bell, ChevronDown } from "lucide-react"
import { initials } from "@/lib/utils"
import { Tooltip } from "@/components/ui/Tooltip"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

interface HeaderProps {
  breadcrumbs: string[]
  title: string
}

/** "wedson.veras" → "Wedson Veras" */
function fmtUsername(u: string): string {
  return u
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
}

export function Header({ breadcrumbs, title }: HeaderProps) {
  const [displayName, setDisplayName] = useState("Usuário")

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        const u = data.user?.user_metadata?.username as string | undefined
        if (u) setDisplayName(fmtUsername(u))
      })
  }, [])
  return (
    <header
      className="fixed top-0 right-0 flex items-center justify-between px-8 z-20"
      style={{
        left: 260,
        height: 64,
        background: "#fff",
        borderBottom: "1px solid #E4EDFA",
      }}
    >
      {/* Breadcrumb + título */}
      <div>
        <nav className="flex items-center gap-1 text-xs mb-0.5" style={{ color: "#8fa8c8" }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1">
              {i > 0 && <span style={{ color: "#BFD7FF" }}>/</span>}
              <span
                style={{
                  color: i === breadcrumbs.length - 1 ? "#0F5BFF" : "#8fa8c8",
                  fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                }}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
        <h1 className="font-bold text-lg leading-tight" style={{ color: "#061A35" }}>
          {title}
        </h1>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-3">
        {/* Notificações */}
        <Tooltip label="Notificações">
          <button
            className="relative p-2 rounded-xl transition-colors"
            style={{ background: "#EAF2FF" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#DBEAFE")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#EAF2FF")}
          >
            <Bell style={{ width: 18, height: 18, color: "#0F5BFF" }} />
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
              style={{ background: "#EF4444", fontSize: 9 }}
            >
              8
            </span>
          </button>
        </Tooltip>

        {/* Avatar dropdown */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors"
          style={{ background: "#EAF2FF", border: "1px solid #BFD7FF" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#DBEAFE")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#EAF2FF")}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#3B82F6,#0F5BFF)" }}
          >
            {initials(displayName)}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#061A35" }}>
            {displayName}
          </span>
          <ChevronDown style={{ width: 13, height: 13, color: "#60708A" }} />
        </div>
      </div>
    </header>
  )
}
