"use client"

import { useEffect, useRef } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"

const TIMEOUT_MS   = 60 * 60 * 1000  // 1 hora
const CHECK_MS     = 60 * 1000        // verifica a cada 1 minuto
const STORAGE_KEY  = "sascarol_last_activity"

function stamp() {
  localStorage.setItem(STORAGE_KEY, String(Date.now()))
}

export function InactivityProvider({ children }: { children: React.ReactNode }) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Registra atividade na primeira montagem
    stamp()

    // Eventos que indicam que o usuário está ativo
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"]
    events.forEach(ev => window.addEventListener(ev, stamp, { passive: true }))

    // Verifica inatividade a cada minuto
    timerRef.current = setInterval(async () => {
      const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0)
      if (Date.now() - last >= TIMEOUT_MS) {
        clearInterval(timerRef.current!)
        const sb = createSupabaseBrowserClient()
        await sb.auth.signOut()
        window.location.href = "/login?motivo=inatividade"
      }
    }, CHECK_MS)

    return () => {
      events.forEach(ev => window.removeEventListener(ev, stamp))
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return <>{children}</>
}
