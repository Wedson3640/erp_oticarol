import { Sidebar } from "@/components/layout/Sidebar"
import { MainShell } from "@/components/layout/MainShell"
import { SidebarProvider } from "@/components/layout/SidebarContext"
import { InactivityProvider } from "@/components/providers/InactivityProvider"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <InactivityProvider>
      <SidebarProvider>
        <div className="min-h-screen" style={{ background: "#f0f5ff" }}>
          <Sidebar />
          <MainShell>{children}</MainShell>
        </div>
      </SidebarProvider>
    </InactivityProvider>
  )
}
