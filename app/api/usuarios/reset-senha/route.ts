import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/usuarios/reset-senha
 *
 * Body: { username }
 *
 * Redefine a senha para "12345678" e marca first_login = true.
 */

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { username } = body

  if (!username) {
    return NextResponse.json({ error: "username obrigatório" }, { status: 400 })
  }

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Variáveis de ambiente não configuradas" }, { status: 500 })
  }

  const authAdmin = createClient(url, serviceKey)
  const dbAdmin   = createClient(url, serviceKey, { db: { schema: "sascarol" } })

  // 1. Busca o supabase_uid pelo username
  const { data: row, error: findErr } = await dbAdmin
    .from("users")
    .select("supabase_uid, id")
    .eq("username", username)
    .maybeSingle()   // maybeSingle: não gera erro quando não encontra — retorna null

  if (findErr) {
    return NextResponse.json(
      { error: `Erro ao buscar usuário: ${findErr.message}` },
      { status: 500 }
    )
  }

  if (!row) {
    return NextResponse.json(
      { error: `Usuário "${username}" não encontrado em sascarol.users` },
      { status: 404 }
    )
  }

  if (!row.supabase_uid) {
    return NextResponse.json(
      { error: `Usuário "${username}" ainda não tem conta Supabase criada` },
      { status: 422 }
    )
  }

  // 2. Redefine senha no Auth + marca first_login: true no user_metadata
  const { error: authErr } = await authAdmin.auth.admin.updateUserById(
    row.supabase_uid,
    { password: "12345678", user_metadata: { first_login: true } }
  )

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  // 3. Marca first_login = true em sascarol.users
  const { error: dbErr } = await dbAdmin
    .from("users")
    .update({ first_login: true })
    .eq("supabase_uid", row.supabase_uid)

  if (dbErr) {
    // Senha já foi redefinida, mas falhou ao marcar first_login — avisa mas não falha
    console.error("[reset-senha] Falha ao marcar first_login:", dbErr.message)
  }

  return NextResponse.json({ success: true })
}
