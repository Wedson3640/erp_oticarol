/**
 * lib/permissions.ts
 * Mapa de rotas → grupos autorizados
 *
 * Grupos do sistema (definidos em /usuarios):
 *   Vendas      — Pedidos, garantias e CRM
 *   Gestão      — Metas, funcionários e relatórios
 *   Caixa       — Acertos financeiros e cupons
 *   Admin       — Configurações e usuários
 *   Superadmin  — Acesso total irrestrito
 *
 * Array vazio = qualquer usuário autenticado pode acessar.
 * Superadmin sempre tem acesso a tudo.
 */

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard":    [],
  "/pedidos":      ["Vendas", "Gestão", "Admin", "Superadmin"],
  "/solicitacoes": ["Vendas", "Gestão", "Admin", "Superadmin"],
  "/garantias":    ["Vendas", "Gestão", "Admin", "Superadmin"],
  "/conversas":    ["Vendas", "Gestão", "Admin", "Superadmin"],
  "/laboratorio":  ["Gestão", "Admin", "Superadmin"],
  "/metas":        ["Gestão", "Admin", "Superadmin"],
  "/relatorios":   ["Gestão", "Admin", "Superadmin"],
  "/usuarios":     ["Admin", "Superadmin"],
  "/funcionarios": ["Gestão", "Admin", "Superadmin"],
  "/remessas":     ["Caixa", "Gestão", "Admin", "Superadmin"],
  "/cupons":       ["Caixa", "Gestão", "Admin", "Superadmin"],
  "/lentes":       ["Admin", "Superadmin"],
  "/laboratorios": ["Admin", "Superadmin"],
  "/empresa":      ["Admin", "Superadmin"],
  "/permissoes":   ["Admin", "Superadmin"],
  "/imprimir":     ["Vendas", "Gestão", "Admin", "Superadmin"],
  "/clientes":     ["Vendas", "Gestão", "Admin", "Superadmin"],
}

/**
 * Verifica se o usuário tem acesso à rota.
 * Compara o pathname com as rotas mapeadas (prefix match).
 */
export function canAccess(pathname: string, userGroups: string[] | null): boolean {
  const groups = userGroups ?? []

  // Superadmin tem acesso a tudo
  if (groups.includes("Superadmin")) return true

  // Encontra a rota raiz que corresponde ao pathname
  const route = Object.keys(ROUTE_PERMISSIONS).find(
    (r) => pathname === r || pathname.startsWith(r + "/")
  )

  // Rota não mapeada → acesso livre (ex: trocar-senha, api/)
  if (!route) return true

  const required = ROUTE_PERMISSIONS[route]

  // Sem restrição de grupo → qualquer autenticado
  if (required.length === 0) return true

  return required.some((g) => groups.includes(g))
}
