import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ERP Ótica Carol",
  description: "Sistema de Gestão — Ótica Carol · Teresina, PI",
  icons: {
    icon: [{ url: "/favicocarol.png", type: "image/png" }],
    shortcut: [{ url: "/favicocarol.png", type: "image/png" }],
    apple: [{ url: "/favicocarol.png", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full">
      {/* suppressHydrationWarning: extensões de browser (ex: ATM guard) injetam
          atributos no <body> antes da hidratação — isso é esperado e seguro */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
