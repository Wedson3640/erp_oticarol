import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/usuarios/excluir
 *
 * Body: { userId }  (id em sascarol.users)
 *
 * 1. Busca supabase_uid em sascarol.users
 * 2. Remove de auth.users (service role)
 * 3. Hard-delete em sascarol.users
 *
 * Usa dois clientes separados para evitar conflito:
 *   - authAdmin  → sem schema (auth.admin usa endpoint próprio)
 *   - dbAdmin    → com schema sascarol para PostgREST
 */

export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  if (!userId) {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 })
  }

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Cliente para Auth admin (sem schema no construtor)
  const authAdmin = createClient(url, serviceKey)

  // Cliente para PostgREST → sascarol schema
  const dbAdmin   = createClient(url, serviceKey, { db: { schema: "sascarol" } })

  // 1. Busca o supabase_uid
  const { data: row, error: findErr } = await dbAdmin
    .from("users")
    .select("supabase_uid")
    .eq("id", Number(userId))
    .single()

  if (findErr || !row) {
    return NextResponse.json(
      { error: findErr?.message ?? "Usuário não encontrado" },
      { status: 404 }
    )
  }

  // 2. Remove do Supabase Auth (se tiver supabase_uid)
  if (row.supabase_uid) {
    const { error: authErr } = await authAdmin.auth.admin.deleteUser(row.supabase_uid)
    if (authErr) {
      return NextResponse.json({ error: `Auth: ${authErr.message}` }, { status: 400 })
    }
  }

  // 3. Hard-delete em sascarol.users
  const { error: dbErr, count } = await dbAdmin
    .from("users")
    .delete({ count: "exact" })
    .eq("id", Number(userId))

  if (dbErr) {
    return NextResponse.json({ error: `DB: ${dbErr.message}` }, { status: 400 })
  }

  // Garante que pelo menos 1 linha foi deletada
  if (count === 0) {
    return NextResponse.json({ error: "Nenhum registro deletado — verifique o id" }, { status: 400 })
  }

  return NextResponse.json({ success: true, deleted: count })
}
