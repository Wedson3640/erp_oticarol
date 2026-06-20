import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { CookieOptions, CookieMethodsServer } from "@supabase/ssr"

// Retorna o objeto de cookies explicitamente tipado como CookieMethodsServer
// para que TypeScript resolva o overload não-deprecated de createServerClient.
function makeCookieMethods(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): CookieMethodsServer {
  return {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options as CookieOptions)
        )
      } catch {
        // Em Server Components (read-only), a escrita de cookies é esperada
        // falhar — o proxy.ts é quem persiste o token atualizado.
      }
    },
  }
}

// Cliente servidor — lê cookies do request para restaurar sessão
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "sascarol" },
      cookies: makeCookieMethods(cookieStore),
    }
  )
}

// Cliente admin (server) — service role, bypass RLS
export async function createSupabaseAdminClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "sascarol" },
      cookies: makeCookieMethods(cookieStore),
    }
  )
}
