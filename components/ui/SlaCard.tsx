"use client"

// ─── SlaCard ─────────────────────────────────────────────────────────────────
// Exibe o SLA de um pedido / garantia / solicitação com barra de progresso.
// criadoEm: "DD/MM/YYYY" ou "DD/MM/YYYY HH:MM"
// prazo:    "DD/MM/YYYY"

interface SlaCardProps {
  label?:   string
  criadoEm: string
  prazo:    string
}

function parsePTDate(str: string): Date {
  const [d, m, y] = str.split(" ")[0].split("/").map(Number)
  return new Date(y, m - 1, d)
}

export function SlaCard({ label = "SLA", criadoEm, prazo }: SlaCardProps) {
  const inicio = parsePTDate(criadoEm)
  const fim    = parsePTDate(prazo)
  const hoje   = new Date(); hoje.setHours(0, 0, 0, 0)

  const totalDias     = Math.max(1, Math.round((fim.getTime()  - inicio.getTime()) / 86400000))
  const decorrDias    = Math.round((hoje.getTime()   - inicio.getTime()) / 86400000)
  const restanteDias  = Math.round((fim.getTime()    - hoje.getTime())   / 86400000)
  const pct           = Math.min(100, Math.max(0, Math.round((decorrDias / totalDias) * 100)))
  const vencido       = restanteDias < 0

  const cor = vencido
    ? { bar: "#dc2626", text: "#dc2626", bg: "#fef2f2",  border: "#fecaca"  }
    : pct >= 80
    ? { bar: "#f59e0b", text: "#b45309", bg: "#fffbeb",  border: "#fde68a"  }
    : { bar: "#22c55e", text: "#15803d", bg: "#f0fdf4",  border: "#bbf7d0"  }

  const statusLabel = vencido
    ? `Vencido há ${Math.abs(restanteDias)}d`
    : `${restanteDias}d restantes`

  return (
    <div
      style={{
        background: "#fff", borderRadius: 16, padding: 20,
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 16px rgba(15,39,68,0.05)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{label}</h4>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: cor.bg, color: cor.text, border: `1px solid ${cor.border}` }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Barra */}
      <div
        className="rounded-full overflow-hidden"
        style={{ height: 8, background: "#f1f5f9", marginBottom: 6 }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: cor.bar,
            borderRadius: 999,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: cor.text, marginBottom: 14 }}>
        {pct}% do prazo utilizado
      </p>

      {/* Detalhe */}
      {[
        { label: "Abertura",   value: criadoEm.split(" ")[0]        },
        { label: "Prazo",      value: prazo                          },
        { label: "Total",      value: `${totalDias} dias`            },
        { label: "Decorridos", value: `${Math.max(0, decorrDias)}d`  },
      ].map((row) => (
        <div
          key={row.label}
          className="flex justify-between py-2"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{row.label}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{row.value}</span>
        </div>
      ))}
    </div>
  )
}
