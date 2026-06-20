import { redirect } from "next/navigation"

// Rota raiz → redireciona para /dashboard
export default function RootPage() {
  redirect("/dashboard")
}
