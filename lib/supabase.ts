import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente público (browser) — usa anon key, respeita RLS
export const supabase = createClient(url, anon, {
  db: { schema: 'sascarol' },
})

// Cliente admin (server actions / route handlers) — usa service role, bypass RLS
// No browser a SUPABASE_SERVICE_ROLE_KEY não está disponível; cai no anon key como fallback seguro
export const supabaseAdmin = createClient(
  url,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? anon,
  { db: { schema: 'sascarol' } }
)
