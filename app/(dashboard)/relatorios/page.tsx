"use client"

import { useState } from "react"
import { RefreshCw, Minimize2, Maximize2 } from "lucide-react"
import { useSidebar, SIDEBAR_W, SIDEBAR_CW } from "@/components/layout/SidebarContext"

const POWERBI_URL =
  "https://app.powerbi.com/reportEmbed?reportId=d2dde6f5-1232-4a22-a66a-40f94a4f6757&autoAuth=true&ctid=8d13f3a0-3e96-4f27-84b4-3bd3a00d712e"

const HEADER_H = 64  // altura do header fixo do ERP

export default function RelatoriosPage() {
  const { collapsed }               = useSidebar()
  const sidebarW                    = collapsed ? SIDEBAR_CW : SIDEBAR_W
  const [fullscreen, setFullscreen] = useState(false)
  const [key,        setKey]        = useState(0)

  /* ── Modo tela cheia ── */
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50" style={{ background: "#fff" }}>
        <iframe
          key={`fs-${key}`}
          title="Dashboard Oticas_Carol"
          src={POWERBI_URL}
          allowFullScreen
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        />
        {/* Botão sair flutuante */}
        <button
          onClick={() => setFullscreen(false)}
          className="fixed top-3 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl z-50 shadow-lg"
          style={{ background: "rgba(15,39,68,0.85)", color: "#fff", fontSize: 13, backdropFilter: "blur(6px)" }}
        >
          <Minimize2 className="w-4 h-4" />
          Sair
        </button>
      </div>
    )
  }

  /* ── Modo normal — iframe preenche do header até o rodapé ── */
  return (
    <div
      style={{
        position:   "fixed",
        top:        HEADER_H,
        left:       sidebarW,
        right:      0,
        bottom:     0,
        transition: "left 0.25s ease",
      }}
    >
      {/* iframe ocupa 100% */}
      <iframe
        key={`normal-${key}`}
        title="Dashboard Oticas_Carol"
        src={POWERBI_URL}
        allowFullScreen
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />

      {/* Botões flutuantes no topo direito */}
      <div
        className="absolute flex items-center gap-1"
        style={{ top: 8, right: 12, zIndex: 10 }}
      >
        <button
          onClick={() => setKey(k => k + 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-md"
          style={{ background: "rgba(15,39,68,0.75)", color: "#fff", fontSize: 12, backdropFilter: "blur(6px)" }}
          title="Recarregar"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recarregar
        </button>
        <button
          onClick={() => setFullscreen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-md"
          style={{ background: "rgba(15,39,68,0.75)", color: "#fff", fontSize: 12, backdropFilter: "blur(6px)" }}
          title="Expandir"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Expandir
        </button>
      </div>
    </div>
  )
}
