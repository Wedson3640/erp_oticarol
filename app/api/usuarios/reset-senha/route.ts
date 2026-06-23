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
  const { username } = await req.json()
  if (!username) {
    return NextResponse.json({ error: "username obrigatório" }, { status: 400 })
  }

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const authAdmin = createClient(url, serviceKey)
  const dbAdmin   = createClient(url, serviceKey, { db: { schema: "sascarol" } })

  // 1. Busca o supabase_uid
  const { data: row, error: findErr } = await dbAdmin
    .from("users")
    .select("supabase_uid")
    .eq("username", username)
    .single()

  if (findErr || !row?.supabase_uid) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  // 2. Redefine senha no Auth e marca first_login = true
  const { error: authErr } = await authAdmin.auth.admin.updateUserById(
    row.supabase_uid,
    { password: "12345678", user_metadata: { first_login: true } }
  )

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  // 3. Marca first_login = true
  await dbAdmin
    .from("users")
    .update({ first_login: true })
    .eq("username", username)

  return NextResponse.json({ success: true })
}
