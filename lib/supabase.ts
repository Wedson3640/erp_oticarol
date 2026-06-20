import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente público (browser) — usa anon key, respeita RLS
export const supabase = createClient(url, anon, {
  db: { schema: 'sascarol' },
})

// Cliente admin (server actions / route handlers) — usa service role, bypass RLS
export const supabaseAdmin = createClient(
  url,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'sascarol' } }
)
