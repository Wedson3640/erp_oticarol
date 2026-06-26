import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Leão Vision ERP",
  description: "Sistema de gestão do Grupo Leão — Piauí · Brasil",
  openGraph: {
    title: "Leão Vision ERP",
    description: "Sistema de gestão do Grupo Leão — Piauí · Brasil",
    url: "https://app.oticascarolpi.com",
    siteName: "Leão Vision ERP",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "https://app.oticascarolpi.com/leao-fundo-branco.png",
        width: 512,
        height: 512,
        alt: "Leão Vision ERP",
      },
    ],
  },
  icons: {
    icon: [{ url: "/leao-fundo-branco.png", type: "image/png" }],
    shortcut: [{ url: "/leao-fundo-branco.png", type: "image/png" }],
    apple: [{ url: "/leao-fundo-branco.png", type: "image/png" }],
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
