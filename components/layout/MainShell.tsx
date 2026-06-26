"use client"

import { ReactNode } from "react"
import { useSidebar, SIDEBAR_W, SIDEBAR_CW } from "./SidebarContext"

export function MainShell({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <div
      style={{
        marginLeft: collapsed ? SIDEBAR_CW : SIDEBAR_W,
        transition: "margin-left 0.25s ease",
      }}
    >
      {children}
    </div>
  )
}
