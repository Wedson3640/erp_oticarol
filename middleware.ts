import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import type { CookieMethodsServer } from "@supabase/ssr"
import { canAccess } from "@/lib/permissions"

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

  // ── Consulta sascarol.users (first_login + groups + active) ─────────────
  // Uma única query por request para checar acesso e primeiro login.
  if (user && !pathname.startsWith("/trocar-senha") && !pathname.startsWith("/api/")) {
    const adminDb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "sascarol" } }
    )
    const { data: userRow } = await adminDb
      .from("users")
      .select("first_login, groups, active")
      .eq("supabase_uid", user.id)
      .single()

    // Usuário inativo → logout
    if (userRow?.active === false) {
      return NextResponse.redirect(new URL("/login?erro=inativo", request.url))
    }

    // Primeiro acesso → trocar senha
    if (userRow?.first_login === true) {
      return NextResponse.redirect(new URL("/trocar-senha", request.url))
    }

    // Sem permissão para a rota → redireciona ao dashboard
    const groups: string[] = Array.isArray(userRow?.groups) ? userRow.groups : []
    if (!canAccess(pathname, groups)) {
      return NextResponse.redirect(new URL("/dashboard?acesso=negado", request.url))
    }

    // Grava grupos num cookie legível pelo cliente (sidebar usa para filtrar menu)
    // httpOnly: false para o JS do browser conseguir ler
    response.cookies.set("_ugr", JSON.stringify(groups), {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
    })
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
