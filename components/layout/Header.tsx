"use client"

import { Bell, ChevronDown } from "lucide-react"
import Link from "next/link"
import { initials } from "@/lib/utils"

interface HeaderProps {
  breadcrumbs: string[]
  title: string
}

const currentUser = { name: "Ana Souza" }

export function Header({ breadcrumbs, title }: HeaderProps) {
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
            {initials(currentUser.name)}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#061A35" }}>
            {currentUser.name}
          </span>
          <ChevronDown style={{ width: 13, height: 13, color: "#60708A" }} />
        </div>
      </div>
    </header>
  )
}
