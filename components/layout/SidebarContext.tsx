"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface SidebarCtx {
  collapsed:   boolean
  toggle:      () => void
  userGroups:  string[]   // ex: ["Vendas", "Admin"]
  groupsReady: boolean    // true quando já leu os grupos
}

const SidebarContext = createContext<SidebarCtx>({
  collapsed:   false,
  toggle:      () => {},
  userGroups:  [],
  groupsReady: false,
})

/** Lê o cookie _ugr (gravado pelo middleware) e retorna o array de grupos */
function readGroupsFromCookie(): string[] {
  if (typeof document === "undefined") return []
  const match = document.cookie.split(";").find((c) => c.trim().startsWith("_ugr="))
  if (!match) return []
  try {
    const raw = decodeURIComponent(match.split("=").slice(1).join("="))
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed,   setCollapsed]   = useState(false)
  const [userGroups,  setUserGroups]  = useState<string[]>([])
  const [groupsReady, setGroupsReady] = useState(false)

  useEffect(() => {
    // Cookie já está disponível no primeiro render do cliente
    setUserGroups(readGroupsFromCookie())
    setGroupsReady(true)
  }, [])

  return (
    <SidebarContext.Provider value={{
      collapsed,
      toggle: () => setCollapsed(c => !c),
      userGroups,
      groupsReady,
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)

export const SIDEBAR_W  = 260
export const SIDEBAR_CW = 68   // collapsed width
