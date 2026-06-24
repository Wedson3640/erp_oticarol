import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/usuarios/primeiro-acesso
 *
 * Body: { supabaseUid }
 *
 * Marca first_login = false em sascarol.users.
 * Chamado pela página /trocar-senha após o usuário definir nova senha.
 * Usa service role para garantir permissão e schema correto.
 */
export async function POST(req: NextRequest) {
  const { supabaseUid } = await req.json()
  if (!supabaseUid) {
    return NextResponse.json({ error: "supabaseUid obrigatório" }, { status: 400 })
  }

  const dbAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "sascarol" } }
  )

  const { data, error } = await dbAdmin
    .from("users")
    .update({ first_login: false })
    .eq("supabase_uid", supabaseUid)
    .select("id, username, first_login")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: `Usuário não encontrado em sascarol.users para uid=${supabaseUid}` },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, updated: data[0] })
}
