"use client"

import { useState } from "react"
import { BarChart3, Maximize2, Minimize2, RefreshCw } from "lucide-react"

const POWERBI_URL =
  "https://app.powerbi.com/reportEmbed?reportId=d2dde6f5-1232-4a22-a66a-40f94a4f6757&autoAuth=true&ctid=8d13f3a0-3e96-4f27-84b4-3bd3a00d712e"

export default function RelatoriosPage() {
  const [fullscreen, setFullscreen] = useState(false)
  const [key,        setKey]        = useState(0)   // força reload do iframe

  return (
    <div className="flex flex-col h-full" style={{ minHeight: "calc(100vh - 64px)" }}>

      {/* ── Cabeçalho ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid #e8edf3" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#EAF2FF" }}
          >
            <BarChart3 className="w-5 h-5" style={{ color: "#1d4ed8" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0f2744", lineHeight: 1.2 }}>
              Relatórios
            </h1>
            <p style={{ fontSize: 12, color: "#8499b1" }}>
              Dashboard Ótica Carol — Power BI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Recarregar */}
          <button
            onClick={() => setKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors hover:bg-slate-100"
            style={{ fontSize: 13, color: "#556376" }}
            title="Recarregar relatório"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Recarregar</span>
          </button>

          {/* Expandir / recolher */}
          <button
            onClick={() => setFullscreen(f => !f)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors hover:bg-slate-100"
            style={{ fontSize: 13, color: "#556376" }}
            title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {fullscreen
              ? <Minimize2 className="w-4 h-4" />
              : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{fullscreen ? "Reduzir" : "Expandir"}</span>
          </button>
        </div>
      </div>

      {/* ── Iframe Power BI ───────────────────────────────────────────────────── */}
      {fullscreen ? (
        /* Modo tela cheia — cobre toda a janela */
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#fff" }}>
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid #e8edf3" }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0f2744" }}>
              Dashboard Ótica Carol — Power BI
            </span>
            <button
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors hover:bg-slate-100"
              style={{ fontSize: 13, color: "#556376" }}
            >
              <Minimize2 className="w-4 h-4" />
              Sair da tela cheia
            </button>
          </div>
          <iframe
            key={`fs-${key}`}
            title="Dashboard Oticas_Carol"
            src={POWERBI_URL}
            frameBorder="0"
            allowFullScreen
            className="flex-1 w-full"
            style={{ border: "none" }}
          />
        </div>
      ) : (
        /* Modo normal — ocupa o restante da altura disponível */
        <div className="flex-1 p-4" style={{ minHeight: 0 }}>
          <div
            className="w-full h-full rounded-2xl overflow-hidden"
            style={{
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 12px rgba(15,39,68,0.06)",
              minHeight: 520,
            }}
          >
            <iframe
              key={`normal-${key}`}
              title="Dashboard Oticas_Carol"
              src={POWERBI_URL}
              frameBorder="0"
              allowFullScreen
              style={{ width: "100%", height: "100%", minHeight: 520, border: "none", display: "block" }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
