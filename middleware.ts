import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import type { CookieMethodsServer } from "@supabase/ssr"

const PUBLIC_PATHS = ["/login"]

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  // Explicitamente tipado como CookieMethodsServer para resolver o overload correto.
  // Sem db.schema — auth usa schema public/auth nativo do Supabase.
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet, headers) {
      cookiesToSet.forEach(({ name, value }) =>
        request.cookies.set(name, value)
      )
      response = NextResponse.next({ request })
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)
      )
      // Aplica headers de cache-control vindos do Supabase (ex: no-store em refresh)
      if (headers) {
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value)
        )
      }
    },
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  )

  // getUser() valida o token com o servidor Supabase (mais seguro que getSession)
  const { data: { user } } = await supabase.auth.getUser()

  // Raiz: logado → dashboard, deslogado → login (sem ?next)
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(user ? "/dashboard" : "/login", request.url)
    )
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // ── Primeiro acesso: redireciona para trocar senha ───────────────────────
  // Consulta sascarol.users diretamente — mais confiável que user_metadata do JWT.
  if (user && !pathname.startsWith("/trocar-senha") && !pathname.startsWith("/api/")) {
    const adminDb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "sascarol" } }
    )
    const { data: userRow } = await adminDb
      .from("users")
      .select("first_login")
      .eq("supabase_uid", user.id)
      .single()

    if (userRow?.first_login === true) {
      return NextResponse.redirect(new URL("/trocar-senha", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
