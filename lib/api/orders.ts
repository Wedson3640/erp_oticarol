import { supabase } from '@/lib/supabase'
import type { ServiceOrder, OrderFilters, PaginatedResult } from '@/lib/types'

const PAGE_DEFAULT = 25

export async function getOrders(
  filters: OrderFilters = {}
): Promise<PaginatedResult<ServiceOrder>> {
  const {
    search,
    status_id,
    store_id,
    urgent,
    page    = 1,
    perPage = PAGE_DEFAULT,
  } = filters

  const from = (page - 1) * perPage
  const to   = from + perPage - 1

  let q = supabase
    .from('service_orders')
    .select(
      `id, os_number, os_sequence,
       customer_name, employee_name, customer_id,
       store_id, employee_id, laboratory_id, lab_os_number,
       current_status_id, situation,
       purchase_date, scheduled_delivery, urgent, notes, source,
       deleted_at, created_at,
       store:stores!store_id(id, code, name),
       customer:customers!customer_id(id, name, cpf, phone)`,
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('id', { ascending: false })
    .range(from, to)

  if (status_id) q = q.eq('current_status_id', status_id)
  if (store_id)  q = q.eq('store_id', store_id)
  if (urgent)    q = q.eq('urgent', true)

  if (search) {
    const s       = search.trim()
    const cpfClean = s.replace(/\D/g, '')
    if (/^\d{11}$/.test(cpfClean)) {
      // busca pelo CPF do cliente via join customers
      q = q.eq('customer.cpf', cpfClean)
    } else if (/^\d/.test(s)) {
      q = q.or(`os_number.eq.${s},os_sequence.ilike.%${s}%`)
    } else {
      q = q.ilike('customer_name', `%${s}%`)
    }
  }

  const { data, error, count } = await q

  if (error) throw new Error(`getOrders: ${error.message}`)

  return {
    data:    (data ?? []) as unknown as ServiceOrder[],
    total:   count ?? 0,
    page,
    perPage,
  }
}

export async function getOrder(id: number): Promise<ServiceOrder | null> {
  const { data, error } = await supabase
    .from('service_orders')
    .select(
      `*,
       stores!store_id(id, code, name),
       order_statuses!current_status_id(id, title, color),
       customers!customer_id(id, name, cpf, phone, email)`
    )
    .eq('id', id)
    .single()

  if (error) return null
  return data as ServiceOrder
}

export async function getOrderStatuses() {
  const { data } = await supabase
    .from('order_statuses')
    .select('id, title, color, position, is_start, is_end')
    .eq('active', true)
    .order('position')
  return data ?? []
}
