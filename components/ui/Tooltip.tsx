"use client"

import { useState, useRef, useCallback, type ReactNode } from "react"

interface TooltipProps {
  label: string
  children: ReactNode
}

/**
 * Tooltip com position:fixed — não sofre clipping de overflow:hidden nos containers de tabela.
 * Aparece acima do elemento alvo com uma seta apontando para baixo.
 */
export function Tooltip({ label, children }: TooltipProps) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setCoords({ x: r.left + r.width / 2, y: r.top - 6 })
  }, [])

  const hide = useCallback(() => setCoords(null), [])

  return (
    <>
      <span ref={ref} onMouseEnter={show} onMouseLeave={hide} className="inline-flex">
        {children}
      </span>

      {coords && (
        <div
          className="fixed pointer-events-none select-none"
          style={{ left: coords.x, top: coords.y, transform: "translate(-50%, -100%)", zIndex: 9999 }}
        >
          {/* Balão */}
          <div
            className="px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap"
            style={{
              background: "#0f172a",
              boxShadow: "0 4px 12px rgba(0,0,0,0.28)",
              letterSpacing: "0.01em",
            }}
          >
            {label}
          </div>
          {/* Seta */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: "100%",
              width: 0, height: 0,
              borderLeft:  "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop:   "5px solid #0f172a",
            }}
          />
        </div>
      )}
    </>
  )
}
