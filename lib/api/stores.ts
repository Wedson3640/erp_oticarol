import { supabase } from '@/lib/supabase'
import type { Store } from '@/lib/types'

let _cache: Store[] | null = null

export async function getStores(): Promise<Store[]> {
  if (_cache) return _cache
  const { data, error } = await supabase
    .from('stores')
    .select('id, code, name, type, active')
    .eq('active', true)
    .order('name')
  if (error) throw new Error(`getStores: ${error.message}`)
  _cache = (data ?? []) as Store[]
  return _cache
}
