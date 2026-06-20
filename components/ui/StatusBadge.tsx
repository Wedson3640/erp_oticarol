// Badges de situação — usados em Pedidos, Garantias e CRM

interface StatusBadgeProps {
  status: string
  size?: "sm" | "md"
}

const statusMap: Record<string, { bg: string; text: string; border: string }> = {
  // ── Pedidos — situações reais do PHP/Rails ─────────────────────────────
  "Pedido criado":               { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },  // azul
  "Pedido reiniciado":           { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },  // âmbar

  // Compras
  "Compras":                     { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  "Compra Interna":              { bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  "Compra Externa":              { bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  "Aguardando Armação":          { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  "Armação encaminhada":         { bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  "Recompra":                    { bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  "Perda Interna":               { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  "Perda Externa":               { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },

  // Logística
  "Trânsito":                    { bg: "#CFFAFE", text: "#155E75", border: "#A5F3FC" },  // ciano
  "Encaminhando para logística": { bg: "#CFFAFE", text: "#155E75", border: "#A5F3FC" },
  "Retorno à logística":         { bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },

  // Laboratório
  "Enviado ao laboratório":      { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },  // roxo
  "Recebido no laboratório":     { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  "Surfaçagem":                  { bg: "#F3E8FF", text: "#6D28D9", border: "#E9D5FF" },
  "Montagem Interna":            { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  "Montagem Externa":            { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  "Em montagem":                 { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  "Enviado para montagem":       { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  "Análise de recebimento":      { bg: "#F3E8FF", text: "#6D28D9", border: "#E9D5FF" },

  // QC + Loja
  "Controle de Qualidade":       { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },  // azul médio
  "Recebido na Loja":            { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },  // verde
  "Transferência entre lojas":   { bg: "#E0F2FE", text: "#075985", border: "#BAE6FD" },
  "Aguardando Retirada":         { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },

  // Entrega
  "Entregue ao Cliente":         { bg: "#DCFCE7", text: "#14532D", border: "#BBF7D0" },  // verde escuro

  // Admin / encerramento
  "Revertido":                   { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  "Fechado pelo Administrador":  { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },

  // ── Solicitações — situações reais do PHP (casing diferente de pedidos) ─
  "Solicitação Criada":         { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  "Análise de recebimento":     { bg: "#F3E8FF", text: "#6D28D9", border: "#E9D5FF" },
  "Recebido no laboratório":    { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  "Controle de qualidade":      { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  "Recebido na loja":           { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
  "Entregue ao cliente":        { bg: "#DCFCE7", text: "#14532D", border: "#BBF7D0" },
  "Fechado pelo administrador": { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },

  // ── Status numéricos desconhecidos ─────────────────────────────────────
  "Status 15":                   { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
  "Status 18":                   { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
  "Status 24":                   { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
  "Status 25":                   { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },

  // ── Legado (nomes anteriores, mantidos por compatibilidade) ────────────
  "Aguardando":         { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  "Em andamento":       { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  "No Laboratório":     { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  "Pronto p/ Entrega":  { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
  "Pronto para Entrega":{ bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
  "Entregue":           { bg: "#DCFCE7", text: "#14532D", border: "#BBF7D0" },
  "Cancelado":          { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  "Urgente":            { bg: "#DC2626", text: "#FFFFFF", border: "#DC2626" },
  // Garantias — problemas
  "Lente Trincada":     { bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  "Retificação Médica": { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  "Adaptação":          { bg: "#CCFBF1", text: "#134E4A", border: "#99F6E4" },
  "Anti-Reflexo":       { bg: "#EDE9FE", text: "#4C1D95", border: "#DDD6FE" },
  "Outros":             { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
  // Garantias — situação
  "Início":             { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  "Intermediário":      { bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  "Encerrado":          { bg: "#DCFCE7", text: "#14532D", border: "#BBF7D0" },
  // CRM
  "Em Atendimento":     { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  "Aguardando Retorno": { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  "Convertido":         { bg: "#DCFCE7", text: "#14532D", border: "#BBF7D0" },
  "Não Convertido":     { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  // Canal
  "WhatsApp":           { bg: "#DCFCE7", text: "#14532D", border: "#BBF7D0" },
  "Loja":               { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  "Instagram":          { bg: "#EDE9FE", text: "#4C1D95", border: "#DDD6FE" },
  // Status geral
  "Ativo":              { bg: "#DCFCE7", text: "#14532D", border: "#BBF7D0" },
  "Inativo":            { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" },
  "Afastado":           { bg: "#FFEDD5", text: "#9A3412", border: "#FED7AA" },
  "Férias":             { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  "Desligado":          { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
}

const fallback = { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" }

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const style = statusMap[status] ?? fallback
  const px = size === "sm" ? "8px" : "10px"
  const py = size === "sm" ? "2px" : "4px"
  const fs = size === "sm" ? 11 : 12

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        paddingLeft: px,
        paddingRight: px,
        paddingTop: py,
        paddingBottom: py,
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 600,
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  )
}
