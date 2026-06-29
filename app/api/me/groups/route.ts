import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import type { CookieMethodsServer } from "@supabase/ssr"

/**
 * GET /api/me/groups
 * Retorna os grupos do usuário autenticado.
 * Usa service role para bypassar RLS (leitura segura de sascarol.users).
 */
export async function GET(request: NextRequest) {
  // Identifica o usuário autenticado via cookie
  const cookieMethods: CookieMethodsServer = {
    getAll: () => request.cookies.getAll(),
    setAll: (_cookiesToSet, _headers) => {
      // API route — não precisa propagar cookies de refresh
    },
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ groups: [] })
  }

  // Busca grupos com service role (bypassa RLS)
  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "sascarol" } }
  )

  const { data } = await adminDb
    .from("users")
    .select("groups, active")
    .eq("supabase_uid", user.id)
    .single()

  // Usuário inativo → sem grupos
  if (data?.active === false) {
    return NextResponse.json({ groups: [] })
  }

  return NextResponse.json({
    groups: Array.isArray(data?.groups) ? data.groups : [],
  })
}
