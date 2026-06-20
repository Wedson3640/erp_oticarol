import { supabase } from '@/lib/supabase'
import type { Customer } from '@/lib/types'

export async function searchCustomers(query: string, limit = 10): Promise<Customer[]> {
  const s = query.trim()
  if (!s || s.length < 2) return []

  const cpf = s.replace(/\D/g, '')

  let q = supabase
    .from('customers')
    .select('id, cpf, name, phone, phone_alt, email, source')
    .is('deleted_at', null)
    .limit(limit)

  if (/^\d{11}$/.test(cpf)) {
    q = q.eq('cpf', cpf)
  } else if (/^\d+$/.test(s)) {
    q = q.or(`phone.ilike.%${s}%,phone_alt.ilike.%${s}%`)
  } else {
    q = q.ilike('name', `%${s}%`).order('name')
  }

  const { data, error } = await q
  if (error) throw new Error(`searchCustomers: ${error.message}`)
  return (data ?? []) as Customer[]
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Customer
}

export async function getCustomerOrders(customerId: number) {
  const { data } = await supabase
    .from('vw_customer_orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('purchase_date', { ascending: false })
    .limit(50)
  return data ?? []
}
