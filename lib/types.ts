// ─── Tipos centrais do sascarol ──────────────────────────────────────────────

export type Source = 'php' | 'rails' | 'manual' | 'both'

export interface Store {
  id:        number
  code:      string
  name:      string
  type:      'S' | 'O'
  active:    boolean
}

export interface Customer {
  id:         number
  cpf:        string | null
  name:       string
  phone:      string | null
  phone_alt:  string | null
  email:      string | null
  notes:      string | null
  source:     Source
  created_at: string
}

export interface OrderStatus {
  id:       number
  title:    string
  color:    string
  is_start: boolean
  is_end:   boolean
  position: number
}

export interface Laboratory {
  id:     number
  name:   string
  active: boolean
}

export interface Employee {
  id:          number
  full_name:   string
  short_name:  string | null
  cpf:         string | null
  email:       string | null
  phone_1:     string | null
  store_id:    number | null
  job_id:      number | null
  status:      string
  active:      boolean
}

export interface WarrantyProblem {
  id:     number
  name:   string
  active: boolean
}

export interface Lens {
  id:         number
  name:       string
  code:       string | null
  sap_code:   string | null
  lab_id:     number | null
  active:     boolean
  // join
  lab?:       Pick<Laboratory, 'id' | 'name'>
}

// ─── service_orders ───────────────────────────────────────────────────────────

export interface ServiceOrder {
  id:                number
  os_number:         string
  os_sequence:       string | null
  customer_name:     string | null   // denormalizado
  employee_name:     string | null   // denormalizado
  customer_id:       number | null
  store_id:          number | null
  employee_id:       number | null
  laboratory_id:     number | null
  lab_os_number:     string | null
  current_status_id: number | null
  situation:         string | null
  purchase_date:     string | null
  scheduled_delivery:string | null
  urgent:            boolean
  notes:             string | null
  source:            Source
  deleted_at:        string | null
  created_at:        string
  // joins
  store?:            Pick<Store,      'id' | 'code' | 'name'> | null
  status?:           Pick<OrderStatus,'id' | 'title' | 'color'> | null
  customer?:         Pick<Customer,   'id' | 'name' | 'cpf' | 'phone'> | null
  employee?:         Pick<Employee,   'id' | 'full_name' | 'short_name'> | null
  laboratory?:       Pick<Laboratory, 'id' | 'name'> | null
}

export interface ServiceOrderHistory {
  id:               number
  service_order_id: number
  situation:        string
  operator_name:    string | null
  employee_id:      number | null
  laboratory_id:    number | null
  lab_os_number:    string | null
  value:            number | null
  notes:            string | null
  created_at:       string
  // join
  laboratory?:      Pick<Laboratory, 'id' | 'name'> | null
}

// ─── warranties ───────────────────────────────────────────────────────────────

export interface Warranty {
  id:                number
  service_order_id:  number | null
  current_status_id: number | null
  problem_id:        number | null   // adicionado em v2
  store_id:          number | null
  situation:         string | null   // adicionado em v2
  customer_name:     string | null   // adicionado em v2
  customer_cpf:      string | null   // adicionado em v2
  request_date:      string | null   // adicionado em v2
  scheduled_delivery:string | null
  urgent:            boolean
  notes:             string | null
  source:            Source
  deleted_at:        string | null
  created_at:        string
  // joins
  store?:         Pick<Store,           'id' | 'code' | 'name'> | null
  problem?:       Pick<WarrantyProblem, 'id' | 'name'> | null
  service_order?: Pick<ServiceOrder,    'id' | 'os_number' | 'os_sequence' | 'customer_name'> | null
}

export interface WarrantyHistory {
  id:            number
  warranty_id:   number
  situation:     string
  operator_name: string | null
  employee_id:   number | null
  notes:         string | null
  created_at:    string
}

// ─── requests (solicitações) ──────────────────────────────────────────────────

export interface Request {
  id:                number
  source_erp_id:     number | null   // ID original do PHP (sol_id)
  customer_id:       number | null
  customer_name:     string | null
  customer_cpf:      string | null
  customer_phone:    string | null
  store_id:          number | null
  employee_id:       number | null
  service_type:      string
  frame_type:        string | null
  frame_model:       string | null
  situation:         string
  scheduled_delivery:string | null
  notes:             string | null
  deleted_at:        string | null
  created_at:        string
  // joins
  store?:    Pick<Store,    'id' | 'code' | 'name'> | null
  employee?: Pick<Employee, 'id' | 'full_name'> | null
  customer?: Pick<Customer, 'id' | 'name' | 'cpf' | 'phone'> | null
}

export interface RequestHistory {
  id:            number
  request_id:    number
  situation:     string
  operator_name: string | null
  employee_id:   number | null
  notes:         string | null
  created_at:    string
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

/** Formata "YYYY-MM-DD..." → "DD/MM/YYYY" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = iso.split("T")[0]
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

/** Formata "YYYY-MM-DD HH:MM:SS..." → "DD/MM/YYYY HH:MM" */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [datePart, timePart] = iso.split("T")
  const [y, m, d] = datePart.split("-")
  const time = timePart ? timePart.slice(0, 5) : ""
  return time ? `${d}/${m}/${y} ${time}` : `${d}/${m}/${y}`
}

/** true se a data ISO ainda não venceu */
export function prazoOk(iso: string | null | undefined): boolean {
  if (!iso) return true
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(iso) >= today
}

/** "63210" + "48957" → "63210/48957" */
export function fmtOs(os_number: string, os_sequence?: string | null): string {
  return os_sequence ? `${os_number}/${os_sequence}` : os_number
}

/** "86999990000" → "(86) 99999-0000" */
export function fmtPhone(v: string | null | undefined): string {
  if (!v) return "—"
  const d = v.replace(/\D/g, "")
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return v
}

/** "12345678901" → "123.456.789-01" */
export function fmtCpf(v: string | null | undefined): string {
  if (!v) return "—"
  const d = v.replace(/\D/g, "")
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return v
}

// ─── Paginação ────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data:    T[]
  total:   number
  page:    number
  perPage: number
}

export interface OrderFilters {
  search?:    string
  status_id?: number
  store_id?:  number
  urgent?:    boolean
  source?:    Source
  page?:      number
  perPage?:   number
}
