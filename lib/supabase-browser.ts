"use client"

import { createBrowserClient } from "@supabase/ssr"

// Cliente browser — usa cookies para persistir sessão no App Router
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'sascarol' } }
  )
}
