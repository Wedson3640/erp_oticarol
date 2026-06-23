import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { CookieMethodsServer } from "@supabase/ssr"

const PUBLIC_PATHS = ["/login", "/"]

export default async function middleware(request: NextRequest) {
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

  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!session && !isPublic) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (session && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // ── Primeiro acesso: redireciona para trocar senha ───────────────────────
  // first_login é gravado em user_metadata (sem query extra ao banco).
  if (
    session &&
    session.user.user_metadata?.first_login === true &&
    !pathname.startsWith("/trocar-senha")
  ) {
    return NextResponse.redirect(new URL("/trocar-senha", request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
