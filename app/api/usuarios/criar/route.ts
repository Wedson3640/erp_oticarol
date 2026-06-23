import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/usuarios/criar
 *
 * Body: { employeeId, username, dashboard, groups }
 *
 * 1. Cria auth user  (email = username@oticacarol.internal, senha = 12345678)
 * 2. Insere em sascarol.users
 *
 * Se o passo 2 falhar, faz rollback deletando o auth user criado.
 *
 * Dois clientes:
 *   authAdmin  → sem schema (auth.admin usa endpoint próprio)
 *   dbAdmin    → schema sascarol para PostgREST
 */

export async function POST(req: NextRequest) {
  const { employeeId, username, dashboard, groups } = await req.json()

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "username obrigatório" }, { status: 400 })
  }

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const authAdmin = createClient(url, serviceKey)
  const dbAdmin   = createClient(url, serviceKey, { db: { schema: "sascarol" } })

  const email    = `${username.trim().toLowerCase()}@oticacarol.internal`
  const password = "12345678"

  // ── 1. Criar no Supabase Auth ─────────────────────────────────────────────
  const { data: authData, error: authErr } =
    await authAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, first_login: true },
    })

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 400 })
  }

  const supabaseUid = authData.user.id

  // ── 2. Inserir em sascarol.users ──────────────────────────────────────────
  const { error: dbErr } = await dbAdmin
    .from("users")
    .insert({
      supabase_uid: supabaseUid,
      employee_id:  employeeId ? Number(employeeId) : null,
      username:     username.trim().toLowerCase(),
      dashboard:    dashboard  || null,
      groups:       Array.isArray(groups) ? groups : [],
      active:       true,
      first_login:  true,
    })

  if (dbErr) {
    // Rollback: remove o auth user para não ficar órfão
    await authAdmin.auth.admin.deleteUser(supabaseUid)
    return NextResponse.json({ error: dbErr.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, username, email })
}
