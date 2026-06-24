import { Sidebar } from "@/components/layout/Sidebar"
import { InactivityProvider } from "@/components/providers/InactivityProvider"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <InactivityProvider>
      <div className="min-h-screen" style={{ background: "#f0f5ff" }}>
        <Sidebar />
        {/* conteúdo deslocado pela sidebar (260px) e pelo header (64px) */}
        <div style={{ marginLeft: 260 }}>
          {children}
        </div>
      </div>
    </InactivityProvider>
  )
}
